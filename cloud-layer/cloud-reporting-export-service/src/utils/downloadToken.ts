import { createHmac } from 'crypto'

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4)
  return Buffer.from(padded, 'base64')
}

export interface DownloadTokenPayload {
  tenant_id: string
  job_id: string
  exp: number
}

export function signDownloadToken(
  payload: DownloadTokenPayload,
  secret: string
): string {
  const body = base64UrlEncode(JSON.stringify(payload))
  const signature = createHmac('sha256', secret).update(body).digest()
  const sig = base64UrlEncode(signature)
  return `${body}.${sig}`
}

export function verifyDownloadToken(
  token: string,
  secret: string
): DownloadTokenPayload | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) {
    return null
  }

  const expected = createHmac('sha256', secret).update(body).digest()
  const expectedSig = base64UrlEncode(expected)
  if (sig !== expectedSig) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body).toString()) as DownloadTokenPayload
    if (!payload.tenant_id || !payload.job_id || !payload.exp) {
      return null
    }
    return payload
  } catch {
    return null
  }
}
