package com.meden.lens.taskprofile.api;

import com.meden.lens.taskprofile.domain.Complexity;
import com.meden.lens.taskprofile.domain.TaskType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TaskProfileResponse(
    UUID id,
    TaskType taskType,
    Complexity complexity,
    int maxModelCalls,
    int maxToolCalls,
    long recommendedInputTokens,
    long recommendedOutputTokens,
    long recommendedTotalTokens,
    long recommendedDurationMs,
    BigDecimal recommendedCostUsd,
    int maxRetries,
    boolean allowSubAgents,
    Instant createdAt,
    Instant updatedAt
) {
}
