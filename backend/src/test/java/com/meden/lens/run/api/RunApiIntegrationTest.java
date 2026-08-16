package com.meden.lens.run.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RunApiIntegrationTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine")
        .withDatabaseName("meden_lens_test")
        .withUsername("meden")
        .withPassword("meden");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @LocalServerPort
    int port;

    @Autowired
    TestRestTemplate restTemplate;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void listsSeededTaskProfiles() {
        ResponseEntity<String> response = restTemplate.getForEntity(url("/api/v1/task-profiles"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("SIMPLE_TRANSFORMATION", "DOCUMENT_SUMMARY", "DEEP_RESEARCH");
    }

    @Test
    void createsRunAndReturnsExistingRunForDuplicateIdempotencyKey() {
        HttpEntity<String> entity = jsonEntity(validRunJson("document-summary-it-001"));

        ResponseEntity<String> created = restTemplate.exchange(url("/api/v1/runs"), HttpMethod.POST, entity, String.class);
        ResponseEntity<String> duplicate = restTemplate.exchange(url("/api/v1/runs"), HttpMethod.POST, entity, String.class);

        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody()).contains("\"previouslyProcessed\":false");
        assertThat(duplicate.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(duplicate.getBody()).contains("\"previouslyProcessed\":true");
    }

    @Test
    void rejectsInvalidRunPayload() {
        HttpEntity<String> entity = jsonEntity("""
            {
              "idempotencyKey": "invalid-run-001",
              "agent": {
                "name": "support-document-agent",
                "version": "1.0.0"
              },
              "task": {
                "type": "DOCUMENT_SUMMARY",
                "description": "Summarize a document",
                "complexity": "MEDIUM"
              },
              "execution": {
                "status": "SUCCESS",
                "startedAt": "2026-08-05T08:00:42Z",
                "completedAt": "2026-08-05T08:00:00Z",
                "durationMs": 42000,
                "modelCalls": 1,
                "toolCalls": 0,
                "retryCount": 0,
                "subAgentCount": 0,
                "inputTokens": 7000,
                "outputTokens": 1000,
                "estimatedCostUsd": 0.08
              }
            }
            """);

        ResponseEntity<String> response = restTemplate.exchange(url("/api/v1/runs"), HttpMethod.POST, entity, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("VALIDATION_ERROR", "execution.completedAt");
    }

    @Test
    void analyzesRunAndReturnsExplainableDecision() throws Exception {
        ResponseEntity<String> created = restTemplate.exchange(
            url("/api/v1/runs"),
            HttpMethod.POST,
            jsonEntity(excessiveRunJson("document-summary-analysis-it-001")),
            String.class
        );
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        JsonNode createdBody = objectMapper.readTree(created.getBody());
        String runId = createdBody.get("id").asText();

        ResponseEntity<String> analyzed = restTemplate.exchange(
            url("/api/v1/runs/" + runId + "/analysis"),
            HttpMethod.POST,
            HttpEntity.EMPTY,
            String.class
        );
        ResponseEntity<String> duplicateAnalysis = restTemplate.exchange(
            url("/api/v1/runs/" + runId + "/analysis"),
            HttpMethod.POST,
            HttpEntity.EMPTY,
            String.class
        );
        ResponseEntity<String> fetched = restTemplate.getForEntity(
            url("/api/v1/runs/" + runId + "/analysis"),
            String.class
        );

        assertThat(analyzed.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(analyzed.getBody())
            .contains(
                "\"runId\":\"" + runId + "\"",
                "\"balanceScore\":16",
                "\"classification\":\"HIGHLY_DISPROPORTIONATE\"",
                "\"TOKEN_BUDGET_EXCEEDED\"",
                "\"COST_DISPROPORTIONATE_TO_TASK\"",
                "\"REDUCE_MODEL_CALLS\"",
                "\"estimatedCostReductionUsd\":1.5900",
                "\"estimatedSavingsPercent\":86.41"
            );
        assertThat(duplicateAnalysis.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(duplicateAnalysis.getBody()).contains("\"runId\":\"" + runId + "\"");
        assertThat(fetched.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(fetched.getBody()).contains("\"runId\":\"" + runId + "\"");
    }

    @Test
    void simulatesScenarioAndReturnsAnalyzedRun() {
        ResponseEntity<String> scenarios = restTemplate.getForEntity(
            url("/api/v1/simulator/scenarios"),
            String.class
        );
        ResponseEntity<String> simulated = restTemplate.exchange(
            url("/api/v1/simulator/scenarios/excessive-document-summary"),
            HttpMethod.POST,
            HttpEntity.EMPTY,
            String.class
        );

        assertThat(scenarios.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(scenarios.getBody())
            .contains(
                "proportional-document-summary",
                "excessive-document-summary",
                "failed-high-cost-run",
                "valid-deep-research"
            );

        assertThat(simulated.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(simulated.getBody())
            .contains(
                "\"scenarioKey\":\"excessive-document-summary\"",
                "\"runCreated\":true",
                "\"analysisCreated\":true",
                "\"classification\":\"HIGHLY_DISPROPORTIONATE\"",
                "\"TOKEN_BUDGET_EXCEEDED\"",
                "\"estimatedCostReductionUsd\":1.5900"
            );
    }

    @Test
    void listsRunsWithOptionalFilters() throws Exception {
        ResponseEntity<String> failedScenario = restTemplate.exchange(
            url("/api/v1/simulator/scenarios/failed-high-cost-run"),
            HttpMethod.POST,
            HttpEntity.EMPTY,
            String.class
        );
        ResponseEntity<String> deepResearchScenario = restTemplate.exchange(
            url("/api/v1/simulator/scenarios/valid-deep-research"),
            HttpMethod.POST,
            HttpEntity.EMPTY,
            String.class
        );

        ResponseEntity<String> allRuns = restTemplate.getForEntity(
            url("/api/v1/runs?page=0&size=20&sort=createdAt,desc"),
            String.class
        );
        ResponseEntity<String> failedRuns = restTemplate.getForEntity(
            url("/api/v1/runs?status=FAILED&page=0&size=1"),
            String.class
        );
        ResponseEntity<String> deepResearchRuns = restTemplate.getForEntity(
            url("/api/v1/runs?taskType=DEEP_RESEARCH&team=demo&page=0&size=10"),
            String.class
        );

        assertThat(failedScenario.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(deepResearchScenario.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        assertThat(allRuns.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode allRunsBody = objectMapper.readTree(allRuns.getBody());
        assertThat(allRunsBody.get("items").isArray()).isTrue();
        assertThat(allRunsBody.get("page").asInt()).isZero();
        assertThat(allRunsBody.get("size").asInt()).isEqualTo(20);
        assertThat(allRunsBody.get("sort").asText()).isEqualTo("createdAt,desc");
        assertThat(allRunsBody.get("totalItems").asLong()).isGreaterThanOrEqualTo(2);
        assertThat(allRuns.getBody())
            .contains("sample-failed-expensive-run", "sample-valid-deep-research");

        assertThat(failedRuns.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode failedRunsBody = objectMapper.readTree(failedRuns.getBody());
        assertThat(failedRunsBody.get("items").size()).isEqualTo(1);
        assertThat(failedRunsBody.get("page").asInt()).isZero();
        assertThat(failedRunsBody.get("size").asInt()).isEqualTo(1);
        assertThat(failedRunsBody.get("sort").asText()).isEqualTo("createdAt,desc");
        assertThat(failedRunsBody.get("totalItems").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(failedRuns.getBody())
            .contains("\"status\":\"FAILED\"", "sample-failed-expensive-run")
            .doesNotContain("\"status\":\"SUCCESS\"");

        assertThat(deepResearchRuns.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode deepResearchRunsBody = objectMapper.readTree(deepResearchRuns.getBody());
        assertThat(deepResearchRunsBody.get("items").isArray()).isTrue();
        assertThat(deepResearchRunsBody.get("page").asInt()).isZero();
        assertThat(deepResearchRunsBody.get("size").asInt()).isEqualTo(10);
        assertThat(deepResearchRuns.getBody())
            .contains("\"type\":\"DEEP_RESEARCH\"", "sample-valid-deep-research")
            .doesNotContain("\"type\":\"DOCUMENT_SUMMARY\"");
    }

    @Test
    void summarizesRunsAndAnalyses() throws Exception {
        JsonNode beforeSummary = getRunSummary();

        ResponseEntity<String> excessiveScenario = restTemplate.exchange(
            url("/api/v1/simulator/scenarios/excessive-document-summary"),
            HttpMethod.POST,
            HttpEntity.EMPTY,
            String.class
        );
        ResponseEntity<String> failedScenario = restTemplate.exchange(
            url("/api/v1/simulator/scenarios/failed-high-cost-run"),
            HttpMethod.POST,
            HttpEntity.EMPTY,
            String.class
        );

        JsonNode afterSummary = getRunSummary();

        assertThat(excessiveScenario.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(failedScenario.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        assertThat(afterSummary.get("totalRuns").asLong())
            .isEqualTo(beforeSummary.get("totalRuns").asLong() + 2);
        assertThat(afterSummary.get("successfulRuns").asLong())
            .isEqualTo(beforeSummary.get("successfulRuns").asLong() + 1);
        assertThat(afterSummary.get("failedRuns").asLong())
            .isEqualTo(beforeSummary.get("failedRuns").asLong() + 1);
        assertThat(afterSummary.get("analyzedRuns").asLong())
            .isEqualTo(beforeSummary.get("analyzedRuns").asLong() + 2);
        assertThat(afterSummary.get("unanalyzedRuns").asLong())
            .isEqualTo(afterSummary.get("totalRuns").asLong() - afterSummary.get("analyzedRuns").asLong());
        assertThat(afterSummary.get("highlyDisproportionateRuns").asLong())
            .isGreaterThanOrEqualTo(beforeSummary.get("highlyDisproportionateRuns").asLong() + 1);
        assertThat(afterSummary.get("estimatedCostReductionUsd").decimalValue())
            .isGreaterThan(beforeSummary.get("estimatedCostReductionUsd").decimalValue());
        assertThat(afterSummary.get("totalEstimatedCostUsd").decimalValue())
            .isGreaterThan(beforeSummary.get("totalEstimatedCostUsd").decimalValue());
        assertThat(afterSummary.get("averageBalanceScore").asInt()).isBetween(0, 100);
    }

    private JsonNode getRunSummary() throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(url("/api/v1/runs/summary"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return objectMapper.readTree(response.getBody());
    }

    private HttpEntity<String> jsonEntity(String json) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(json, headers);
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private String validRunJson(String idempotencyKey) {
        return """
            {
              "externalRunId": "run-external-001",
              "idempotencyKey": "%s",
              "agent": {
                "name": "support-document-agent",
                "version": "1.0.0"
              },
              "task": {
                "type": "DOCUMENT_SUMMARY",
                "description": "Summarize a 15-page technical support document",
                "complexity": "MEDIUM"
              },
              "execution": {
                "status": "SUCCESS",
                "startedAt": "2026-08-05T08:00:00Z",
                "completedAt": "2026-08-05T08:00:42Z",
                "durationMs": 42000,
                "modelCalls": 1,
                "toolCalls": 0,
                "retryCount": 0,
                "subAgentCount": 0,
                "inputTokens": 7000,
                "outputTokens": 1000,
                "estimatedCostUsd": 0.08
              },
              "models": [
                {
                  "provider": "sample-provider",
                  "model": "efficient-summary-model",
                  "callCount": 1,
                  "inputTokens": 7000,
                  "outputTokens": 1000,
                  "estimatedCostUsd": 0.08
                }
              ],
              "tools": [],
              "metadata": {
                "environment": "local",
                "team": "demo",
                "purpose": "technical-document-summary"
              }
            }
            """.formatted(idempotencyKey);
    }

    private String excessiveRunJson(String idempotencyKey) {
        return """
            {
              "externalRunId": "run-external-analysis-001",
              "idempotencyKey": "%s",
              "agent": {
                "name": "support-document-agent",
                "version": "1.0.0"
              },
              "task": {
                "type": "DOCUMENT_SUMMARY",
                "description": "Summarize a 15-page technical support document",
                "complexity": "MEDIUM"
              },
              "execution": {
                "status": "SUCCESS",
                "startedAt": "2026-08-05T08:00:00Z",
                "completedAt": "2026-08-05T08:00:42Z",
                "durationMs": 42000,
                "modelCalls": 6,
                "toolCalls": 12,
                "retryCount": 2,
                "subAgentCount": 0,
                "inputTokens": 48000,
                "outputTokens": 9000,
                "estimatedCostUsd": 1.84
              },
              "models": [
                {
                  "provider": "sample-provider",
                  "model": "large-reasoning-model",
                  "callCount": 6,
                  "inputTokens": 48000,
                  "outputTokens": 9000,
                  "estimatedCostUsd": 1.84
                }
              ],
              "tools": [
                {
                  "name": "web-search",
                  "callCount": 12,
                  "successCount": 12,
                  "failureCount": 0
                }
              ],
              "metadata": {
                "environment": "local",
                "team": "demo",
                "purpose": "technical-document-summary"
              }
            }
            """.formatted(idempotencyKey);
    }
}
