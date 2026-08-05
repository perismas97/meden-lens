package com.meden.lens.analysis.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "recommendations")
public class RecommendationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private AnalysisEntity analysis;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 80)
    private RecommendationCode code;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "estimated_impact", nullable = false, length = 32)
    private EstimatedImpact estimatedImpact;

    @Enumerated(EnumType.STRING)
    @Column(name = "related_finding_code", length = 80)
    private FindingCode relatedFindingCode;

    protected RecommendationEntity() {
    }

    public RecommendationEntity(
        RecommendationCode code,
        String message,
        EstimatedImpact estimatedImpact,
        FindingCode relatedFindingCode
    ) {
        this.code = code;
        this.message = message;
        this.estimatedImpact = estimatedImpact;
        this.relatedFindingCode = relatedFindingCode;
    }

    void attachTo(AnalysisEntity analysis) {
        this.analysis = analysis;
    }

    public UUID getId() {
        return id;
    }

    public RecommendationCode getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public EstimatedImpact getEstimatedImpact() {
        return estimatedImpact;
    }

    public FindingCode getRelatedFindingCode() {
        return relatedFindingCode;
    }
}
