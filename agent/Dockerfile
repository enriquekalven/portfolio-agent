FROM python:3.11-slim

# SRE Resource Consternation
# Expected: CPU 1, Memory 1Gi
ENV RESOURCE_CPU=1
ENV RESOURCE_MEMORY=1Gi

WORKDIR /app

# Create a non-root user
RUN groupadd -r agentuser && useradd -r -g agentuser agentuser

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY *.py ./

# Create learner context directory and set permissions
RUN mkdir -p /app/learner_context && chown -R agentuser:agentuser /app

# Switch to non-root user
USER agentuser

# Set environment variables
ENV PORT=8080
# GOOGLE_CLOUD_PROJECT must be set at runtime
ENV GOOGLE_CLOUD_LOCATION=global

# Expose port
EXPOSE 8080

# Run the server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
