import crypto from 'crypto'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const port = Number(process.env.PORT || 3000)
const offlineAfterMs = 5000

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
  const value = Number(tempC)
  if (!Number.isFinite(value)) return 'normal'
  if (value > 38 || value < 36) return 'alarm'
  if (value > 37.5 || value < 36.5) return 'warning'
  return 'normal'
}

function ageToBand(age) {
  const value = Number(age)
  return ageGroups.find((group) => value >= group.minAge && value <= group.maxAge) || ageGroups[0]
}

function defaultTargetBpm(age) {
  const band = ageToBand(age)
  return Math.round((band.minBpm + band.maxBpm) / 2)
}

function createInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    selectedPatientId: null,
    nodeStates: {}
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

function createPatientChecksum(patient) {
  return crypto
    .createHash('md5')
    .update(
      JSON.stringify({
        nodeId: patient.nodeId,
        patientName: patient.patientName,
        age: patient.age,
        targetBpm: patient.targetBpm
      })
    )
    .digest('hex')
}

function enrichPatient(patient, fallbackNodeId) {
  const age = Number(patient.age)
  const band = ageToBand(age)
  const targetBpm = Number.isFinite(Number(patient.targetBpm))
    ? Number(patient.targetBpm)
    : defaultTargetBpm(age)

  const normalizedPatient = {
    id: String(patient.id || `patient-${Date.now()}`),
    nodeId: Number.isFinite(Number(patient.nodeId)) ? Number(patient.nodeId) : fallbackNodeId,
    patientName: String(patient.patientName || '').trim(),
    age,
    targetBpm,
    referenceMinBpm: band.minBpm,
    referenceMaxBpm: band.maxBpm,
    groupLabel: band.label,
    updatedAt: typeof patient.updatedAt === 'string' ? patient.updatedAt : new Date().toISOString()
  }

  return {
    ...normalizedPatient,
    profileChecksum: createPatientChecksum(normalizedPatient)
  }
}

function getRealPatients() {
  const rawPatients = readJson(patientsFile, [])

  return rawPatients
    .map((patient, index) => enrichPatient(patient, index + 1))
    .sort((left, right) => left.nodeId - right.nodeId)
}

function writePatients(patients) {
  writeJson(patientsFile, patients)
}

function nextNodeId(patients) {
  return patients.reduce((maxNodeId, patient) => Math.max(maxNodeId, Number(patient.nodeId) || 0), 0) + 1
}

function getPatientById(patientId, patients = getRealPatients()) {
  return patients.find((patient) => patient.id === patientId) || null
}

function getPatientByNodeId(nodeId, patients = getRealPatients()) {
  return patients.find((patient) => patient.nodeId === Number(nodeId)) || null
}

function normalizeNodeState(nodeState = {}) {
  const nodeId = Number(nodeState.nodeId)
  if (!Number.isFinite(nodeId)) return null

  return {
    nodeId,
    online: Boolean(nodeState.online),
    latencyMs: Number.isFinite(Number(nodeState.latencyMs)) ? Number(nodeState.latencyMs) : 0,
    breathsPerMinute: Number.isFinite(Number(nodeState.breathsPerMinute)) ? Number(nodeState.breathsPerMinute) : 0,
    breathingLevel: Number.isFinite(Number(nodeState.breathingLevel)) ? Number(nodeState.breathingLevel) : 0,
    temperatureC: Number.isFinite(Number(nodeState.temperatureC)) ? Number(nodeState.temperatureC) : null,
    temperatureState: classifyTemperature(nodeState.temperatureC),
    lastSeenEpochMs: Number.isFinite(Number(nodeState.lastSeenEpochMs)) ? Number(nodeState.lastSeenEpochMs) : 0,
    source: String(nodeState.source || 'gateway')
  }
}

