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

function ringGradient(status) {
  if (status === 'alarm') return 'conic-gradient(#ef4444 0deg, #ef4444 360deg)'
  if (status === 'warning') return 'conic-gradient(#f59e0b 0deg, #f59e0b 360deg)'
  return 'conic-gradient(#22c55e 0deg, #22c55e 360deg)'
}

function App() {
  const [config, setConfig] = useState(null)
  const [patients, setPatients] = useState({ realPatients: [], demoPatients: [] })
  const [state, setState] = useState(null)
  const [selectedId, setSelectedId] = useState('demo-1')
  const [showForm, setShowForm] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [form, setForm] = useState({ patientName: '', age: '' })

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
    setSelectedId(stateData.selectedPatientId || 'demo-1')
  }

  async function loadState() {
    const response = await fetch('/api/state')
    const data = await response.json()
    setState(data)
    setSelectedId(data.selectedPatientId || 'demo-1')
  }

  async function changeMode(mode) {
    await fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    })
    await loadState()
  }

  async function selectPatient(patientId) {
    setSelectedId(patientId)
    await fetch('/api/select-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId })
    })
  }

  async function submitPatient(event) {
    event.preventDefault()
    await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName: form.patientName,
        age: Number(form.age)
      })
    })
    setForm({ patientName: '', age: '' })
    setShowForm(false)
    const patientsRes = await fetch('/api/patients')
    const patientsData = await patientsRes.json()
    setPatients(patientsData)
  }

  const isDemo = state?.mode !== 'live'
  const list = isDemo ? patients.demoPatients : patients.realPatients

  const current = useMemo(() => {
    if (!state) return null
    if (isDemo) {
      return state.demoNodes?.find((item) => item.patientId === selectedId) || state.demoNodes?.[0] || null
    }
    return state.live
  }, [state, isDemo, selectedId])

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
            <button className="add-btn" onClick={() => setShowForm(true)}>+</button>
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
            <h2>Add patient</h2>
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
              <div className="form-actions">
                <button type="button" className="mode-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="mode-btn active">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
