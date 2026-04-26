import axios from 'axios';
import { getRuntimeConfigValue } from '../config/runtimeConfig';

const API_URL = getRuntimeConfigValue(
  'VITE_API_URL',
  import.meta.env.VITE_API_URL || `${window.location.protocol}//localhost:3000/api`,
);

const http = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default http;
