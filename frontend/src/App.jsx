import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import GuestView from './pages/GuestView';
import { syncTasks } from './services/sync';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { CONFIG } from './config';
import { store } from './store';

// Protected Route Guard (Auth Stack to App Stack Navigation)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector(state => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Guard (Auth Stack Only)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector(state => state.auth);
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  const dispatch = useDispatch();
  const isOnline = useOnlineStatus();
  const { isAuthenticated } = useSelector(state => state.auth);

  // Theme Management Initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Service Worker Registration for Offline Capabilities
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => {
            console.log('Service Worker registered successfully with scope:', reg.scope);
          })
          .catch(err => {
            console.error('Service Worker registration failed:', err);
          });
      });
    }
  }, []);

  // Request native browser desktop notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Sync tasks immediately when transitioning back to online
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      syncTasks(dispatch, store.getState);
    }
  }, [isOnline, isAuthenticated, dispatch]);

  // Periodic task syncing loop in background
  useEffect(() => {
    if (!isAuthenticated) return;

    // Run first sync immediately on load
    syncTasks(dispatch, store.getState);
    
    const intervalId = setInterval(() => {
      syncTasks(dispatch, store.getState);
    }, CONFIG.SYNC_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, dispatch]);

  return (
    <BrowserRouter>
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="network-banner offline">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536 4.978 4.978 0 011.414-3.536m0 0L11.314 11.3m-2.829 2.829L5 19m1.414-13.364a9 9 0 000 12.728M12 12v.01" />
          </svg>
          Offline Mode. Changes will save locally and synchronize when connectivity is restored.
        </div>
      )}

      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/guest/share/:token" element={
          <GuestView />
        } />
        {/* Redirect unknown routes to Dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