function normalizeState(state = {}) {
  const patients = getRealPatients()
  const nodeStates = {}

  const rawNodeStates = state.nodeStates && typeof state.nodeStates === 'object' ? state.nodeStates : {}
  Object.entries(rawNodeStates).forEach(([, rawNodeState]) => {
    const normalizedNodeState = normalizeNodeState(rawNodeState)
    if (normalizedNodeState) {
      nodeStates[String(normalizedNodeState.nodeId)] = normalizedNodeState
    }
  })

  const legacyLiveState = normalizeNodeState(state.live)
  if (legacyLiveState && !nodeStates[String(legacyLiveState.nodeId)]) {
    nodeStates[String(legacyLiveState.nodeId)] = legacyLiveState
  }

  const patientIds = new Set(patients.map((patient) => patient.id))
  const selectedPatientId = typeof state.selectedPatientId === 'string' && patientIds.has(state.selectedPatientId)
    ? state.selectedPatientId
    : patients[0]?.id || null

  return {
    updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : new Date().toISOString(),
    selectedPatientId,
    nodeStates
  }
}

function readState() {
  return normalizeState(readJson(stateFile, createInitialState()))
}

function writeState(state) {
  writeJson(stateFile, normalizeState(state))
}

function withComputedNodeStatus(state) {
  const responseState = {
    ...state,
    nodeStates: {}
  }

  Object.entries(state.nodeStates || {}).forEach(([nodeKey, rawNodeState]) => {
    const nodeState = normalizeNodeState(rawNodeState)
    if (!nodeState) return

    responseState.nodeStates[nodeKey] = {
      ...nodeState,
      online: (Date.now() - nodeState.lastSeenEpochMs) <= offlineAfterMs
    }
  })

  return responseState
}

function toGatewayPatient(patient) {
  if (!patient) return null

  return {
    id: patient.id,
    nodeId: patient.nodeId,
    patientName: patient.patientName,
    age: patient.age,
    targetBpm: patient.targetBpm,
    referenceMinBpm: patient.referenceMinBpm,
    referenceMaxBpm: patient.referenceMaxBpm,
    groupLabel: patient.groupLabel,
    profileChecksum: patient.profileChecksum
  }
}

function gatewayListChecksum(patients) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(patients.map((patient) => toGatewayPatient(patient))))
    .digest('hex')
}

ensureDataFiles()

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.get('/api/config', (_req, res) => {
  res.json({
    ageGroups,
    authEnabled: false,
    theme: 'dark',
    languages: ['en', 'nl', 'ja']
  })
})

app.get('/patients.json', (_req, res) => {
  res.json(getRealPatients())
})

app.get('/api/patients', (_req, res) => {
  const state = readState()
  res.json({
    patients: getRealPatients(),
    selectedPatientId: state.selectedPatientId
  })
})

app.get('/api/gateway/patients', (req, res) => {
  const patients = getRealPatients()
  const checksum = gatewayListChecksum(patients)
  const requestedChecksum = String(req.query.checksum || '')
  const changed = requestedChecksum !== checksum

  res.json({
    checksum,
    changed,
    patients: changed ? patients.map((patient) => toGatewayPatient(patient)) : []
  })
})

app.post('/api/patients', (req, res) => {
  const patientName = String(req.body?.patientName || '').trim()
  const age = Number(req.body?.age)
  const requestedTargetBpm = req.body?.targetBpm

  if (!patientName) {
    return res.status(400).json({ error: 'patientName is required' })
  }

  if (!Number.isFinite(age) || age < 0 || age > 120) {
    return res.status(400).json({ error: 'age must be between 0 and 120' })
  }

  if (requestedTargetBpm !== undefined && requestedTargetBpm !== null && requestedTargetBpm !== '' && (!Number.isFinite(Number(requestedTargetBpm)) || Number(requestedTargetBpm) < 1 || Number(requestedTargetBpm) > 120)) {
    return res.status(400).json({ error: 'targetBpm must be between 1 and 120' })
  }

  const patients = getRealPatients()
  const patient = enrichPatient(
    {
      id: `patient-${Date.now()}`,
      nodeId: nextNodeId(patients),
      patientName,
      age,
      targetBpm: requestedTargetBpm
    },
    nextNodeId(patients)
  )

  patients.push(patient)
  writePatients(patients)

  const state = readState()
  if (!state.selectedPatientId) {
    state.selectedPatientId = patient.id
  }
  state.updatedAt = new Date().toISOString()
  writeState(state)

  res.status(201).json(patient)
})

