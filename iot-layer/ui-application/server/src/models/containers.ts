import http from 'node:http'

type DockerContainer = {
  Names?: string[]
  State?: string
  Status?: string
}

type ContainerTarget = {
  key: string
  label: string
  containerName: string
}

const SOCKET_PATH = process.env.DOCKER_SOCKET_PATH ?? '/var/run/docker.sock'

const TARGETS: ContainerTarget[] = [
  {
    key: 'ui-app',
    label: 'ui-app',
    containerName: process.env.DOCKER_CONTAINER_UI_APP ?? 'iot-layer-ui-app-1',
  },
  {
    key: 'weight-vision-capture',
    label: 'weight-vision-capture',
    containerName: process.env.DOCKER_CONTAINER_CAPTURE ?? 'iot-layer-weight-vision-capture-1',
  },
  {
    key: 'weight-vision-service',
    label: 'weight-vision-service',
    containerName: process.env.DOCKER_CONTAINER_SERVICE ?? 'iot-layer-weight-vision-service-1',
  },
  {
    key: 'weight-vision-calibrator',
    label: 'weight-vision-calibrator',
    containerName: process.env.DOCKER_CONTAINER_CALIBRATOR ?? 'iot-layer-weight-vision-calibrator-1',
  },
]

function requestDocker(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: SOCKET_PATH,
        path,
        method: 'GET',
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8')
          if ((res.statusCode ?? 500) >= 400) {
            reject(new Error(`Docker API ${res.statusCode}: ${body}`))
            return
          }
          resolve(body)
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

export async function readDockerContainersStatus() {
  const body = await requestDocker('/containers/json?all=1')
  const containers = JSON.parse(body) as DockerContainer[]

  return TARGETS.map((target) => {
    const match = containers.find((container) =>
      (container.Names ?? []).some((name) => name === `/${target.containerName}`)
    )
    const running = match?.State === 'running'
    return {
      key: target.key,
      label: target.label,
      containerName: target.containerName,
      running,
      status: match?.Status ?? 'not found',
    }
  })
}
