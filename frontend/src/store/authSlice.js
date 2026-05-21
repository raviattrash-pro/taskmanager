import { createSlice } from '@reduxjs/toolkit';

// Retrieve initial session from localStorage
const token = localStorage.getItem('token') || null;
const userJson = localStorage.getItem('user');
const user = userJson ? JSON.parse(userJson) : null;

const initialState = {
  token,
  user,
  isAuthenticated: !!token,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (state, action) => {
      state.loading = false;
      state.token = action.payload.token;
      state.user = {
        id: action.payload.id,
        email: action.payload.email
      };
      state.isAuthenticated = true;
      state.error = null;
      
      // Persist in localStorage
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify({
        id: action.payload.id,
        email: action.payload.email
      }));
    },
    authFail: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('lastSyncTime'); // Clear sync state on logout
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

export const { authStart, authSuccess, authFail, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
