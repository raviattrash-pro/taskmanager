import React, { createContext, useContext, useState, useEffect } from 'react';

const LabsContext = createContext();

const DEFAULT_LABS = {
  // Date & Time
  nlp: false,
  presets: false,
  timezone: false,
  heatmap: false,
  // Task & Deadline
  reminders: false,
  recurrence: false,
  halos: false,
  pomodoro: false,
  // Layouts
  kanban: false,
  gantt: false,
  zen: false,
  // AI
  aiSubtasks: false,
  aiScheduler: false,
  // Collaborative
  p2p: false,
  conflictVisualizer: false,
  attachments: false,
  // Gamification
  habitStreaks: false,
  soundscapes: false,

  // NEW EXPERIMENTAL SUGGESTED FEATURES
  energyLevelTagging: false,
  focusSoundscapes: false,
  timeBoxing: false,
  productivityRpg: false,
  achievements: false,
  leaderboards: false,
  smartAutoTagging: false,
  predictiveDelays: false,
  voiceTaskInput: false,
  flowDiagrams: false,
  productivityHeatmap: false,
  velocityTracking: false,
  e2ee: false,
  guestAccess: false,
  collaborativeWhiteboard: false,
};

export function LabsProvider({ children }) {
  const [labs, setLabs] = useState(() => {
    const saved = localStorage.getItem('ascent_labs');
    return saved ? JSON.parse(saved) : DEFAULT_LABS;
  });

  useEffect(() => {
    localStorage.setItem('ascent_labs', JSON.stringify(labs));
  }, [labs]);

  const toggleLab = (key) => {
    setLabs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <LabsContext.Provider value={{ labs, toggleLab }}>
      {children}
    </LabsContext.Provider>
  );
}

export function useLabs() {
  const context = useContext(LabsContext);
  if (!context) {
    return { labs: DEFAULT_LABS, toggleLab: () => {} };
  }
  return context;
}
