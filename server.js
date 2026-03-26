import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const port = Number(process.env.PORT || 3000)

const dataDir = path.join(__dirname, 'data')
const patientsFile = path.join(dataDir, 'patients.json')
const stateFile = path.join(dataDir, 'last-state.json')

app.use(cors())
app.use(express.json({ limit: '1mb' }))

const ageGroups = [
  { key: 'adult', minAge: 18, maxAge: 120, minBpm: 12, maxBpm: 20, label: 'Adult' },
  { key: 'school', minAge: 6, maxAge: 17, minBpm: 16, maxBpm: 30, label: 'School-age child' },
  { key: 'preschool', minAge: 3, maxAge: 5, minBpm: 22, maxBpm: 34, label: 'Preschooler' },
  { key: 'toddler', minAge: 1, maxAge: 2, minBpm: 24, maxBpm: 40, label: 'Toddler' },
  { key: 'infant', minAge: 0, maxAge: 0, minBpm: 30, maxBpm: 60, label: 'Infant' }
]

function classifyTemperature(tempC) {
  const t = Number(tempC)
  if (!Number.isFinite(t)) return 'normal'
  if (t > 38 || t < 36) return 'alarm'
  if (t > 37.5 || t < 36.5) return 'warning'
  return 'normal'
}

function ageToBand(age) {
  const value = Number(age)
  return ageGroups.find((group) => value >= group.minAge && value <= group.maxAge) || ageGroups[0]
}

function enrichPatient(patient) {
  const age = Number(patient.age)
  const band = ageToBand(age)
  return {
    id: patient.id,
    patientName: String(patient.patientName || '').trim(),
    age,
    minBreaths: band.minBpm,
    maxBreaths: band.maxBpm,
    groupLabel: band.label
  }
}

const demoPatients = [
  { id: 'demo-1', patientName: 'Emma de Vries', age: 34 },
  { id: 'demo-2', patientName: 'Noah Jansen', age: 8 },
  { id: 'demo-3', patientName: 'Sophie Bakker', age: 4 },
  { id: 'demo-4', patientName: 'Liam Visser', age: 2 },
  { id: 'demo-5', patientName: 'Mila Smit', age: 0 },
  { id: 'demo-6', patientName: 'Lucas Meijer', age: 67 }
].map(enrichPatient)

const demoProfiles = [
  { baseTemp: 36.9, tempSwing: 0.08, baseBpm: 18, bpmSwing: 1, latencies: [42, 57, 64, 51, 69] },
  { baseTemp: 37.3, tempSwing: 0.12, baseBpm: 22, bpmSwing: 2, latencies: [75, 91, 88, 102, 84] },
  { baseTemp: 37.7, tempSwing: 0.16, baseBpm: 28, bpmSwing: 2, latencies: [118, 126, 139, 121, 132] },
  { baseTemp: 38.2, tempSwing: 0.14, baseBpm: 34, bpmSwing: 3, latencies: [150, 168, 159, 177, 162] },
  { baseTemp: 36.4, tempSwing: 0.11, baseBpm: 40, bpmSwing: 3, latencies: [66, 73, 79, 71, 85] },
  { baseTemp: 36.8, tempSwing: 0.07, baseBpm: 16, bpmSwing: 1, latencies: [97, 108, 99, 113, 104] }
]

function createInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    mode: 'demo',
    liveSelectedPatientId: null,
    live: null,
    demoNodes: []
  }
}

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  if (!fs.existsSync(patientsFile)) {
    fs.writeFileSync(patientsFile, JSON.stringify([], null, 2))
  }

  if (!fs.existsSync(stateFile)) {
    writeJson(stateFile, createInitialState())
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

function triangleWave(normalized) {
  return normalized < 0.5 ? normalized * 2 : (1 - normalized) * 2
}

function createDemoState() {
  const now = Date.now()
  const timeBucket = Math.floor(now / 1400)

  return demoPatients.map((patient, index) => {
    const profile = demoProfiles[index]
    const bpmDelta = Math.round(Math.sin(now / 4200 + index) * profile.bpmSwing)
    const breathsPerMinute = profile.baseBpm + bpmDelta
    const cycleMs = 60000 / Math.max(breathsPerMinute, 1)
    const phase = ((now + index * 850) % cycleMs) / cycleMs
    const breathingLevel = Math.round(8 + triangleWave(phase) * 84)
    const latencyMs = profile.latencies[(timeBucket + index) % profile.latencies.length]
    const tempC = Number((profile.baseTemp + Math.sin(now / 6000 + index * 0.7) * profile.tempSwing).toFixed(1))

    return {
      nodeId: index + 1,
      online: true,
      latencyMs,
      patientId: patient.id,
      patientName: patient.patientName,
      age: patient.age,
      minBreaths: patient.minBreaths,
      maxBreaths: patient.maxBreaths,
      groupLabel: patient.groupLabel,
      breathsPerMinute,
      breathingLevel,
      temperatureC: tempC,
      temperatureState: classifyTemperature(tempC),
      lastSeenEpochMs: now - latencyMs,
      source: 'demo'
    }
  })
}

function getRealPatients() {
  return readJson(patientsFile, []).map(enrichPatient)
}

function getPatientById(patientId, patients = getRealPatients()) {
  return patients.find((patient) => patient.id === patientId) || null
}

function deriveLiveSelectedPatientId(state, patients = getRealPatients()) {
  const legacySelectedId = typeof state.selectedPatientId === 'string' && !state.selectedPatientId.startsWith('demo-')
    ? state.selectedPatientId
    : null

  const candidateIds = [state.liveSelectedPatientId, legacySelectedId, state.live?.patientId]

  for (const candidateId of candidateIds) {
    if (typeof candidateId === 'string' && getPatientById(candidateId, patients)) {
      return candidateId
    }
  }

  return null
}

function normalizeState(state = {}) {
  const patients = getRealPatients()

  return {
    updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : new Date().toISOString(),
    mode: state.mode === 'live' ? 'live' : 'demo',
    liveSelectedPatientId: deriveLiveSelectedPatientId(state, patients),
    live: state.live && typeof state.live === 'object' ? state.live : null,
    demoNodes: Array.isArray(state.demoNodes) ? state.demoNodes : []
  }
}

function readState() {
  return normalizeState(readJson(stateFile, createInitialState()))
}

function writeState(state) {
  writeJson(stateFile, normalizeState(state))
}

function getSelectedPatient(state, patients = getRealPatients()) {
  return getPatientById(state.liveSelectedPatientId, patients)
}

function applyPatientToLiveState(live, patient) {
  if (!live || !patient) return live

  return {
    ...live,
    patientId: patient.id,
    patientName: patient.patientName,
    age: patient.age,
    minBreaths: patient.minBreaths,
    maxBreaths: patient.maxBreaths,
    groupLabel: patient.groupLabel
  }
}

function getStateResponse(state) {
  const responseState = {
    ...state,
    demoNodes: Array.isArray(state.demoNodes) ? state.demoNodes : []
  }

  if (responseState.mode === 'demo') {
    responseState.updatedAt = new Date().toISOString()
    responseState.demoNodes = createDemoState()
  }

  if (responseState.mode === 'live' && responseState.live) {
    const now = Date.now()
    const offlineAfterMs = 5000

    if ((now - Number(responseState.live.lastSeenEpochMs || 0)) > offlineAfterMs) {
      responseState.live = {
        ...responseState.live,
        online: false,
        source: 'stale'
      }
    }
  }

  return responseState
}

ensureDataFiles()

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.get('/api/config', (_req, res) => {
  res.json({
    demoPatients,
    ageGroups,
    authEnabled: false,
    theme: 'dark'
  })
})

app.get('/api/patients', (_req, res) => {
  const realPatients = getRealPatients()
  res.json({ realPatients, demoPatients })
})

app.post('/api/patients', (req, res) => {
  const patientName = String(req.body?.patientName || '').trim()
  const age = Number(req.body?.age)

  if (!patientName) {
    return res.status(400).json({ error: 'patientName is required' })
  }

  if (!Number.isFinite(age) || age < 0 || age > 120) {
    return res.status(400).json({ error: 'age must be between 0 and 120' })
  }

  const patients = getRealPatients()
  const patient = enrichPatient({
    id: `patient-${Date.now()}`,
    patientName,
    age
  })

  patients.push(patient)
  writeJson(patientsFile, patients)

  const state = readState()
  if (!state.liveSelectedPatientId) {
    state.liveSelectedPatientId = patient.id
    state.updatedAt = new Date().toISOString()
    writeState(state)
  }

  res.status(201).json(patient)
})

app.put('/api/patients/:id', (req, res) => {
  const patientId = String(req.params.id || '')
  const patientName = String(req.body?.patientName || '').trim()
  const age = Number(req.body?.age)

  if (!patientName) {
    return res.status(400).json({ error: 'patientName is required' })
  }

  if (!Number.isFinite(age) || age < 0 || age > 120) {
    return res.status(400).json({ error: 'age must be between 0 and 120' })
  }

  const patients = getRealPatients()
  const index = patients.findIndex((patient) => patient.id === patientId)

  if (index < 0) {
    return res.status(404).json({ error: 'patient not found' })
  }

  const updatedPatient = enrichPatient({
    id: patientId,
    patientName,
    age
  })

  patients[index] = updatedPatient
  writeJson(patientsFile, patients)

  const state = readState()
  if (state.live && state.liveSelectedPatientId === patientId) {
    state.live = applyPatientToLiveState(state.live, updatedPatient)
    state.updatedAt = new Date().toISOString()
    writeState(state)
  }

  res.json(updatedPatient)
})

app.get('/api/state', (_req, res) => {
  res.json(getStateResponse(readState()))
})

app.post('/api/mode', (req, res) => {
  const requestedMode = req.body?.mode === 'live' ? 'live' : 'demo'
  const state = readState()
  state.mode = requestedMode
  state.updatedAt = new Date().toISOString()
  writeState(state)
  res.json(getStateResponse(state))
})

app.post('/api/select-patient', (req, res) => {
  const state = readState()
  const patients = getRealPatients()
  const requestedId = String(req.body?.patientId || '')
  const selectedPatient = getPatientById(requestedId, patients)

  if (!selectedPatient) {
    return res.status(404).json({ error: 'patient not found' })
  }

  state.liveSelectedPatientId = selectedPatient.id
  state.live = applyPatientToLiveState(state.live, selectedPatient)
  state.updatedAt = new Date().toISOString()
  writeState(state)
  res.json(getStateResponse(state))
})

app.post('/api/medsense', (req, res) => {
  const now = Date.now()
  const body = req.body || {}

  const fallbackPatientName = String(body.patientName || 'Live patient').trim()
  const fallbackAge = Number.isFinite(Number(body.age)) ? Number(body.age) : 34
  const nodeId = Number.isFinite(Number(body.nodeId)) ? Number(body.nodeId) : 1
  const breathsPerMinute = Number.isFinite(Number(body.breathsPerMinute)) ? Number(body.breathsPerMinute) : 0
  const breathingLevel = Number.isFinite(Number(body.breathingLevel)) ? Number(body.breathingLevel) : 0
  const temperatureC = Number.isFinite(Number(body.temperatureC)) ? Number(body.temperatureC) : 0
  const latencyMs = Number.isFinite(Number(body.latencyMs)) ? Number(body.latencyMs) : 0

  const state = readState()
  const selectedPatient = getSelectedPatient(state)
  const patientName = selectedPatient?.patientName || fallbackPatientName
  const age = selectedPatient?.age ?? fallbackAge
  const band = ageToBand(age)

  state.updatedAt = new Date().toISOString()
  state.live = {
    nodeId,
    online: true,
    latencyMs,
    patientId: selectedPatient?.id || 'live-patient',
    patientName,
    age,
    minBreaths: band.minBpm,
    maxBreaths: band.maxBpm,
    groupLabel: band.label,
    breathsPerMinute,
    breathingLevel,
    temperatureC,
    temperatureState: classifyTemperature(temperatureC),
    lastSeenEpochMs: now,
    source: 'esp32'
  }

  writeState(state)
  res.json({ ok: true, receivedAt: state.updatedAt })
})

const distDir = path.join(__dirname, 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next()
    }
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(port, '0.0.0.0', () => {
  console.log(`MedSense HMI running on port ${port}`)
})
