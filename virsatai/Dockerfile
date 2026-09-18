# Multi-stage Dockerfile for VirasatAI
# -------------------------------------------------
# Stage 1: Build the React frontend using Node
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime image with Python FastAPI backend
FROM python:3.12-slim AS runtime
WORKDIR /app
# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Copy built frontend assets
COPY --from=frontend-builder /app/dist ./frontend
# Copy FastAPI source code
COPY src/server ./src/server
# Expose ports (8000 for API, 3000 for static serving if needed)
EXPOSE 8000
# Command to run both the API and serve static files via python -m http.server (or using uvicorn + serve)
# Here we use uvicorn for API and python http.server for static files in background
CMD sh -c "uvicorn src.server.vision_proxy:app --host 0.0.0.0 --port 8000 & cd frontend && python -m http.server 3000"
