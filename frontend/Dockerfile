# =============================================
# Stage 1: Build the React application
# =============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (for dependency caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build production bundle (no VITE_API_BASE_URL needed — Nginx proxies it)
RUN npm run build

# =============================================
# Stage 2: Serve with Nginx (lightweight)
# =============================================
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
