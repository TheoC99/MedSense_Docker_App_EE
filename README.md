# MedSense HMI Docker

This version is fixed and complete.

## What was broken
The previous scaffold was missing `package.json`, `src/main.jsx`, `index.html`, and Vite config. That is why Docker failed with `react/jsx-runtime` resolution errors.

## Start locally
```bash
npm install
npm run build
npm run start
```

## Start with Docker
```bash
docker compose up --build -d
```

Open `http://localhost:3000`

## Start with Cloudflare Tunnel
```bash
cp .env.example .env
nano .env
```
Paste your tunnel token, save, then:

```bash
docker compose --profile cloudflare up --build -d
```

## API payload expected from ESP32
```json
{
  "mode": "live",
  "nodeId": 1,
  "patientName": "Theo Demo",
  "age": 26,
  "breathsPerMinute": 18,
  "breathingLevel": 64,
  "temperatureC": 37.2,
  "latencyMs": 146
}
```
