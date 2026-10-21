FROM node:22-bookworm

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh && \
    mv tectonic /usr/local/bin/

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install -r backend/requirements.txt
ENV PATH="/opt/venv/bin:$PATH"

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build:node

RUN sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh

EXPOSE 8080 8000

CMD ["/app/start.sh"]
