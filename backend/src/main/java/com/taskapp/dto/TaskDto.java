package com.taskapp.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskDto {
    private String id;
    private String title;
    private String description;
    private boolean completed;
    private LocalDateTime dueDate;
    private boolean deleted;
    private LocalDateTime updatedAt;
}
