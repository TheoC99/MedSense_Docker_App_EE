# MedSense HMI Docker
vite-plugin-pwa + React + Vite

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
## Gateway Serial commands
``` bash
help
show
name=Theo test
age=33
node=2
bpm=20
level=65
temp=37.4
lat=150
auto=on
auto=off
postnow
```
