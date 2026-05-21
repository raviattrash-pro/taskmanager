import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tasks: [],
  syncing: false,
  lastSynced: localStorage.getItem('lastSyncTime') || null,
  error: null,
  loading: false
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action) => {
      state.tasks = action.payload;
    },
    addTaskState: (state, action) => {
      state.tasks.unshift(action.payload);
    },
    updateTaskState: (state, action) => {
      const index = state.tasks.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = { ...state.tasks[index], ...action.payload };
      }
    },
    deleteTaskState: (state, action) => {
      state.tasks = state.tasks.filter(t => t.id !== action.payload);
    },
    setSyncStart: (state) => {
      state.syncing = true;
      state.error = null;
    },
    setSyncSuccess: (state, action) => {
      state.syncing = false;
      state.lastSynced = action.payload;
      state.error = null;
      localStorage.setItem('lastSyncTime', action.payload);
    },
    setSyncFail: (state, action) => {
      state.syncing = false;
      state.error = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  }
});

export const {
  setTasks,
  addTaskState,
  updateTaskState,
  deleteTaskState,
  setSyncStart,
  setSyncSuccess,
  setSyncFail,
  setLoading
} = taskSlice.actions;

export default taskSlice.reducer;
