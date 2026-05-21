import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { db } from '../services/db';
import { useLabs } from '../context/LabsContext';
import ReactDOM from 'react-dom';

export default function Navbar() {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLabsOpen, setIsLabsOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const { labs, toggleLab } = useLabs();
  const labsRef = useRef(null);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  // Click outside to close the Labs dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (labsRef.current && !labsRef.current.contains(event.target)) {
        setIsLabsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleLogout = async () => {
    dispatch(logout());
    await db.tasks.clear(); // Clear local cache database on logout for security
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <span>Ascent</span>
      </div>
      
      <div className="nav-actions">
        {/* Labs Feature Toggle Button */}
        <div className="labs-container" ref={labsRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsLabsOpen(!isLabsOpen)} 
            className={`theme-toggle-btn labs-btn ${isLabsOpen ? 'active' : ''}`}
            title="Ascent Labs Feature Center" 
            aria-label="Ascent Labs Feature Center"
            style={{ marginRight: '8px', color: isLabsOpen ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            {/* Premium Sparkles Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isLabsOpen ? 'rotate(15deg) scale(1.1)' : 'none', transition: 'transform 0.2s ease' }}>
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m10.656 10.657l.707.707" stroke="var(--primary)" opacity="0.3" />
              <path d="M5 3L5.5 4.5L7 5L5.5 5.5L5 7L4.5 5.5L3 5L4.5 4.5L5 3Z" fill="var(--primary)" stroke="none" />
              <path d="M19 17L19.5 18.5L21 19L19.5 19.5L19 21L18.5 19.5L17 19L18.5 18.5L19 17Z" fill="var(--primary)" stroke="none" />
              <path d="M12 7l1.5 3.5L17 12l-3.5 1.5L12 17l-1.5-3.5L7 12l3.5-1.5L12 7Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
          
          {isLabsOpen && (
            <div className="glass-panel labs-dropdown">
              <div className="labs-header">
                <h4>🧪 Ascent Labs</h4>
                <p>Experiment with cutting-edge productivity features.</p>
              </div>
              <div className="labs-body">
                <div className="labs-section">
                  <h5>Date & Time</h5>
                  <div className="lab-item">
                    <span className="lab-name">Natural Language Parsing</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.nlp} onChange={() => toggleLab('nlp')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Smart Time Presets</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.presets} onChange={() => toggleLab('presets')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Dynamic Timezone Selector</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.timezone} onChange={() => toggleLab('timezone')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Glow Heatmap on Calendar</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.heatmap} onChange={() => toggleLab('heatmap')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="labs-section">
                  <h5>Task & Deadline UX</h5>
                  <div className="lab-item">
                    <span className="lab-name">Multiple Reminder Windows</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.reminders} onChange={() => toggleLab('reminders')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Advanced Recurrence Builder</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.recurrence} onChange={() => toggleLab('recurrence')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Urgency Color Halos</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.halos} onChange={() => toggleLab('halos')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Estimated Effort / Pomodoro</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.pomodoro} onChange={() => toggleLab('pomodoro')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="labs-section">
                  <h5>Visual & Layouts</h5>
                  <div className="lab-item">
                    <span className="lab-name">Kanban Board Switcher</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.kanban} onChange={() => toggleLab('kanban')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Gantt / Timeline View</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.gantt} onChange={() => toggleLab('gantt')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Zen Focus Mode</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.zen} onChange={() => toggleLab('zen')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="labs-section">
                  <h5>AI Productivity</h5>
                  <div className="lab-item">
                    <span className="lab-name">Auto-Subtask Breakdown</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.aiSubtasks} onChange={() => toggleLab('aiSubtasks')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Smart Schedule Recommender</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.aiScheduler} onChange={() => toggleLab('aiScheduler')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="labs-section">
                  <h5>Collaborative Sync</h5>
                  <div className="lab-item">
                    <span className="lab-name">Local P2P Sync (WebRTC)</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.p2p} onChange={() => toggleLab('p2p')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Conflict Visualizer Simulation</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.conflictVisualizer} onChange={() => toggleLab('conflictVisualizer')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Local Offline Attachments</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.attachments} onChange={() => toggleLab('attachments')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="labs-section">
                  <h5>Micro-Interactions</h5>
                  <div className="lab-item">
                    <span className="lab-name">Habit Streak Wheels</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.habitStreaks} onChange={() => toggleLab('habitStreaks')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Audio Soundscapes</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.soundscapes} onChange={() => toggleLab('soundscapes')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="labs-section">
                  <h5>Focus & Wellness (AI/UX)</h5>
                  <div className="lab-item">
                    <span className="lab-name">Energy-Level Tagging</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.energyLevelTagging} onChange={() => toggleLab('energyLevelTagging')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Energy/Focus Soundscapes</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.focusSoundscapes} onChange={() => toggleLab('focusSoundscapes')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Time-Boxing Blocks</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.timeBoxing} onChange={() => toggleLab('timeBoxing')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="labs-section">
                  <h5>Gamification RPG</h5>
                  <div className="lab-item">
                    <span className="lab-name">Productivity RPG Tracker</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.productivityRpg} onChange={() => toggleLab('productivityRpg')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Streaks & Achievements</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.achievements} onChange={() => toggleLab('achievements')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Leaderboards Integration</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.leaderboards} onChange={() => toggleLab('leaderboards')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="labs-section">
                  <h5>AI Product Enhancements</h5>
                  <div className="lab-item">
                    <span className="lab-name">Smart Auto-Tagging</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.smartAutoTagging} onChange={() => toggleLab('smartAutoTagging')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Predictive Completion Delays</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.predictiveDelays} onChange={() => toggleLab('predictiveDelays')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Voice Task Input</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.voiceTaskInput} onChange={() => toggleLab('voiceTaskInput')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="labs-section">
                  <h5>Advanced Analytics</h5>
                  <div className="lab-item">
                    <span className="lab-name">Cumulative Flow Diagrams</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.flowDiagrams} onChange={() => toggleLab('flowDiagrams')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Productivity Heatmap</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.productivityHeatmap} onChange={() => toggleLab('productivityHeatmap')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Velocity Tracking Charts</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.velocityTracking} onChange={() => toggleLab('velocityTracking')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="labs-section">
                  <h5>Collaboration & Security</h5>
                  <div className="lab-item">
                    <span className="lab-name">End-to-End Encryption (E2EE)</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.e2ee} onChange={() => toggleLab('e2ee')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Dynamic Guest Access</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.guestAccess} onChange={() => toggleLab('guestAccess')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="lab-item">
                    <span className="lab-name">Collaborative Whiteboards</span>
                    <label className="switch">
                      <input type="checkbox" checked={labs.collaborativeWhiteboard} onChange={() => toggleLab('collaborativeWhiteboard')} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RPG Level Tracker */}
        {labs.productivityRpg && (
          <div className="rpg-badge" style={{ marginRight: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>🧙 Lvl {localStorage.getItem('ascent_rpg_level') || 3} Knight</span>
              <span>{localStorage.getItem('ascent_rpg_xp') || 120} / 300 XP</span>
            </div>
            <div className="xp-bar-container">
              <div className="xp-bar-fill" style={{ width: `${((parseInt(localStorage.getItem('ascent_rpg_xp') || 120) / 300) * 100)}%` }}></div>
            </div>
          </div>
        )}

        {/* Achievements Modal Trigger */}
        {labs.achievements && (
          <button 
            onClick={() => setIsAchievementsOpen(!isAchievementsOpen)}
            className="theme-toggle-btn" 
            title="View Achievements" 
            style={{ marginRight: '8px', color: 'var(--warning)' }}
          >
            🏆
          </button>
        )}

        {/* Theme Toggle Button */}
        <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle dark/light mode" aria-label="Toggle dark/light mode">
          {isDarkMode ? (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m10.656 10.657l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {user && (
          <>
            <span className="user-email">{user.email}</span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              Logout
            </button>
          </>
        )}
      </div>

      {/* Achievements Overlay Popover */}
      {isAchievementsOpen && ReactDOM.createPortal(
        <div className="whiteboard-overlay" onClick={() => setIsAchievementsOpen(false)}>
          <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>🏆 Unlocked Achievements</h2>
              <button onClick={() => setIsAchievementsOpen(false)} className="action-btn">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <div className="achievement-badge-card">
                <div className="achievement-icon">🔥</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--primary)' }}>10-Day Streak (Active)</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Completed tasks 10 days in a row.</p>
                </div>
              </div>
              <div className="achievement-badge-card">
                <div className="achievement-icon">🦉</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--primary)' }}>Night Owl</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Completed a task past midnight.</p>
                </div>
              </div>
              <div className="achievement-badge-card" style={{ opacity: 0.6 }}>
                <div className="achievement-icon">🚀</div>
                <div>
                  <h4 style={{ margin: 0 }}>Task Crusher (Locked)</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Complete 50 tasks to unlock.</p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}

