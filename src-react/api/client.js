import axios from 'axios';

// API base URL - use environment variable or default
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1/docupedia';

// Create axios instance
const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
client.interceptors.response.use(
  (response) => {
    // Return data directly if success
    return response.data;
  },
  (error) => {
    // Handle response errors
    if (error.response) {
      const { status, data } = error.response;

      // Handle 401 - Unauthorized
      if (status === 401) {
        // Clear token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }

      // Return error with message
      const errorMessage = data?.error?.message || 'Có lỗi xảy ra';
      const errorCode = data?.error?.code || 'UNKNOWN_ERROR';
      
      return Promise.reject({
        message: errorMessage,
        code: errorCode,
        status,
      });
    }

    // Network error
    if (error.request) {
      return Promise.reject({
        message: 'Không thể kết nối đến server',
        code: 'NETWORK_ERROR',
        status: 0,
      });
    }

    return Promise.reject({
      message: error.message || 'Có lỗi xảy ra',
      code: 'UNKNOWN_ERROR',
      status: 0,
    });
  }
);

export default client;

// Helper functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete client.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};
