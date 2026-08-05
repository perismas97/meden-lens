package com.meden.lens.run.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "tool_usages")
public class ToolUsageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "execution_run_id", nullable = false)
    private ExecutionRunEntity executionRun;

    @Column(name = "tool_name", nullable = false)
    private String toolName;

    @Column(name = "call_count", nullable = false)
    private int callCount;

    @Column(name = "success_count", nullable = false)
    private int successCount;

    @Column(name = "failure_count", nullable = false)
    private int failureCount;

    protected ToolUsageEntity() {
    }

    public ToolUsageEntity(String toolName, int callCount, int successCount, int failureCount) {
        this.toolName = toolName;
        this.callCount = callCount;
        this.successCount = successCount;
        this.failureCount = failureCount;
    }

    void attachTo(ExecutionRunEntity executionRun) {
        this.executionRun = executionRun;
    }

    public UUID getId() {
        return id;
    }

    public String getToolName() {
        return toolName;
    }

    public int getCallCount() {
        return callCount;
    }

    public int getSuccessCount() {
        return successCount;
    }

    public int getFailureCount() {
        return failureCount;
    }
}
