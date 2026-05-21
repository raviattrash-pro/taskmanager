import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authStart, authSuccess, authFail, clearError } from '../store/authSlice';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector(state => state.auth);

  // Parse session expiry message if redirect occurred
  const isSessionExpired = new URLSearchParams(location.search).get('expired') === 'true';

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!email.trim() || !password.trim()) {
      setValidationError('Please fill in all fields.');
      return;
    }

    dispatch(authStart());
    try {
      const response = await api.post('/auth/login', { email, password });
      dispatch(authSuccess(response.data));
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.response && err.response.data
        ? err.response.data
        : 'Authentication failed. Please check your credentials.';
      dispatch(authFail(errMsg));
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <div className="auth-header">
          <div className="auth-logo">Ascent</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {isSessionExpired ? 'Your session expired. Please log in again.' : 'Log in to manage your tasks'}
          </p>
        </div>

        {error && <div className="network-banner offline" style={{ borderRadius: '8px', marginBottom: '20px', padding: '10px' }}>{error}</div>}
        {validationError && <div className="network-banner offline" style={{ borderRadius: '8px', marginBottom: '20px', padding: '10px' }}>{validationError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <input
              type="email"
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="login-pass">Password</label>
            <input
              type="password"
              id="login-pass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="text-center mt-4" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
