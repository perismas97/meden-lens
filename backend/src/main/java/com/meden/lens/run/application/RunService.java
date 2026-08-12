package com.meden.lens.run.application;

import com.meden.lens.run.api.CreateRunRequest;
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
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class RunService {

    private final ExecutionRunRepository runRepository;
    private final TaskProfileRepository taskProfileRepository;
    private final IdempotencyKeyResolver idempotencyKeyResolver;
    private final RunRequestValidator validator;
    private final RunMapper mapper;

    public RunService(
        ExecutionRunRepository runRepository,
        TaskProfileRepository taskProfileRepository,
        IdempotencyKeyResolver idempotencyKeyResolver,
        RunRequestValidator validator,
        RunMapper mapper
    ) {
        this.runRepository = runRepository;
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
    public List<RunResponse> listRuns(TaskType taskType, ExecutionStatus status, String team) {
        String normalizedTeam = team == null || team.isBlank() ? null : team.trim();

        return runRepository.findAll(
                matchesFilters(taskType, status, normalizedTeam),
                Sort.by(Sort.Direction.DESC, "createdAt")
            )
            .stream()
            .map(run -> mapper.toResponse(run, false))
            .toList();
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
}
