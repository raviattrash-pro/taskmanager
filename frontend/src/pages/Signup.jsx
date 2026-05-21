import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { authStart, authFail, clearError } from '../store/authSlice';
import api from '../services/api';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setValidationError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    dispatch(authStart());
    try {
      await api.post('/auth/signup', { email, password });
      setSuccessMsg('Account created successfully! Redirecting to login page...');
      dispatch(clearError());
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const errMsg = err.response && err.response.data
        ? err.response.data
        : 'Sign up failed. Please try again.';
      dispatch(authFail(errMsg));
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <div className="auth-header">
          <div className="auth-logo">Ascent</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Create an account to get started</p>
        </div>

        {error && <div className="network-banner offline" style={{ borderRadius: '8px', marginBottom: '20px', padding: '10px' }}>{error}</div>}
        {validationError && <div className="network-banner offline" style={{ borderRadius: '8px', marginBottom: '20px', padding: '10px' }}>{validationError}</div>}
        {successMsg && <div className="network-banner" style={{ borderRadius: '8px', marginBottom: '20px', padding: '10px', background: 'var(--success-bg)', color: 'var(--success)' }}>{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Email Address</label>
            <input
              type="email"
              id="signup-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-pass">Password</label>
            <input
              type="password"
              id="signup-pass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Min. 6 characters"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="signup-confirm">Confirm Password</label>
            <input
              type="password"
              id="signup-confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              placeholder="Repeat your password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center mt-4" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
