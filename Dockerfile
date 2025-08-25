### --- Stage 1: build frontend (React/Vite) ---
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
# Copy only frontend to leverage Docker cache
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# Build production assets (bundled, no CDN)
RUN npm run build

### --- Stage 2: backend (FastAPI) ---
FROM python:3.11-slim

# Avoid interactive tzdata prompts, speed up pip
ENV PIP_NO_CACHE_DIR=1     PYTHONDONTWRITEBYTECODE=1     PYTHONUNBUFFERED=1

WORKDIR /app

# System deps that help lxml and friends
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libxml2-dev libxslt1-dev build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install -r requirements.txt

# Copy app sources
COPY app ./app

# Copy built frontend
# Result of Vite build goes to /frontend/dist; we place it under app/static
COPY --from=frontend-build /frontend/dist /app/app/static

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
