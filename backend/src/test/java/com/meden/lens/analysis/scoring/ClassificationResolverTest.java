package com.meden.lens.analysis.scoring;

import com.meden.lens.analysis.domain.AnalysisClassification;
import com.meden.lens.analysis.domain.FindingCode;
import com.meden.lens.analysis.domain.FindingEntity;
import com.meden.lens.analysis.domain.Severity;
import com.meden.lens.run.domain.ExecutionStatus;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ClassificationResolverTest {

    private final ClassificationResolver resolver = new ClassificationResolver();

    @Test
    void resolvesBaseClassificationFromBalanceScore() {
        assertThat(resolver.resolve(90, ExecutionStatus.SUCCESS, List.of()))
            .isEqualTo(AnalysisClassification.PROPORTIONAL);
        assertThat(resolver.resolve(72, ExecutionStatus.SUCCESS, List.of()))
            .isEqualTo(AnalysisClassification.ACCEPTABLE);
        assertThat(resolver.resolve(55, ExecutionStatus.SUCCESS, List.of()))
            .isEqualTo(AnalysisClassification.SLIGHTLY_EXCESSIVE);
        assertThat(resolver.resolve(35, ExecutionStatus.SUCCESS, List.of()))
            .isEqualTo(AnalysisClassification.DISPROPORTIONATE);
        assertThat(resolver.resolve(16, ExecutionStatus.SUCCESS, List.of()))
            .isEqualTo(AnalysisClassification.HIGHLY_DISPROPORTIONATE);
    }

    @Test
    void capsClassificationWhenCriticalFindingExists() {
        FindingEntity criticalFinding = new FindingEntity(
            FindingCode.COST_DISPROPORTIONATE_TO_TASK,
            Severity.CRITICAL,
            "Cost is too high.",
            "1.0000",
            "0.1000",
            null
        );

        assertThat(resolver.resolve(90, ExecutionStatus.SUCCESS, List.of(criticalFinding)))
            .isEqualTo(AnalysisClassification.DISPROPORTIONATE);
    }

    @Test
    void capsClassificationWhenRunFailed() {
        assertThat(resolver.resolve(90, ExecutionStatus.FAILED, List.of()))
            .isEqualTo(AnalysisClassification.SLIGHTLY_EXCESSIVE);
    }
}
