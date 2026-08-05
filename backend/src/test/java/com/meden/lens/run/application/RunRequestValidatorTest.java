package com.meden.lens.run.application;

import com.meden.lens.run.api.CreateRunRequest;
import com.meden.lens.run.domain.ExecutionStatus;
import com.meden.lens.shared.errors.ApiValidationException;
import com.meden.lens.taskprofile.domain.Complexity;
import com.meden.lens.taskprofile.domain.TaskType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RunRequestValidatorTest {

    private final RunRequestValidator validator = new RunRequestValidator();

    @Test
    void rejectsCompletedAtBeforeStartedAt() {
        CreateRunRequest request = validRequest(new CreateRunRequest.ExecutionRequest(
            ExecutionStatus.SUCCESS,
            Instant.parse("2026-08-05T08:00:42Z"),
            Instant.parse("2026-08-05T08:00:00Z"),
            42000L,
            1,
            0,
            0,
            0,
            7000L,
            1000L,
            null,
            new BigDecimal("0.08")
        ), List.of());

        assertThatThrownBy(() -> validator.validate(request))
            .isInstanceOf(ApiValidationException.class)
            .hasMessage("The execution request is invalid.");
    }

    @Test
    void rejectsTotalTokensThatDoNotMatchInputPlusOutput() {
        CreateRunRequest request = validRequest(new CreateRunRequest.ExecutionRequest(
            ExecutionStatus.SUCCESS,
            Instant.parse("2026-08-05T08:00:00Z"),
            Instant.parse("2026-08-05T08:00:42Z"),
            42000L,
            1,
            0,
            0,
            0,
            7000L,
            1000L,
            9000L,
            new BigDecimal("0.08")
        ), List.of());

        assertThatThrownBy(() -> validator.validate(request))
            .isInstanceOf(ApiValidationException.class)
            .hasMessage("The execution request is invalid.");
    }

    @Test
    void rejectsToolUsageWhenSuccessAndFailureExceedCallCount() {
        CreateRunRequest request = validRequest(validExecution(), List.of(
            new CreateRunRequest.ToolUsageRequest("document-reader", 2, 2, 1)
        ));

        assertThatThrownBy(() -> validator.validate(request))
            .isInstanceOf(ApiValidationException.class)
            .hasMessage("The execution request is invalid.");
    }

    private CreateRunRequest validRequest(
        CreateRunRequest.ExecutionRequest execution,
        List<CreateRunRequest.ToolUsageRequest> tools
    ) {
        return new CreateRunRequest(
            "run-external-001",
            "document-summary-001",
            new CreateRunRequest.AgentRequest("support-document-agent", "1.0.0"),
            new CreateRunRequest.TaskRequest(
                TaskType.DOCUMENT_SUMMARY,
                "Summarize a 15-page technical support document",
                Complexity.MEDIUM
            ),
            execution,
            List.of(),
            tools,
            new CreateRunRequest.MetadataRequest("local", "demo", "technical-document-summary")
        );
    }

    private CreateRunRequest.ExecutionRequest validExecution() {
        return new CreateRunRequest.ExecutionRequest(
            ExecutionStatus.SUCCESS,
            Instant.parse("2026-08-05T08:00:00Z"),
            Instant.parse("2026-08-05T08:00:42Z"),
            42000L,
            1,
            0,
            0,
            0,
            7000L,
            1000L,
            null,
            new BigDecimal("0.08")
        );
    }
}
