package com.meden.lens.analysis.infrastructure;

import com.meden.lens.analysis.domain.AnalysisEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnalysisRepository extends JpaRepository<AnalysisEntity, UUID> {

    Optional<AnalysisEntity> findByExecutionRunId(UUID executionRunId);

    @Query("""
        select analysis
        from AnalysisEntity analysis
        join fetch analysis.executionRun run
        where run.id in :executionRunIds
        """)
    List<AnalysisEntity> findByExecutionRunIds(@Param("executionRunIds") Collection<UUID> executionRunIds);
}
