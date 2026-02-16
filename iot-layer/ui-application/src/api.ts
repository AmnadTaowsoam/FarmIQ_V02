export type CalibrationRun = {
  runId: string
  createdAt: string | null
  rmsStereo: number | null
  notes: string | null
}

export type CaptureSession = {
  sessionId: string
  capturedAt: string | null
  weightKg: number | null
  detectionsCount: number
  imageCount: number
  status: string
}

export type CaptureMetadata = {
  image_id?: string
  timestamp?: string
  scale?: { weight_kg?: number | null }
  detections?: Array<{
    confidence?: number
    width_mm?: number | null
    length_mm?: number | null
    height_mm?: number | null
    area_xy_mm2?: number | null
  }>
}

export type ServiceStatus = {
  mqttConnected: boolean
  bufferedEvents: number
  lastCaptureAt: string | null
  stateDbExists: boolean
}

export type CameraConfig = {
  profileName: string
  lastUpdated: string | null
  diagnostics: Record<string, unknown>
}

export type CaptureControl = {
  paused: boolean
  trigger_id: number
  updated_at: string
}

export type CalibratorJob = {
  job_id: string
  action: string
  command: string[]
  status: string
  created_at: string
  started_at: string | null
  finished_at: string | null
  exit_code: number | null
  log: string[]
  saved_count?: number
  note?: string | null
  floor_height_mm?: number | null
  mono_side?: 'left' | 'right' | null
  mono_rms?: number | null
  mono_image_width?: number | null
  mono_image_height?: number | null
  mono_fx?: number | null
  mono_fy?: number | null
  mono_cx?: number | null
  mono_cy?: number | null
  stereo_run_id?: string | null
  stereo_rms_left?: number | null
  stereo_rms_right?: number | null
  stereo_rms?: number | null
  stereo_baseline?: number | null
  stereo_angle_deg?: number | null
  stereo_coverage_x?: number | null
  stereo_coverage_y?: number | null
  stereo_report_lines?: string[]
}

export type Overview = {
  stationId: string
  lastSeen: string | null
  capturesToday: number
  sessionsPending: number
}

export type CaptureImageVariant = 'left' | 'right' | 'vis'

export type DockerContainerStatus = {
  key: string
  label: string
  containerName: string
  running: boolean
  status: string
}

export type CalibratorImagePair = {
  pairKey: string
  leftFile: string | null
  rightFile: string | null
  leftUrl: string | null
  rightUrl: string | null
  updatedAt: string | null
  status: 'paired' | 'missing-left' | 'missing-right'
}

export type CalibratorImageDataset = {
  summary: {
    leftCount: number
    rightCount: number
    pairedCount: number
    unpairedCount: number
  }
  pairs: CalibratorImagePair[]
}

export type BoardReferenceConfig = {
  board: {
    name: string
    color: string
    size_mm: {
      width: number
      height: number
    }
  }
  roi: {
    offset_mm: {
      x: number
      y: number
    }
    size_scale: {
      x: number
      y: number
    }
    padding_mm: {
      x: number
      y: number
    }
  }
  camera: {
    distance_to_board_mm: number
  }
  reference_plane: {
    axis: string
    z_mm: number
    normal: [number, number, number]
  }
  measurement: {
    unit: {
      length: string
    }
    usage: string[]
  }
  metadata: {
    created_by: string
    description: string
  }
}

export type BoardReferenceResponse = {
  config: BoardReferenceConfig
  updatedAt: string | null
}

export type RectifiedLatestPair = {
  pairKey: string
  leftFile: string
  rightFile: string
  capturedAt: string
  leftUrl: string
  rightUrl: string
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(path, init)
  if (!resp.ok) {
    throw new Error(`Request failed: ${resp.status}`)
  }
  return (await resp.json()) as T
}

