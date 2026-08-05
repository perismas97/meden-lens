package com.meden.lens.analysis.scoring;

import com.meden.lens.analysis.domain.AnalysisClassification;
import com.meden.lens.analysis.domain.FindingEntity;
import com.meden.lens.analysis.domain.Severity;
import com.meden.lens.run.domain.ExecutionStatus;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ClassificationResolver {

    public AnalysisClassification resolve(int balanceScore, ExecutionStatus status, List<FindingEntity> findings) {
        AnalysisClassification baseClassification = baseClassification(balanceScore);

        if (hasCriticalFinding(findings)) {
            baseClassification = capAt(baseClassification, AnalysisClassification.DISPROPORTIONATE);
        }

        if (status == ExecutionStatus.FAILED) {
            baseClassification = capAt(baseClassification, AnalysisClassification.SLIGHTLY_EXCESSIVE);
        }

        return baseClassification;
    }

    private AnalysisClassification baseClassification(int balanceScore) {
        if (balanceScore >= 85) {
            return AnalysisClassification.PROPORTIONAL;
        }
        if (balanceScore >= 70) {
            return AnalysisClassification.ACCEPTABLE;
        }
        if (balanceScore >= 50) {
            return AnalysisClassification.SLIGHTLY_EXCESSIVE;
        }
        if (balanceScore >= 30) {
            return AnalysisClassification.DISPROPORTIONATE;
        }
        return AnalysisClassification.HIGHLY_DISPROPORTIONATE;
    }

    private boolean hasCriticalFinding(List<FindingEntity> findings) {
        return findings.stream().anyMatch(finding -> finding.getSeverity() == Severity.CRITICAL);
    }

    private AnalysisClassification capAt(AnalysisClassification classification, AnalysisClassification cap) {
        return classification.ordinal() < cap.ordinal() ? cap : classification;
    }
}
