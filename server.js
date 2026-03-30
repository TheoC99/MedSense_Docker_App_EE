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
const defaultNormalTempMinC = 36.5
const defaultNormalTempMaxC = 37.5
const temperatureWarningOffsetC = 0.5

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

function parseFiniteNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10
}

function defaultTemperatureRange() {
  return {
    minC: defaultNormalTempMinC,
    maxC: defaultNormalTempMaxC
  }
}

function resolveTemperatureRange(patient = {}) {
  const defaults = defaultTemperatureRange()
  const minC = parseFiniteNumber(patient.normalTempMinC)
  const maxC = parseFiniteNumber(patient.normalTempMaxC)

  if (minC === null || maxC === null || minC > maxC) {
    return defaults
  }

  return {
    minC: roundToOneDecimal(minC),
    maxC: roundToOneDecimal(maxC)
  }
}

function classifyTemperature(tempC, patient) {
  const value = parseFiniteNumber(tempC)
  if (value === null) return 'normal'

  const range = resolveTemperatureRange(patient)

  if (value > range.maxC + temperatureWarningOffsetC || value < range.minC - temperatureWarningOffsetC) {
    return 'alarm'
  }

  if (value > range.maxC || value < range.minC) {
    return 'warning'
  }

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

function resolveBreathingRange(patient = {}, age) {
  const band = ageToBand(age)
  const minBpm = parseFiniteNumber(patient.referenceMinBpm)
  const maxBpm = parseFiniteNumber(patient.referenceMaxBpm)

  if (minBpm === null || maxBpm === null || minBpm < 1 || maxBpm > 120 || minBpm > maxBpm) {
    return {
      minBpm: band.minBpm,
      maxBpm: band.maxBpm,
      groupLabel: band.label
    }
  }

  return {
    minBpm: Math.round(minBpm),
    maxBpm: Math.round(maxBpm),
    groupLabel: band.label
  }
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
        targetBpm: patient.targetBpm,
        referenceMinBpm: patient.referenceMinBpm,
        referenceMaxBpm: patient.referenceMaxBpm,
        normalTempMinC: patient.normalTempMinC,
        normalTempMaxC: patient.normalTempMaxC
      })
    )
    .digest('hex')
}

