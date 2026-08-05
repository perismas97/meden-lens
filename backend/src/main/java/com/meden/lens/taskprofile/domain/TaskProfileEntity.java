package com.meden.lens.taskprofile.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "task_profiles")
public class TaskProfileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, unique = true)
    private TaskType taskType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Complexity complexity;

    @Column(name = "max_model_calls", nullable = false)
    private int maxModelCalls;

    @Column(name = "max_tool_calls", nullable = false)
    private int maxToolCalls;

    @Column(name = "recommended_input_tokens", nullable = false)
    private long recommendedInputTokens;

    @Column(name = "recommended_output_tokens", nullable = false)
    private long recommendedOutputTokens;

    @Column(name = "recommended_total_tokens", nullable = false)
    private long recommendedTotalTokens;

    @Column(name = "recommended_duration_ms", nullable = false)
    private long recommendedDurationMs;

    @Column(name = "recommended_cost_usd", nullable = false, precision = 12, scale = 4)
    private BigDecimal recommendedCostUsd;

    @Column(name = "max_retries", nullable = false)
    private int maxRetries;

    @Column(name = "allow_sub_agents", nullable = false)
    private boolean allowSubAgents;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TaskProfileEntity() {
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public TaskType getTaskType() {
        return taskType;
    }

    public Complexity getComplexity() {
        return complexity;
    }

    public int getMaxModelCalls() {
        return maxModelCalls;
    }

    public int getMaxToolCalls() {
        return maxToolCalls;
    }

    public long getRecommendedInputTokens() {
        return recommendedInputTokens;
    }

    public long getRecommendedOutputTokens() {
        return recommendedOutputTokens;
    }

    public long getRecommendedTotalTokens() {
        return recommendedTotalTokens;
    }

    public long getRecommendedDurationMs() {
        return recommendedDurationMs;
    }

    public BigDecimal getRecommendedCostUsd() {
        return recommendedCostUsd;
    }

    public int getMaxRetries() {
        return maxRetries;
    }

    public boolean isAllowSubAgents() {
        return allowSubAgents;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
