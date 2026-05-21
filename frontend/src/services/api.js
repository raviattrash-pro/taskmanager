import axios from 'axios';
import { CONFIG } from '../config';

// Create an Axios instance
const api = axios.create({
  baseURL: CONFIG.API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local auth storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // We can trigger a page reload to force routing back to auth screens
      if (
        !window.location.pathname.startsWith('/login') && 
        !window.location.pathname.startsWith('/signup') &&
        !window.location.pathname.startsWith('/guest')
      ) {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
