# MedSense HMI Docker App

MedSense is a lightweight full-stack HMI for displaying patient-linked breathing and temperature data from a gateway or ESP32-based node setup.

This repository contains:

- a React + Vite frontend
- an Express backend API
- JSON file persistence
- Docker deployment
- optional Cloudflare Tunnel support

## What it does

The app has two main jobs:

1. show live node data in the HMI
2. keep gateway-side patient configuration in sync

The HMI shows:

- selected patient
- linked node ID
- breaths per minute
- breathing level
- temperature
- online/offline status
- freshness / last update
- patient-specific target ranges

The backend:

- stores patients in `data/patients.json`
- stores latest node state in `data/last-state.json`
- receives live telemetry from the gateway
- computes online/offline state
- exposes endpoints for the HMI
- exposes checksum-based sync endpoints for the gateway

## Stack

- React 18
- Vite
- vite-plugin-pwa
- Express
- Docker / Docker Compose

## Project structure

```text
.
├─ src/                 # React frontend
├─ dist/                # Built frontend output
├─ data/                # JSON persistence
├─ server.js            # Express API + static server
├─ Dockerfile
├─ docker-compose.yml
├─ package.json
└─ vite.config.js