package com.meden.lens.run.application;

import com.meden.lens.analysis.domain.AnalysisEntity;
import com.meden.lens.analysis.infrastructure.AnalysisRepository;
import com.meden.lens.run.api.CreateRunRequest;
import com.meden.lens.run.api.RunListItemResponse;
import com.meden.lens.run.api.RunPageResponse;
import com.meden.lens.run.api.RunResponse;
import com.meden.lens.run.domain.ExecutionRunEntity;
import com.meden.lens.run.domain.ExecutionStatus;
import com.meden.lens.run.infrastructure.ExecutionRunRepository;
import com.meden.lens.shared.errors.ApiValidationException;
import com.meden.lens.shared.errors.FieldErrorDetail;
import com.meden.lens.shared.errors.ResourceNotFoundException;
import com.meden.lens.taskprofile.domain.TaskType;
import com.meden.lens.taskprofile.infrastructure.TaskProfileRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class RunService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;
    private static final String DEFAULT_SORT_PROPERTY = "createdAt";

    private final ExecutionRunRepository runRepository;
    private final AnalysisRepository analysisRepository;
    private final TaskProfileRepository taskProfileRepository;
    private final IdempotencyKeyResolver idempotencyKeyResolver;
    private final RunRequestValidator validator;
    private final RunMapper mapper;

    public RunService(
        ExecutionRunRepository runRepository,
        AnalysisRepository analysisRepository,
        TaskProfileRepository taskProfileRepository,
        IdempotencyKeyResolver idempotencyKeyResolver,
        RunRequestValidator validator,
        RunMapper mapper
    ) {
        this.runRepository = runRepository;
        this.analysisRepository = analysisRepository;
        this.taskProfileRepository = taskProfileRepository;
        this.idempotencyKeyResolver = idempotencyKeyResolver;
        this.validator = validator;
        this.mapper = mapper;
    }

    @Transactional
    public RunResponse createRun(CreateRunRequest request, String headerIdempotencyKey) {
        String idempotencyKey = idempotencyKeyResolver.resolve(request, headerIdempotencyKey);

        return runRepository.findByIdempotencyKey(idempotencyKey)
            .map(existingRun -> mapper.toResponse(existingRun, true))
            .orElseGet(() -> createNewRun(request, idempotencyKey));
    }

    @Transactional(readOnly = true)
    public RunResponse getRun(UUID runId) {
        return runRepository.findById(runId)
            .map(run -> mapper.toResponse(run, false))
            .orElseThrow(() -> new ResourceNotFoundException("Execution run was not found."));
    }

    @Transactional(readOnly = true)
    public RunPageResponse listRuns(
        TaskType taskType,
        ExecutionStatus status,
        String team,
        int page,
        int size,
        String sort
    ) {
        String normalizedTeam = team == null || team.isBlank() ? null : team.trim();
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = normalizePageSize(size);
        RunSort runSort = resolveSort(sort);

        Page<ExecutionRunEntity> runPage = runRepository.findAll(
                matchesFilters(taskType, status, normalizedTeam),
                PageRequest.of(normalizedPage, normalizedSize, runSort.toSpringSort())
            );

        Map<UUID, AnalysisEntity> analysesByRunId = findAnalysesByRunId(runPage.getContent());

        List<RunListItemResponse> items = runPage
            .stream()
            .map(run -> mapper.toListItemResponse(run, analysesByRunId.get(run.getId())))
            .toList();

        return new RunPageResponse(
            items,
            runPage.getNumber(),
            runPage.getSize(),
            runSort.responseValue(),
            runPage.getTotalElements(),
            runPage.getTotalPages(),
            runPage.isFirst(),
            runPage.isLast()
        );
    }

    private Map<UUID, AnalysisEntity> findAnalysesByRunId(List<ExecutionRunEntity> runs) {
        if (runs.isEmpty()) {
            return Collections.emptyMap();
        }

        List<UUID> runIds = runs.stream()
            .map(ExecutionRunEntity::getId)
            .toList();

        return analysisRepository.findByExecutionRunIds(runIds)
            .stream()
            .collect(Collectors.toMap(analysis -> analysis.getExecutionRun().getId(), Function.identity()));
    }

    private int normalizePageSize(int size) {
        if (size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }

        return Math.min(size, MAX_PAGE_SIZE);
    }

    private RunSort resolveSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return new RunSort(DEFAULT_SORT_PROPERTY, Sort.Direction.DESC);
        }

        String[] parts = sort.split(",", 2);
        String property = allowedSortProperty(parts[0].trim());
        Sort.Direction direction = parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim())
            ? Sort.Direction.ASC
            : Sort.Direction.DESC;

        return new RunSort(property, direction);
    }

    private String allowedSortProperty(String property) {
        return switch (property) {
            case "createdAt",
                 "startedAt",
                 "completedAt",
                 "durationMs",
                 "modelCalls",
                 "toolCalls",
                 "retryCount",
                 "totalTokens",
                 "estimatedCostUsd" -> property;
            default -> DEFAULT_SORT_PROPERTY;
        };
    }

    private Specification<ExecutionRunEntity> matchesFilters(
        TaskType taskType,
        ExecutionStatus status,
        String team
    ) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (taskType != null) {
                predicates.add(criteriaBuilder.equal(root.get("taskType"), taskType));
            }

            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }

            if (team != null) {
                predicates.add(criteriaBuilder.equal(
                    criteriaBuilder.lower(root.get("team")),
                    team.toLowerCase(Locale.ROOT)
                ));
            }

            return predicates.isEmpty()
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private RunResponse createNewRun(CreateRunRequest request, String idempotencyKey) {
        ensureTaskProfileExists(request);
        validator.validate(request);

        ExecutionRunEntity run = mapper.toEntity(request, idempotencyKey);

        try {
            ExecutionRunEntity savedRun = runRepository.saveAndFlush(run);
            return mapper.toResponse(savedRun, false);
        } catch (DataIntegrityViolationException exception) {
            return runRepository.findByIdempotencyKey(idempotencyKey)
                .map(existingRun -> mapper.toResponse(existingRun, true))
                .orElseThrow(() -> exception);
        }
    }

    private void ensureTaskProfileExists(CreateRunRequest request) {
        boolean taskProfileExists = taskProfileRepository.findByTaskType(request.task().type()).isPresent();
        if (!taskProfileExists) {
            throw new ApiValidationException(
                "The execution request is invalid.",
                List.of(new FieldErrorDetail("task.type", "does not have a configured task profile"))
            );
        }
    }

    private record RunSort(String property, Sort.Direction direction) {

        Sort toSpringSort() {
            return Sort.by(direction, property);
        }

        String responseValue() {
            return property + "," + direction.name().toLowerCase(Locale.ROOT);
        }
    }
}
