package com.meden.lens.run.api;

import com.meden.lens.run.application.RunService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/runs")
public class RunController {

    private final RunService runService;

    public RunController(RunService runService) {
        this.runService = runService;
    }

    @PostMapping
    @Operation(summary = "Ingest an AI agent execution run")
    public ResponseEntity<RunResponse> createRun(
        @Valid @RequestBody CreateRunRequest request,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        RunResponse response = runService.createRun(request, idempotencyKey);
        HttpStatus status = response.previouslyProcessed() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(response);
    }

    @GetMapping("/{runId}")
    @Operation(summary = "Get an execution run by ID")
    public RunResponse getRun(@PathVariable UUID runId) {
        return runService.getRun(runId);
    }
}
