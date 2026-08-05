package com.meden.lens.analysis.infrastructure;

import com.meden.lens.analysis.domain.AnalysisEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AnalysisRepository extends JpaRepository<AnalysisEntity, UUID> {

    Optional<AnalysisEntity> findByExecutionRunId(UUID executionRunId);
}
