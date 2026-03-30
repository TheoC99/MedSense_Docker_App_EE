import { useEffect, useRef, useState } from 'react'

const fallbackLanguages = ['en', 'nl', 'ja']
const localeByLanguage = {
  en: 'en-US',
  nl: 'nl-NL',
  ja: 'ja-JP'
}
const languageOptions = [
  { key: 'nl', icon: '/icons/languages/nl.svg' },
  { key: 'en', icon: '/icons/languages/en.svg' },
  { key: 'ja', icon: '/icons/languages/ja.svg' }
]
const fallbackTemperatureRange = {
  minC: 36.5,
  maxC: 37.5
}
const fallbackAgeGroups = [
  { key: 'adult', minAge: 18, maxAge: 120, minBpm: 12, maxBpm: 20, label: 'Adult' },
  { key: 'school', minAge: 6, maxAge: 17, minBpm: 16, maxBpm: 30, label: 'School-age child' },
  { key: 'preschool', minAge: 3, maxAge: 5, minBpm: 22, maxBpm: 34, label: 'Preschooler' },
  { key: 'toddler', minAge: 1, maxAge: 2, minBpm: 24, maxBpm: 40, label: 'Toddler' },
  { key: 'infant', minAge: 0, maxAge: 0, minBpm: 30, maxBpm: 60, label: 'Infant' }
]

