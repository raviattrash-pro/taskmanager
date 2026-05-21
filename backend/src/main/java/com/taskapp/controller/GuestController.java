package com.taskapp.controller;

import com.taskapp.dto.TaskDto;
import com.taskapp.entity.Task;
import com.taskapp.entity.User;
import com.taskapp.repository.TaskRepository;
import com.taskapp.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/guest")
public class GuestController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public GuestController(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/share/{token}")
    public ResponseEntity<List<TaskDto>> getSharedTasks(@PathVariable String token) {
        Optional<User> userOpt = userRepository.findByShareToken(token);
        if (userOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        User user = userOpt.get();
        List<Task> tasks = taskRepository.findByUserAndDeletedFalseOrderByDueDateAsc(user);
        List<TaskDto> dtos = new ArrayList<>();
        for (Task task : tasks) {
            dtos.add(convertToDto(task));
        }
        return ResponseEntity.ok(dtos);
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
