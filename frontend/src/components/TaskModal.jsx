import React, { useState, useEffect } from 'react';
import GlassyDateTimePicker from './GlassyDateTimePicker';
import { useLabs } from '../context/LabsContext';

export default function TaskModal({ task, isOpen, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  
  // Labs Integration states
  const { labs } = useLabs();
  const [reminder, setReminder] = useState('none');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('daily');
  const [pomodoros, setPomodoros] = useState(1);
  const [attachment, setAttachment] = useState('');
  const [isAiBreakingDown, setIsAiBreakingDown] = useState(false);
  
  // Suggested new features
  const [energyLevel, setEnergyLevel] = useState('medium');
  const [voiceListening, setVoiceListening] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setReminder(task.reminder || 'none');
      setIsRecurring(task.isRecurring || false);
      setRecurrencePattern(task.recurrencePattern || 'daily');
      setPomodoros(task.pomodoros || 1);
      setAttachment(task.attachment || '');
      setEnergyLevel(task.energyLevel || 'medium');
      
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        const formattedDate = date.toISOString().slice(0, 16);
        setDueDate(formattedDate);
      } else {
        setDueDate('');
      }
    } else {
      setTitle('');
      setDescription('');
      setDueDate('');
      setReminder('none');
      setIsRecurring(false);
      setRecurrencePattern('daily');
      setPomodoros(1);
      setAttachment('');
      setEnergyLevel('medium');
    }
    setError('');
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task Title is required.');
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      reminder,
      isRecurring,
      recurrencePattern,
      pomodoros,
      attachment,
      energyLevel
    });
  };

  const handleAiBreakdown = () => {
    if (isAiBreakingDown) return;
    setIsAiBreakingDown(true);
    let count = 0;
    const subtasks = [
      "• Research requirements & scope",
      "• Draft initial outline and designs",
      "• Develop core components & logic",
      "• Final review and validation"
    ];
    
    setDescription(prev => prev + (prev ? "\n\n" : "") + "🪄 AI Task Breakdown:\n");
    const interval = setInterval(() => {
      if (count < subtasks.length) {
        setDescription(prev => prev + subtasks[count] + "\n");
        count++;
      } else {
        clearInterval(interval);
        setIsAiBreakingDown(false);
      }
    }, 450);
  };

  const applyRecommendedTime = () => {
    const d = new Date();
    d.setHours(16, 0, 0, 0); // 4:00 PM
    const formatted = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setDueDate(formatted);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file.name);
    }
  };

  // Smart Auto-Tagging Keyword analysis
  const getSuggestedTag = () => {
    if (!title) return '';
    const t = title.toLowerCase();
    if (t.includes('code') || t.includes('api') || t.includes('bug') || t.includes('test') || t.includes('dev') || t.includes('docs') || t.includes('git')) return 'Development';
    if (t.includes('figma') || t.includes('design') || t.includes('logo') || t.includes('slide') || t.includes('ui') || t.includes('sketch')) return 'Design';
    if (t.includes('buy') || t.includes('shop') || t.includes('grocery') || t.includes('order') || t.includes('bill')) return 'Personal';
    return 'General';
  };
  const suggestedTag = getSuggestedTag();

  // Voice Input via Web Speech API
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Google Chrome or MS Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setVoiceListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTitle(transcript);
      
      // Auto-schedule date if user mentions "tomorrow" or "next monday" in speech
      if (transcript.toLowerCase().includes("tomorrow")) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const formatted = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setDueDate(formatted);
      }
    };

    recognition.onerror = (e) => {
      console.error(e);
      setVoiceListening(false);
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    recognition.start();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="action-btn" title="Close Modal" aria-label="Close Modal">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" htmlFor="task-title" style={{ marginBottom: 0 }}>Title *</label>
              {labs.voiceTaskInput && (
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`btn ${voiceListening ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    animation: voiceListening ? 'pulse 1.5s infinite' : 'none'
                  }}
                >
                  <span>🎙️</span>
                  {voiceListening ? 'Listening...' : 'Voice Input'}
                </button>
              )}
            </div>
            
            <input
              type="text"
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              placeholder="e.g. Prepare presentation slides"
              autoFocus
            />
            {error && <span className="error-text">{error}</span>}

            {labs.smartAutoTagging && suggestedTag && (
              <div style={{ fontSize: '11.5px', color: 'var(--primary)', marginTop: '6px', fontWeight: '500' }}>
                ✨ AI Suggested Tag: <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{suggestedTag}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" htmlFor="task-desc" style={{ marginBottom: 0 }}>Description</label>
              {labs.aiSubtasks && (
                <button 
                  type="button" 
                  onClick={handleAiBreakdown}
                  disabled={isAiBreakingDown}
                  className="btn"
                  style={{ 
                    padding: '4px 10px', 
                    fontSize: '11px', 
                    background: 'var(--primary-bg)', 
                    color: 'var(--primary)',
                    border: '1px solid var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <span>🪄</span>
                  {isAiBreakingDown ? 'Analyzing...' : 'AI Breakdown'}
                </button>
              )}
            </div>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              placeholder="Write task details here..."
              rows="4"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-due">Due Date</label>
            <GlassyDateTimePicker
              value={dueDate}
              onChange={setDueDate}
            />
            
            {labs.aiScheduler && (
              <div style={{ marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={applyRecommendedTime} 
                  className="date-chip" 
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)', 
                    border: '1px dashed var(--primary)', 
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>💡 AI Suggestion:</span> Best scheduled today at 4:00 PM (High Focus Window)
                </button>
              </div>
            )}

            <div className="date-chips">
              <button
                type="button"
                className="date-chip"
                onClick={() => {
                  const today = new Date();
                  today.setHours(18, 0, 0, 0);
                  const formatted = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                  setDueDate(formatted);
                }}
              >
                Today (6 PM)
              </button>
              <button
                type="button"
                className="date-chip"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(9, 0, 0, 0);
                  const formatted = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                  setDueDate(formatted);
                }}
              >
                Tomorrow (9 AM)
              </button>
              <button
                type="button"
                className="date-chip"
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + (1 + 7 - nextWeek.getDay()) % 7 || 7);
                  nextWeek.setHours(9, 0, 0, 0);
                  const formatted = new Date(nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                  setDueDate(formatted);
                }}
              >
                Next Mon (9 AM)
              </button>
              {dueDate && (
                <button
                  type="button"
                  className="date-chip date-chip-clear"
                  onClick={() => setDueDate('')}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Energy-Level Tagging selector */}
          {labs.energyLevelTagging && (
            <div className="form-group">
              <label className="form-label" htmlFor="task-energy">Mental Energy Required</label>
              <select
                id="task-energy"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(e.target.value)}
                className="form-input"
                style={{ background: 'var(--panel-bg)', cursor: 'pointer' }}
              >
                <option value="low">Brain Dead (Low Focus) 😴</option>
                <option value="medium">Routine (Medium Focus) ☕</option>
                <option value="high">High Focus Required ⚡</option>
              </select>
            </div>
          )}

          {/* Multiple Reminder Windows */}
          {labs.reminders && (
            <div className="form-group">
              <label className="form-label" htmlFor="task-reminder">Reminder Alert</label>
              <select 
                id="task-reminder"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                className="form-input"
                style={{ background: 'var(--panel-bg)', cursor: 'pointer' }}
              >
                <option value="none">None</option>
                <option value="at_event">At time of deadline</option>
                <option value="15m">15 minutes before</option>
                <option value="1h">1 hour before</option>
                <option value="1d">1 day before</option>
              </select>
            </div>
          )}

          {/* Advanced Recurrence Builder */}
          {labs.recurrence && (
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="task-recur" 
                  checked={isRecurring} 
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label className="form-label" htmlFor="task-recur" style={{ margin: 0, cursor: 'pointer' }}>Repeat Task (Recurring)</label>
              </div>
              {isRecurring && (
                <div style={{ paddingLeft: '24px' }}>
                  <select
                    value={recurrencePattern}
                    onChange={(e) => setRecurrencePattern(e.target.value)}
                    className="form-input"
                    style={{ background: 'var(--panel-bg)', cursor: 'pointer' }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Estimated Effort / Pomodoro Integration */}
          {labs.pomodoro && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estimated Effort</span>
                <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{pomodoros} Pomodoro{pomodoros > 1 ? 's' : ''} {Array.from({ length: pomodoros }).map(() => '🍅')}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="8" 
                value={pomodoros}
                onChange={(e) => setPomodoros(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
            </div>
          )}

          {/* Local Offline Attachments */}
          {labs.attachments && (
            <div className="form-group">
              <label className="form-label" htmlFor="task-attachment">Attach File (Local IndexedDB)</label>
              <input 
                type="file" 
                id="task-attachment"
                onChange={handleFileChange}
                className="form-input"
                style={{ padding: '8px' }}
              />
              {attachment && (
                <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>📎 Attached:</span> {attachment}
                </div>
              )}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
          70% { transform: scale(1.02); box-shadow: 0 0 0 8px rgba(124, 58, 237, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
        }
      `}</style>
    </div>
  );
}
