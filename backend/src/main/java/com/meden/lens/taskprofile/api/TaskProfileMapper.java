package com.meden.lens.taskprofile.api;

import com.meden.lens.taskprofile.domain.TaskProfileEntity;
import org.springframework.stereotype.Component;

@Component
class TaskProfileMapper {

    TaskProfileResponse toResponse(TaskProfileEntity entity) {
        return new TaskProfileResponse(
            entity.getId(),
            entity.getTaskType(),
            entity.getComplexity(),
            entity.getMaxModelCalls(),
            entity.getMaxToolCalls(),
            entity.getRecommendedInputTokens(),
            entity.getRecommendedOutputTokens(),
            entity.getRecommendedTotalTokens(),
            entity.getRecommendedDurationMs(),
            entity.getRecommendedCostUsd(),
            entity.getMaxRetries(),
            entity.isAllowSubAgents(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
