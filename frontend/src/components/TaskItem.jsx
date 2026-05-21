import React from 'react';
import { useLabs } from '../context/LabsContext';

export default function TaskItem({ task, onToggle, onEdit, onDelete, onZen, onWhiteboard }) {
  const { labs } = useLabs();

  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const checkOverdue = (dateString) => {
    if (!dateString || task.completed) return false;
    return new Date(dateString) < new Date();
  };

  const checkCloseDeadline = () => {
    if (!task.dueDate || task.completed) return false;
    const diff = new Date(task.dueDate) - new Date();
    return diff > 0 && diff <= 3600000; // 1 hour in ms
  };

  const isOverdue = checkOverdue(task.dueDate);
  const isUrgent = checkCloseDeadline();

  // Simulated AI delay analysis
  const getDelayPrediction = () => {
    if (task.completed) return null;
    const titleLen = task.title.length;
    const poms = task.pomodoros || 1;
    const percent = Math.min(Math.round((titleLen * 0.4) + (poms * 8)), 92);
    return percent;
  };
  const delayPercent = getDelayPrediction();

  return (
    <div className={`glass-panel task-card ${task.completed ? 'completed' : ''} ${labs.halos && isUrgent ? 'urgency-halo' : ''}`}>
      <div className="task-checkbox-container">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id, task.completed)}
          className="task-checkbox"
          title="Toggle completion status"
          aria-label="Toggle completion status"
        />
      </div>

      <div className="task-content">
        <h3 className="task-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</span>
          
          {labs.pomodoro && task.pomodoros > 0 && !task.completed && (
            <span style={{ fontSize: '11px', display: 'flex', gap: '1px', opacity: 0.85 }} title={`${task.pomodoros} Pomodoro effort`}>
              {Array.from({ length: task.pomodoros }).map((_, i) => (
                <span key={i}>🍅</span>
              ))}
            </span>
          )}

          {labs.habitStreaks && task.isRecurring && !task.completed && (
            <span className="streak-badge" style={{ 
              fontSize: '10px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              padding: '1px 6px', 
              borderRadius: '10px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '2px',
              fontWeight: '600'
            }}>
              🔥 5d Streak
            </span>
          )}

          {/* Energy level tagging badge */}
          {labs.energyLevelTagging && task.energyLevel && !task.completed && (
            <span className={`energy-tag ${task.energyLevel}`}>
              {task.energyLevel === 'high' ? '⚡ High Focus' : task.energyLevel === 'medium' ? '☕ Routine' : '😴 Brain Dead'}
            </span>
          )}
        </h3>

        {task.description && <p className="task-desc">{task.description}</p>}
        
        {/* AI Predictive Delay warnings */}
        {labs.predictiveDelays && delayPercent && !task.completed && (
          <div style={{ fontSize: '11px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: '500' }}>
            <span>⚠️ AI Predicts:</span> {delayPercent}% Completion Delay Risk
          </div>
        )}

        <div className="task-meta">
          {task.dueDate && (
            <div className={`task-date ${isOverdue ? 'overdue' : ''}`}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDueDate(task.dueDate)} {isOverdue && '(Overdue)'}
            </div>
          )}

          {labs.reminders && task.reminder && task.reminder !== 'none' && (
            <span className="task-meta-tag" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <span>🔔</span> Alert Set
            </span>
          )}

          {labs.attachments && task.attachment && (
            <span className="task-meta-tag" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }} title={task.attachment}>
              <span>📎</span> {task.attachment.length > 15 ? `${task.attachment.slice(0, 12)}...` : task.attachment}
            </span>
          )}

          {/* Sync Status Badge (AES Lock icon if E2EE active) */}
          {task.synced === 0 ? (
            <span className="task-sync-badge pending">
              {labs.e2ee ? '🔒 E2EE Local' : 'Local Draft'}
            </span>
          ) : (
            <span className="task-sync-badge synced">
              {labs.e2ee ? '🔒 E2EE Synced' : 'Cloud Synced'}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        {/* Collaborative Whiteboard button */}
        {labs.collaborativeWhiteboard && (
          <button onClick={() => onWhiteboard(task)} className="action-btn" title="Open Draw Whiteboard" style={{ color: 'var(--primary)' }}>
            🎨
          </button>
        )}

        {labs.zen && !task.completed && (
          <button onClick={() => onZen(task)} className="action-btn zen-btn" title="Start Zen Focus Session" aria-label="Start Zen Focus Session" style={{ color: 'var(--primary)' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
            </svg>
          </button>
        )}

        <button onClick={() => onEdit(task)} className="action-btn" title="Edit Task" aria-label="Edit Task">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button onClick={() => onDelete(task.id)} className="action-btn delete-btn" title="Delete Task" aria-label="Delete Task">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
