---
name: Thai SMS Providers
description: การเชื่อมต่อ SMS Gateway ในประเทศไทย สำหรับ OTP, notifications และ marketing messages ผ่าน ThaiBulkSMS, SMSMKT และ provider อื่นๆ
---

# Thai SMS Providers

## Overview

SMS ยังคงเป็นช่องทางสำคัญสำหรับ OTP verification และ notifications ในประเทศไทย เนื่องจากเข้าถึงได้ทุกเบอร์โทรศัพท์ไม่ต้องใช้ internet รองรับผู้ใช้ทุกกลุ่ม

## Why This Matters

- **Universal Reach**: ทุกเบอร์รับได้ ไม่ต้องมี internet
- **High Open Rate**: อัตราการเปิดอ่านสูงกว่า email
- **OTP Standard**: มาตรฐานสำหรับ 2FA ในไทย
- **Legal Compliance**: รองรับ PDPA consent

---

## Core Concepts

### 1. ThaiBulkSMS Integration

```typescript
// lib/thaibulksms.ts
interface ThaiBulkSMSConfig {
  apiKey: string;
  apiSecret: string;
  sender?: string;
}

class ThaiBulkSMSClient {
  private config: ThaiBulkSMSConfig;
  private baseUrl = 'https://api-v2.thaibulksms.com';
  
  constructor(config: ThaiBulkSMSConfig) {
    this.config = config;
  }
  
  // Send single SMS
  async sendSMS(params: {
    to: string;
    message: string;
    sender?: string;
  }): Promise<SMSResult> {
    const response = await fetch(`${this.baseUrl}/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        msisdn: this.formatPhoneNumber(params.to),
        message: params.message,
        sender: params.sender || this.config.sender || 'OTP',
      }),
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new SMSError(data.error_code, data.message);
    }
    
    return {
      messageId: data.data.message_id,
      status: data.status,
      creditUsed: data.data.credit_used,
    };
  }
  
  // Send OTP
  async sendOTP(params: {
    to: string;
    ref?: string;
  }): Promise<OTPResult> {
    const response = await fetch(`${this.baseUrl}/otp/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        msisdn: this.formatPhoneNumber(params.to),
        ref_code: params.ref || this.generateRefCode(),
      }),
    });
    
    const data = await response.json();
    
    return {
      token: data.data.token,
      refCode: data.data.ref_code,
      expiresIn: data.data.expires_in,
    };
  }
  
  // Verify OTP
  async verifyOTP(params: {
    token: string;
    pin: string;
  }): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        token: params.token,
        pin: params.pin,
      }),
    });
    
    const data = await response.json();
    return data.data.verify;
  }
  
  // Check credit balance
  async getBalance(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/credits`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
      },
    });
    
    const data = await response.json();
    return data.data.remaining_credits;
  }
  
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Convert 0x to 66x
    if (cleaned.startsWith('0')) {
      cleaned = '66' + cleaned.slice(1);
    }
    
    // Remove leading 66 if present, then add it back
    if (!cleaned.startsWith('66')) {
      cleaned = '66' + cleaned;
    }
    
    return cleaned;
  }
  
  private generateRefCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
```

### 2. SMSMKT Integration

```typescript
// lib/smsmkt.ts
interface SMSMKTConfig {
  apiKey: string;
  secret: string;
  sender?: string;
}

class SMSMKTClient {
  private config: SMSMKTConfig;
  private baseUrl = 'https://api.smsmkt.com/v1';
  
  constructor(config: SMSMKTConfig) {
    this.config = config;
  }
  
  private getAuthToken(): string {
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', this.config.secret)
      .update(this.config.apiKey + timestamp)
      .digest('hex');
    
    return Buffer.from(`${this.config.apiKey}:${timestamp}:${signature}`).toString('base64');
  }
  
  async sendSMS(params: {
    to: string | string[];
    message: string;
    sender?: string;
    scheduleAt?: Date;
  }): Promise<SMSResult> {
    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    
    const response = await fetch(`${this.baseUrl}/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify({
        sender: params.sender || this.config.sender,
        to: recipients.map(r => this.formatPhone(r)),
        message: params.message,
        ...(params.scheduleAt && { send_at: params.scheduleAt.toISOString() }),
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new SMSError(data.error_code, data.error_message);
    }
    
    return {
      messageId: data.data.message_id,
      status: 'sent',
      recipients: data.data.recipients,
    };
  }
  
  async getDeliveryReport(messageId: string): Promise<DeliveryReport> {
    const response = await fetch(`${this.baseUrl}/sms/report/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
    });
    
