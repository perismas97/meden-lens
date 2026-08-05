package com.meden.lens.run.application;

import com.meden.lens.run.api.CreateRunRequest;
import com.meden.lens.shared.errors.ApiValidationException;
import com.meden.lens.shared.errors.FieldErrorDetail;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class RunRequestValidator {

    public void validate(CreateRunRequest request) {
        List<FieldErrorDetail> errors = new ArrayList<>();

        validateExecutionDates(request, errors);
        validateTotalTokens(request, errors);
        validateToolCounts(request, errors);

        if (!errors.isEmpty()) {
            throw new ApiValidationException("The execution request is invalid.", errors);
        }
    }

    private void validateExecutionDates(CreateRunRequest request, List<FieldErrorDetail> errors) {
        if (request.execution().completedAt().isBefore(request.execution().startedAt())) {
            errors.add(new FieldErrorDetail("execution.completedAt", "cannot be before execution.startedAt"));
        }
    }

    private void validateTotalTokens(CreateRunRequest request, List<FieldErrorDetail> errors) {
        Long providedTotal = request.execution().totalTokens();
        long expectedTotal = request.execution().inputTokens() + request.execution().outputTokens();

        if (providedTotal != null && providedTotal != expectedTotal) {
            errors.add(new FieldErrorDetail("execution.totalTokens", "must equal execution.inputTokens plus execution.outputTokens"));
        }
    }

    private void validateToolCounts(CreateRunRequest request, List<FieldErrorDetail> errors) {
        List<CreateRunRequest.ToolUsageRequest> tools = request.tools() == null ? List.of() : request.tools();

        for (int index = 0; index < tools.size(); index++) {
            CreateRunRequest.ToolUsageRequest tool = tools.get(index);
            int completedCalls = tool.successCount() + tool.failureCount();
            if (completedCalls > tool.callCount()) {
                errors.add(new FieldErrorDetail(
                    "tools[" + index + "]",
                    "successCount plus failureCount cannot exceed callCount"
                ));
            }
        }
    }
}
