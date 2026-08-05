package com.meden.lens.run.domain;

import com.meden.lens.taskprofile.domain.Complexity;
import com.meden.lens.taskprofile.domain.TaskType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "execution_runs")
public class ExecutionRunEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_run_id")
    private String externalRunId;

    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;

    @Column(name = "agent_name", nullable = false)
    private String agentName;

    @Column(name = "agent_version", nullable = false)
    private String agentVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false)
    private TaskType taskType;

    @Column(name = "task_description", nullable = false)
    private String taskDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_complexity", nullable = false)
    private Complexity taskComplexity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExecutionStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "completed_at", nullable = false)
    private Instant completedAt;

    @Column(name = "duration_ms", nullable = false)
    private long durationMs;

    @Column(name = "model_calls", nullable = false)
    private int modelCalls;

    @Column(name = "tool_calls", nullable = false)
    private int toolCalls;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "sub_agent_count", nullable = false)
    private int subAgentCount;

    @Column(name = "input_tokens", nullable = false)
    private long inputTokens;

    @Column(name = "output_tokens", nullable = false)
    private long outputTokens;

    @Column(name = "total_tokens", nullable = false)
    private long totalTokens;

    @Column(name = "estimated_cost_usd", nullable = false, precision = 12, scale = 4)
    private BigDecimal estimatedCostUsd;

    private String environment;

    private String team;

    private String purpose;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "executionRun", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ModelUsageEntity> modelUsages = new ArrayList<>();

    @OneToMany(mappedBy = "executionRun", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ToolUsageEntity> toolUsages = new ArrayList<>();

    protected ExecutionRunEntity() {
    }

    public ExecutionRunEntity(
        String externalRunId,
        String idempotencyKey,
        String agentName,
        String agentVersion,
        TaskType taskType,
        String taskDescription,
        Complexity taskComplexity,
        ExecutionStatus status,
        Instant startedAt,
        Instant completedAt,
        long durationMs,
        int modelCalls,
        int toolCalls,
        int retryCount,
        int subAgentCount,
        long inputTokens,
        long outputTokens,
        long totalTokens,
        BigDecimal estimatedCostUsd,
        String environment,
        String team,
        String purpose
    ) {
        this.externalRunId = externalRunId;
        this.idempotencyKey = idempotencyKey;
        this.agentName = agentName;
        this.agentVersion = agentVersion;
        this.taskType = taskType;
        this.taskDescription = taskDescription;
        this.taskComplexity = taskComplexity;
        this.status = status;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.durationMs = durationMs;
        this.modelCalls = modelCalls;
        this.toolCalls = toolCalls;
        this.retryCount = retryCount;
        this.subAgentCount = subAgentCount;
        this.inputTokens = inputTokens;
        this.outputTokens = outputTokens;
        this.totalTokens = totalTokens;
        this.estimatedCostUsd = estimatedCostUsd;
        this.environment = environment;
        this.team = team;
        this.purpose = purpose;
    }

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }

    public void addModelUsage(ModelUsageEntity modelUsage) {
        modelUsage.attachTo(this);
        modelUsages.add(modelUsage);
    }

    public void addToolUsage(ToolUsageEntity toolUsage) {
        toolUsage.attachTo(this);
        toolUsages.add(toolUsage);
    }

    public UUID getId() {
        return id;
    }

    public String getExternalRunId() {
        return externalRunId;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public String getAgentName() {
        return agentName;
    }

    public String getAgentVersion() {
        return agentVersion;
    }

    public TaskType getTaskType() {
        return taskType;
    }

    public String getTaskDescription() {
        return taskDescription;
    }

    public Complexity getTaskComplexity() {
        return taskComplexity;
    }

    public ExecutionStatus getStatus() {
        return status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public long getDurationMs() {
        return durationMs;
    }

    public int getModelCalls() {
        return modelCalls;
    }

    public int getToolCalls() {
        return toolCalls;
    }

    public int getRetryCount() {
        return retryCount;
    }

    public int getSubAgentCount() {
        return subAgentCount;
    }

    public long getInputTokens() {
        return inputTokens;
    }

    public long getOutputTokens() {
        return outputTokens;
    }

    public long getTotalTokens() {
        return totalTokens;
    }

    public BigDecimal getEstimatedCostUsd() {
        return estimatedCostUsd;
    }

    public String getEnvironment() {
        return environment;
    }

    public String getTeam() {
        return team;
    }

    public String getPurpose() {
        return purpose;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public List<ModelUsageEntity> getModelUsages() {
        return Collections.unmodifiableList(modelUsages);
    }

    public List<ToolUsageEntity> getToolUsages() {
        return Collections.unmodifiableList(toolUsages);
    }
}
