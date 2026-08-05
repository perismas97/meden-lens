package com.meden.lens.analysis.api;

import com.meden.lens.analysis.application.AnalysisResult;
import com.meden.lens.analysis.application.AnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/runs/{runId}/analysis")
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping
    @Operation(summary = "Analyze an execution run")
    public ResponseEntity<AnalysisResponse> analyzeRun(@PathVariable UUID runId) {
        AnalysisResult result = analysisService.analyze(runId);
        HttpStatus status = result.newlyCreated() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.response());
    }

    @GetMapping
    @Operation(summary = "Get analysis for an execution run")
    public AnalysisResponse getAnalysis(@PathVariable UUID runId) {
        return analysisService.getAnalysis(runId);
    }
}
