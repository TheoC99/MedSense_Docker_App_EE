import { useEffect, useState } from 'react'

const fallbackLanguages = ['en', 'nl', 'ja']
const localeByLanguage = {
  en: 'en-US',
  nl: 'nl-NL',
  ja: 'ja-JP'
}

const translations = {
  en: {
    eyebrow: 'MedSense HMI',
    title: 'Breathing monitor',
    subtitle: 'Patient-linked node overview',
    lightMode: 'White mode',
    darkMode: 'Black mode',
    patients: 'Patients',
    addPatient: 'Add patient',
    editPatient: 'Edit patient',
    createPatient: 'Create patient',
    saveChanges: 'Save changes',
    cancel: 'Cancel',
    patientName: 'Name',
    age: 'Age',
    years: 'years',
    ageGroup: 'Age group',
    bandAdult: 'Adult',
    bandSchool: 'School-age child',
    bandPreschool: 'Preschooler',
    bandToddler: 'Toddler',
    bandInfant: 'Infant',
    temperature: 'Temperature',
    normalTemp: 'Normal 36.5-37.5 °C',
    breathing: 'Breathing',
    breathingRate: 'Breaths per minute',
    targetRange: 'Target range',
    gaugeTarget: 'target {targetRange} bpm',
    status: 'Status',
    source: 'Source',
    sourceGateway: 'Gateway',
    sourceWaiting: 'Waiting',
    freshness: 'Freshness',
    fresh: 'Fresh',
    stale: 'Stale',
    waiting: 'Waiting',
    lastUpdate: 'Last update',
    online: 'Online',
    offline: 'Offline',
    noPatients: 'No patients yet. Create the first patient to link incoming node data.',
    waitingSensor: 'Waiting for node data',
    targetHint: 'Target range is filled automatically from age.',
    loadError: 'Could not load data.',
    saveError: 'Could not save patient.',
    headerMeta: 'Node {nodeId} | {age} years | target {targetRange} bpm',
    patientMeta: '{age} years | target {targetRange} bpm'
  },
  nl: {
    eyebrow: 'MedSense HMI',
    title: 'Ademhalingsmonitor',
    subtitle: 'Node-overzicht gekoppeld aan patienten',
    lightMode: 'Witte modus',
    darkMode: 'Zwarte modus',
    patients: 'Patienten',
    addPatient: 'Patient toevoegen',
    editPatient: 'Patient bewerken',
    createPatient: 'Patient aanmaken',
    saveChanges: 'Wijzigingen opslaan',
    cancel: 'Annuleren',
    patientName: 'Naam',
    age: 'Leeftijd',
    years: 'jaar',
    ageGroup: 'Leeftijdsgroep',
    bandAdult: 'Volwassene',
    bandSchool: 'Schoolkind',
    bandPreschool: 'Peuter',
    bandToddler: 'Dreumes',
    bandInfant: 'Baby',
    temperature: 'Temperatuur',
    normalTemp: 'Normaal 36.5-37.5 °C',
    breathing: 'Ademhaling',
    breathingRate: 'Ademhalingen per minuut',
    targetRange: 'Doelbereik',
    gaugeTarget: 'doel {targetRange} bpm',
    status: 'Status',
    source: 'Bron',
    sourceGateway: 'Gateway',
    sourceWaiting: 'Wachten',
    freshness: 'Actualiteit',
    fresh: 'Actueel',
    stale: 'Verouderd',
    waiting: 'Wachten',
    lastUpdate: 'Laatste update',
    online: 'Online',
    offline: 'Offline',
    noPatients: 'Nog geen patienten. Maak de eerste patient aan om inkomende nodedata te koppelen.',
    waitingSensor: 'Wachten op nodegegevens',
    targetHint: 'Het doelbereik wordt automatisch op basis van leeftijd ingevuld.',
    loadError: 'Gegevens konden niet worden geladen.',
    saveError: 'Patient kon niet worden opgeslagen.',
    headerMeta: 'Node {nodeId} | {age} jaar | doel {targetRange} bpm',
    patientMeta: '{age} jaar | doel {targetRange} bpm'
  },
  ja: {
    eyebrow: 'MedSense HMI',
    title: '呼吸モニター',
    subtitle: '患者に紐づくノード概要',
    lightMode: '白表示',
    darkMode: '黒表示',
    patients: '患者一覧',
    addPatient: '患者を追加',
    editPatient: '患者を編集',
    createPatient: '患者を作成',
    saveChanges: '保存',
    cancel: 'キャンセル',
    patientName: '名前',
    age: '年齢',
    years: '歳',
    ageGroup: '年齢区分',
    bandAdult: '成人',
    bandSchool: '学童',
    bandPreschool: '未就学児',
    bandToddler: '幼児',
    bandInfant: '乳児',
    temperature: '温度',
    normalTemp: '通常 36.5-37.5 °C',
    breathing: '呼吸',
    breathingRate: '呼吸数',
    targetRange: '目標範囲',
    gaugeTarget: '目標 {targetRange} bpm',
    status: '状態',
    source: '送信元',
    sourceGateway: 'ゲートウェイ',
    sourceWaiting: '待機中',
    freshness: '鮮度',
    fresh: '最新',
    stale: '古い',
    waiting: '待機中',
    lastUpdate: '最終更新',
    online: 'オンライン',
    offline: 'オフライン',
    noPatients: 'まだ患者がいません。最初の患者を作成してください。',
    waitingSensor: 'ノードデータを待機中',
    targetHint: '目標範囲は年齢に応じて自動設定されます。',
    loadError: 'データを読み込めませんでした。',
    saveError: '患者を保存できませんでした。',
    headerMeta: 'ノード {nodeId} | {age}歳 | 目標 {targetRange} bpm',
    patientMeta: '{age}歳 | 目標 {targetRange} bpm'
  }
}

