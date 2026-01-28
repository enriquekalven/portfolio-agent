# Portfolio Agent - Cloud Run Dockerfile
# Serves both the pre-built Vite frontend and the API server

FROM node:20-slim

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install only production dependencies
# We need tsx to run the api-server.ts
RUN npm install --omit=dev && npm install tsx

# Copy everything (assuming 'dist' is built locally)
COPY . .

# Set production environment
ENV PORT=8080
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Run the API server (serves both API and static files in production)
CMD ["npx", "tsx", "api-server.ts"]
