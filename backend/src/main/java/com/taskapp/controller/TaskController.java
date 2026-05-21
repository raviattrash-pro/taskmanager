package com.taskapp.controller;

import com.taskapp.dto.SyncRequest;
import com.taskapp.dto.SyncResponse;
import com.taskapp.dto.TaskDto;
import com.taskapp.entity.Task;
import com.taskapp.entity.User;
import com.taskapp.repository.TaskRepository;
import com.taskapp.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskController(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<TaskDto>> getActiveTasks(@AuthenticationPrincipal UserDetails userDetails) {
        User user = getUserFromUserDetails(userDetails);
        List<Task> tasks = taskRepository.findByUserAndDeletedFalseOrderByDueDateAsc(user);
        List<TaskDto> dtos = new ArrayList<>();
        for (Task task : tasks) {
            dtos.add(convertToDto(task));
        }
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    public ResponseEntity<TaskDto> createTask(@AuthenticationPrincipal UserDetails userDetails, @RequestBody TaskDto taskDto) {
        User user = getUserFromUserDetails(userDetails);
        
        String taskId = taskDto.getId();
        if (taskId == null || taskId.trim().isEmpty()) {
            taskId = java.util.UUID.randomUUID().toString();
        }

        Task task = Task.builder()
                .id(taskId)
                .user(user)
                .title(taskDto.getTitle())
                .description(taskDto.getDescription())
                .completed(taskDto.isCompleted())
                .dueDate(taskDto.getDueDate())
                .deleted(false)
                .build();

        Task savedTask = taskRepository.save(task);
        return new ResponseEntity<>(convertToDto(savedTask), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskDto> updateTask(@AuthenticationPrincipal UserDetails userDetails, @PathVariable String id, @RequestBody TaskDto taskDto) {
        User user = getUserFromUserDetails(userDetails);
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!task.getUser().getId().equals(user.getId())) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }

        task.setTitle(taskDto.getTitle());
        task.setDescription(taskDto.getDescription());
        task.setCompleted(taskDto.isCompleted());
        task.setDueDate(taskDto.getDueDate());
        
        Task updatedTask = taskRepository.save(task);
        return ResponseEntity.ok(convertToDto(updatedTask));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@AuthenticationPrincipal UserDetails userDetails, @PathVariable String id) {
        User user = getUserFromUserDetails(userDetails);
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!task.getUser().getId().equals(user.getId())) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }

        // Soft delete so that offline clients can sync this deletion
        task.setDeleted(true);
        taskRepository.save(task);
        return ResponseEntity.noContent().build();
    }

    // Task Offline Synchronization Sync Endpoint
    @PostMapping("/sync")
    public ResponseEntity<SyncResponse> syncTasks(@AuthenticationPrincipal UserDetails userDetails, @RequestBody SyncRequest syncRequest) {
        User user = getUserFromUserDetails(userDetails);
        LocalDateTime clientLastSync = syncRequest.getLastSyncTime();
        LocalDateTime serverSyncTime = LocalDateTime.now();

        // 1. Process client's offline / unsynced changes
        if (syncRequest.getLocalChanges() != null) {
            for (TaskDto localDto : syncRequest.getLocalChanges()) {
                Optional<Task> existingTaskOpt = taskRepository.findById(localDto.getId());

                if (existingTaskOpt.isPresent()) {
                    Task existingTask = existingTaskOpt.get();
                    
                    // Ownership verification
                    if (!existingTask.getUser().getId().equals(user.getId())) {
                        continue; // Skip changes on tasks not owned by the current user
                    }

                    if (localDto.isDeleted()) {
                        existingTask.setDeleted(true);
                    } else {
                        existingTask.setTitle(localDto.getTitle());
                        existingTask.setDescription(localDto.getDescription());
                        existingTask.setCompleted(localDto.isCompleted());
                        existingTask.setDueDate(localDto.getDueDate());
                    }
                    taskRepository.save(existingTask);
                } else {
                    // Task does not exist on server yet
                    if (!localDto.isDeleted()) {
                        Task newTask = Task.builder()
                                .id(localDto.getId())
                                .user(user)
                                .title(localDto.getTitle())
                                .description(localDto.getDescription())
                                .completed(localDto.isCompleted())
                                .dueDate(localDto.getDueDate())
                                .deleted(false)
                                .build();
                        taskRepository.save(newTask);
                    }
                }
            }
        }

        // 2. Fetch server changes since client last synced
        List<TaskDto> serverChanges = new ArrayList<>();
        if (clientLastSync != null) {
            List<Task> updatedTasks = taskRepository.findByUserAndUpdatedAtAfter(user, clientLastSync);
            for (Task task : updatedTasks) {
                serverChanges.add(convertToDto(task));
            }
        } else {
            // First time syncing, send all tasks
            List<Task> allTasks = taskRepository.findByUser(user);
            for (Task task : allTasks) {
                serverChanges.add(convertToDto(task));
            }
        }

        return ResponseEntity.ok(SyncResponse.builder()
                .serverSyncTime(serverSyncTime)
                .serverChanges(serverChanges)
                .build());
    }

    @PostMapping("/share")
    public ResponseEntity<Void> registerShareToken(@AuthenticationPrincipal UserDetails userDetails, @RequestParam String token) {
        User user = getUserFromUserDetails(userDetails);
        user.setShareToken(token);
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }

    private User getUserFromUserDetails(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private TaskDto convertToDto(Task task) {
        return TaskDto.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .completed(task.isCompleted())
                .dueDate(task.getDueDate())
                .deleted(task.isDeleted())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
