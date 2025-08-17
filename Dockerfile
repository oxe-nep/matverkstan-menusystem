# Multi-stage build
FROM node:18-alpine AS frontend-build

# Bygg frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ .
RUN npm run build

# Backend stage
FROM node:18-alpine AS production

# Skapa app directory
WORKDIR /app

# Kopiera backend package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Kopiera backend kod
COPY backend/src ./src

# Kopiera frontend build
COPY --from=frontend-build /app/frontend/dist ./public

# Skapa uploads directory
RUN mkdir -p src/uploads/menus

# Exponera port
EXPOSE 5000

# Miljövariabler
ENV NODE_ENV=production
ENV PORT=5000

# Starta applikationen
CMD ["node", "src/server.js"]
