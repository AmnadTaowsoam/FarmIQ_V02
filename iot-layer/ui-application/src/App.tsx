import { useEffect, useMemo, useState } from 'react'
import {
  api,
  CalibrationRun,
  CameraConfig,
  CalibratorImageDataset,
  CalibratorImagePair,
  CaptureSession,
  CaptureControl,
  CaptureMetadata,
  Overview,
  ServiceStatus,
  CalibratorJob,
  DockerContainerStatus,
  BoardReferenceConfig,
  BoardReferenceResponse,
} from './api'

const MENU = {
  calibrator: 'weight-vision-calibrator',
  capture: 'weight-vision-capture',
  service: 'weight-vision-service',
} as const

type MenuKey = keyof typeof MENU
type Tone = 'ok' | 'warn' | 'danger'

type LoadState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

const emptyList = <T,>(): LoadState<T[]> => ({ data: [], loading: false, error: null })

const formatDate = (value: string | null) => {
  if (!value) return 'ไม่พบข้อมูล'
  const date = new Date(value)
  return isNaN(date.getTime()) ? value : date.toLocaleString('th-TH')
}

export default function App() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('calibrator')
  const [overview, setOverview] = useState<LoadState<Overview>>({ data: null, loading: true, error: null })
  const [calibrations, setCalibrations] = useState<LoadState<CalibrationRun[]>>(emptyList())
  const [captures, setCaptures] = useState<LoadState<CaptureSession[]>>(emptyList())
  const [serviceStatus, setServiceStatus] = useState<LoadState<ServiceStatus>>({
    data: null,
    loading: false,
    error: null,
  })
  const [cameraConfig, setCameraConfig] = useState<LoadState<CameraConfig>>({
    data: null,
    loading: false,
    error: null,
  })
  const [calibratorJobs, setCalibratorJobs] = useState<LoadState<CalibratorJob[]>>(emptyList())
  const [captureControl, setCaptureControl] = useState<LoadState<CaptureControl>>({
    data: null,
    loading: false,
    error: null,
  })
  const [dockerContainers, setDockerContainers] = useState<LoadState<DockerContainerStatus[]>>(emptyList())
  const [calibratorImages, setCalibratorImages] = useState<LoadState<CalibratorImageDataset>>({
    data: null,
    loading: false,
    error: null,
  })
  const [boardReference, setBoardReference] = useState<LoadState<BoardReferenceResponse>>({
    data: null,
    loading: false,
    error: null,
  })
  const [calibratorImageFilter, setCalibratorImageFilter] = useState<string>('')
  const [previewPairKey, setPreviewPairKey] = useState<string | null>(null)
  const [deleteBusyKey, setDeleteBusyKey] = useState<string | null>(null)
  const [selectedCaptureId, setSelectedCaptureId] = useState<string | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [liveImageUrl, setLiveImageUrl] = useState<string>('')
  const [captureFilter, setCaptureFilter] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [selectedMetadata, setSelectedMetadata] = useState<LoadState<CaptureMetadata>>({
    data: null,
    loading: false,
    error: null,
  })

  const loadOverview = async () => {
    setOverview((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.overview()
      setOverview({ data, loading: false, error: null })
    } catch (error) {
      setOverview({ data: null, loading: false, error: (error as Error).message })
    }
  }

  const syncNow = async () => {
    await api.sync()
    await Promise.all([
      loadOverview(),
      loadCalibrations(),
      loadCaptures(),
      loadServiceStatus(),
      loadCameraConfig(),
      loadDockerContainers(),
      loadCalibratorImages(),
      loadBoardReference(),
    ])
  }

  const loadCalibrations = async () => {
    setCalibrations((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.calibrations()
      setCalibrations({ data, loading: false, error: null })
    } catch (error) {
      setCalibrations({ data: [], loading: false, error: (error as Error).message })
    }
  }

  const fetchCaptures = async (filter: { from: string; to: string }) => {
    setCaptures((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const fromIso = filter.from ? new Date(filter.from).toISOString() : undefined
      const toIso = filter.to ? new Date(filter.to).toISOString() : undefined
      const data = await api.captures({ from: fromIso, to: toIso, limit: 100 })
      setCaptures({ data, loading: false, error: null })
    } catch (error) {
      setCaptures({ data: [], loading: false, error: (error as Error).message })
    }
  }

  const loadCaptures = async () => {
    await fetchCaptures(captureFilter)
  }

  const applyCaptureFilter = async () => {
    await fetchCaptures(captureFilter)
  }

  const clearCaptureFilter = async () => {
    const reset = { from: '', to: '' }
    setCaptureFilter(reset)
    await fetchCaptures(reset)
  }

  const loadServiceStatus = async () => {
    setServiceStatus((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.serviceStatus()
      setServiceStatus({ data, loading: false, error: null })
    } catch (error) {
      setServiceStatus({ data: null, loading: false, error: (error as Error).message })
    }
  }

  const loadCameraConfig = async () => {
    setCameraConfig((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.cameraConfig()
      setCameraConfig({ data, loading: false, error: null })
    } catch (error) {
      setCameraConfig({ data: null, loading: false, error: (error as Error).message })
    }
  }

  const loadCalibratorJobs = async () => {
    setCalibratorJobs((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.calibratorJobs()
      setCalibratorJobs({ data, loading: false, error: null })
    } catch (error) {
      setCalibratorJobs({ data: [], loading: false, error: (error as Error).message })
    }
  }

  const loadCaptureControl = async () => {
    setCaptureControl((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.captureControl()
      setCaptureControl({ data, loading: false, error: null })
    } catch (error) {
      setCaptureControl({ data: null, loading: false, error: (error as Error).message })
    }
  }

  const loadDockerContainers = async () => {
    setDockerContainers((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.dockerContainers()
      setDockerContainers({ data, loading: false, error: null })
    } catch (error) {
      setDockerContainers({ data: [], loading: false, error: (error as Error).message })
    }
  }

  const loadCalibratorImages = async () => {
    setCalibratorImages((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.calibratorImages()
      setCalibratorImages({ data, loading: false, error: null })
    } catch (error) {
      setCalibratorImages({ data: null, loading: false, error: (error as Error).message })
    }
  }

  const loadBoardReference = async () => {
    setBoardReference((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.calibratorBoardReference()
      setBoardReference({ data, loading: false, error: null })
    } catch (error) {
      setBoardReference({ data: null, loading: false, error: (error as Error).message })
    }
  }

  const updateBoardReferenceField = (updater: (current: BoardReferenceConfig) => BoardReferenceConfig) => {
    setBoardReference((prev) => {
      if (!prev.data) return prev
      return {
        ...prev,
        data: {
          ...prev.data,
          config: updater(prev.data.config),
        },
      }
    })
  }

  const parseNumberInput = (value: string, fallback = 0): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const saveBoardReference = async () => {
    if (!boardReference.data?.config) return
    setBoardReference((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api.updateCalibratorBoardReference(boardReference.data.config)
      setBoardReference({ data, loading: false, error: null })
    } catch (error) {
      setBoardReference((prev) => ({ ...prev, loading: false, error: (error as Error).message }))
    }
  }

  const triggerCapturePairs = async () => {
    await api.calibratorCapturePairs({})
    await loadCalibratorJobs()
  }

  const waitForJob = async (jobId: string, timeoutMs = 60000) => {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      const job = await api.calibratorJob(jobId)
      if (job.status === 'success') return true
      if (job.status === 'failed') return false
      await new Promise((resolve) => window.setTimeout(resolve, 2000))
    }
    return false
  }

  const downloadLatestBoard = () => {
    const url = api.calibratorBoardDownloadUrl()
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const downloadFile = (url: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const triggerGenerateBoard = async () => {
    const data = await api.calibratorGenerateBoard({})
    await loadCalibratorJobs()
    const ok = await waitForJob(data.job_id)
    if (ok) {
      downloadLatestBoard()
      await loadCalibratorJobs()
    }
  }

  const triggerMonoCalib = async (side: 'left' | 'right') => {
    await api.calibratorMonoCalib(side)
    await loadCalibratorJobs()
  }

  const triggerStereoCalib = async () => {
    await api.calibratorStereoCalib(0.0)
    await loadCalibratorJobs()
  }

  const triggerCaptureRectified = async () => {
    const data = await api.calibratorCaptureRectified({ count: 1, max_files: 10 })
    await loadCalibratorJobs()
    const ok = await waitForJob(data.job_id)
    if (!ok) return
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const latest = await api.calibratorLatestRectified()
        downloadFile(latest.leftUrl)
        window.setTimeout(() => downloadFile(latest.rightUrl), 200)
        break
      } catch {
        await new Promise((resolve) => window.setTimeout(resolve, 200))
      }
    }
    await loadCalibratorJobs()
  }

  const triggerFloorCalib = async () => {
    await api.calibratorFloorCalib({ auto_frames: 30, auto_interval_ms: 200 })
    await loadCalibratorJobs()
  }

  const triggerPauseCapture = async () => {
    const data = await api.capturePause()
    setCaptureControl({ data, loading: false, error: null })
  }

  const triggerResumeCapture = async () => {
    const data = await api.captureResume()
    setCaptureControl({ data, loading: false, error: null })
  }

  const triggerManualShot = async () => {
    const data = await api.captureTrigger()
    setCaptureControl({ data, loading: false, error: null })
  }

  useEffect(() => {
    loadOverview()
    loadCalibrations()
    loadCaptures()
    loadServiceStatus()
    loadCameraConfig()
    loadCalibratorJobs()
    loadCaptureControl()
    loadDockerContainers()
    loadCalibratorImages()
    loadBoardReference()
  }, [])

  useEffect(() => {
    if (!previewPairKey) return
    const exists = (calibratorImages.data?.pairs ?? []).some((pair) => pair.pairKey === previewPairKey)
    if (!exists) setPreviewPairKey(null)
  }, [calibratorImages.data, previewPairKey])

  useEffect(() => {
    if (!selectedCaptureId && captures.data?.length) {
      setSelectedCaptureId(captures.data[0].sessionId)
    }
  }, [captures.data, selectedCaptureId])

  useEffect(() => {
    if (!selectedCaptureId) {
      setSelectedImageUrl(null)
      return
    }
    setSelectedImageUrl(`${api.captureImageUrl(selectedCaptureId, 'vis')}&ts=${Date.now()}`)
  }, [selectedCaptureId])

  useEffect(() => {
    if (!selectedCaptureId) {
      setSelectedMetadata({ data: null, loading: false, error: null })
      return
    }
    api
      .captureRefresh(selectedCaptureId)
      .then(() => loadCaptures())
      .catch(() => null)
    setSelectedMetadata((prev) => ({ ...prev, loading: true, error: null }))
    api
      .captureMetadata(selectedCaptureId)
      .then((data) => setSelectedMetadata({ data, loading: false, error: null }))
      .catch((error) =>
        setSelectedMetadata({ data: null, loading: false, error: (error as Error).message })
      )
  }, [selectedCaptureId])

  useEffect(() => {
    const refresh = () => {
      setLiveImageUrl(`${api.captureLiveUrl('left')}&ts=${Date.now()}`)
    }
    refresh()
    const timer = window.setInterval(refresh, 2000)
    return () => window.clearInterval(timer)
  }, [])

  const statusCards = useMemo(() => {
    const ready =
      !dockerContainers.error &&
      (dockerContainers.data?.length ?? 0) > 0 &&
      (dockerContainers.data ?? []).every((container) => container.running)
    return [{ label: ready ? 'ระบบพร้อมใช้งาน' : 'ระบบไม่พร้อมใช้งาน', tone: ready ? 'ok' : 'danger' }]
  }, [dockerContainers.data, dockerContainers.error])

  const serviceUi = useMemo(() => {
    const bufferedEvents = serviceStatus.data?.bufferedEvents ?? 0
    const stateDbExists = serviceStatus.data?.stateDbExists ?? false
    const sessionsPending = overview.data?.sessionsPending ?? 0
    const ready = !overview.error && !serviceStatus.error && stateDbExists && bufferedEvents === 0 && sessionsPending === 0
    const statusTone: Tone = ready ? 'ok' : 'danger'
    const statusText = ready ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'

    return {
      ready,
      statusTone,
      statusText,
    }
  }, [overview.data, serviceStatus.data])

  const selectedDetection = useMemo(() => {
    const detections = selectedMetadata.data?.detections ?? []
    if (!detections.length) return null
    return [...detections].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0]
  }, [selectedMetadata.data])

  const filteredCalibratorPairs = useMemo(() => {
    const pairs = calibratorImages.data?.pairs ?? []
    const needle = calibratorImageFilter.trim().toLowerCase()
    if (!needle) return pairs
    return pairs.filter((pair) => {
      const left = pair.leftFile?.toLowerCase() ?? ''
      const right = pair.rightFile?.toLowerCase() ?? ''
      return (
        pair.pairKey.toLowerCase().includes(needle) || left.includes(needle) || right.includes(needle)
      )
    })
  }, [calibratorImageFilter, calibratorImages.data?.pairs])

  const previewPair = useMemo(
    () => (calibratorImages.data?.pairs ?? []).find((pair) => pair.pairKey === previewPairKey) ?? null,
    [calibratorImages.data?.pairs, previewPairKey]
  )

  const previewIndex = useMemo(() => {
    if (!previewPair) return -1
    return filteredCalibratorPairs.findIndex((pair) => pair.pairKey === previewPair.pairKey)
  }, [filteredCalibratorPairs, previewPair])

  const deleteCalibratorSide = async (pair: CalibratorImagePair, side: 'left' | 'right') => {
    const fileName = side === 'left' ? pair.leftFile : pair.rightFile
    if (!fileName) return
    const ok = window.confirm(`ลบไฟล์ ${side.toUpperCase()}\n${fileName}\n\nยืนยันการลบถาวร?`)
    if (!ok) return
    setDeleteBusyKey(`${pair.pairKey}:${side}`)
    try {
      await api.calibratorDeleteImage(side, fileName)
      await loadCalibratorImages()
    } finally {
      setDeleteBusyKey(null)
    }
  }

  const deleteCalibratorPair = async (pair: CalibratorImagePair) => {
    const ok = window.confirm(`ลบคู่ภาพนี้ถาวร?\n${pair.pairKey}`)
    if (!ok) return
    setDeleteBusyKey(`${pair.pairKey}:pair`)
    try {
      await api.calibratorDeletePair(pair.pairKey)
      await loadCalibratorImages()
      setPreviewPairKey((prev) => (prev === pair.pairKey ? null : prev))
    } finally {
      setDeleteBusyKey(null)
    }
  }

  const selectedWeight = selectedMetadata.data?.scale?.weight_kg ?? null
  const boardConfig = boardReference.data?.config ?? null
  const imageBase = selectedMetadata.data?.image_id ?? selectedCaptureId ?? ''
  const imageNames = imageBase
    ? [`${imageBase}_left.jpg`, `${imageBase}_right.jpg`, `${imageBase}_vis.jpg`]
    : []

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" />
          <div>
            <p className="brand-title">FarmIQ</p>
            <p className="brand-subtitle">IoT Layer Console</p>
          </div>
        </div>

        <nav className="menu">
          {(Object.keys(MENU) as MenuKey[]).map((key) => (
            <button
              key={key}
              className={`menu-item ${activeMenu === key ? 'is-active' : ''}`}
              onClick={() => setActiveMenu(key)}
            >
              <span className="menu-label">{MENU[key]}</span>
              <span className="menu-meta">
                {key === 'calibrator' && 'Calibration & Camera Setup'}
                {key === 'capture' && 'Capture Control & Status'}
                {key === 'service' && 'Session & Delivery Pipeline'}
              </span>
            </button>
          ))}
        </nav>

        <section className="sidebar-card">
          <h3>Device Snapshot</h3>
          {overview.loading && <p className="panel-copy">กำลังโหลดข้อมูล...</p>}
          {overview.error && <p className="panel-copy">เกิดข้อผิดพลาด: {overview.error}</p>}
          {overview.data && (
            <div className="sidebar-metrics">
              <div>
                <p className="metric-label">Station</p>
                <p className="metric-value">{overview.data.stationId}</p>
              </div>
              <div>
                <p className="metric-label">Last Seen</p>
                <p className="metric-value">{formatDate(overview.data.lastSeen)}</p>
              </div>
              <div>
                <p className="metric-label">Captures Today</p>
                <p className="metric-value">{overview.data.capturesToday}</p>
              </div>
            </div>
          )}
        </section>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">iot-layer operations</p>
            <h1>WeighVision Operations UI</h1>
            <p className="subtitle">ควบคุม ตรวจสอบ และแก้ไขปัญหา pipeline ได้แบบรวมศูนย์</p>
          </div>
          <div className="status-stack">
            {statusCards.map((card) => (
              <div key={card.label} className={`status-chip ${card.tone}`}>
                <span className="status-dot" />
                {card.label}
              </div>
            ))}
          </div>
        </header>

        <section className="hero">
          <div>
            <h2>Realtime Operations Grid</h2>
            <p>สถานะสำคัญของ iot-layer เพื่อทีมหน้างานและเทคนิคในการแก้ปัญหาได้เร็วที่สุด</p>
          </div>
          <div className="hero-actions">
            <button className="primary" onClick={syncNow}>
              Sync Data
            </button>
            <button className="secondary">Download Logs</button>
          </div>
        </section>

        {activeMenu === 'calibrator' && (
          <>
            <section className="panel-grid">
              <article className="panel">
              <div className="panel-header">
                <h3>Calibration Status</h3>
                <span className="pill ok">Active</span>
              </div>
              <p className="panel-copy">จำนวนรอบการคาลิเบรตในฐานข้อมูล: {calibrations.data?.length ?? 0}</p>
              <div className="progress">
                <span style={{ width: '80%' }} />
              </div>
              </article>
              <article className="panel">
              <div className="panel-header">
                <h3>Calibration Actions</h3>
                <span className="pill">ล่าสุด</span>
              </div>
              <p className="panel-copy">Profile: {cameraConfig.data?.profileName ?? 'ไม่พบ'}</p>
              <p className="panel-copy">อัปเดตล่าสุด: {formatDate(cameraConfig.data?.lastUpdated ?? null)}</p>
              <div className="button-row">
                <button className="primary" onClick={triggerGenerateBoard}>
                  01_Generate ChArUco Board
                </button>
                <button className="primary" onClick={triggerCapturePairs}>
                  02_ Auto Capture Pairs
                </button>
                <button className="secondary" onClick={() => triggerMonoCalib('left')}>
                  021_Mono Calib (Left)
                </button>
                <button className="secondary" onClick={() => triggerMonoCalib('right')}>
                  021_Mono Calib (Right)
                </button>
                <button className="ghost" onClick={triggerStereoCalib}>
                  03_Stereo Calib
                </button>
                <button className="secondary" onClick={triggerFloorCalib}>
                  04_Calibration Floor (Height)
                </button>
                <button className="secondary" onClick={triggerCaptureRectified}>
                  05_Manual Capture Rectified
                </button>
              </div>
              <p className="panel-copy">
                งานทั้งหมดจะรันบน calibrator service และสามารถตรวจสอบสถานะได้ในตารางด้านขวา
              </p>
              </article>
              <article className="panel">
              <div className="panel-header">
                <h3>Calibration Jobs</h3>
                <span className="pill">Last 5</span>
              </div>
              <div className="timeline">
                {calibratorJobs.loading && <p className="panel-copy">กำลังโหลด...</p>}
                {calibratorJobs.error && (
                  <p className="panel-copy">เกิดข้อผิดพลาด: {calibratorJobs.error}</p>
                )}
                {calibratorJobs.data?.slice(0, 5).map((job) => (
                  <div key={job.job_id}>
                    <p className="time">{formatDate(job.created_at)}</p>
                    <p className="event">
                      {job.action} | {job.status}
                      {job.saved_count && job.saved_count > 0 ? ` · saved ${job.saved_count}` : ''}
                      {job.floor_height_mm ? ` · floor ${job.floor_height_mm.toFixed(1)} mm` : ''}
                    </p>
                    {job.action === 'mono_calib' && job.status === 'success' && job.mono_rms != null ? (
                      <p className="panel-copy">
                        mono {job.mono_side ?? '-'} | rms {job.mono_rms.toFixed(4)}
                        {job.mono_image_width && job.mono_image_height
                          ? ` | ${job.mono_image_width}x${job.mono_image_height}`
                          : ''}
                        {job.mono_fx != null && job.mono_fy != null
                          ? ` | fx=${job.mono_fx.toFixed(1)} fy=${job.mono_fy.toFixed(1)}`
                          : ''}
                      </p>
                    ) : null}
                    {job.action === 'stereo_calib' && job.status === 'success' ? (
                      <>
                        <p className="panel-copy">
                          {job.stereo_run_id ?? 'run'} | rmsL {job.stereo_rms_left?.toFixed(4) ?? '-'} | rmsR{' '}
                          {job.stereo_rms_right?.toFixed(4) ?? '-'} | rmsS {job.stereo_rms?.toFixed(4) ?? '-'}
                          {job.stereo_baseline != null ? ` | baseline ${job.stereo_baseline.toFixed(3)}` : ''}
                          {job.stereo_angle_deg != null ? ` | angle ${job.stereo_angle_deg.toFixed(3)}°` : ''}
                        </p>
                        {(job.stereo_report_lines ?? []).slice(0, 12).map((line, index) => (
                          <p key={`${job.job_id}:stereo:${index}`} className="time">
                            {line}
                          </p>
                        ))}
                      </>
                    ) : null}
                    {job.note ? <p className="panel-copy">{job.note}</p> : null}
                  </div>
                ))}
                {!calibratorJobs.loading && !calibratorJobs.data?.length && (
                  <p className="panel-copy">ยังไม่มี job ที่สั่งจาก UI</p>
                )}
              </div>
              </article>
            </section>

            <section className="panel-grid">
              <article className="panel">
                <div className="panel-header">
                  <h3>Board Reference Config</h3>
                  <span className="pill">Geometry-based</span>
                </div>
                <p className="panel-copy">
                  ใช้กำหนดค่าคงที่จากหน้างานจริงสำหรับไฟล์ `camera-config/Geometry-based/board_reference.yml`
                </p>
                <p className="panel-copy">
                  อัปเดตล่าสุด: {formatDate(boardReference.data?.updatedAt ?? null)}
                </p>
                {boardReference.loading && <p className="panel-copy">กำลังโหลด board reference...</p>}
                {boardReference.error && <p className="panel-copy">board reference error: {boardReference.error}</p>}
                {boardConfig && (
                  <>
                    <div className="filter-row">
                      <label className="filter-field">
                        <span>Board Name</span>
                        <input
                          type="text"
                          value={boardConfig.board.name}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              board: { ...current.board, name: event.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>Board Color</span>
                        <input
                          type="text"
                          value={boardConfig.board.color}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              board: { ...current.board, color: event.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>Board Width (mm)</span>
                        <input
                          type="number"
                          value={boardConfig.board.size_mm.width}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              board: {
                                ...current.board,
                                size_mm: {
                                  ...current.board.size_mm,
                                  width: parseNumberInput(event.target.value, current.board.size_mm.width),
                                },
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>Board Height (mm)</span>
                        <input
                          type="number"
                          value={boardConfig.board.size_mm.height}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              board: {
                                ...current.board,
                                size_mm: {
                                  ...current.board.size_mm,
                                  height: parseNumberInput(event.target.value, current.board.size_mm.height),
                                },
                              },
                            }))
                          }
                        />
                      </label>
                    </div>

                    <div className="filter-row">
                      <label className="filter-field">
                        <span>ROI Offset X (mm)</span>
                        <input
                          type="number"
                          value={boardConfig.roi.offset_mm.x}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              roi: {
                                ...current.roi,
                                offset_mm: {
                                  ...current.roi.offset_mm,
                                  x: parseNumberInput(event.target.value, current.roi.offset_mm.x),
                                },
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>ROI Offset Y (mm)</span>
                        <input
                          type="number"
                          value={boardConfig.roi.offset_mm.y}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              roi: {
                                ...current.roi,
                                offset_mm: {
                                  ...current.roi.offset_mm,
                                  y: parseNumberInput(event.target.value, current.roi.offset_mm.y),
                                },
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>ROI Scale X</span>
                        <input
                          type="number"
                          step="0.01"
                          value={boardConfig.roi.size_scale.x}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              roi: {
                                ...current.roi,
                                size_scale: {
                                  ...current.roi.size_scale,
                                  x: parseNumberInput(event.target.value, current.roi.size_scale.x),
                                },
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>ROI Scale Y</span>
                        <input
                          type="number"
                          step="0.01"
                          value={boardConfig.roi.size_scale.y}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              roi: {
                                ...current.roi,
                                size_scale: {
                                  ...current.roi.size_scale,
                                  y: parseNumberInput(event.target.value, current.roi.size_scale.y),
                                },
                              },
                            }))
                          }
                        />
                      </label>
                    </div>

                    <div className="filter-row">
                      <label className="filter-field">
                        <span>ROI Padding X (mm)</span>
                        <input
                          type="number"
                          value={boardConfig.roi.padding_mm.x}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              roi: {
                                ...current.roi,
                                padding_mm: {
                                  ...current.roi.padding_mm,
                                  x: parseNumberInput(event.target.value, current.roi.padding_mm.x),
                                },
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>ROI Padding Y (mm)</span>
                        <input
                          type="number"
                          value={boardConfig.roi.padding_mm.y}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              roi: {
                                ...current.roi,
                                padding_mm: {
                                  ...current.roi.padding_mm,
                                  y: parseNumberInput(event.target.value, current.roi.padding_mm.y),
                                },
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>Camera Distance To Board (mm)</span>
                        <input
                          type="number"
                          value={boardConfig.camera.distance_to_board_mm}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              camera: {
                                ...current.camera,
                                distance_to_board_mm: parseNumberInput(
                                  event.target.value,
                                  current.camera.distance_to_board_mm
                                ),
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>Reference Axis</span>
                        <input
                          type="text"
                          value={boardConfig.reference_plane.axis}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              reference_plane: {
                                ...current.reference_plane,
                                axis: event.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                    </div>

                    <div className="filter-row">
                      <label className="filter-field">
                        <span>Reference Z (mm)</span>
                        <input
                          type="number"
                          value={boardConfig.reference_plane.z_mm}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              reference_plane: {
                                ...current.reference_plane,
                                z_mm: parseNumberInput(event.target.value, current.reference_plane.z_mm),
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>Normal X</span>
                        <input
                          type="number"
                          value={boardConfig.reference_plane.normal[0]}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              reference_plane: {
                                ...current.reference_plane,
                                normal: [
                                  parseNumberInput(event.target.value, current.reference_plane.normal[0]),
                                  current.reference_plane.normal[1],
                                  current.reference_plane.normal[2],
                                ],
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>Normal Y</span>
                        <input
                          type="number"
                          value={boardConfig.reference_plane.normal[1]}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              reference_plane: {
                                ...current.reference_plane,
                                normal: [
                                  current.reference_plane.normal[0],
                                  parseNumberInput(event.target.value, current.reference_plane.normal[1]),
                                  current.reference_plane.normal[2],
                                ],
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="filter-field">
                        <span>Normal Z</span>
                        <input
                          type="number"
                          value={boardConfig.reference_plane.normal[2]}
                          onChange={(event) =>
                            updateBoardReferenceField((current) => ({
                              ...current,
                              reference_plane: {
                                ...current.reference_plane,
                                normal: [
                                  current.reference_plane.normal[0],
                                  current.reference_plane.normal[1],
                                  parseNumberInput(event.target.value, current.reference_plane.normal[2]),
                                ],
                              },
                            }))
                          }
                        />
                      </label>
                    </div>

                    <div className="button-row">
                      <button className="primary" onClick={saveBoardReference} disabled={boardReference.loading}>
                        Save Board Reference
                      </button>
                      <button className="secondary" onClick={loadBoardReference} disabled={boardReference.loading}>
                        Reload
                      </button>
                    </div>
                  </>
                )}
              </article>
            </section>

            <section className="panel-grid calibrator-dataset-grid">
              <article className="panel calibrator-dataset-panel">
                <div className="panel-header">
                  <h3>Calibration Dataset Manager</h3>
                  <span className="pill">Left/Right Preview & Delete</span>
                </div>
                <div className="stat-grid stat-grid-four">
                  <div>
                    <p className="metric-label">Left Files</p>
                    <p className="metric-value">{calibratorImages.data?.summary.leftCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="metric-label">Right Files</p>
                    <p className="metric-value">{calibratorImages.data?.summary.rightCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="metric-label">Paired</p>
                    <p className="metric-value">{calibratorImages.data?.summary.pairedCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="metric-label">Unpaired</p>
                    <p className="metric-value">{calibratorImages.data?.summary.unpairedCount ?? 0}</p>
                  </div>
                </div>
                <div className="filter-row">
                  <label className="filter-field">
                    <span>Search pair/file</span>
                    <input
                      type="text"
                      value={calibratorImageFilter}
                      onChange={(event) => setCalibratorImageFilter(event.target.value)}
                      placeholder="charuco_20260128..."
                    />
                  </label>
                  <button className="secondary" onClick={loadCalibratorImages}>
                    Refresh List
                  </button>
                </div>
                <div className="dataset-table">
                  <div className="dataset-row head">
                    <span>Pair</span>
                    <span>Left</span>
                    <span>Right</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>
                  {filteredCalibratorPairs.map((pair) => (
                    <div key={pair.pairKey} className="dataset-row">
                      <div>
                        <p className="event">{pair.pairKey}</p>
                        <p className="time">{formatDate(pair.updatedAt)}</p>
                      </div>
                      <div className="dataset-cell">
                        {pair.leftUrl ? (
                          <button
                            type="button"
                            className="thumb-button"
                            onClick={() => setPreviewPairKey(pair.pairKey)}
                            title={pair.leftFile ?? ''}
                          >
                            <img
                              src={`${pair.leftUrl}?ts=${encodeURIComponent(pair.updatedAt ?? pair.pairKey)}`}
                              alt={pair.leftFile ?? 'left image'}
                            />
                          </button>
                        ) : (
                          <span className="thumb-missing">No Left</span>
                        )}
                        <p className="time">{pair.leftFile ?? '-'}</p>
                      </div>
                      <div className="dataset-cell">
                        {pair.rightUrl ? (
                          <button
                            type="button"
                            className="thumb-button"
                            onClick={() => setPreviewPairKey(pair.pairKey)}
                            title={pair.rightFile ?? ''}
                          >
                            <img
                              src={`${pair.rightUrl}?ts=${encodeURIComponent(pair.updatedAt ?? pair.pairKey)}`}
                              alt={pair.rightFile ?? 'right image'}
                            />
                          </button>
                        ) : (
                          <span className="thumb-missing">No Right</span>
                        )}
                        <p className="time">{pair.rightFile ?? '-'}</p>
                      </div>
                      <div>
                        <span className={`pill ${pair.status === 'paired' ? 'ok' : 'danger'}`}>
                          {pair.status}
                        </span>
                      </div>
                      <div className="button-row">
                        <button className="secondary" onClick={() => setPreviewPairKey(pair.pairKey)}>
                          Preview
                        </button>
                        <button
                          className="ghost"
                          disabled={deleteBusyKey === `${pair.pairKey}:pair`}
                          onClick={() => deleteCalibratorPair(pair)}
                        >
                          Delete Pair
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {calibratorImages.loading && <p className="panel-copy">กำลังโหลดรายการภาพ...</p>}
                {calibratorImages.error && (
                  <p className="panel-copy">dataset error: {calibratorImages.error}</p>
                )}
                {!calibratorImages.loading && !filteredCalibratorPairs.length && (
                  <p className="panel-copy">ยังไม่พบภาพใน `calib/samples/left` และ `calib/samples/right`</p>
                )}
              </article>
            </section>
          </>
        )}

        {activeMenu === 'capture' && (
          <section className="panel-grid">
            <article className="panel">
              <div className="panel-header">
                <h3>Capture Controls</h3>
                <span className={`pill ${captureControl.data?.paused ? 'warn' : 'ok'}`}>
                  {captureControl.data?.paused ? 'Paused' : 'Running'}
                </span>
              </div>
              <div className="button-row">
                <button
                  className="primary"
                  onClick={captureControl.data?.paused ? triggerResumeCapture : triggerPauseCapture}
                >
                  {captureControl.data?.paused ? 'Auto Capture' : 'Pause Capture'}
                </button>
                <button className="secondary" onClick={triggerManualShot}>
                  Trigger Manual Shot
                </button>
              </div>
              <p className="panel-copy">โหลดข้อมูลล่าสุดจาก metadata ของ capture service</p>
              <div className="media-frame">
                {liveImageUrl ? (
                  <img src={liveImageUrl} alt="Live left stream" />
                ) : (
                  <p className="panel-copy">ยังไม่มีภาพจากกล้อง</p>
                )}
              </div>
              <p className="panel-copy">รีเฟรชอัตโนมัติทุก ~2 วินาที</p>
              {captureControl.error && <p className="panel-copy">เกิดข้อผิดพลาด: {captureControl.error}</p>}
            </article>
            <article className="panel">
              <div className="panel-header">
                <h3>Capture Status</h3>
                <span className="pill">Live</span>
              </div>
              <div className="media-frame">
                {selectedImageUrl ? (
                  <img src={selectedImageUrl} alt="Annotated left capture" />
                ) : (
                  <p className="panel-copy">เลือก session จาก Recent Captures เพื่อดูภาพ</p>
                )}
              </div>
              <div className="stat-grid stat-grid-two">
                <div>
                  <p className="metric-label">Sessions</p>
                  {imageNames.length ? (
                    <div className="metric-value small">
                      {imageNames.map((name) => (
                        <span key={name}>{name}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="metric-value">ไม่พบข้อมูล</p>
                  )}
                </div>
                <div>
                  <p className="metric-label">Weight</p>
                  <p className="metric-value">
                    {selectedWeight !== null && selectedWeight !== undefined
                      ? `${selectedWeight.toFixed(2)} kg`
                      : '-'}
                  </p>
                </div>
              </div>
              <div className="stat-grid stat-grid-four">
                <div>
                  <p className="metric-label">Width (mm)</p>
                  <p className="metric-value">
                    {selectedDetection?.width_mm !== undefined && selectedDetection?.width_mm !== null
                      ? selectedDetection.width_mm.toFixed(1)
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="metric-label">Length (mm)</p>
                  <p className="metric-value">
                    {selectedDetection?.length_mm !== undefined && selectedDetection?.length_mm !== null
                      ? selectedDetection.length_mm.toFixed(1)
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="metric-label">Height (mm)</p>
                  <p className="metric-value">
                    {selectedDetection?.height_mm !== undefined && selectedDetection?.height_mm !== null
                      ? selectedDetection.height_mm.toFixed(1)
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="metric-label">Area (mm²)</p>
                  <p className="metric-value">
                    {selectedDetection?.area_xy_mm2 !== undefined && selectedDetection?.area_xy_mm2 !== null
                      ? selectedDetection.area_xy_mm2.toFixed(0)
                      : '-'}
                  </p>
                </div>
              </div>
              {selectedMetadata.error && (
                <p className="panel-copy">metadata error: {selectedMetadata.error}</p>
              )}
            </article>
            <article className="panel">
              <div className="panel-header">
                <h3>Recent Captures</h3>
                <span className="pill warn">จากไฟล์ metadata</span>
              </div>
              <div className="filter-row">
                <label className="filter-field">
                  <span>เริ่ม</span>
                  <input
                    type="datetime-local"
                    value={captureFilter.from}
                    onChange={(event) => setCaptureFilter((prev) => ({ ...prev, from: event.target.value }))}
                  />
                </label>
                <label className="filter-field">
                  <span>สิ้นสุด</span>
                  <input
                    type="datetime-local"
                    value={captureFilter.to}
                    onChange={(event) => setCaptureFilter((prev) => ({ ...prev, to: event.target.value }))}
                  />
                </label>
                <button className="secondary" onClick={applyCaptureFilter}>
                  Apply Filter
                </button>
                <button className="ghost" onClick={clearCaptureFilter}>
                  Clear
                </button>
              </div>
              <div className="table">
                <div className="row head">
                  <span>Session</span>
                  <span>Captured</span>
                  <span>Status</span>
                </div>
                {captures.data?.slice(0, 10).map((session) => (
                  <div
                    key={session.sessionId}
                    className={`row clickable ${selectedCaptureId === session.sessionId ? 'is-active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCaptureId(session.sessionId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        setSelectedCaptureId(session.sessionId)
                      }
                    }}
                  >
                    <span>{session.sessionId}</span>
                    <span>{formatDate(session.capturedAt)}</span>
                    <span className={`status ${session.status === 'complete' ? 'ok' : ''}`}>
                      {session.status}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {activeMenu === 'service' && (
          <section className="panel-grid">
            <article className="panel">
              <div className="panel-header">
                <h3>Docker Services</h3>
                <span className={`pill ${serviceUi.statusTone}`}>{serviceUi.statusText}</span>
              </div>
              <div className="docker-status-buttons">
                {(dockerContainers.data ?? []).map((container) => (
                  <button
                    key={container.key}
                    className={`docker-status-btn ${container.running ? 'up' : 'down'}`}
                    title={`${container.containerName} | ${container.status}`}
                    type="button"
                  >
                    {container.label}
                  </button>
                ))}
              </div>
              {dockerContainers.loading && <p className="panel-copy">กำลังโหลดสถานะ Docker...</p>}
              {dockerContainers.error && <p className="panel-copy">Docker status error: {dockerContainers.error}</p>}
            </article>
            <article className="panel">
              <div className="panel-header">
                <h3>MQTT & Buffer Status</h3>
                <span className={`pill ${serviceUi.statusTone}`}>{serviceUi.statusText}</span>
              </div>
              <ul className="list">
                <li>Service: {serviceUi.statusText}</li>
                <li>Buffered Events: {serviceStatus.data?.bufferedEvents ?? 0}</li>
                <li>State DB: {serviceStatus.data?.stateDbExists ? 'ready' : 'missing'}</li>
              </ul>
              <button className="ghost">Force Replay</button>
            </article>
            <article className="panel">
              <div className="panel-header">
                <h3>Media Upload Status</h3>
                <span className={`pill ${serviceUi.statusTone}`}>{serviceUi.statusText}</span>
              </div>
              <div className="stat-grid">
                <div>
                  <p className="metric-label">Last Capture</p>
                  <p className="metric-value">{formatDate(serviceStatus.data?.lastCaptureAt ?? null)}</p>
                </div>
                <div>
                  <p className="metric-label">Buffered</p>
                  <p className="metric-value">{serviceStatus.data?.bufferedEvents ?? 0}</p>
                </div>
                <div>
                  <p className="metric-label">Status</p>
                  <p className="metric-value">{serviceUi.statusText}</p>
                </div>
              </div>
            </article>
          </section>
        )}

        <section className="footer">
          <div>
            <p className="footer-title">System Health Notes</p>
            <p className="footer-copy">
              คำแนะนำ: ตรวจสอบ Edge Media Store เมื่อ buffer สะสมเกิน 200 events
            </p>
          </div>
          <div className="footer-actions">
            <button className="secondary">Open Diagnostics</button>
            <button className="ghost">Export Report</button>
          </div>
        </section>
      </main>

      {previewPair && (
        <div className="preview-backdrop" onClick={() => setPreviewPairKey(null)}>
          <section className="preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h3>Preview Pair: {previewPair.pairKey}</h3>
              <button className="ghost" onClick={() => setPreviewPairKey(null)}>
                Close
              </button>
            </div>
            <div className="preview-grid">
              <article className="preview-pane">
                <h4>Left</h4>
                <div className="preview-image">
                  {previewPair.leftUrl ? (
                    <img
                      src={`${previewPair.leftUrl}?ts=${encodeURIComponent(
                        previewPair.updatedAt ?? previewPair.pairKey
                      )}`}
                      alt={previewPair.leftFile ?? 'left'}
                    />
                  ) : (
                    <p className="panel-copy">ไม่พบไฟล์ Left</p>
                  )}
                </div>
                <p className="time">{previewPair.leftFile ?? '-'}</p>
                <button
                  className="ghost"
                  disabled={!previewPair.leftFile || deleteBusyKey === `${previewPair.pairKey}:left`}
                  onClick={() => deleteCalibratorSide(previewPair, 'left')}
                >
                  Delete Left
                </button>
              </article>
              <article className="preview-pane">
                <h4>Right</h4>
                <div className="preview-image">
                  {previewPair.rightUrl ? (
                    <img
                      src={`${previewPair.rightUrl}?ts=${encodeURIComponent(
                        previewPair.updatedAt ?? previewPair.pairKey
                      )}`}
                      alt={previewPair.rightFile ?? 'right'}
                    />
                  ) : (
                    <p className="panel-copy">ไม่พบไฟล์ Right</p>
                  )}
                </div>
                <p className="time">{previewPair.rightFile ?? '-'}</p>
                <button
                  className="ghost"
                  disabled={!previewPair.rightFile || deleteBusyKey === `${previewPair.pairKey}:right`}
                  onClick={() => deleteCalibratorSide(previewPair, 'right')}
                >
                  Delete Right
                </button>
              </article>
            </div>
            <div className="button-row">
              <button
                className="secondary"
                disabled={previewIndex <= 0}
                onClick={() => {
                  if (previewIndex <= 0) return
                  setPreviewPairKey(filteredCalibratorPairs[previewIndex - 1].pairKey)
                }}
              >
                Prev
              </button>
              <button
                className="secondary"
                disabled={previewIndex < 0 || previewIndex >= filteredCalibratorPairs.length - 1}
                onClick={() => {
                  if (previewIndex < 0 || previewIndex >= filteredCalibratorPairs.length - 1) return
                  setPreviewPairKey(filteredCalibratorPairs[previewIndex + 1].pairKey)
                }}
              >
                Next
              </button>
              <button
                className="ghost"
                disabled={deleteBusyKey === `${previewPair.pairKey}:pair`}
                onClick={() => deleteCalibratorPair(previewPair)}
              >
                Delete Pair
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
