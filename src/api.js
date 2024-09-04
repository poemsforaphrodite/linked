import axios from 'axios';

const api = axios.create({
  baseURL: 'https://linked-api.vercel.app/api', // Adjust this URL to match your backend
});

// Add a request interceptor
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

export default api;