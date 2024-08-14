import axios from 'axios';

const baseURL = process.env.NODE_ENV === 'production' 
  ? 'https://linked-api.vercel.app/api' 
  : '/api';

const api = axios.create({
  baseURL: baseURL,
});

export default api;