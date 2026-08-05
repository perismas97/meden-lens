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
@Table(name = "findings")
public class FindingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private AnalysisEntity analysis;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 80)
    private FindingCode code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Severity severity;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "actual_value", length = 120)
    private String actualValue;

    @Column(name = "expected_value", length = 120)
    private String expectedValue;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    protected FindingEntity() {
    }

    public FindingEntity(
        FindingCode code,
        Severity severity,
        String message,
        String actualValue,
        String expectedValue,
        String explanation
    ) {
        this.code = code;
        this.severity = severity;
        this.message = message;
        this.actualValue = actualValue;
        this.expectedValue = expectedValue;
        this.explanation = explanation;
    }

    void attachTo(AnalysisEntity analysis) {
        this.analysis = analysis;
    }

    public UUID getId() {
        return id;
    }

    public FindingCode getCode() {
        return code;
    }

    public Severity getSeverity() {
        return severity;
    }

    public String getMessage() {
        return message;
    }

    public String getActualValue() {
        return actualValue;
    }

    public String getExpectedValue() {
        return expectedValue;
    }

    public String getExplanation() {
        return explanation;
    }
}