    const data = await response.json();
    
    return {
      messageId,
      status: data.data.status,
      deliveredAt: data.data.delivered_at,
      errorCode: data.data.error_code,
    };
  }
  
  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '66' + cleaned.slice(1);
    }
    return cleaned;
  }
}
```

### 3. Unified SMS Service

```typescript
// services/sms.service.ts
type SMSProvider = 'THAIBULKSMS' | 'SMSMKT';

interface SMSServiceConfig {
  defaultProvider: SMSProvider;
  providers: {
    THAIBULKSMS?: ThaiBulkSMSConfig;
    SMSMKT?: SMSMKTConfig;
  };
}

class SMSService {
  private providers: Map<SMSProvider, ThaiBulkSMSClient | SMSMKTClient>;
  private defaultProvider: SMSProvider;
  
  constructor(config: SMSServiceConfig) {
    this.defaultProvider = config.defaultProvider;
    this.providers = new Map();
    
    if (config.providers.THAIBULKSMS) {
      this.providers.set('THAIBULKSMS', new ThaiBulkSMSClient(config.providers.THAIBULKSMS));
    }
    if (config.providers.SMSMKT) {
      this.providers.set('SMSMKT', new SMSMKTClient(config.providers.SMSMKT));
    }
  }
  
  async sendOTP(phone: string): Promise<OTPSession> {
    // Rate limiting
    const rateKey = `otp:rate:${phone}`;
    const attempts = await redis.incr(rateKey);
    await redis.expire(rateKey, 3600); // 1 hour window
    
    if (attempts > 5) {
      throw new RateLimitError('Too many OTP requests');
    }
    
    // Generate OTP
    const otp = this.generateOTP();
    const refCode = this.generateRefCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Store OTP
    const session = await prisma.otpSession.create({
      data: {
        phone: this.normalizePhone(phone),
        otp: await bcrypt.hash(otp, 10),
        refCode,
        expiresAt,
        attempts: 0,
      },
    });
    
    // Send SMS
    const message = `รหัส OTP ของคุณคือ ${otp} (Ref: ${refCode}) หมดอายุใน 5 นาที`;
    
    try {
      await this.sendSMS(phone, message);
    } catch (error) {
      // Fallback to another provider
      const fallbackProvider = this.getFallbackProvider();
      if (fallbackProvider) {
        await this.sendSMS(phone, message, fallbackProvider);
      } else {
        throw error;
      }
    }
    
    return {
      sessionId: session.id,
      refCode,
      expiresAt,
    };
  }
  
  async verifyOTP(sessionId: string, otp: string): Promise<boolean> {
    const session = await prisma.otpSession.findUnique({
      where: { id: sessionId },
    });
    
    if (!session) {
      throw new Error('OTP session not found');
    }
    
    if (session.expiresAt < new Date()) {
      throw new Error('OTP expired');
    }
    
    if (session.attempts >= 3) {
      throw new Error('Too many failed attempts');
    }
    
    const isValid = await bcrypt.compare(otp, session.otp);
    
    if (!isValid) {
      await prisma.otpSession.update({
        where: { id: sessionId },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }
    
    // Mark as verified
    await prisma.otpSession.update({
      where: { id: sessionId },
      data: { verifiedAt: new Date() },
    });
    
    return true;
  }
  
  async sendSMS(
    to: string,
    message: string,
    provider?: SMSProvider
  ): Promise<void> {
    const selectedProvider = provider || this.defaultProvider;
    const client = this.providers.get(selectedProvider);
    
    if (!client) {
      throw new Error(`SMS provider ${selectedProvider} not configured`);
    }
    
    // Log outgoing SMS
    const log = await prisma.smsLog.create({
      data: {
        to: this.normalizePhone(to),
        message,
        provider: selectedProvider,
        status: 'PENDING',
      },
    });
    
    try {
      const result = await client.sendSMS({ to, message });
      
      await prisma.smsLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
          messageId: result.messageId,
        },
      });
    } catch (error) {
      await prisma.smsLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });
      throw error;
    }
  }
  
  async sendBulkSMS(params: {
    recipients: string[];
    message: string;
    scheduleAt?: Date;
  }): Promise<BulkSMSResult> {
    const results: SMSResult[] = [];
    const chunks = this.chunkArray(params.recipients, 100);
    
    for (const chunk of chunks) {
      const client = this.providers.get(this.defaultProvider) as SMSMKTClient;
      const result = await client.sendSMS({
        to: chunk,
        message: params.message,
        scheduleAt: params.scheduleAt,
      });
      results.push(result);
    }
    
    return {
      totalSent: params.recipients.length,
      results,
    };
  }
  
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  private generateRefCode(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  }
  
  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('66')) {
      cleaned = '0' + cleaned.slice(2);
    }
    return cleaned;
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  private getFallbackProvider(): SMSProvider | null {
    for (const [provider] of this.providers) {
      if (provider !== this.defaultProvider) {
        return provider;
      }
    }
    return null;
  }
}
```

### 4. API Routes

```typescript
// api/otp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';

