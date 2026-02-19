# Portfolio Agent - Cloud Run Dockerfile
# Serves both the pre-built Vite frontend and the API server

# SRE Resource Consternation
# Expected: CPU 1, Memory 1Gi
ENV RESOURCE_CPU=1
ENV RESOURCE_MEMORY=1Gi

FROM node:20-slim

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install only production dependencies
# We need tsx to run the api-server.ts
RUN npm install --omit=dev && npm install tsx

# Copy everything (assuming 'dist' is built locally)
COPY . .

# Set permissions for non-root user
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Set production environment
ENV PORT=8080
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Healthcheck for SRE resilience
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run the API server (serves both API and static files in production)
CMD ["npx", "tsx", "api-server.ts"]
