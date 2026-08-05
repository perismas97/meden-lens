package com.meden.lens.taskprofile.infrastructure;

import com.meden.lens.taskprofile.domain.TaskProfileEntity;
import com.meden.lens.taskprofile.domain.TaskType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TaskProfileRepository extends JpaRepository<TaskProfileEntity, UUID> {

    Optional<TaskProfileEntity> findByTaskType(TaskType taskType);
}
