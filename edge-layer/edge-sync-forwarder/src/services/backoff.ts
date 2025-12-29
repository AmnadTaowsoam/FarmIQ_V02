export function computeBackoffSeconds(params: {
  attempt: number
  capSeconds: number
  jitterRatio: number
  rng?: () => number
}): number {
  const base = Math.pow(2, Math.max(1, params.attempt))
  const capped = Math.min(base, params.capSeconds)
  const jitterBase = capped * params.jitterRatio
  const random = params.rng ? params.rng() : Math.random()
  const jitter = random * jitterBase
  return Math.ceil(capped + jitter)
}