export const api = {
  overview: () => fetchJson<Overview>('/api/overview'),
  sync: () => fetchJson<{ synced: boolean }>('/api/sync', { method: 'POST' }),
  calibrations: () => fetchJson<CalibrationRun[]>('/api/calibrations'),
  captures: (params?: { from?: string; to?: string; limit?: number }) => {
    const search = new URLSearchParams()
    if (params?.from) search.set('from', params.from)
    if (params?.to) search.set('to', params.to)
    if (params?.limit) search.set('limit', String(params.limit))
    const suffix = search.toString()
    return fetchJson<CaptureSession[]>(`/api/captures${suffix ? `?${suffix}` : ''}`)
  },
  serviceStatus: () => fetchJson<ServiceStatus>('/api/service/status'),
  cameraConfig: () => fetchJson<CameraConfig>('/api/camera-config'),
  captureControl: () => fetchJson<CaptureControl>('/api/capture/control'),
  capturePause: () => fetchJson<CaptureControl>('/api/capture/pause', { method: 'POST' }),
  captureResume: () => fetchJson<CaptureControl>('/api/capture/resume', { method: 'POST' }),
  captureTrigger: () => fetchJson<CaptureControl>('/api/capture/trigger', { method: 'POST' }),
  captureMetadata: (sessionId: string) =>
    fetchJson<CaptureMetadata>(`/api/captures/${encodeURIComponent(sessionId)}/metadata`),
  calibratorJobs: () => fetchJson<CalibratorJob[]>('/api/calibrator/jobs'),
  calibratorJob: (jobId: string) => fetchJson<CalibratorJob>(`/api/calibrator/jobs/${jobId}`),
  calibratorCapturePairs: (payload: Record<string, unknown>) =>
    fetchJson<{ job_id: string; status: string }>('/api/calibrator/jobs/capture-pairs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  calibratorGenerateBoard: (payload: Record<string, unknown>) =>
    fetchJson<{ job_id: string; status: string }>('/api/calibrator/jobs/generate-board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  calibratorMonoCalib: (side: 'left' | 'right') =>
    fetchJson<{ job_id: string; status: string }>('/api/calibrator/jobs/mono-calib', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side }),
    }),
  calibratorStereoCalib: (alpha = 0.0) =>
    fetchJson<{ job_id: string; status: string }>('/api/calibrator/jobs/stereo-calib', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alpha }),
    }),
  calibratorCaptureRectified: (payload: Record<string, unknown>) =>
    fetchJson<{ job_id: string; status: string }>('/api/calibrator/jobs/capture-rectified', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  calibratorFloorCalib: (payload: Record<string, unknown>) =>
    fetchJson<{ job_id: string; status: string }>('/api/calibrator/jobs/floor-calib', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  calibratorImages: () => fetchJson<CalibratorImageDataset>('/api/calibrator/images'),
  calibratorDeleteImage: (side: 'left' | 'right', fileName: string) =>
    fetchJson<{ deleted: boolean }>(`/api/calibrator/images/${side}/${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
    }),
  calibratorDeletePair: (pairKey: string) =>
    fetchJson<{ deleted: number }>(`/api/calibrator/pairs/${encodeURIComponent(pairKey)}`, {
      method: 'DELETE',
    }),
  calibratorBoardDownloadUrl: () => '/api/calibrator/board/download',
  calibratorBoardReference: () => fetchJson<BoardReferenceResponse>('/api/calibrator/board-reference'),
  updateCalibratorBoardReference: (config: BoardReferenceConfig) =>
    fetchJson<BoardReferenceResponse>('/api/calibrator/board-reference', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    }),
  calibratorLatestRectified: () => fetchJson<RectifiedLatestPair>('/api/calibrator/rectified/latest'),
  calibratorRectifiedDownloadUrl: (fileName: string) =>
    `/api/calibrator/rectified/download/${encodeURIComponent(fileName)}`,
  captureRefresh: (sessionId: string) =>
    fetchJson<CaptureSession>(`/api/captures/${encodeURIComponent(sessionId)}/refresh`, {
      method: 'POST',
    }),
  dockerContainers: () => fetchJson<DockerContainerStatus[]>('/api/system/containers'),
  captureImageUrl: (sessionId: string, variant: CaptureImageVariant = 'left') =>
    `/api/captures/${encodeURIComponent(sessionId)}/image?variant=${variant}`,
  captureLiveUrl: (variant: CaptureImageVariant = 'left') => `/api/capture/live-image?variant=${variant}`,
}
