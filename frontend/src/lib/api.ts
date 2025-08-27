import axios from 'axios'

// In prod (served by FastAPI) the baseURL is same origin.
// In dev, vite proxy (vite.config.ts) forwards /schemas* to backend.
// All client calls go to JSON API under /api/*
export const api = axios.create({ baseURL: '/api' })
