import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { db } from '../services/db';
import { syncTasks, isBrowserOnline } from '../services/sync';
import api from '../services/api';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { setTasks, addTaskState, updateTaskState, deleteTaskState, setLoading } from '../store/taskSlice';
import { store } from '../store';
import Navbar from '../components/Navbar';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import { useLabs } from '../context/LabsContext';

// Fallback UUID generator
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function Dashboard() {
  const dispatch = useDispatch();
  const tasks = useSelector(state => state.tasks.tasks);
  const isSyncing = useSelector(state => state.tasks.syncing);
  const lastSynced = useSelector(state => state.tasks.lastSynced);
  const isLoading = useSelector(state => state.tasks.loading);
  const isOnline = useOnlineStatus();

  // Labs Config
  const { labs } = useLabs();

  // Local UI States
  const [filter, setFilter] = useState('all'); 
  const [energyFilter, setEnergyFilter] = useState('all'); // low | medium | high | all
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  // View mode
  const [view, setView] = useState('list');

  // Zen Mode states
  const [zenTask, setZenTask] = useState(null);
  const [zenTimeLeft, setZenTimeLeft] = useState(1500); 
  const [zenRunning, setZenRunning] = useState(false);
  const [zenSoundActive, setZenSoundActive] = useState(false);
  const [selectedSoundscape, setSelectedSoundscape] = useState('drone'); // drone | brown | pink | breathing
  const [breathingText, setBreathingText] = useState('Inhale (4s)');
  
  // Conflict Visualizer state
  const [isConflictOpen, setIsConflictOpen] = useState(false);

  // Dynamic Guest Access state
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [guestLink, setGuestLink] = useState('');

  // Interactive Whiteboard state
  const [whiteboardTask, setWhiteboardTask] = useState(null);
  const [brushColor, setBrushColor] = useState('#7c3ad9');
  const [brushSize, setBrushSize] = useState(5);
  const [drawing, setDrawing] = useState(false);

  // Time-boxing allocations state (dictionary mapping time-slot to task ID)
  const [timeBoxSlots, setTimeBoxSlots] = useState({
    '09:00 AM': '',
    '10:00 AM': '',
    '11:00 AM': '',
    '01:00 PM': '',
    '02:00 PM': '',
    '03:00 PM': '',
    '04:00 PM': ''
  });

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  const zenIntervalRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const noiseCtxRef = useRef(null);
  const notifiedTasksRef = useRef(new Set());

  // Breathing Visualizer Loop
  useEffect(() => {
    if (selectedSoundscape !== 'breathing' || !zenRunning) return;
    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % 4;
      if (step === 0) setBreathingText('Inhale (4s) 💨');
      else if (step === 1) setBreathingText('Hold (4s) 🧘');
      else if (step === 2) setBreathingText('Exhale (4s) 💨');
      else setBreathingText('Hold (4s) 🧘');
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedSoundscape, zenRunning]);

  // Audio Success Chime Synthesizer
  const playChime = (type) => {
    if (!labs.soundscapes) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      const now = ctx.currentTime;
      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(783.99, now + 0.12); // G5
        gain2.gain.setValueAtTime(0.15, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.4);
      } else if (type === 'click') {
        osc.frequency.setValueAtTime(880, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {
      console.warn('Audio Context block:', e);
    }
  };

  // Noise generators (synthesized programmatically)
  const startNoiseGenerator = (type) => {
    stopNoiseGenerator();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'brown') {
          // Accumulative low-pass filter
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
        } else {
          // Pink noise filter approximation
          output[i] = (white + lastOut) / 2.0;
          lastOut = white;
          output[i] *= 2.0;
        }
      }
      
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.06;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.start();
      noiseSourceRef.current = source;
      noiseCtxRef.current = ctx;
      setZenSoundActive(true);
    } catch (err) {
      console.error(err);
    }
  };

  const stopNoiseGenerator = () => {
    if (noiseSourceRef.current) {
      try { noiseSourceRef.current.stop(); } catch (e) {}
      noiseSourceRef.current = null;
    }
    if (noiseCtxRef.current) {
      try { noiseCtxRef.current.close(); } catch (e) {}
      noiseCtxRef.current = null;
    }
    setZenSoundActive(false);
  };

  // Initial Load from IndexedDB
  const loadTasksFromDb = async () => {
    dispatch(setLoading(true));
    try {
      const activeTasks = await db.tasks
        .filter(task => task.deleted === 0)
        .toArray();

      const mappedTasks = activeTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        completed: task.completed === 1,
        dueDate: task.dueDate,
        updatedAt: task.updatedAt,
        synced: task.synced,
        pendingAction: task.pendingAction,
        reminder: task.reminder,
        isRecurring: task.isRecurring === 1,
        recurrencePattern: task.recurrencePattern,
        pomodoros: task.pomodoros,
        attachment: task.attachment,
        energyLevel: task.energyLevel
      })).sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });

      dispatch(setTasks(mappedTasks));
    } catch (err) {
      console.error('Failed to load tasks from local IndexedDB:', err);
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    loadTasksFromDb();
  }, [dispatch]);

  // Task Handlers
  const handleToggleCompleted = async (id, currentCompleted) => {
    const nextCompletedVal = currentCompleted ? 0 : 1;
    const updatedAt = new Date().toISOString();

    if (nextCompletedVal === 1) {
      playChime('success');
      
      // Increment XP / Level Up
      if (labs.productivityRpg) {
        const lvl = parseInt(localStorage.getItem('ascent_rpg_level') || '3');
        const xp = parseInt(localStorage.getItem('ascent_rpg_xp') || '120');
        let nextXp = xp + 50;
        let nextLvl = lvl;
        if (nextXp >= 300) {
          nextXp -= 300;
          nextLvl += 1;
        }
        localStorage.setItem('ascent_rpg_level', nextLvl.toString());
        localStorage.setItem('ascent_rpg_xp', nextXp.toString());
        window.dispatchEvent(new Event('rpg-update'));
      }
    } else {
      playChime('click');
    }

    await db.tasks.update(id, {
      completed: nextCompletedVal,
      synced: 0,
      pendingAction: 'UPDATE',
      updatedAt
    });

    dispatch(updateTaskState({
      id,
      completed: nextCompletedVal === 1,
      synced: 0,
      pendingAction: 'UPDATE',
      updatedAt
    }));

    if (isOnline) {
      syncTasks(dispatch, store.getState);
    }
  };

  const handleManualSync = () => {
    playChime('click');
    if (isOnline) {
      syncTasks(dispatch, store.getState);
    }
  };

  const handleCreateOrEditTask = (taskToEdit = null) => {
    playChime('click');
    setEditingTask(taskToEdit);
    setModalOpen(true);
  };

  const handleSaveTask = async (taskFormData) => {
    const updatedAt = new Date().toISOString();
    playChime('success');

    if (editingTask) {
      const updatedFields = {
        title: taskFormData.title,
        description: taskFormData.description,
        dueDate: taskFormData.dueDate,
        reminder: taskFormData.reminder,
        isRecurring: taskFormData.isRecurring ? 1 : 0,
        recurrencePattern: taskFormData.recurrencePattern,
        pomodoros: taskFormData.pomodoros,
        attachment: taskFormData.attachment,
        energyLevel: taskFormData.energyLevel,
        synced: 0,
        pendingAction: 'UPDATE',
        updatedAt
      };

      await db.tasks.update(editingTask.id, updatedFields);
      dispatch(updateTaskState({
        id: editingTask.id,
        ...updatedFields,
        completed: editingTask.completed
      }));
    } else {
      const newUUID = generateUUID();
      const newTask = {
        id: newUUID,
        title: taskFormData.title,
        description: taskFormData.description,
        completed: 0,
        dueDate: taskFormData.dueDate,
        deleted: 0,
        reminder: taskFormData.reminder,
        isRecurring: taskFormData.isRecurring ? 1 : 0,
        recurrencePattern: taskFormData.recurrencePattern,
        pomodoros: taskFormData.pomodoros,
        attachment: taskFormData.attachment,
        energyLevel: taskFormData.energyLevel,
        synced: 0,
        pendingAction: 'CREATE',
        updatedAt
      };

      await db.tasks.put(newTask);
      dispatch(addTaskState({
        id: newUUID,
        title: taskFormData.title,
        description: taskFormData.description,
        completed: false,
        dueDate: taskFormData.dueDate,
        reminder: taskFormData.reminder,
        isRecurring: taskFormData.isRecurring,
        recurrencePattern: taskFormData.recurrencePattern,
        pomodoros: taskFormData.pomodoros,
        attachment: taskFormData.attachment,
        energyLevel: taskFormData.energyLevel,
        synced: 0,
        pendingAction: 'CREATE',
        updatedAt
      }));
    }

    setModalOpen(false);
    setEditingTask(null);

    if (isOnline) {
      syncTasks(dispatch, store.getState);
    }
  };

  const handleDeleteTask = async (id) => {
    playChime('click');
    const task = await db.tasks.get(id);
    if (!task) return;

    if (task.synced === 0 && task.pendingAction === 'CREATE') {
      await db.tasks.delete(id);
    } else {
      await db.tasks.update(id, {
        deleted: 1,
        synced: 0,
        pendingAction: 'DELETE',
        updatedAt: new Date().toISOString()
      });
    }

    dispatch(deleteTaskState(id));

    if (isOnline) {
      syncTasks(dispatch, store.getState);
    }
  };

  // 4. Filtering Tasks (Standard Filters + Energy demand filters)
  const filteredTasks = tasks.filter(task => {
    if (filter === 'active' && task.completed) return false;
    if (filter === 'completed' && !task.completed) return false;
    if (filter === 'overdue' && (task.completed || !task.dueDate || new Date(task.dueDate) >= new Date())) return false;
    
    if (labs.energyLevelTagging && energyFilter !== 'all') {
      if (task.energyLevel !== energyFilter) return false;
    }
    
    return true;
  });

  // Soundscape switcher inside Zen focus overlay
  const handleSoundscapeChange = (e) => {
    const val = e.target.value;
    setSelectedSoundscape(val);
    stopNoiseGenerator();
    if (val === 'brown' || val === 'pink') {
      startNoiseGenerator(val);
    }
  };

  const handleZenTogglePlay = () => {
    playChime('click');
    setZenRunning(!zenRunning);
  };

  const handleZenSoundToggle = () => {
    playChime('click');
    if (zenSoundActive) {
      stopNoiseGenerator();
    } else {
      if (selectedSoundscape === 'brown' || selectedSoundscape === 'pink') {
        startNoiseGenerator(selectedSoundscape);
      }
    }
  };

  const exitZenMode = () => {
    playChime('click');
    setZenTask(null);
    setZenRunning(false);
    stopNoiseGenerator();
  };

  const triggerZenMode = (task) => {
    playChime('click');
    setZenTask(task);
    setZenTimeLeft(1500); 
    setZenRunning(true);
    if (selectedSoundscape === 'brown' || selectedSoundscape === 'pink') {
      startNoiseGenerator(selectedSoundscape);
    }
  };

  // Kanban update
  const handleKanbanStatusMove = async (task, newStatus) => {
    playChime('success');
    const isCompleted = newStatus === 'Completed' ? 1 : 0;
    const updatedAt = new Date().toISOString();

    await db.tasks.update(task.id, {
      completed: isCompleted,
      synced: 0,
      pendingAction: 'UPDATE',
      updatedAt
    });

    dispatch(updateTaskState({
      id: task.id,
      completed: isCompleted === 1,
      synced: 0,
      pendingAction: 'UPDATE',
      updatedAt
    }));

    if (isOnline) {
      syncTasks(dispatch, store.getState);
    }
  };

  // Dynamic Guest Access Generator
  const generateGuestLink = async () => {
    playChime('success');
    const randomToken = Math.random().toString(36).substring(2, 10);
    try {
      if (isOnline) {
        await api.post(`/tasks/share?token=${randomToken}`);
      }
    } catch (err) {
      console.error('Failed to register guest share token on server:', err);
    }
    setGuestLink(`${window.location.origin}/guest/share/${randomToken}`);
    setIsGuestOpen(true);
  };

  // Time-boxing allocation slot
  const handleAssignTimeBox = (slot, taskId) => {
    playChime('click');
    setTimeBoxSlots(prev => ({
      ...prev,
      [slot]: taskId
    }));
  };

  // --- INTERACTIVE PAINT WHITEBOARD DRAWING CANVAS LOGIC ---
  useEffect(() => {
    if (!whiteboardTask || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Canvas sizing setup
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 400;
    ctx.lineCap = 'round';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
  }, [whiteboardTask]);

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;

    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastX.current = x;
    lastY.current = y;
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    lastX.current = e.clientX - rect.left;
    lastY.current = e.clientY - rect.top;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearWhiteboard = () => {
    playChime('click');
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const downloadWhiteboard = () => {
    playChime('success');
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `whiteboard-${whiteboardTask.id}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <main className="main-content">
        {/* P2P banner */}
        {labs.p2p && (
          <div className="network-banner" style={{ 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
            border: '1px dashed var(--primary)',
            color: 'var(--primary)',
            padding: '10px 16px',
            marginBottom: '20px',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span className="spin-animation" style={{ display: 'inline-block' }}>📡</span>
            <strong>Local P2P Sync (WebRTC):</strong> {labs.e2ee ? '🔒 E2EE Encryption active.' : ''} Listening for adjacent local Wi-Fi nodes...
          </div>
        )}

        {/* Header Title Area */}
        <div className="task-header">
          <div className="dashboard-title-area">
            <h2>Your Tasks</h2>
            <p>
              Last Synced: <strong style={{ color: 'var(--primary)' }}>{lastSynced ? new Date(lastSynced).toLocaleTimeString() : 'Never'}</strong>
              {isSyncing && ' (Syncing...)'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* View Switchers */}
            {(labs.kanban || labs.gantt) && (
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--panel-border)', marginRight: '8px' }}>
                <button onClick={() => setView('list')} className={`filter-chip ${view === 'list' ? 'active' : ''}`} style={{ margin: 0, padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}>List</button>
                {labs.kanban && <button onClick={() => setView('kanban')} className={`filter-chip ${view === 'kanban' ? 'active' : ''}`} style={{ margin: 0, padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}>Kanban</button>}
                {labs.gantt && <button onClick={() => setView('gantt')} className={`filter-chip ${view === 'gantt' ? 'active' : ''}`} style={{ margin: 0, padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}>Timeline</button>}
              </div>
            )}

            {/* Guest access triggers */}
            {labs.guestAccess && (
              <button onClick={generateGuestLink} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '12px' }}>
                🔗 Guest Portal
              </button>
            )}

            {/* Conflict visualizer */}
            {labs.conflictVisualizer && (
              <button onClick={() => setIsConflictOpen(true)} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '12px', borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                ⚡ Conflict Test
              </button>
            )}

            <button onClick={handleManualSync} disabled={isSyncing || !isOnline} className="btn btn-secondary" title="Sync with Cloud">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={isSyncing ? 'spin-animation' : ''}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18m0 0V9m0-5h.01" />
              </svg>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            
            <button onClick={() => handleCreateOrEditTask(null)} className="btn btn-primary">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Task
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <div className="task-filters">
              <button onClick={() => setFilter('all')} className={`filter-chip ${filter === 'all' ? 'active' : ''}`}>All ({tasks.length})</button>
              <button onClick={() => setFilter('active')} className={`filter-chip ${filter === 'active' ? 'active' : ''}`}>Active ({tasks.filter(t => !t.completed).length})</button>
              <button onClick={() => setFilter('completed')} className={`filter-chip ${filter === 'completed' ? 'active' : ''}`}>Completed ({tasks.filter(t => t.completed).length})</button>
              <button onClick={() => setFilter('overdue')} className={`filter-chip ${filter === 'overdue' ? 'active' : ''}`}>Overdue ({tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length})</button>
            </div>
            
            {/* Energy filter row */}
            {labs.energyLevelTagging && (
              <div className="task-filters" style={{ borderTop: '1px dashed var(--panel-border)', paddingTop: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}>Filter by Energy:</span>
                <button onClick={() => setEnergyFilter('all')} className={`filter-chip ${energyFilter === 'all' ? 'active' : ''}`} style={{ padding: '3px 8px', fontSize: '11px' }}>All Demand</button>
                <button onClick={() => setEnergyFilter('high')} className={`filter-chip ${energyFilter === 'high' ? 'active' : ''}`} style={{ padding: '3px 8px', fontSize: '11px' }}>⚡ High Focus</button>
                <button onClick={() => setEnergyFilter('medium')} className={`filter-chip ${energyFilter === 'medium' ? 'active' : ''}`} style={{ padding: '3px 8px', fontSize: '11px' }}>☕ Routine</button>
                <button onClick={() => setEnergyFilter('low')} className={`filter-chip ${energyFilter === 'low' ? 'active' : ''}`} style={{ padding: '3px 8px', fontSize: '11px' }}>😴 Brain Dead</button>
              </div>
            )}
          </div>
        )}

        {/* 2-Column dashboard layout for Side Widget features */}
        <div style={{ display: 'grid', gridTemplateColumns: (labs.timeBoxing || labs.leaderboards || labs.flowDiagrams || labs.productivityHeatmap) ? '1fr 300px' : '1fr', gap: '24px', alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {isLoading && tasks.length === 0 ? (
              <div className="empty-state"><p>Loading tasks...</p></div>
            ) : filteredTasks.length === 0 && view === 'list' ? (
              <div className="glass-panel empty-state"><h3>No Tasks Found</h3></div>
            ) : view === 'list' ? (
              <div className="task-list">
                {filteredTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggleCompleted}
                    onEdit={handleCreateOrEditTask}
                    onDelete={handleDeleteTask}
                    onZen={triggerZenMode}
                    onWhiteboard={setWhiteboardTask}
                  />
                ))}
              </div>
            ) : view === 'kanban' ? (
              <div className="kanban-board">
                {['To Do', 'In Progress', 'Under Review', 'Completed'].map((columnTitle) => {
                  const colTasks = tasks.filter(task => {
                    if (columnTitle === 'Completed') return task.completed;
                    if (columnTitle === 'To Do') return !task.completed && (!task.pomodoros || task.pomodoros <= 2);
                    if (columnTitle === 'In Progress') return !task.completed && task.pomodoros > 2 && task.pomodoros <= 5;
                    if (columnTitle === 'Under Review') return !task.completed && task.pomodoros > 5;
                    return false;
                  });

                  return (
                    <div key={columnTitle} className="kanban-column">
                      <div className="kanban-column-header">
                        <h4>{columnTitle}</h4>
                        <span className="kanban-column-count">{colTasks.length}</span>
                      </div>
                      <div className="kanban-tasks-list">
                        {colTasks.map(task => (
                          <div 
                            key={task.id} 
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              const nextStatus = 
                                columnTitle === 'To Do' ? 'In Progress' :
                                columnTitle === 'In Progress' ? 'Under Review' :
                                columnTitle === 'Under Review' ? 'Completed' : 'To Do';
                              handleKanbanStatusMove(task, nextStatus);
                            }}
                          >
                            <TaskItem
                              task={task}
                              onToggle={handleToggleCompleted}
                              onEdit={handleCreateOrEditTask}
                              onDelete={handleDeleteTask}
                              onZen={triggerZenMode}
                              onWhiteboard={setWhiteboardTask}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="gantt-chart">
                <div className="gantt-header-row">
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>Task Timeline</div>
                  <div className="gantt-days-axis">
                    <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                  </div>
                </div>
                {tasks.map((task) => {
                  const dayOffset = task.dueDate ? new Date(task.dueDate).getDay() : 2;
                  const gridColumnStart = dayOffset === 0 ? 7 : dayOffset; 
                  return (
                    <div key={task.id} className="gantt-task-row">
                      <div className="gantt-task-info" title={task.title}>{task.title}</div>
                      <div className="gantt-bar-grid">
                        <div 
                          className="gantt-bar-fill"
                          style={{ 
                            gridColumnStart: gridColumnStart,
                            gridColumnEnd: `span ${task.completed ? 1 : 2}`,
                            background: task.completed ? 'var(--success)' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)'
                          }}
                        >
                          {task.completed ? 'Done' : 'Active'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================
              SIDEBAR CONTROLS (TIME-BOXING, RPG, LEADERBOARDS)
             ======================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Time Boxing Scheduler */}
            {labs.timeBoxing && (
              <div className="timebox-scheduler">
                <h4 style={{ marginBottom: '12px' }}>📅 Time-Boxing Blocks</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.keys(timeBoxSlots).map((slot) => {
                    const assignedTaskId = timeBoxSlots[slot];
                    const assignedTask = tasks.find(t => t.id === assignedTaskId);
                    return (
                      <div key={slot} className="timebox-slot">
                        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{slot}</span>
                        <select 
                          value={assignedTaskId}
                          onChange={(e) => handleAssignTimeBox(slot, e.target.value)}
                          style={{ width: '100%', padding: '4px', fontSize: '11px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', borderRadius: '4px' }}
                        >
                          <option value="">[Free Block]</option>
                          {tasks.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Team Leaderboard */}
            {labs.leaderboards && (
              <div className="leaderboard-widget">
                <h4 style={{ marginBottom: '12px' }}>👥 Team Leaderboard</h4>
                <div className="leaderboard-item">
                  <span className="leaderboard-rank">🥇</span>
                  <span style={{ flex: 1, fontSize: '12.5px' }}>Alex (Manager)</span>
                  <span style={{ fontWeight: 'bold', fontSize: '12px' }}>780 XP</span>
                </div>
                <div className="leaderboard-item" style={{ background: 'rgba(124,58,237,0.05)', borderRadius: '4px', padding: '8px' }}>
                  <span className="leaderboard-rank">🥈</span>
                  <span style={{ flex: 1, fontSize: '12.5px', fontWeight: 'bold' }}>You (Knight)</span>
                  <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{localStorage.getItem('ascent_rpg_xp') || 120} XP</span>
                </div>
                <div className="leaderboard-item">
                  <span className="leaderboard-rank">🥉</span>
                  <span style={{ flex: 1, fontSize: '12.5px' }}>Sarah (Designer)</span>
                  <span style={{ fontWeight: 'bold', fontSize: '12px' }}>490 XP</span>
                </div>
              </div>
            )}

            {/* Advanced Insights (Diagrams, Heatmaps, Velocity) */}
            {(labs.flowDiagrams || labs.productivityHeatmap || labs.velocityTracking) && (
              <div className="leaderboard-widget" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ margin: 0 }}>📊 Advanced Insights</h4>
                
                {/* 1. Cumulative Flow */}
                {labs.flowDiagrams && (
                  <div>
                    <h5 style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Cumulative Flow Stack</h5>
                    <svg width="100%" height="60" style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '4px' }}>
                      {/* Flow representation stacks */}
                      <path d="M 0,40 Q 50,20 100,50 L 100,60 L 0,60 Z" fill="rgba(16, 185, 129, 0.4)" />
                      <path d="M 0,30 Q 50,10 100,30 L 100,40 Q 50,20 0,40 Z" fill="rgba(59, 130, 246, 0.4)" />
                      <path d="M 0,10 Q 50,0 100,10 L 100,30 Q 50,10 0,30 Z" fill="rgba(124, 58, 237, 0.4)" />
                    </svg>
                  </div>
                )}

                {/* 2. Heatmap */}
                {labs.productivityHeatmap && (
                  <div>
                    <h5 style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Daily Contributions</h5>
                    <div className="heatmap-container" style={{ padding: '8px' }}>
                      <div className="heatmap-grid">
                        {Array.from({ length: 70 }).map((_, i) => {
                          const level = (i % 7 === 0) ? 'level-3' : (i % 5 === 0) ? 'level-2' : (i % 9 === 0) ? 'level-1' : '';
                          return <div key={i} className={`heatmap-cell ${level}`}></div>;
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Velocity tracking */}
                {labs.velocityTracking && (
                  <div>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Weekly Velocity (Tasks Done)</h5>
                    <div className="bar-chart-container">
                      {[
                        { label: 'Wk 1', val: 3 },
                        { label: 'Wk 2', val: 6 },
                        { label: 'Wk 3', val: 5 },
                        { label: 'Wk 4', val: 8 }
                      ].map((bar, i) => (
                        <div key={i} className="chart-bar-col">
                          <div className="chart-bar-fill" style={{ height: `${(bar.val / 10) * 100}%` }}></div>
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{bar.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Task Modal for Creating/Editing */}
      <TaskModal
        task={editingTask}
        isOpen={isModalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
        onSave={handleSaveTask}
      />

      {/* ==========================================================
          ZEN MODE OVERLAY MODAL
         ========================================================== */}
      {zenTask && (
        <div className="zen-overlay">
          <div className="zen-panel">
            <div className="zen-title">Focusing on Task</div>
            <h1 style={{ fontSize: '32px', margin: '8px 0', color: '#fff', textTransform: 'capitalize' }}>
              {zenTask.title}
            </h1>
            <p className="zen-desc">
              {zenTask.description || 'No additional description provided.'}
            </p>

            {/* Breathing Visualizer Grid */}
            {selectedSoundscape === 'breathing' && zenRunning && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  boxShadow: '0 0 30px var(--primary-glow)',
                  transform: breathingText.includes('Inhale') ? 'scale(1.4)' : breathingText.includes('Exhale') ? 'scale(0.8)' : 'scale(1.1)',
                  transition: 'transform 4s ease-in-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: '#fff'
                }}>
                  🧘
                </div>
                <div style={{ marginTop: '16px', fontSize: '15px', color: 'var(--primary)' }}>{breathingText}</div>
              </div>
            )}

            <div className="zen-timer">
              {Math.floor(zenTimeLeft / 60).toString().padStart(2, '0')}:
              {(zenTimeLeft % 60).toString().padStart(2, '0')}
            </div>

            <div className="zen-controls">
              <button onClick={handleZenTogglePlay} className="zen-btn-action">
                {zenRunning ? 'Pause Session' : 'Resume Session'}
              </button>
              
              <button onClick={handleZenSoundToggle} className="zen-btn-close" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎧 Soundscape</span>
                {zenSoundActive && (
                  <div className="audio-visualizer-wave">
                    <span></span><span></span><span></span>
                  </div>
                )}
              </button>

              <button onClick={exitZenMode} className="zen-btn-close">
                Exit Zen Focus
              </button>
            </div>

            {/* Soundscape selectors */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Select Soundscape:</span>
              <select 
                value={selectedSoundscape}
                onChange={handleSoundscapeChange}
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '4px', fontSize: '12px' }}
              >
                <option value="drone">Binaural Drone Hum</option>
                <option value="brown">Brownian Noise 🌧️</option>
                <option value="pink">Pink Noise 🍃</option>
                <option value="breathing">Breathing Helper Guide</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          INTERACTIVE WHITEBOARD PAINTING CANVAS MODAL
         ========================================================== */}
      {whiteboardTask && (
        <div className="whiteboard-overlay" onClick={() => setWhiteboardTask(null)}>
          <div className="whiteboard-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎨 Collaborative Drawing Canvas: {whiteboardTask.title}</h3>
              <button onClick={() => setWhiteboardTask(null)} className="action-btn">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <canvas
              ref={canvasRef}
              className="whiteboard-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />

            <div className="whiteboard-controls">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ fontSize: '12px' }}>Brush Color:</label>
                <input 
                  type="color" 
                  value={brushColor} 
                  onChange={(e) => setBrushColor(e.target.value)} 
                  style={{ border: 'none', background: 'transparent', width: '32px', height: '32px', cursor: 'pointer' }}
                />
                
                <label style={{ fontSize: '12px' }}>Brush Size:</label>
                <input 
                  type="range" 
                  min="2" 
                  max="20" 
                  value={brushSize} 
                  onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                  style={{ width: '80px', accentColor: 'var(--primary)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={clearWhiteboard} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Clear Canvas
                </button>
                <button onClick={downloadWhiteboard} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Save Illustration (PNG)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          CONFLICT RESOLUTION MODAL
         ========================================================== */}
      {isConflictOpen && (
        <div className="modal-overlay" onClick={() => setIsConflictOpen(false)}>
          <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>⚡ Sync Conflict Visualizer</h2>
              <button onClick={() => setIsConflictOpen(false)} className="action-btn">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              A conflict was detected. The task was modified offline on two separate devices:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="glass-panel" style={{ padding: '16px', border: '1px solid var(--panel-border)' }}>
                <h4 style={{ color: 'var(--primary)', marginBottom: '8px' }}>Local Device Copy</h4>
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Title:</strong> Submit presentation slides v2</div>
                  <div><strong>Effort:</strong> 3 Pomodoros 🍅</div>
                  <div><strong>Modified:</strong> 5 mins ago</div>
                </div>
                <button onClick={() => { playChime('success'); setIsConflictOpen(false); }} className="btn btn-primary btn-block" style={{ marginTop: '16px', fontSize: '12px', padding: '6px 12px' }}>Keep Local Version</button>
              </div>
              <div className="glass-panel" style={{ padding: '16px', border: '1px solid var(--panel-border)' }}>
                <h4 style={{ color: 'var(--warning)', marginBottom: '8px' }}>Cloud Server Copy</h4>
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Title:</strong> Submit final slides to client</div>
                  <div><strong>Effort:</strong> 2 Pomodoros 🍅</div>
                  <div><strong>Modified:</strong> 10 mins ago</div>
                </div>
                <button onClick={() => { playChime('success'); setIsConflictOpen(false); }} className="btn btn-secondary btn-block" style={{ marginTop: '16px', fontSize: '12px', padding: '6px 12px', border: '1px solid var(--panel-border)' }}>Keep Cloud Version</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          DYNAMIC GUEST ACCESS SHARE MODAL
         ========================================================== */}
      {isGuestOpen && (
        <div className="modal-overlay" onClick={() => setIsGuestOpen(false)}>
          <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>🔗 Generate Guest Share Link</h2>
              <button onClick={() => setIsGuestOpen(false)} className="action-btn">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Share this secure temporary link to allow guests to view your current task lists:
            </p>
            <input 
              type="text" 
              readOnly 
              value={guestLink} 
              className="form-input" 
              onClick={(e) => e.target.select()}
              style={{ background: 'var(--bg-secondary)', color: 'var(--primary)', fontWeight: '600', textAlign: 'center', cursor: 'pointer', marginBottom: '20px' }}
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(guestLink);
                playChime('success');
                alert('Copied guest link to clipboard!');
                setIsGuestOpen(false);
              }}
              className="btn btn-primary btn-block"
            >
              Copy Link & Close
            </button>
          </div>
        </div>
      )}
      
      {/* Dynamic Rotation Style for Sync Icon */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1.2s linear infinite;
        }
      `}</style>
    </div>
  );
}
