package com.meden.lens.analysis.domain;

import com.meden.lens.run.domain.ExecutionRunEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "analyses")
public class AnalysisEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "execution_run_id", nullable = false, unique = true)
    private ExecutionRunEntity executionRun;

    @Column(name = "balance_score", nullable = false)
    private int balanceScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private AnalysisClassification classification;

    @Column(name = "cost_efficiency_score", nullable = false)
    private int costEfficiencyScore;

    @Column(name = "token_efficiency_score", nullable = false)
    private int tokenEfficiencyScore;

    @Column(name = "tool_efficiency_score", nullable = false)
    private int toolEfficiencyScore;

    @Column(name = "model_call_efficiency_score", nullable = false)
    private int modelCallEfficiencyScore;

    @Column(name = "latency_efficiency_score", nullable = false)
    private int latencyEfficiencyScore;

    @Column(name = "retry_efficiency_score", nullable = false)
    private int retryEfficiencyScore;

    @Column(name = "autonomy_efficiency_score", nullable = false)
    private int autonomyEfficiencyScore;

    @Column(name = "estimated_cost_reduction_usd", nullable = false, precision = 12, scale = 4)
    private BigDecimal estimatedCostReductionUsd;

    @Column(name = "estimated_savings_percent", nullable = false, precision = 8, scale = 2)
    private BigDecimal estimatedSavingsPercent;

    @Column(name = "analyzed_at", nullable = false)
    private Instant analyzedAt;

    @OneToMany(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FindingEntity> findings = new ArrayList<>();

    @OneToMany(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RecommendationEntity> recommendations = new ArrayList<>();

    protected AnalysisEntity() {
    }

    public AnalysisEntity(
        ExecutionRunEntity executionRun,
        int balanceScore,
        AnalysisClassification classification,
        int costEfficiencyScore,
        int tokenEfficiencyScore,
        int toolEfficiencyScore,
        int modelCallEfficiencyScore,
        int latencyEfficiencyScore,
        int retryEfficiencyScore,
        int autonomyEfficiencyScore,
        BigDecimal estimatedCostReductionUsd,
        BigDecimal estimatedSavingsPercent
    ) {
        this.executionRun = executionRun;
        this.balanceScore = balanceScore;
        this.classification = classification;
        this.costEfficiencyScore = costEfficiencyScore;
        this.tokenEfficiencyScore = tokenEfficiencyScore;
        this.toolEfficiencyScore = toolEfficiencyScore;
        this.modelCallEfficiencyScore = modelCallEfficiencyScore;
        this.latencyEfficiencyScore = latencyEfficiencyScore;
        this.retryEfficiencyScore = retryEfficiencyScore;
        this.autonomyEfficiencyScore = autonomyEfficiencyScore;
        this.estimatedCostReductionUsd = estimatedCostReductionUsd;
        this.estimatedSavingsPercent = estimatedSavingsPercent;
    }

    @PrePersist
    void prePersist() {
        analyzedAt = Instant.now();
    }

    public void addFinding(FindingEntity finding) {
        finding.attachTo(this);
        findings.add(finding);
    }

    public void addRecommendation(RecommendationEntity recommendation) {
        recommendation.attachTo(this);
        recommendations.add(recommendation);
    }

    public UUID getId() {
        return id;
    }

    public ExecutionRunEntity getExecutionRun() {
        return executionRun;
    }

    public int getBalanceScore() {
        return balanceScore;
    }

    public AnalysisClassification getClassification() {
        return classification;
    }

    public int getCostEfficiencyScore() {
        return costEfficiencyScore;
    }

    public int getTokenEfficiencyScore() {
        return tokenEfficiencyScore;
    }

    public int getToolEfficiencyScore() {
        return toolEfficiencyScore;
    }

    public int getModelCallEfficiencyScore() {
        return modelCallEfficiencyScore;
    }

    public int getLatencyEfficiencyScore() {
        return latencyEfficiencyScore;
    }

    public int getRetryEfficiencyScore() {
        return retryEfficiencyScore;
    }

    public int getAutonomyEfficiencyScore() {
        return autonomyEfficiencyScore;
    }

    public BigDecimal getEstimatedCostReductionUsd() {
        return estimatedCostReductionUsd;
    }

    public BigDecimal getEstimatedSavingsPercent() {
        return estimatedSavingsPercent;
    }

    public Instant getAnalyzedAt() {
        return analyzedAt;
    }

    public List<FindingEntity> getFindings() {
        return Collections.unmodifiableList(findings);
    }

    public List<RecommendationEntity> getRecommendations() {
        return Collections.unmodifiableList(recommendations);
    }
}
