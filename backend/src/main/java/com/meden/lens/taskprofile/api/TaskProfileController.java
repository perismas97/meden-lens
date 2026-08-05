package com.meden.lens.taskprofile.api;

import com.meden.lens.taskprofile.infrastructure.TaskProfileRepository;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/v1/task-profiles")
public class TaskProfileController {

    private final TaskProfileRepository taskProfileRepository;
    private final TaskProfileMapper mapper;

    public TaskProfileController(TaskProfileRepository taskProfileRepository, TaskProfileMapper mapper) {
        this.taskProfileRepository = taskProfileRepository;
        this.mapper = mapper;
    }

    @GetMapping
    @Operation(summary = "List configured task profiles")
    public List<TaskProfileResponse> listTaskProfiles() {
        return taskProfileRepository.findAll()
            .stream()
            .sorted(Comparator.comparing(profile -> profile.getTaskType().name()))
            .map(mapper::toResponse)
            .toList();
    }
}
