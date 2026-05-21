import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/db';
import api from '../services/api';

export default function GuestView() {
  const { token } = useParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        // Try fetching shared tasks from the server database
        const response = await api.get(`/guest/share/${token}`);
        if (response.data && Array.isArray(response.data)) {
          setTasks(response.data.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
          }));
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Server guest fetch failed, trying local IndexedDB fallback...', err);
      }

      try {
        const allTasks = await db.tasks.toArray();
        const localTasks = allTasks.filter(t => t.deleted !== 1);
        setTasks(localTasks.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        }));
      } catch (err) {
        console.error('Error fetching local tasks for guest:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [token]);

  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="dashboard-container" style={{ minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="nav-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          <span>Ascent</span>
          <span style={{ fontSize: '11px', background: 'var(--primary-bg)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', marginLeft: '10px', fontWeight: 'bold' }}>
            Guest Portal
          </span>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}>
            Log In to Edit
          </Link>
        </div>
      </nav>

      <main className="main-content" style={{ maxWidth: '800px', margin: '40px auto' }}>
        <div className="task-header" style={{ marginBottom: '30px' }}>
          <div>
            <h2>📋 Shared Task Board</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
              Viewing read-only snapshot shared via token <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{token}</code>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading shared board...</p></div>
        ) : tasks.length === 0 ? (
          <div className="glass-panel empty-state">
            <h3>No Shared Tasks</h3>
            <p>This user hasn't added any tasks to their board yet.</p>
          </div>
        ) : (
          <div className="task-list">
            {tasks.map(task => (
              <div key={task.id} className={`glass-panel task-card ${task.completed ? 'completed' : ''}`} style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '12px' }}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    disabled
                    className="task-checkbox"
                    style={{ cursor: 'not-allowed', opacity: 0.6 }}
                  />
                </div>
                <div className="task-content">
                  <h3 className="task-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</span>
                    {task.energyLevel && (
                      <span className={`energy-tag ${task.energyLevel}`}>
                        {task.energyLevel === 'high' ? '⚡ High Focus' : task.energyLevel === 'medium' ? '☕ Routine' : '😴 Brain Dead'}
                      </span>
                    )}
                  </h3>
                  {task.description && <p className="task-desc" style={{ opacity: 0.85 }}>{task.description}</p>}
                  
                  <div className="task-meta" style={{ marginTop: '8px' }}>
                    {task.dueDate && (
                      <div className="task-date">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDueDate(task.dueDate)}
                      </div>
                    )}
                    {task.pomodoros && (
                      <span className="task-meta-tag" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        🍅 {task.pomodoros} effort
                      </span>
                    )}
                    {task.attachment && (
                      <span className="task-meta-tag" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        📎 {task.attachment}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