const translations = {
  en: {
    eyebrow: 'MedSense HMI',
    title: 'Breathing monitor',
    subtitle: 'Patient-linked node overview',
    lightMode: 'White mode',
    darkMode: 'Black mode',
    languageMenu: 'Language menu',
    languageDutch: 'Dutch',
    languageEnglish: 'English',
    languageJapanese: 'Japanese',
    patients: 'Patients',
    addPatient: 'Add patient',
    editPatient: 'Edit patient',
    deletePatient: 'Delete patient',
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
    normalTemp: 'Normal {range} \u00B0C',
    tempRange: 'Temperature range',
    tempMin: 'Temp min (\u00B0C)',
    tempMax: 'Temp max (\u00B0C)',
    breathingCycle: 'Breathing cycle',
    inhale: 'Inhale',
    exhale: 'Exhale',
    breathing: 'Breathing',
    breathingRate: 'Breaths per minute',
    targetRange: 'Target range',
    targetMinBpm: 'Target min (bpm)',
    targetMaxBpm: 'Target max (bpm)',
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
    targetHint: 'Ranges are filled from age at creation and stay editable afterwards.',
    loadError: 'Could not load data.',
    saveError: 'Could not save patient.',
    deleteError: 'Could not delete patient.',
    deletePatientConfirm: 'Delete patient {patientName}?',
    headerMeta: 'Node {nodeId} | {age} years | target {targetRange} bpm',
    patientMeta: '{age} years | target {targetRange} bpm'
  },
  nl: {
    eyebrow: 'MedSense HMI',
    title: 'Ademhalingsmonitor',
    subtitle: 'Node-overzicht gekoppeld aan patienten',
    lightMode: 'Witte modus',
    darkMode: 'Zwarte modus',
    languageMenu: 'Taalmenu',
    languageDutch: 'Nederlands',
    languageEnglish: 'Engels',
    languageJapanese: 'Japans',
    patients: 'Patienten',
    addPatient: 'Patient toevoegen',
    editPatient: 'Patient bewerken',
    deletePatient: 'Patient verwijderen',
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
    normalTemp: 'Normaal {range} \u00B0C',
    tempRange: 'Temperatuurbereik',
    tempMin: 'Temp min (\u00B0C)',
    tempMax: 'Temp max (\u00B0C)',
    breathingCycle: 'Ademcyclus',
    inhale: 'Inademen',
    exhale: 'Uitademen',
    breathing: 'Ademhaling',
    breathingRate: 'Ademhalingen per minuut',
    targetRange: 'Doelbereik',
    targetMinBpm: 'Doel min (bpm)',
    targetMaxBpm: 'Doel max (bpm)',
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
    targetHint: 'Bereiken worden bij aanmaak automatisch op basis van leeftijd ingevuld en blijven daarna aanpasbaar.',
    loadError: 'Gegevens konden niet worden geladen.',
    saveError: 'Patient kon niet worden opgeslagen.',
    deleteError: 'Patient kon niet worden verwijderd.',
    deletePatientConfirm: 'Patient {patientName} verwijderen?',
    headerMeta: 'Node {nodeId} | {age} jaar | doel {targetRange} bpm',
    patientMeta: '{age} jaar | doel {targetRange} bpm'
  },
  ja: {
    eyebrow: 'MedSense HMI',
    title: '呼吸モニター',
    subtitle: '患者に紐づくノード概要',
    lightMode: '白表示',
    darkMode: '黒表示',
    languageMenu: '言語メニュー',
    languageDutch: 'オランダ語',
    languageEnglish: '英語',
    languageJapanese: '日本語',
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
    normalTemp: '\u901a\u5e38 36.5-37.5 \u00B0C',
    breathingCycle: '呼吸サイクル',
    inhale: '吸う',
    exhale: '吐く',
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

translations.ja = {
  ...translations.en,
  ...translations.ja,
  normalTemp: 'Normal {range} \u00B0C',
  targetHint: 'Ranges are filled from age at creation and stay editable afterwards.'
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

function formatTemperatureRange(patient) {
  const min = Number(patient?.normalTempMinC)
  const max = Number(patient?.normalTempMaxC)
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return '--'
  }
  return `${min.toFixed(1)}-${max.toFixed(1)}`
}

function createEmptyFormState() {
  return {
    id: null,
    patientName: '',
    age: '',
    referenceMinBpm: '',
    referenceMaxBpm: '',
    normalTempMinC: '',
    normalTempMaxC: ''
  }
}

function getDefaultTargetRange(age, ageGroups) {
  const value = Number(age)
  if (!Number.isFinite(value)) {
    return { minBpm: '', maxBpm: '' }
  }

  const band = ageGroups.find((group) => value >= Number(group.minAge) && value <= Number(group.maxAge))
  if (!band) {
    return { minBpm: '', maxBpm: '' }
  }

  return {
    minBpm: String(Math.round(Number(band.minBpm))),
    maxBpm: String(Math.round(Number(band.maxBpm)))
  }
}

function getDefaultTemperatureValues(defaultTemperatureRange) {
  const minC = Number(defaultTemperatureRange?.minC)
  const maxC = Number(defaultTemperatureRange?.maxC)

  return {
    minC: Number.isFinite(minC) ? minC.toFixed(1) : fallbackTemperatureRange.minC.toFixed(1),
    maxC: Number.isFinite(maxC) ? maxC.toFixed(1) : fallbackTemperatureRange.maxC.toFixed(1)
  }
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
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const [configLanguages, setConfigLanguages] = useState(fallbackLanguages)
  const [ageGroups, setAgeGroups] = useState(fallbackAgeGroups)
  const [defaultTempRange, setDefaultTempRange] = useState(fallbackTemperatureRange)
  const [patients, setPatients] = useState([])
  const [nodeStates, setNodeStates] = useState({})
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [actionError, setActionError] = useState('')
  const [formError, setFormError] = useState('')
  const [formState, setFormState] = useState(() => createEmptyFormState())
  const [autoFillState, setAutoFillState] = useState({
    targetRange: true,
    tempRange: true
  })
  const languageMenuRef = useRef(null)

  const configuredLanguageOptions = languageOptions.filter((option) => configLanguages.includes(option.key) && translations[option.key])
  const availableLanguages = configuredLanguageOptions.length
    ? configuredLanguageOptions
    : languageOptions.filter((option) => translations[option.key])
  const fallbackLanguageKey = availableLanguages[0]?.key || 'en'
  const activeLanguage = availableLanguages.some((option) => option.key === language) ? language : fallbackLanguageKey
  const t = translations[activeLanguage]
  const locale = localeByLanguage[activeLanguage] || localeByLanguage.en
  const languageLabelByKey = {
    nl: t.languageDutch,
    en: t.languageEnglish,
    ja: t.languageJapanese
  }

  async function loadData() {
    const [configData, patientData, stateData] = await Promise.all([
      fetchJson('/api/config'),
      fetchJson('/api/patients'),
      fetchJson('/api/state')
    ])

    setConfigLanguages(Array.isArray(configData?.languages) ? configData.languages : fallbackLanguages)
    setAgeGroups(Array.isArray(configData?.ageGroups) ? configData.ageGroups : fallbackAgeGroups)
    setDefaultTempRange(
      configData?.defaultTemperatureRange && typeof configData.defaultTemperatureRange === 'object'
        ? configData.defaultTemperatureRange
        : fallbackTemperatureRange
    )
    setPatients(Array.isArray(patientData?.patients) ? patientData.patients : [])
    setNodeStates(stateData?.nodeStates && typeof stateData.nodeStates === 'object' ? stateData.nodeStates : {})

    const nextSelectedId =
      stateData?.selectedPatientId ||
      patientData?.selectedPatientId ||
      patientData?.patients?.[0]?.id ||
      null

    setSelectedPatientId(nextSelectedId)
    setHasLoadError(false)
    setActionError('')
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

  useEffect(() => {
    if (!isLanguageMenuOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setIsLanguageMenuOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsLanguageMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLanguageMenuOpen])

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) || patients[0] || null
  const selectedNodeState = selectedPatient ? nodeStates[String(selectedPatient.nodeId)] || null : null
  const targetRange = formatTargetRange(selectedPatient)
  const normalTemperatureRange = formatTemperatureRange(selectedPatient)
  const temperatureState = selectedNodeState?.temperatureState || 'normal'
  const currentBreathingLevel = clamp(Number(selectedNodeState?.breathingLevel) || 0, 0, 100)
  const minTargetBpm = Number(selectedPatient?.referenceMinBpm)
  const maxTargetBpm = Number(selectedPatient?.referenceMaxBpm)
  const currentBpm = Number(selectedNodeState?.breathsPerMinute)
  const bpmInRange =
    Number.isFinite(currentBpm) &&
    Number.isFinite(minTargetBpm) &&
    Number.isFinite(maxTargetBpm) &&
    currentBpm >= minTargetBpm &&
    currentBpm <= maxTargetBpm
  const gaugeScaleMax = Math.ceil(
    Math.max(
      Number.isFinite(maxTargetBpm) ? maxTargetBpm + 10 : 0,
      Number.isFinite(currentBpm) ? currentBpm + 5 : 0,
      40
    ) / 5
  ) * 5
  const rangeStartPercent = Number.isFinite(minTargetBpm)
    ? clamp(Math.round((minTargetBpm / gaugeScaleMax) * 100), 0, 100)
    : 0
  const rangeEndPercent = Number.isFinite(maxTargetBpm)
    ? clamp(Math.round((maxTargetBpm / gaugeScaleMax) * 100), 0, 100)
    : 100
  const gaugeStyle =
    Number.isFinite(minTargetBpm) && Number.isFinite(maxTargetBpm)
      ? {
          background: `conic-gradient(from -90deg, rgba(239, 68, 68, 0.88) 0 ${rangeStartPercent}%, rgba(34, 197, 94, 0.88) ${rangeStartPercent}% ${rangeEndPercent}%, rgba(239, 68, 68, 0.88) ${rangeEndPercent}% 100%)`
        }
      : {
          background: 'conic-gradient(from -90deg, rgba(148, 163, 184, 0.18) 0 100%)'
        }
  const hasValidTargetRange = Number.isFinite(minTargetBpm) && Number.isFinite(maxTargetBpm)
  const gaugeValueColor = Number.isFinite(currentBpm)
    ? hasValidTargetRange
      ? bpmInRange
        ? 'var(--green)'
        : 'var(--red)'
      : 'var(--text)'
    : 'var(--text)'
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
    setActionError('')
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
    const tempDefaults = getDefaultTemperatureValues(defaultTempRange)
    setActionError('')
    setFormError('')
    setFormState({
      ...createEmptyFormState(),
      normalTempMinC: tempDefaults.minC,
      normalTempMaxC: tempDefaults.maxC
    })
    setAutoFillState({
      targetRange: true,
      tempRange: true
    })
    setIsFormOpen(true)
  }

  function openEditForm() {
    if (!selectedPatient) {
      return
    }

    setActionError('')
    setFormError('')
    setFormState({
      id: selectedPatient.id,
      patientName: selectedPatient.patientName,
      age: String(selectedPatient.age),
      referenceMinBpm: String(selectedPatient.referenceMinBpm ?? ''),
      referenceMaxBpm: String(selectedPatient.referenceMaxBpm ?? ''),
      normalTempMinC: Number(selectedPatient.normalTempMinC).toFixed(1),
      normalTempMaxC: Number(selectedPatient.normalTempMaxC).toFixed(1)
    })
    setAutoFillState({
      targetRange: false,
      tempRange: false
    })
    setIsFormOpen(true)
  }

  function handleAgeChange(nextAge) {
    const targetDefaults = getDefaultTargetRange(nextAge, ageGroups)
    const tempDefaults = getDefaultTemperatureValues(defaultTempRange)

    setFormState((currentState) => {
      const nextState = {
        ...currentState,
        age: nextAge
      }

      if (!currentState.id && !autoFillState.targetRange) {
        nextState.referenceMinBpm = currentState.referenceMinBpm
        nextState.referenceMaxBpm = currentState.referenceMaxBpm
      } else if (!currentState.id) {
        nextState.referenceMinBpm = targetDefaults.minBpm
        nextState.referenceMaxBpm = targetDefaults.maxBpm
      }

      if (!currentState.id && !autoFillState.tempRange) {
        nextState.normalTempMinC = currentState.normalTempMinC
        nextState.normalTempMaxC = currentState.normalTempMaxC
      } else if (!currentState.id) {
        nextState.normalTempMinC = tempDefaults.minC
        nextState.normalTempMaxC = tempDefaults.maxC
      }

      return nextState
    })
  }

  function handleRangeChange(field, value, groupKey) {
    setAutoFillState((currentState) => ({
      ...currentState,
      [groupKey]: false
    }))
    setFormState((currentState) => ({
      ...currentState,
      [field]: value
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setFormError('')
    setActionError('')

    try {
      const payload = {
        patientName: formState.patientName.trim(),
        age: Number(formState.age),
        referenceMinBpm: Number(formState.referenceMinBpm),
        referenceMaxBpm: Number(formState.referenceMaxBpm),
        normalTempMinC: Number(formState.normalTempMinC),
        normalTempMaxC: Number(formState.normalTempMaxC)
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

  async function handleDeletePatient() {
    if (!selectedPatient || isDeleting) {
      return
    }

    const confirmed = window.confirm(
      applyTemplate(t.deletePatientConfirm, {
        patientName: selectedPatient.patientName
      })
    )

    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setActionError('')

    try {
      await fetchJson(`/api/patients/${selectedPatient.id}`, {
        method: 'DELETE'
      })
      setIsFormOpen(false)
      await loadData()
    } catch {
      setActionError(t.deleteError)
    } finally {
      setIsDeleting(false)
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
          {actionError ? <div className="subtle">{actionError}</div> : null}
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="icon-btn theme-toggle"
            aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
            title={theme === 'dark' ? t.lightMode : t.darkMode}
            onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
          >
            <img
              src={theme === 'dark' ? '/icons/ui/sun.svg' : '/icons/ui/moon.svg'}
              alt=""
              className="icon-image mono-icon"
            />
          </button>

          <div className="language-toggle" ref={languageMenuRef}>
            <button
              type="button"
              className={`icon-btn language-trigger ${isLanguageMenuOpen ? 'active' : ''}`}
              aria-label={t.languageMenu}
              aria-haspopup="menu"
              aria-expanded={isLanguageMenuOpen}
              onClick={() => setIsLanguageMenuOpen((currentState) => !currentState)}
            >
              <img src="/icons/languages/translate.svg" alt="" className="icon-image mono-icon" />
            </button>

            {isLanguageMenuOpen ? (
              <div className="language-popover" role="menu" aria-label={t.languageMenu}>
                {availableLanguages.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={activeLanguage === option.key}
                    aria-label={languageLabelByKey[option.key]}
                    title={languageLabelByKey[option.key]}
                    className={`language-option ${activeLanguage === option.key ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage(option.key)
                      setIsLanguageMenuOpen(false)
                    }}
                  >
                    <img src={option.icon} alt="" className="flag-icon" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="dashboard">
        <section className="card temp-card">
          <div className="section-title">{t.temperature}</div>
          <div className={`temp-value ${temperatureState}`}>
            {Number.isFinite(Number(selectedNodeState?.temperatureC))
              ? `${Number(selectedNodeState.temperatureC).toFixed(1)} \u00B0C`
              : '--'}
          </div>
          <div className="subtle">
            {applyTemplate(t.normalTemp, {
              range: normalTemperatureRange
            })}
          </div>
        </section>

        <section className="center-panel">
          <article className="card breathing-card">
            <div className="section-title">{t.breathingCycle}</div>
            <div className="breathing-wrap">
              <div className="breathing-bar-shell">
                <div
                  className="breathing-bar-fill"
                  style={{
                    height: `${currentBreathingLevel}%`
                  }}
                />
              </div>

              <div className="breathing-scale">
                <span>{t.inhale}</span>
                <span>{t.exhale}</span>
              </div>
            </div>
          </article>

          <article className="card gauge-card">
            <div className="section-title">{t.breathingRate}</div>
            <div className="gauge-shell">
              <div className="gauge-wrap">
                <div className="gauge-edge gauge-edge-left">
                  {Number.isFinite(minTargetBpm) ? minTargetBpm : '--'}
                </div>
                <div className="gauge-ring" style={gaugeStyle}>
                  <div className="gauge-inner">
                    <div className="gauge-value" style={{ color: gaugeValueColor }}>
                      {Number.isFinite(currentBpm) ? currentBpm : '--'}
                    </div>
                  </div>
                </div>
                <div className="gauge-edge gauge-edge-right">
                  {Number.isFinite(maxTargetBpm) ? maxTargetBpm : '--'}
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
              <div className="label">{t.source}</div>
              <div className="metric">{sourceLabel}</div>
            </div>
            <div>
              <div className="label">{t.freshness}</div>
              <div className="metric">{freshnessLabel}</div>
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
              <>
                <button
                  type="button"
                  className="icon-btn patient-action"
                  aria-label={t.editPatient}
                  title={t.editPatient}
                  onClick={openEditForm}
                  disabled={isDeleting}
                >
                  <img src="/icons/ui/edit.svg" alt="" className="icon-image mono-icon" />
                </button>
                <button
                  type="button"
                  className="icon-btn patient-action danger-btn"
                  aria-label={t.deletePatient}
                  title={t.deletePatient}
                  onClick={handleDeletePatient}
                  disabled={isDeleting}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="icon-image"
                    aria-hidden="true"
                  >
                    <path d="M4 7h16" />
                    <path d="M9 7V4h6v3" />
                    <path d="M7 7l1 12h8l1-12" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="add-btn icon-btn patient-action"
              aria-label={t.addPatient}
              title={t.addPatient}
              onClick={openCreateForm}
              disabled={isDeleting}
            >
              <img src="/icons/ui/add.svg" alt="" className="icon-image mono-icon" />
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
                  onChange={(event) => handleAgeChange(event.target.value)}
                  placeholder="0"
                  required
                />
              </label>

              <div className="form-section">
                <div className="section-title">{t.targetRange}</div>
                <div className="range-grid">
                  <label>
                    <span>{t.targetMinBpm}</span>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      step="1"
                      value={formState.referenceMinBpm}
                      onChange={(event) => handleRangeChange('referenceMinBpm', event.target.value, 'targetRange')}
                      placeholder="0"
                      required
                    />
                  </label>

                  <label>
                    <span>{t.targetMaxBpm}</span>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      step="1"
                      value={formState.referenceMaxBpm}
                      onChange={(event) => handleRangeChange('referenceMaxBpm', event.target.value, 'targetRange')}
                      placeholder="0"
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="form-section">
                <div className="section-title">{t.tempRange}</div>
                <div className="range-grid">
                  <label>
                    <span>{t.tempMin}</span>
                    <input
                      type="number"
                      min="30"
                      max="45"
                      step="0.1"
                      value={formState.normalTempMinC}
                      onChange={(event) => handleRangeChange('normalTempMinC', event.target.value, 'tempRange')}
                      placeholder="36.5"
                      required
                    />
                  </label>

                  <label>
                    <span>{t.tempMax}</span>
                    <input
                      type="number"
                      min="30"
                      max="45"
                      step="0.1"
                      value={formState.normalTempMaxC}
                      onChange={(event) => handleRangeChange('normalTempMaxC', event.target.value, 'tempRange')}
                      placeholder="37.5"
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="subtle">{t.targetHint}</div>
              {formError ? <div className="form-error">{formError}</div> : null}

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