function enrichPatient(patient, fallbackNodeId) {
  const age = parseFiniteNumber(patient.age) ?? 0
  const breathingRange = resolveBreathingRange(patient, age)
  const temperatureRange = resolveTemperatureRange(patient)
  const requestedTargetBpm = parseFiniteNumber(patient.targetBpm)
  const targetBpm = requestedTargetBpm !== null
    ? Math.round(requestedTargetBpm)
    : Math.round((breathingRange.minBpm + breathingRange.maxBpm) / 2)

  const normalizedPatient = {
    id: String(patient.id || `patient-${Date.now()}`),
    nodeId: parseFiniteNumber(patient.nodeId) ?? fallbackNodeId,
    patientName: String(patient.patientName || '').trim(),
    age,
    targetBpm,
    referenceMinBpm: breathingRange.minBpm,
    referenceMaxBpm: breathingRange.maxBpm,
    normalTempMinC: temperatureRange.minC,
    normalTempMaxC: temperatureRange.maxC,
    groupLabel: breathingRange.groupLabel,
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
  const usedNodeIds = new Set(
    patients
      .map((patient) => parseFiniteNumber(patient.nodeId))
      .filter((nodeId) => nodeId !== null)
      .map((nodeId) => Math.round(nodeId))
      .filter((nodeId) => nodeId > 0)
  )

  let candidate = 1
  while (usedNodeIds.has(candidate)) {
    candidate += 1
  }

  return candidate
}

function getPatientById(patientId, patients = getRealPatients()) {
  return patients.find((patient) => patient.id === patientId) || null
}

function getPatientByNodeId(nodeId, patients = getRealPatients()) {
  return patients.find((patient) => patient.nodeId === Number(nodeId)) || null
}

function normalizeNodeState(nodeState = {}) {
  const nodeId = parseFiniteNumber(nodeState.nodeId)
  if (nodeId === null) return null

  return {
    nodeId: Math.round(nodeId),
    online: Boolean(nodeState.online),
    latencyMs: parseFiniteNumber(nodeState.latencyMs) ?? 0,
    breathsPerMinute: parseFiniteNumber(nodeState.breathsPerMinute) ?? 0,
    breathingLevel: parseFiniteNumber(nodeState.breathingLevel) ?? 0,
    temperatureC: parseFiniteNumber(nodeState.temperatureC),
    temperatureState: String(nodeState.temperatureState || 'normal'),
    lastSeenEpochMs: parseFiniteNumber(nodeState.lastSeenEpochMs) ?? 0,
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
  const patientsByNodeId = new Map(getRealPatients().map((patient) => [String(patient.nodeId), patient]))
  const responseState = {
    ...state,
    nodeStates: {}
  }

  Object.entries(state.nodeStates || {}).forEach(([nodeKey, rawNodeState]) => {
    const nodeState = normalizeNodeState(rawNodeState)
    if (!nodeState) return

    const patient = patientsByNodeId.get(String(nodeState.nodeId)) || null
    responseState.nodeStates[nodeKey] = {
      ...nodeState,
      online: (Date.now() - nodeState.lastSeenEpochMs) <= offlineAfterMs,
      temperatureState: classifyTemperature(nodeState.temperatureC, patient)
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
    normalTempMinC: patient.normalTempMinC,
    normalTempMaxC: patient.normalTempMaxC,
    groupLabel: patient.groupLabel,
    profileChecksum: patient.profileChecksum
  }
}

function validatePatientPayload(body) {
  const patientName = String(body?.patientName || '').trim()
  const age = parseFiniteNumber(body?.age)
  const requestedTargetBpm = body?.targetBpm
  const referenceMinBpm = body?.referenceMinBpm
  const referenceMaxBpm = body?.referenceMaxBpm
  const normalTempMinC = body?.normalTempMinC
  const normalTempMaxC = body?.normalTempMaxC

  if (!patientName) {
    return { error: 'patientName is required' }
  }

  if (age === null || age < 0 || age > 120) {
    return { error: 'age must be between 0 and 120' }
  }

  if (requestedTargetBpm !== undefined && requestedTargetBpm !== null && requestedTargetBpm !== '' && ((parseFiniteNumber(requestedTargetBpm) ?? 0) < 1 || (parseFiniteNumber(requestedTargetBpm) ?? 0) > 120)) {
    return { error: 'targetBpm must be between 1 and 120' }
  }

  const parsedTargetBpm = parseFiniteNumber(requestedTargetBpm)
  if (referenceMinBpm !== undefined && referenceMinBpm !== null && referenceMinBpm !== '' && ((parseFiniteNumber(referenceMinBpm) ?? 0) < 1 || (parseFiniteNumber(referenceMinBpm) ?? 0) > 120)) {
    return { error: 'referenceMinBpm must be between 1 and 120' }
  }

  if (referenceMaxBpm !== undefined && referenceMaxBpm !== null && referenceMaxBpm !== '' && ((parseFiniteNumber(referenceMaxBpm) ?? 0) < 1 || (parseFiniteNumber(referenceMaxBpm) ?? 0) > 120)) {
    return { error: 'referenceMaxBpm must be between 1 and 120' }
  }

  const parsedReferenceMinBpm = parseFiniteNumber(referenceMinBpm)
  const parsedReferenceMaxBpm = parseFiniteNumber(referenceMaxBpm)
  if (parsedReferenceMinBpm !== null && parsedReferenceMaxBpm !== null && parsedReferenceMinBpm > parsedReferenceMaxBpm) {
    return { error: 'referenceMinBpm must be <= referenceMaxBpm' }
  }

  if (normalTempMinC !== undefined && normalTempMinC !== null && normalTempMinC !== '' && ((parseFiniteNumber(normalTempMinC) ?? 0) < 30 || (parseFiniteNumber(normalTempMinC) ?? 0) > 45)) {
    return { error: 'normalTempMinC must be between 30 and 45' }
  }

  if (normalTempMaxC !== undefined && normalTempMaxC !== null && normalTempMaxC !== '' && ((parseFiniteNumber(normalTempMaxC) ?? 0) < 30 || (parseFiniteNumber(normalTempMaxC) ?? 0) > 45)) {
    return { error: 'normalTempMaxC must be between 30 and 45' }
  }

  const parsedNormalTempMinC = parseFiniteNumber(normalTempMinC)
  const parsedNormalTempMaxC = parseFiniteNumber(normalTempMaxC)
  if (parsedNormalTempMinC !== null && parsedNormalTempMaxC !== null && parsedNormalTempMinC > parsedNormalTempMaxC) {
    return { error: 'normalTempMinC must be <= normalTempMaxC' }
  }

  return {
    patientName,
    age,
    targetBpm: requestedTargetBpm === undefined || requestedTargetBpm === null || requestedTargetBpm === ''
      ? undefined
      : Math.round(parsedTargetBpm),
    referenceMinBpm: referenceMinBpm === undefined || referenceMinBpm === null || referenceMinBpm === ''
      ? undefined
      : Math.round(parsedReferenceMinBpm),
    referenceMaxBpm: referenceMaxBpm === undefined || referenceMaxBpm === null || referenceMaxBpm === ''
      ? undefined
      : Math.round(parsedReferenceMaxBpm),
    normalTempMinC: normalTempMinC === undefined || normalTempMinC === null || normalTempMinC === ''
      ? undefined
      : roundToOneDecimal(parsedNormalTempMinC),
    normalTempMaxC: normalTempMaxC === undefined || normalTempMaxC === null || normalTempMaxC === ''
      ? undefined
      : roundToOneDecimal(parsedNormalTempMaxC)
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
    defaultTemperatureRange: defaultTemperatureRange(),
    temperatureWarningOffsetC,
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
  const payload = validatePatientPayload(req.body)
  if (payload.error) {
    return res.status(400).json({ error: payload.error })
  }

  const patients = getRealPatients()
  const nodeId = nextNodeId(patients)
  const patient = enrichPatient(
    {
      id: `patient-${Date.now()}`,
      nodeId,
      ...payload
    },
    nodeId
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
  const payload = validatePatientPayload(req.body)
  if (payload.error) {
    return res.status(400).json({ error: payload.error })
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
      patientName: payload.patientName,
      age: payload.age,
      targetBpm: payload.targetBpm ?? existingPatient.targetBpm,
      referenceMinBpm: payload.referenceMinBpm ?? existingPatient.referenceMinBpm,
      referenceMaxBpm: payload.referenceMaxBpm ?? existingPatient.referenceMaxBpm,
      normalTempMinC: payload.normalTempMinC ?? existingPatient.normalTempMinC,
      normalTempMaxC: payload.normalTempMaxC ?? existingPatient.normalTempMaxC,
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

app.delete('/api/patients/:id', (req, res) => {
  const patientId = String(req.params.id || '')
  const patients = getRealPatients()
  const index = patients.findIndex((patient) => patient.id === patientId)

  if (index < 0) {
    return res.status(404).json({ error: 'patient not found' })
  }

  const [removedPatient] = patients.splice(index, 1)
  writePatients(patients)

  const state = readState()
  if (state.selectedPatientId === removedPatient.id) {
    state.selectedPatientId = patients[0]?.id || null
  }
  state.updatedAt = new Date().toISOString()
  writeState(state)

  res.json({
    ok: true,
    removedPatientId: removedPatient.id,
    selectedPatientId: state.selectedPatientId
  })
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
  const patient = getPatientByNodeId(nodeId)

  const state = readState()
  state.nodeStates[String(nodeId)] = {
    nodeId,
    online: true,
    latencyMs,
    breathsPerMinute,
    breathingLevel,
    temperatureC,
    temperatureState: classifyTemperature(temperatureC, patient),
    lastSeenEpochMs: now,
    source: 'gateway'
  }
  state.updatedAt = new Date().toISOString()

  if (!state.selectedPatientId && patient) {
    state.selectedPatientId = patient.id
  }

  writeState(state)

  const patientChanged = patient ? patient.profileChecksum !== patientChecksum : Boolean(patientChecksum)

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
