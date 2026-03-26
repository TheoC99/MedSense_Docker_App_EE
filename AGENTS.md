# AGENTS.md

## Project
MedSense HMI web app for a school electrical engineering project.

## Goal
This repo hosts the HMI frontend and backend for MedSense.
It is deployed automatically to a Debian server called `delta` through a self-hosted GitHub Actions runner.

## Deployment
- Repo push to `main` triggers deploy
- Deploy target on server: `/srv/stacks/MedSense_Docker_App_EE`
- Docker container name: `medsense-hmi`
- Public URL: `https://hmi.theodelcon.com`
- Local URL on server: `http://192.168.1.93:3001`
- Important: keep Docker port mapping as `3001:3000`
- Do not change Cloudflare assumptions unless explicitly asked

## Stack
- Frontend: React + Vite + PWA
- Backend: Express in `server.js`
- Deployment: Docker Compose
- CI/CD: GitHub Actions self-hosted runner on `delta`

## Important files
- `docker-compose.yml` -> container config, must keep `3001:3000`
- `Dockerfile` -> image build
- `server.js` -> Express API and state logic
- `src/App.jsx` -> main HMI UI logic
- `src/styles.css` -> styling
- `vite.config.js` -> Vite config
- `public/` -> static assets
- `.github/workflows/deploy.yml` -> self-hosted deployment workflow

## Runtime data
- `.env` must not be overwritten by deploy
- `data/` must not be deleted by deploy
- Avoid changing deploy exclusions unless explicitly asked

## Current problems to solve
- Demo and live behavior are mixed and have caused confusing UI resets
- Gateway test posts can force the UI toward live behavior
- Demo code should likely be removed or isolated cleanly
- Patient selection and edit behavior should stay stable during polling
- Node online/offline state should reflect real timeout behavior

## Coding rules
- Keep code simple and readable
- Do not introduce unnecessary frameworks
- Do not change architecture unless there is a strong reason
- Prefer small safe edits over broad rewrites
- Preserve working Docker deployment
- Preserve self-hosted GitHub Actions deployment
- Do not change the server path or host assumptions
- Ask for confirmation before deleting major functionality

## Validation
After changes:
- run build
- ensure Docker still builds
- ensure the app still serves correctly
- do not break deployment