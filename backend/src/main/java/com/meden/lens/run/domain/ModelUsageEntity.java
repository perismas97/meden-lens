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

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "model_usages")
public class ModelUsageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "execution_run_id", nullable = false)
    private ExecutionRunEntity executionRun;

    @Column(nullable = false)
    private String provider;

    @Column(name = "model", nullable = false)
    private String modelName;

    @Column(name = "call_count", nullable = false)
    private int callCount;

    @Column(name = "input_tokens", nullable = false)
    private long inputTokens;

    @Column(name = "output_tokens", nullable = false)
    private long outputTokens;

    @Column(name = "estimated_cost_usd", nullable = false, precision = 12, scale = 4)
    private BigDecimal estimatedCostUsd;

    protected ModelUsageEntity() {
    }

    public ModelUsageEntity(
        String provider,
        String modelName,
        int callCount,
        long inputTokens,
        long outputTokens,
        BigDecimal estimatedCostUsd
    ) {
        this.provider = provider;
        this.modelName = modelName;
        this.callCount = callCount;
        this.inputTokens = inputTokens;
        this.outputTokens = outputTokens;
        this.estimatedCostUsd = estimatedCostUsd;
    }

    void attachTo(ExecutionRunEntity executionRun) {
        this.executionRun = executionRun;
    }

    public UUID getId() {
        return id;
    }

    public String getProvider() {
        return provider;
    }

    public String getModelName() {
        return modelName;
    }

    public int getCallCount() {
        return callCount;
    }

    public long getInputTokens() {
        return inputTokens;
    }

    public long getOutputTokens() {
        return outputTokens;
    }

    public BigDecimal getEstimatedCostUsd() {
        return estimatedCostUsd;
    }
}
