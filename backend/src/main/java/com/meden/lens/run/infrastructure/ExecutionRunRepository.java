package com.meden.lens.run.infrastructure;

import com.meden.lens.run.domain.ExecutionRunEntity;
import com.meden.lens.run.domain.ExecutionStatus;
import com.meden.lens.taskprofile.domain.TaskType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExecutionRunRepository extends JpaRepository<ExecutionRunEntity, UUID> {

    Optional<ExecutionRunEntity> findById(UUID id);

    Optional<ExecutionRunEntity> findByIdempotencyKey(String idempotencyKey);

    @Query("""
        select run
        from ExecutionRunEntity run
        where (:taskType is null or run.taskType = :taskType)
          and (:status is null or run.status = :status)
          and (:team is null or lower(run.team) = lower(:team))
        order by run.createdAt desc
        """)
    List<ExecutionRunEntity> findRuns(
        @Param("taskType") TaskType taskType,
        @Param("status") ExecutionStatus status,
        @Param("team") String team
    );
}