app.put('/api/patients/:id', (req, res) => {
  const patientId = String(req.params.id || '')
  const patientName = String(req.body?.patientName || '').trim()
  const age = Number(req.body?.age)
  const requestedTargetBpm = req.body?.targetBpm

  if (!patientName) {
    return res.status(400).json({ error: 'patientName is required' })
  }

  if (!Number.isFinite(age) || age < 0 || age > 120) {
    return res.status(400).json({ error: 'age must be between 0 and 120' })
  }

  if (requestedTargetBpm !== undefined && requestedTargetBpm !== null && requestedTargetBpm !== '' && (!Number.isFinite(Number(requestedTargetBpm)) || Number(requestedTargetBpm) < 1 || Number(requestedTargetBpm) > 120)) {
    return res.status(400).json({ error: 'targetBpm must be between 1 and 120' })
  }

  const patients = getRealPatients()
  const index = patients.findIndex((patient) => patient.id === patientId)

  if (index < 0) {
    return res.status(404).json({ error: 'patient not found' })
  }

  const existingPatient = patients[index]
  const updatedPatient = enrichPatient(
    {
      ...existingPatient,
      patientName,
      age,
      targetBpm: requestedTargetBpm,
      updatedAt: new Date().toISOString()
    },
    existingPatient.nodeId
  )

  patients[index] = updatedPatient
  writePatients(patients)

  const state = readState()
  state.updatedAt = new Date().toISOString()
  writeState(state)

  res.json(updatedPatient)
})

app.get('/api/state', (_req, res) => {
  res.json(withComputedNodeStatus(readState()))
})

app.post('/api/select-patient', (req, res) => {
  const patientId = String(req.body?.patientId || '')
  const patient = getPatientById(patientId)

  if (!patient) {
    return res.status(404).json({ error: 'patient not found' })
  }

  const state = readState()
  state.selectedPatientId = patient.id
  state.updatedAt = new Date().toISOString()
  writeState(state)

  res.json(withComputedNodeStatus(state))
})

app.post('/api/medsense', (req, res) => {
  const now = Date.now()
  const body = req.body || {}
  const nodeId = Number(body.nodeId)

  if (!Number.isFinite(nodeId) || nodeId < 1) {
    return res.status(400).json({ error: 'nodeId is required and must be >= 1' })
  }

  const breathsPerMinute = Number.isFinite(Number(body.breathsPerMinute)) ? Number(body.breathsPerMinute) : 0
  const breathingLevel = Number.isFinite(Number(body.breathingLevel)) ? Number(body.breathingLevel) : 0
  const temperatureC = Number.isFinite(Number(body.temperatureC)) ? Number(body.temperatureC) : null
  const latencyMs = Number.isFinite(Number(body.latencyMs)) ? Number(body.latencyMs) : 0
  const patientChecksum = String(body.patientChecksum || '')

  const state = readState()
  state.nodeStates[String(nodeId)] = {
    nodeId,
    online: true,
    latencyMs,
    breathsPerMinute,
    breathingLevel,
    temperatureC,
    temperatureState: classifyTemperature(temperatureC),
    lastSeenEpochMs: now,
    source: 'gateway'
  }
  state.updatedAt = new Date().toISOString()

  const patient = getPatientByNodeId(nodeId)
  if (!state.selectedPatientId && patient) {
    state.selectedPatientId = patient.id
  }

  writeState(state)

  const patientChanged = Boolean(patient) && patient.profileChecksum !== patientChecksum

  res.json({
    ok: true,
    receivedAt: state.updatedAt,
    patientChecksum: patient?.profileChecksum || null,
    patientChanged,
    patient: patientChanged ? toGatewayPatient(patient) : null
  })
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
