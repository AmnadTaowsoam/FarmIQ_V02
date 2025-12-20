type SeedDevice = {
  username: string
  topic: string
}

const records: SeedDevice[] = Array.from({ length: 10 }, (_, index) => ({
  username: `device-${index + 1}`,
  topic: `iot/telemetry/tenant-1/farm-1/barn-1/device-${index + 1}/temperature`,
}))

console.log(JSON.stringify(records, null, 2))