function readStoredValue(key, fallback) {
  try {
    return window.localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function applyTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ''))
}

function formatTargetRange(patient) {
  const min = Number(patient?.referenceMinBpm)
  const max = Number(patient?.referenceMaxBpm)
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return '--'
  }
  return `${min}-${max}`
}

function bpmStatus(value, minBpm, maxBpm) {
  const bpm = Number(value)
  const min = Number(minBpm)
  const max = Number(maxBpm)

  if (!Number.isFinite(bpm) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return 'normal'
  }

  if (bpm < min || bpm > max) {
    return 'alarm'
  }

  if (bpm <= min + 2 || bpm >= max - 2) {
    return 'warning'
  }

  return 'normal'
}

function ageBandKey(age) {
  const value = Number(age)
  if (!Number.isFinite(value)) return ''
  if (value >= 18) return 'bandAdult'
  if (value >= 6) return 'bandSchool'
  if (value >= 3) return 'bandPreschool'
  if (value >= 1) return 'bandToddler'
  return 'bandInfant'
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with ${response.status}`)
  }

  return data
}

export default function App() {
  const [theme, setTheme] = useState(() => readStoredValue('medsense-theme', 'dark'))
  const [language, setLanguage] = useState(() => readStoredValue('medsense-language', 'en'))
  const [configLanguages, setConfigLanguages] = useState(fallbackLanguages)
  const [patients, setPatients] = useState([])
  const [nodeStates, setNodeStates] = useState({})
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState({
    id: null,
    patientName: '',
    age: ''
  })

  const availableLanguages = configLanguages.filter((code) => translations[code]) || fallbackLanguages
  const activeLanguage = availableLanguages.includes(language) ? language : availableLanguages[0] || 'en'
  const t = translations[activeLanguage]
  const locale = localeByLanguage[activeLanguage] || localeByLanguage.en

  async function loadData() {
    const [configData, patientData, stateData] = await Promise.all([
      fetchJson('/api/config'),
      fetchJson('/api/patients'),
      fetchJson('/api/state')
    ])

    setConfigLanguages(Array.isArray(configData?.languages) ? configData.languages : fallbackLanguages)
    setPatients(Array.isArray(patientData?.patients) ? patientData.patients : [])
    setNodeStates(stateData?.nodeStates && typeof stateData.nodeStates === 'object' ? stateData.nodeStates : {})

    const nextSelectedId =
      stateData?.selectedPatientId ||
      patientData?.selectedPatientId ||
      patientData?.patients?.[0]?.id ||
      null

    setSelectedPatientId(nextSelectedId)
    setHasLoadError(false)
  }

  useEffect(() => {
    let isActive = true

    async function refresh() {
      try {
        await loadData()
      } catch {
        if (isActive) {
          setHasLoadError(true)
        }
      }
    }

    refresh()
    const intervalId = window.setInterval(refresh, 1000)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('medsense-theme', theme)
    } catch {
      // Ignore local storage errors.
    }
  }, [theme])

  useEffect(() => {
    if (language !== activeLanguage) {
      setLanguage(activeLanguage)
      return
    }

    try {
      window.localStorage.setItem('medsense-language', activeLanguage)
    } catch {
      // Ignore local storage errors.
    }
  }, [activeLanguage, language])

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) || patients[0] || null
  const selectedNodeState = selectedPatient ? nodeStates[String(selectedPatient.nodeId)] || null : null
  const targetRange = formatTargetRange(selectedPatient)
  const breathingState = bpmStatus(
    selectedNodeState?.breathsPerMinute,
    selectedPatient?.referenceMinBpm,
    selectedPatient?.referenceMaxBpm
  )
  const temperatureState = selectedNodeState?.temperatureState || 'normal'
  const gaugeColor = {
    normal: '#22c55e',
    warning: '#f59e0b',
    alarm: '#ef4444'
  }[breathingState]
  const maxBpm = Number(selectedPatient?.referenceMaxBpm) || 1
  const currentBpm = Number(selectedNodeState?.breathsPerMinute)
  const gaugeFill = clamp(Math.round(((Number.isFinite(currentBpm) ? currentBpm : 0) / maxBpm) * 100), 0, 100)
  const gaugeStyle = {
    background: `conic-gradient(${gaugeColor} 0 ${gaugeFill}%, rgba(148, 163, 184, 0.18) ${gaugeFill}% 100%)`
  }
  const freshnessLabel = !selectedNodeState?.lastSeenEpochMs
    ? t.waiting
    : selectedNodeState.online
      ? t.fresh
      : t.stale
  const sourceLabel = !selectedNodeState?.lastSeenEpochMs
    ? t.sourceWaiting
    : selectedNodeState.source === 'stale'
      ? t.stale
      : t.sourceGateway
  const lastUpdateLabel = selectedNodeState?.lastSeenEpochMs
    ? new Date(selectedNodeState.lastSeenEpochMs).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : '--'
  const ageGroupLabel = selectedPatient ? t[ageBandKey(selectedPatient.age)] || selectedPatient.groupLabel || '--' : '--'

  async function handleSelectPatient(patientId) {
    setSelectedPatientId(patientId)

    try {
      await fetchJson('/api/select-patient', {
        method: 'POST',
        body: JSON.stringify({ patientId })
      })
      await loadData()
    } catch {
      setHasLoadError(true)
    }
  }

  function openCreateForm() {
    setFormError('')
    setFormState({
      id: null,
      patientName: '',
      age: ''
    })
    setIsFormOpen(true)
  }

  function openEditForm() {
    if (!selectedPatient) {
      return
    }

    setFormError('')
    setFormState({
      id: selectedPatient.id,
      patientName: selectedPatient.patientName,
      age: String(selectedPatient.age)
    })
    setIsFormOpen(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setFormError('')

    try {
      const payload = {
        patientName: formState.patientName.trim(),
        age: Number(formState.age)
      }

      const result = formState.id
        ? await fetchJson(`/api/patients/${formState.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          })
        : await fetchJson('/api/patients', {
            method: 'POST',
            body: JSON.stringify(payload)
          })

      if (!formState.id && result?.id) {
        await fetchJson('/api/select-patient', {
          method: 'POST',
          body: JSON.stringify({ patientId: result.id })
        })
      }

      setIsFormOpen(false)
      await loadData()
    } catch {
      setFormError(t.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={`app ${theme === 'light' ? 'light' : ''}`}>
      <header className="topbar">
        <div>
          <div className="eyebrow">{t.eyebrow}</div>
          <h1>{selectedPatient ? selectedPatient.patientName : t.title}</h1>
          <div className="subtle">
            {selectedPatient
              ? applyTemplate(t.headerMeta, {
                  nodeId: selectedPatient.nodeId,
                  age: selectedPatient.age,
                  targetRange
                })
              : t.subtitle}
          </div>
          {hasLoadError ? <div className="subtle">{t.loadError}</div> : null}
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="mode-btn"
            onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? t.lightMode : t.darkMode}
          </button>

          <div className="language-toggle" aria-label="Language toggle">
            {availableLanguages.map((code) => (
              <button
                key={code}
                type="button"
                className={`toggle-chip ${activeLanguage === code ? 'active' : ''}`}
                onClick={() => setLanguage(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="dashboard">
        <section className="card temp-card">
          <div className="section-title">{t.temperature}</div>
          <div className={`temp-value ${temperatureState}`}>
            {Number.isFinite(Number(selectedNodeState?.temperatureC))
              ? `${Number(selectedNodeState.temperatureC).toFixed(1)} °C`
              : '--'}
          </div>
          <div className="subtle">{t.normalTemp}</div>
          <div className="status-grid">
            <div>
              <div className="label">{t.source}</div>
              <div className="metric">{sourceLabel}</div>
            </div>
            <div>
              <div className="label">{t.freshness}</div>
              <div className="metric">{freshnessLabel}</div>
            </div>
          </div>
        </section>

        <section className="center-panel">
          <article className="card breathing-card">
            <div className="section-title">{t.breathing}</div>
            <div className="breathing-wrap">
              <div className="breathing-bar-shell">
                <div
                  className="breathing-bar-fill"
                  style={{
                    height: `${gaugeFill}%`,
                    background: `linear-gradient(180deg, ${gaugeColor}, rgba(14, 165, 233, 0.45))`
                  }}
                />
              </div>

              <div>
                <div className="label">{t.breathingRate}</div>
                <div className="metric">{Number.isFinite(currentBpm) ? currentBpm : '--'}</div>
              </div>

              <div className="breathing-scale">
                <span>{Number(selectedPatient?.referenceMaxBpm) || '--'}</span>
                <span>
                  {selectedPatient
                    ? Math.round(
                        (Number(selectedPatient.referenceMinBpm) + Number(selectedPatient.referenceMaxBpm)) / 2
                      )
                    : '--'}
                </span>
                <span>{Number(selectedPatient?.referenceMinBpm) || '--'}</span>
              </div>
            </div>
          </article>

          <article className="card gauge-card">
            <div className="section-title">{t.targetRange}</div>
            <div className="gauge-shell">
              <div className="gauge-ring" style={gaugeStyle}>
                <div className="gauge-inner">
                  <div>
                    <div className="gauge-value">{Number.isFinite(currentBpm) ? currentBpm : '--'}</div>
                    <div className="subtle">
                      {applyTemplate(t.gaugeTarget, {
                        targetRange
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="card status-card">
          <div className="section-title">{t.status}</div>
          <div className={`status-pill ${selectedNodeState?.online ? 'online' : 'offline'}`}>
            {selectedNodeState?.online ? t.online : selectedNodeState ? t.offline : t.waiting}
          </div>

          <div className="status-grid">
            <div>
              <div className="label">{t.targetRange}</div>
              <div className="metric">{targetRange} bpm</div>
            </div>
            <div>
              <div className="label">{t.lastUpdate}</div>
              <div className="metric">{lastUpdateLabel}</div>
            </div>
            <div>
              <div className="label">{t.age}</div>
              <div className="metric">{selectedPatient ? `${selectedPatient.age} ${t.years}` : '--'}</div>
            </div>
            <div>
              <div className="label">{t.ageGroup}</div>
              <div className="metric">{ageGroupLabel}</div>
            </div>
          </div>

          <div className="subtle" style={{ marginTop: '1rem' }}>
            {selectedNodeState?.lastSeenEpochMs ? null : t.waitingSensor}
          </div>
        </section>
      </main>

      <section className="patients-panel">
        <div className="patients-header">
          <div>
            <div className="section-title">{t.patients}</div>
            <div className="subtle">{t.targetHint}</div>
          </div>

          <div className="topbar-actions">
            {selectedPatient ? (
              <button type="button" className="mode-btn" onClick={openEditForm}>
                {t.editPatient}
              </button>
            ) : null}
            <button type="button" className="add-btn" onClick={openCreateForm}>
              {t.addPatient}
            </button>
          </div>
        </div>

        {patients.length ? (
          <div className="patient-tabs">
            {patients.map((patient, index) => (
              <button
                key={patient.id}
                type="button"
                className={`patient-tab ${selectedPatient?.id === patient.id ? 'active' : ''}`}
                onClick={() => handleSelectPatient(patient.id)}
              >
                <div className="patient-index">{index + 1}</div>
                <div className="patient-tab-copy">
                  <div className="patient-name">{patient.patientName}</div>
                  <div className="patient-meta">
                    {applyTemplate(t.patientMeta, {
                      age: patient.age,
                      targetRange: formatTargetRange(patient)
                    })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">{t.noPatients}</div>
        )}
      </section>

      {isFormOpen ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{formState.id ? t.editPatient : t.createPatient}</h2>

            <form className="patient-form" onSubmit={handleSubmit}>
              <label>
                <span>{t.patientName}</span>
                <input
                  value={formState.patientName}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      patientName: event.target.value
                    }))
                  }
                  placeholder={t.patientName}
                  required
                />
              </label>

              <label>
                <span>{t.age}</span>
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="1"
                  value={formState.age}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      age: event.target.value
                    }))
                  }
                  placeholder="0"
                  required
                />
              </label>

              <div className="subtle">{t.targetHint}</div>
              {formError ? <div className="subtle">{formError}</div> : null}

              <div className="form-actions">
                <button type="button" className="mode-btn" onClick={() => setIsFormOpen(false)}>
                  {t.cancel}
                </button>
                <button type="submit" className="add-btn" disabled={isSaving}>
                  {formState.id ? t.saveChanges : t.createPatient}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
