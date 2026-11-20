
import axios from 'axios';

import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://norvigam.onrender.com/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adjuntar automáticamente el token guardado
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('tura_driver_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
