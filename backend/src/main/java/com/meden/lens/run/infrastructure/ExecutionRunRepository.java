package com.meden.lens.run.infrastructure;

import com.meden.lens.run.domain.ExecutionRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ExecutionRunRepository extends JpaRepository<ExecutionRunEntity, UUID> {

    Optional<ExecutionRunEntity> findById(UUID id);

    Optional<ExecutionRunEntity> findByIdempotencyKey(String idempotencyKey);
}
