package com.taskapp.repository;

import com.taskapp.entity.Task;
import com.taskapp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findByUserAndDeletedFalseOrderByDueDateAsc(User user);
    
    List<Task> findByUser(User user);
    
    // Supports delta synchronization
    List<Task> findByUserAndUpdatedAtAfter(User user, LocalDateTime lastSyncTime);
}
