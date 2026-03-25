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

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  if (!fs.existsSync(patientsFile)) {
    fs.writeFileSync(patientsFile, JSON.stringify([], null, 2))
  }

  if (!fs.existsSync(stateFile)) {
    fs.writeFileSync(
      stateFile,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          mode: 'demo',
          selectedPatientId: 'demo-1',
          live: null,
          demoNodes: createDemoState()
        },
        null,
        2
      )
    )
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

function createDemoState() {
  const now = Date.now()
  return demoPatients.map((patient, index) => {
    const bpm = [18, 24, 30, 34, 44, 16][index]
    const tempC = [36.9, 37.3, 37.7, 38.2, 36.4, 36.8][index]
    return {
      nodeId: index + 1,
      online: true,
      latencyMs: 80 + index * 25,
      patientId: patient.id,
      patientName: patient.patientName,
      age: patient.age,
      minBreaths: patient.minBreaths,
      maxBreaths: patient.maxBreaths,
      groupLabel: patient.groupLabel,
      breathsPerMinute: bpm,
      breathingLevel: 30 + index * 10,
      temperatureC: tempC,
      temperatureState: classifyTemperature(tempC),
      lastSeenEpochMs: now - index * 400,
      source: 'demo'
    }
  })
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
  const realPatients = readJson(patientsFile, [])
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

  const patients = readJson(patientsFile, [])
  const patient = enrichPatient({
    id: `patient-${Date.now()}`,
    patientName,
    age
  })

  patients.push(patient)
  writeJson(patientsFile, patients)
  res.status(201).json(patient)
})

app.get('/api/state', (_req, res) => {
  const fallback = {
    updatedAt: new Date().toISOString(),
    mode: 'demo',
    selectedPatientId: 'demo-1',
    live: null,
    demoNodes: createDemoState()
  }

  const state = readJson(stateFile, fallback)

  if (state.mode === 'demo') {
    state.demoNodes = createDemoState()
    state.updatedAt = new Date().toISOString()
    writeJson(stateFile, state)
  }

  res.json(state)
})

app.post('/api/mode', (req, res) => {
  const requestedMode = req.body?.mode === 'live' ? 'live' : 'demo'
  const state = readJson(stateFile, {})
  state.mode = requestedMode
  state.updatedAt = new Date().toISOString()
  writeJson(stateFile, state)
  res.json(state)
})

app.post('/api/select-patient', (req, res) => {
  const state = readJson(stateFile, {})
  state.selectedPatientId = String(req.body?.patientId || state.selectedPatientId || 'demo-1')
  state.updatedAt = new Date().toISOString()
  writeJson(stateFile, state)
  res.json(state)
})

app.post('/api/medsense', (req, res) => {
  const now = Date.now()
  const body = req.body || {}

  const patientName = String(body.patientName || 'Live patient').trim()
  const age = Number.isFinite(Number(body.age)) ? Number(body.age) : 34
  const nodeId = Number.isFinite(Number(body.nodeId)) ? Number(body.nodeId) : 1
  const breathsPerMinute = Number.isFinite(Number(body.breathsPerMinute)) ? Number(body.breathsPerMinute) : 0
  const breathingLevel = Number.isFinite(Number(body.breathingLevel)) ? Number(body.breathingLevel) : 0
  const temperatureC = Number.isFinite(Number(body.temperatureC)) ? Number(body.temperatureC) : 0
  const latencyMs = Number.isFinite(Number(body.latencyMs)) ? Number(body.latencyMs) : 0
  const band = ageToBand(age)

  const state = readJson(stateFile, {})
  state.mode = body.mode === 'demo' ? 'demo' : 'live'
  state.updatedAt = new Date().toISOString()
  state.live = {
    nodeId,
    online: true,
    latencyMs,
    patientId: 'live-patient',
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

  writeJson(stateFile, state)
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
