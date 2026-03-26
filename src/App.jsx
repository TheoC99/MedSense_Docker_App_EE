import { useEffect, useMemo, useState } from 'react'

const pollMs = 1000
const languageOptions = [
  { key: 'en', label: 'EN', locale: 'en-US' },
  { key: 'nl', label: 'NL', locale: 'nl-NL' },
  { key: 'ja', label: 'JP', locale: 'ja-JP' }
]

const translations = {
  en: {
    appTitle: 'MedSense HMI',
    noPatientSelected: 'No patient selected',
    noPatientsAvailable: 'Add a patient to start monitoring a node.',
    headerMeta: 'Node {nodeId} · {age} years · target {targetBpm} bpm',
    temperature: 'Temperature',
    normalTemp: 'Normal 36.5-37.5 deg C',
    breathingCycle: 'Breathing cycle',
    inhale: 'Inhale',
    exhale: 'Exhale',
    breathsPerMinute: 'Breaths per minute',
    targetBpmLabel: 'target {targetBpm}',
    nodeStatus: 'Node status',
    online: 'Online',
    offline: 'Offline',
    node: 'Node',
    latency: 'Latency',
    source: 'Source',
    lastUpdate: 'Last update',
    patientsNodes: 'Patients / nodes',
    patientCount: '{count} patients',
    addPatient: 'Add patient',
    editPatient: 'Edit patient',
    noPatientsYet: 'No patients yet. Create one to assign the next node slot.',
    addPatientTitle: 'Add patient',
    editPatientTitle: 'Edit patient',
    patientName: 'Patient name',
    age: 'Age',
    targetBpm: 'Target bpm',
    targetHint: 'Age suggests a default target. You can override it before saving.',
    cancel: 'Cancel',
    save: 'Save',
    submit: 'Submit',
    lightMode: 'White mode',
    darkMode: 'Dark mode',
    waitingSource: 'waiting'
  },
  nl: {
    appTitle: 'MedSense HMI',
    noPatientSelected: 'Geen patient geselecteerd',
    noPatientsAvailable: 'Voeg een patient toe om een node te monitoren.',
    headerMeta: 'Node {nodeId} · {age} jaar · target {targetBpm} bpm',
    temperature: 'Temperatuur',
    normalTemp: 'Normaal 36.5-37.5 graden C',
    breathingCycle: 'Ademcyclus',
    inhale: 'Inademen',
    exhale: 'Uitademen',
    breathsPerMinute: 'Ademhalingen per minuut',
    targetBpmLabel: 'target {targetBpm}',
    nodeStatus: 'Node status',
    online: 'Online',
    offline: 'Offline',
    node: 'Node',
    latency: 'Latentie',
    source: 'Bron',
    lastUpdate: 'Laatste update',
    patientsNodes: 'Patienten / nodes',
    patientCount: '{count} patienten',
    addPatient: 'Patient toevoegen',
    editPatient: 'Patient bewerken',
    noPatientsYet: 'Nog geen patienten. Maak er een aan om de volgende node toe te wijzen.',
    addPatientTitle: 'Patient toevoegen',
    editPatientTitle: 'Patient bewerken',
    patientName: 'Patientnaam',
    age: 'Leeftijd',
    targetBpm: 'Target bpm',
    targetHint: 'Leeftijd geeft een standaard target. Je kunt die voor het opslaan aanpassen.',
    cancel: 'Annuleren',
    save: 'Opslaan',
    submit: 'Opslaan',
    lightMode: 'Witte modus',
    darkMode: 'Donkere modus',
    waitingSource: 'wachten'
  },
  ja: {
    appTitle: 'MedSense HMI',
    noPatientSelected: '患者が選択されていません',
    noPatientsAvailable: 'ノード監視を始めるには患者を追加してください。',
    headerMeta: 'Node {nodeId} ・ {age}歳 ・ target {targetBpm} bpm',
    temperature: '体温',
    normalTemp: '正常 36.5-37.5 度C',
    breathingCycle: '呼吸サイクル',
    inhale: '吸う',
    exhale: '吐く',
    breathsPerMinute: '1分あたりの呼吸数',
    targetBpmLabel: 'target {targetBpm}',
    nodeStatus: 'ノード状態',
    online: 'オンライン',
    offline: 'オフライン',
    node: 'Node',
    latency: '遅延',
    source: 'ソース',
    lastUpdate: '最終更新',
    patientsNodes: '患者 / nodes',
    patientCount: '{count} patients',
    addPatient: '患者を追加',
    editPatient: '患者を編集',
    noPatientsYet: '患者がまだいません。追加すると次のノード枠に割り当てられます。',
    addPatientTitle: '患者を追加',
    editPatientTitle: '患者を編集',
    patientName: '患者名',
    age: '年齢',
    targetBpm: 'Target bpm',
    targetHint: '年齢から標準 target が提案されます。保存前に変更できます。',
    cancel: 'キャンセル',
    save: '保存',
    submit: '保存',
    lightMode: 'ライトモード',
    darkMode: 'ダークモード',
    waitingSource: '待機中'
  }
}

