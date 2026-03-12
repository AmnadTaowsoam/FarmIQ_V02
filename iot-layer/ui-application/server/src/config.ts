import path from 'node:path'

export const IOT_LAYER_ROOT =
  process.env.IOT_LAYER_ROOT ?? path.resolve(process.cwd(), '../..')

export const PATHS = {
  calibratorOutputs: path.join(IOT_LAYER_ROOT, 'weight-vision-calibrator', 'calib', 'outputs'),
  calibratorDiagnostics: path.join(IOT_LAYER_ROOT, 'weight-vision-calibrator', 'calib', 'outputs'),
  calibratorBoard: path.join(IOT_LAYER_ROOT, 'weight-vision-calibrator', 'board'),
  calibratorSamples: path.join(IOT_LAYER_ROOT, 'weight-vision-calibrator', 'calib', 'samples'),
  calibratorRectified: path.join(IOT_LAYER_ROOT, 'weight-vision-calibrator', 'calib', 'rectified_test'),
  boardReference: path.join(IOT_LAYER_ROOT, 'camera-config', 'Geometry-based', 'board_reference.yml'),
  captureMetadata: path.join(IOT_LAYER_ROOT, 'weight-vision-capture', 'data', 'metadata'),
  captureImages: path.join(IOT_LAYER_ROOT, 'weight-vision-capture', 'data', 'images'),
  captureControl: path.join(IOT_LAYER_ROOT, 'weight-vision-capture', 'data', 'control.json'),
  serviceBuffer: path.join(IOT_LAYER_ROOT, 'weight-vision-service', 'buffer', 'events.jsonl'),
  serviceStateDb: path.join(IOT_LAYER_ROOT, 'weight-vision-service', 'state', 'state.db'),
  cameraConfigDiagnostics: path.join(IOT_LAYER_ROOT, 'camera-config', 'calibration-camera', 'diagnostics.json'),
  cameraConfigDir: path.join(IOT_LAYER_ROOT, 'camera-config', 'calibration-camera'),
}
