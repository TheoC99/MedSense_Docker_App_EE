import { useEffect, useMemo, useState } from 'react'

const pollMs = 1000

function formatTemp(temp) {
  if (temp === null || temp === undefined || Number.isNaN(Number(temp))) return '--.-'
  return Number(temp).toFixed(1)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function bpmStatus(value, minBreaths, maxBreaths) {
  if (!Number.isFinite(Number(value))) return 'normal'
  const bpm = Number(value)
  if (bpm < minBreaths || bpm > maxBreaths) return 'alarm'
  if (bpm <= minBreaths + 2 || bpm >= maxBreaths - 2) return 'warning'
  return 'normal'
}

function emptyForm() {
  return { id: '', patientName: '', age: '' }
}

function App() {
  const [config, setConfig] = useState(null)
  const [patients, setPatients] = useState({ realPatients: [], demoPatients: [] })
  const [state, setState] = useState(null)
  const [selectedId, setSelectedId] = useState('demo-1')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [theme, setTheme] = useState('dark')
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    loadAll()
    const timer = setInterval(loadState, pollMs)
    return () => clearInterval(timer)
  }, [])

  async function loadAll() {
    const [configRes, patientsRes, stateRes] = await Promise.all([
      fetch('/api/config'),
      fetch('/api/patients'),
      fetch('/api/state')
    ])
    const configData = await configRes.json()
    const patientsData = await patientsRes.json()
    const stateData = await stateRes.json()
    setConfig(configData)
    setPatients(patientsData)
    setState(stateData)
    setSelectedId((previous) => previous || stateData.selectedPatientId || 'demo-1')
  }

  async function loadState() {
    const response = await fetch('/api/state')
    const data = await response.json()
    setState(data)
  }

  async function reloadPatients() {
    const patientsRes = await fetch('/api/patients')
    const patientsData = await patientsRes.json()
    setPatients(patientsData)
    return patientsData
  }

  async function changeMode(mode) {
    await fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    })
    await Promise.all([loadState(), reloadPatients()])
  }

  async function selectPatient(patientId) {
    setSelectedId(patientId)
    await fetch('/api/select-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId })
    })
    await loadState()
  }

  function openAddPatient() {
    setFormMode('add')
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEditPatient() {
    const selectedPatient = patients.realPatients.find((patient) => patient.id === selectedId)
    if (!selectedPatient) return
    setFormMode('edit')
    setForm({
      id: selectedPatient.id,
      patientName: selectedPatient.patientName,
      age: String(selectedPatient.age)
    })
    setShowForm(true)
  }

  async function submitPatient(event) {
    event.preventDefault()

    const payload = {
      patientName: form.patientName,
      age: Number(form.age)
    }

    const url = formMode === 'edit' ? `/api/patients/${form.id}` : '/api/patients'
    const method = formMode === 'edit' ? 'PUT' : 'POST'

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    setForm(emptyForm())
    setShowForm(false)
    const patientsData = await reloadPatients()

    if (formMode === 'add') {
      const newestPatient = patientsData.realPatients[patientsData.realPatients.length - 1]
      if (newestPatient) {
        await selectPatient(newestPatient.id)
      }
    } else if (form.id) {
      await selectPatient(form.id)
    }

    await loadState()
  }

  const isDemo = state?.mode !== 'live'
  const list = isDemo ? patients.demoPatients : patients.realPatients

  const current = useMemo(() => {
    if (!state) return null
    if (isDemo) {
      return state.demoNodes?.find((item) => item.patientId === selectedId) || state.demoNodes?.[0] || null
    }

    const selectedPatient = patients.realPatients.find((patient) => patient.id === selectedId)
    if (!state.live && selectedPatient) {
      return {
        ...selectedPatient,
        online: false,
        latencyMs: '--',
        breathsPerMinute: '--',
        breathingLevel: 0,
        temperatureC: null,
        temperatureState: 'normal',
        source: 'waiting',
        nodeId: '--'
      }
    }

    if (selectedPatient && state.live) {
      return {
        ...state.live,
        patientId: selectedPatient.id,
        patientName: selectedPatient.patientName,
        age: selectedPatient.age,
        minBreaths: selectedPatient.minBreaths,
        maxBreaths: selectedPatient.maxBreaths,
        groupLabel: selectedPatient.groupLabel
      }
    }

    return state.live
  }, [state, isDemo, selectedId, patients.realPatients])

  const currentBpmStatus = current ? bpmStatus(current.breathsPerMinute, current.minBreaths, current.maxBreaths) : 'normal'
  const breathingHeight = current ? clamp(Number(current.breathingLevel), 0, 100) : 0
  const bpmPercent = current
    ? clamp((Number(current.breathsPerMinute) / Math.max(current.maxBreaths + 10, 1)) * 100, 0, 100)
    : 0

  return (
    <div className={`app ${theme}`}>
      <header className="topbar">
        <div>
          <div className="eyebrow">MedSense HMI</div>
          <h1>{current?.patientName || 'No patient selected'}</h1>
          <div className="subtle">
            {current ? `${current.age} years · ${current.minBreaths}-${current.maxBreaths} bpm` : 'Waiting for data'}
          </div>
        </div>

        <div className="topbar-actions">
          {!isDemo && patients.realPatients.length > 0 && (
            <button className="mode-btn" onClick={openEditPatient}>Edit patient</button>
          )}
          <button className={`mode-btn ${isDemo ? 'active' : ''}`} onClick={() => changeMode('demo')}>Demo</button>
          <button className={`mode-btn ${!isDemo ? 'active' : ''}`} onClick={() => changeMode('live')}>Live</button>
          <button className="mode-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'White mode' : 'Dark mode'}
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="card temp-card">
          <div className="section-title">Temperature</div>
          <div className={`temp-value ${current?.temperatureState || 'normal'}`}>{formatTemp(current?.temperatureC)} °C</div>
          <div className="subtle">Normal 36.5-37.5 °C</div>
        </section>

        <section className="center-panel">
          <div className="card breathing-card">
            <div className="section-title">Breathing cycle</div>
            <div className="breathing-wrap">
              <div className="breathing-bar-shell">
                <div className="breathing-bar-fill" style={{ height: `${breathingHeight}%` }} />
              </div>
              <div className="breathing-scale">
                <span>Inhale</span>
                <span>Exhale</span>
              </div>
            </div>
          </div>

          <div className="card gauge-card">
            <div className="section-title">Breaths per minute</div>
            <div className="gauge-shell">
              <div
                className="gauge-ring"
                style={{
                  background: `conic-gradient(${currentBpmStatus === 'alarm' ? '#ef4444' : currentBpmStatus === 'warning' ? '#f59e0b' : '#22c55e'} 0 ${bpmPercent}%, rgba(148,163,184,0.15) ${bpmPercent}% 100%)`
                }}
              >
                <div className="gauge-inner">
                  <div className="gauge-value">{current?.breathsPerMinute ?? '--'}</div>
                  <div className="subtle">target {current ? `${current.minBreaths}-${current.maxBreaths}` : '--'}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card status-card">
          <div className="section-title">Node status</div>
          <div className="status-grid">
            <div>
              <div className={`status-pill ${current?.online ? 'online' : 'offline'}`}>{current?.online ? 'Online' : 'Offline'}</div>
            </div>
            <div>
              <div className="label">Node</div>
              <div className="metric">{current?.nodeId ?? '--'}</div>
            </div>
            <div>
              <div className="label">Latency</div>
              <div className="metric">{current?.latencyMs ?? '--'} ms</div>
            </div>
            <div>
              <div className="label">Source</div>
              <div className="metric">{current?.source || '--'}</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="patients-panel card">
        <div className="patients-header">
          <div>
            <div className="section-title">Patients / nodes</div>
            <div className="subtle">{isDemo ? '6 demo profiles' : 'Live patient list'}</div>
          </div>
          {!isDemo && (
            <div className="topbar-actions">
              {patients.realPatients.length > 0 && (
                <button className="mode-btn" onClick={openEditPatient}>Edit</button>
              )}
              <button className="add-btn" onClick={openAddPatient}>+</button>
            </div>
          )}
        </div>

        <div className="patient-tabs">
          {list.map((patient, index) => (
            <button
              key={patient.id}
              className={`patient-tab ${selectedId === patient.id ? 'active' : ''}`}
              onClick={() => selectPatient(patient.id)}
            >
              <span className="patient-index">{index + 1}</span>
              <span className="patient-name">{patient.patientName}</span>
            </button>
          ))}
        </div>
      </footer>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>{formMode === 'edit' ? 'Edit patient' : 'Add patient'}</h2>
            <form onSubmit={submitPatient} className="patient-form">
              <label>
                Patient name
                <input
                  value={form.patientName}
                  onChange={(event) => setForm({ ...form, patientName: event.target.value })}
                  required
                />
              </label>
              <label>
                Age
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={form.age}
                  onChange={(event) => setForm({ ...form, age: event.target.value })}
                  required
                />
              </label>
              <div className="subtle">
                The breathing limits are filled automatically based on age.
              </div>
              <div className="form-actions">
                <button type="button" className="mode-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="mode-btn active">{formMode === 'edit' ? 'Save' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