function formatMessage(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''))
}

function formatTemp(temp) {
  if (temp === null || temp === undefined || Number.isNaN(Number(temp))) return '--.-'
  return Number(temp).toFixed(1)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function bpmStatus(value, targetBpm) {
  if (!Number.isFinite(Number(value)) || !Number.isFinite(Number(targetBpm))) return 'normal'
  const delta = Math.abs(Number(value) - Number(targetBpm))
  if (delta > 4) return 'alarm'
  if (delta > 2) return 'warning'
  return 'normal'
}

function emptyForm() {
  return { id: '', patientName: '', age: '', targetBpm: '' }
}

function getStoredValue(key, fallback) {
  if (typeof window === 'undefined') return fallback
  return window.localStorage.getItem(key) || fallback
}

function App() {
  const [config, setConfig] = useState(null)
  const [patients, setPatients] = useState([])
  const [state, setState] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [theme, setTheme] = useState(() => getStoredValue('medsense-theme', 'dark'))
  const [language, setLanguage] = useState(() => getStoredValue('medsense-language', 'en'))
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    loadAll()
    const timer = setInterval(loadState, pollMs)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('medsense-theme', theme)
    }
  }, [theme])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('medsense-language', language)
    }
  }, [language])

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
    setPatients(patientsData.patients || [])
    setState(stateData)
  }

  async function loadState() {
    const response = await fetch('/api/state')
    const data = await response.json()
    setState(data)
  }

  async function reloadPatients() {
    const response = await fetch('/api/patients')
    const data = await response.json()
    setPatients(data.patients || [])
    return data
  }

  async function selectPatient(patientId) {
    await fetch('/api/select-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId })
    })
    await loadState()
  }

  function recommendedTarget(ageValue) {
    const age = Number(ageValue)
    if (!config || !Number.isFinite(age)) return ''
    const band = config.ageGroups.find((group) => age >= group.minAge && age <= group.maxAge) || config.ageGroups[0]
    return String(Math.round((band.minBpm + band.maxBpm) / 2))
  }

  function openAddPatient() {
    setFormMode('add')
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEditPatient() {
    const selectedPatient = patients.find((patient) => patient.id === state?.selectedPatientId)
    if (!selectedPatient) return

    setFormMode('edit')
    setForm({
      id: selectedPatient.id,
      patientName: selectedPatient.patientName,
      age: String(selectedPatient.age),
      targetBpm: String(selectedPatient.targetBpm)
    })
    setShowForm(true)
  }

  function updateAge(ageValue) {
    setForm((currentForm) => ({
      ...currentForm,
      age: ageValue,
      targetBpm: formMode === 'add' ? recommendedTarget(ageValue) : currentForm.targetBpm
    }))
  }

  async function submitPatient(event) {
    event.preventDefault()

    const payload = {
      patientName: form.patientName,
      age: Number(form.age),
      targetBpm: Number(form.targetBpm)
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
    const nextPatients = patientsData.patients || []

    if (formMode === 'add') {
      const newestPatient = nextPatients[nextPatients.length - 1]
      if (newestPatient) {
        await selectPatient(newestPatient.id)
      }
    } else if (form.id) {
      await selectPatient(form.id)
    }

    await loadState()
  }

  const messages = translations[language] || translations.en
  const selectedLocale = languageOptions.find((option) => option.key === language)?.locale || 'en-US'
  const t = (key, values) => formatMessage(messages[key] || translations.en[key] || key, values)

  const selectedPatient = useMemo(() => {
    if (!patients.length) return null
    return patients.find((patient) => patient.id === state?.selectedPatientId) || patients[0] || null
  }, [patients, state?.selectedPatientId])

  const selectedNodeState = useMemo(() => {
    if (!selectedPatient || !state?.nodeStates) return null
    return state.nodeStates[String(selectedPatient.nodeId)] || null
  }, [selectedPatient, state])

  const current = useMemo(() => {
    if (!selectedPatient) return null

    if (!selectedNodeState) {
      return {
        ...selectedPatient,
        online: false,
        latencyMs: '--',
        breathsPerMinute: '--',
        breathingLevel: 0,
        temperatureC: null,
        temperatureState: 'normal',
        source: t('waitingSource'),
        lastSeenEpochMs: 0
      }
    }

    return {
      ...selectedPatient,
      ...selectedNodeState
    }
  }, [selectedPatient, selectedNodeState, t])

  const currentBpmStatus = current ? bpmStatus(current.breathsPerMinute, current.targetBpm) : 'normal'
  const breathingHeight = current ? clamp(Number(current.breathingLevel), 0, 100) : 0
  const bpmPercent = current
    ? clamp((Number(current.breathsPerMinute) / Math.max(Number(current.targetBpm) + 10, 1)) * 100, 0, 100)
    : 0
  const lastUpdatedAt = current?.lastSeenEpochMs
    ? new Date(current.lastSeenEpochMs).toLocaleString(selectedLocale)
    : '--'

  return (
    <div className={`app ${theme}`}>
      <header className="topbar">
        <div>
          <div className="eyebrow">{t('appTitle')}</div>
          <h1>{current?.patientName || t('noPatientSelected')}</h1>
          <div className="subtle">
            {current
              ? t('headerMeta', {
                nodeId: current.nodeId,
                age: current.age,
                targetBpm: current.targetBpm
              })
              : t('noPatientsAvailable')}
          </div>
        </div>

        <div className="topbar-actions">
          <div className="language-toggle" aria-label="Language toggle">
            {languageOptions.map((option) => (
              <button
                key={option.key}
                className={`toggle-chip ${language === option.key ? 'active' : ''}`}
                onClick={() => setLanguage(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button className="mode-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? t('lightMode') : t('darkMode')}
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="card temp-card">
          <div className="section-title">{t('temperature')}</div>
          <div className={`temp-value ${current?.temperatureState || 'normal'}`}>{formatTemp(current?.temperatureC)} deg C</div>
          <div className="subtle">{t('normalTemp')}</div>
        </section>

        <section className="center-panel">
          <div className="card breathing-card">
            <div className="section-title">{t('breathingCycle')}</div>
            <div className="breathing-wrap">
              <div className="breathing-bar-shell">
                <div className="breathing-bar-fill" style={{ height: `${breathingHeight}%` }} />
              </div>
              <div className="breathing-scale">
                <span>{t('inhale')}</span>
                <span>{t('exhale')}</span>
              </div>
            </div>
          </div>

          <div className="card gauge-card">
            <div className="section-title">{t('breathsPerMinute')}</div>
            <div className="gauge-shell">
              <div
                className="gauge-ring"
                style={{
                  background: `conic-gradient(${currentBpmStatus === 'alarm' ? '#ef4444' : currentBpmStatus === 'warning' ? '#f59e0b' : '#22c55e'} 0 ${bpmPercent}%, rgba(148,163,184,0.15) ${bpmPercent}% 100%)`
                }}
              >
                <div className="gauge-inner">
                  <div className="gauge-value">{current?.breathsPerMinute ?? '--'}</div>
                  <div className="subtle">
                    {current ? t('targetBpmLabel', { targetBpm: current.targetBpm }) : '--'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card status-card">
          <div className="section-title">{t('nodeStatus')}</div>
          <div className="status-grid">
            <div>
              <div className={`status-pill ${current?.online ? 'online' : 'offline'}`}>{current?.online ? t('online') : t('offline')}</div>
            </div>
            <div>
              <div className="label">{t('node')}</div>
              <div className="metric">{current?.nodeId ?? '--'}</div>
            </div>
            <div>
              <div className="label">{t('latency')}</div>
              <div className="metric">{current?.latencyMs ?? '--'} ms</div>
            </div>
            <div>
              <div className="label">{t('source')}</div>
              <div className="metric">{current?.source || '--'}</div>
            </div>
            <div>
              <div className="label">{t('lastUpdate')}</div>
              <div className="metric">{lastUpdatedAt}</div>
            </div>
            <div>
              <div className="label">{t('targetBpm')}</div>
              <div className="metric">{current?.targetBpm ?? '--'}</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="patients-panel card">
        <div className="patients-header">
          <div>
            <div className="section-title">{t('patientsNodes')}</div>
            <div className="subtle">{t('patientCount', { count: patients.length })}</div>
          </div>
          <div className="topbar-actions">
            {selectedPatient && (
              <button className="mode-btn" onClick={openEditPatient}>{t('editPatient')}</button>
            )}
            <button className="add-btn" onClick={openAddPatient}>{t('addPatient')}</button>
          </div>
        </div>

        {patients.length > 0 ? (
          <div className="patient-tabs">
            {patients.map((patient) => (
              <button
                key={patient.id}
                className={`patient-tab ${state?.selectedPatientId === patient.id ? 'active' : ''}`}
                onClick={() => selectPatient(patient.id)}
              >
                <span className="patient-index">{patient.nodeId}</span>
                <span className="patient-tab-copy">
                  <span className="patient-name">{patient.patientName}</span>
                  <span className="patient-meta">{patient.age}y · {patient.targetBpm} bpm</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">{t('noPatientsYet')}</div>
        )}
      </footer>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>{formMode === 'edit' ? t('editPatientTitle') : t('addPatientTitle')}</h2>
            <form onSubmit={submitPatient} className="patient-form">
              <label>
                {t('patientName')}
                <input
                  value={form.patientName}
                  onChange={(event) => setForm({ ...form, patientName: event.target.value })}
                  required
                />
              </label>
              <label>
                {t('age')}
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={form.age}
                  onChange={(event) => updateAge(event.target.value)}
                  required
                />
              </label>
              <label>
                {t('targetBpm')}
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={form.targetBpm}
                  onChange={(event) => setForm({ ...form, targetBpm: event.target.value })}
                  required
                />
              </label>
              <div className="subtle">{t('targetHint')}</div>
              <div className="form-actions">
                <button type="button" className="mode-btn" onClick={() => setShowForm(false)}>{t('cancel')}</button>
                <button type="submit" className="mode-btn active">{formMode === 'edit' ? t('save') : t('submit')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
