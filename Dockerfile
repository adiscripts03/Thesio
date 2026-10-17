# Use a modern Debian base image that supports Node 22 and Python
FROM node:22-bookworm

# Install Python, pip, and Tectonic
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Tectonic (LaTeX compiler)
RUN curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh && \
    mv tectonic /usr/local/bin/

# Set working directory
WORKDIR /app

# Setup Python Virtual Environment in /opt/venv and install dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install -r backend/requirements.txt
ENV PATH="/opt/venv/bin:$PATH"

# Install Node dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy application source code
COPY . .

# Build the frontend for a node server environment
RUN npm run build:node

# Make the start script executable and strip any carriage returns (CRLF fix)
RUN sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh

# Expose ports for both the Node app (8080) and FastAPI (8000)
# NOTE: Render only exposes one port to the internet. We will use a reverse proxy or just bind the Node app to the PORT env variable provided by Render.
# For this setup, we will bind Node to the main port and keep Python on 8000 internally.
EXPOSE 8080 8000

# Start both servers
CMD ["/app/start.sh"]