const smsService = new SMSService({
  defaultProvider: 'THAIBULKSMS',
  providers: {
    THAIBULKSMS: {
      apiKey: process.env.THAIBULKSMS_API_KEY!,
      apiSecret: process.env.THAIBULKSMS_API_SECRET!,
      sender: 'MyApp',
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    
    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }
    
    const session = await smsService.sendOTP(phone);
    
    return NextResponse.json({
      sessionId: session.sessionId,
      refCode: session.refCode,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}

// api/otp/verify/route.ts
export async function POST(req: NextRequest) {
  try {
    const { sessionId, otp } = await req.json();
    
    const isValid = await smsService.verifyOTP(sessionId, otp);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }
    
    // Generate token or proceed with registration
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

### 5. React OTP Component

```tsx
// components/OTPVerification.tsx
'use client';

import { useState } from 'react';

interface OTPVerificationProps {
  phone: string;
  onVerified: () => void;
}

export function OTPVerification({ phone, onVerified }: OTPVerificationProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  const requestOTP = async () => {
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      
      const data = await res.json();
      setSessionId(data.sessionId);
      setRefCode(data.refCode);
      setCountdown(60);
      
      // Start countdown
      const interval = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) clearInterval(interval);
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const verifyOTP = async () => {
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, otp }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      
      onVerified();
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <div className="space-y-4">
      {!sessionId ? (
        <button
          onClick={requestOTP}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          ส่งรหัส OTP
        </button>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            รหัสอ้างอิง: <span className="font-mono">{refCode}</span>
          </p>
          
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="กรอกรหัส OTP 6 หลัก"
            className="w-full p-2 border rounded text-center text-2xl tracking-widest"
            maxLength={6}
          />
          
          <button
            onClick={verifyOTP}
            disabled={otp.length !== 6}
            className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-50"
          >
            ยืนยัน OTP
          </button>
          
          {countdown > 0 ? (
            <p className="text-sm text-gray-500 text-center">
              ส่งรหัสใหม่ได้ใน {countdown} วินาที
            </p>
          ) : (
            <button
              onClick={requestOTP}
              className="w-full text-blue-600 text-sm"
            >
              ส่งรหัส OTP อีกครั้ง
            </button>
          )}
        </>
      )}
      
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}
```

## Quick Start

1. **สมัคร account:**
   - [ThaiBulkSMS](https://www.thaibulksms.com/)
   - [SMSMKT](https://www.smsmkt.com/)

2. **รับ API credentials**

3. **ลงทะเบียน Sender ID** (ถ้าต้องการ custom sender)

4. **Implement SMS client**

5. **Test with real phone numbers**

## Production Checklist

- [ ] Rate limiting implemented
- [ ] OTP expiration handling
- [ ] Failed attempt tracking
- [ ] Fallback provider configured
- [ ] SMS logs stored
- [ ] Delivery reports monitored
- [ ] Credit balance alerting
- [ ] PDPA consent tracking

## Anti-patterns

1. **ไม่ hash OTP**: ต้อง hash ก่อนเก็บ
2. **OTP ไม่หมดอายุ**: ต้องมี expiration
3. **ไม่ limit attempts**: เสี่ยงต่อ brute force
4. **Hardcode credentials**: ใช้ environment variables

## Further Reading

- [ThaiBulkSMS API Docs](https://developer.thaibulksms.com/)
- [SMSMKT API Docs](https://www.smsmkt.com/api-docs/)
- [PDPA Guidelines](https://www.pdpc.or.th/)
