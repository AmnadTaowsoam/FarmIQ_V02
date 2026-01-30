---
name: PromptPay Integration
description: การเชื่อมต่อระบบ PromptPay QR Payment สำหรับรับชำระเงินในประเทศไทย รองรับทั้ง Static และ Dynamic QR
---

# PromptPay Integration

## Overview

PromptPay เป็นระบบการชำระเงินแบบ QR Code มาตรฐานของประเทศไทย พัฒนาโดย NPCI ภายใต้การกำกับของธนาคารแห่งประเทศไทย รองรับการรับเงินผ่าน Mobile Banking ทุกธนาคาร โดยใช้ QR Code มาตรฐาน EMVCo

## Why This Matters

- **Universal**: ทุกธนาคารในไทยรองรับ
- **No Fee**: ไม่มีค่าธรรมเนียมสำหรับบุคคลธรรมดา
- **Instant**: เงินเข้าทันที
- **Mobile First**: เหมาะกับ mobile commerce

---

## Core Concepts

### 1. QR Code Types

| Type | ใช้เมื่อ | จำนวนเงิน |
|------|---------|-----------|
| Static QR | ร้านค้าทั่วไป, donation | ผู้จ่ายกรอกเอง |
| Dynamic QR | E-commerce, billing | กำหนดไว้แล้ว |

### 2. Generate Static QR (PromptPay ID)

```typescript
// lib/promptpay.ts
import QRCode from 'qrcode';
import crc from 'crc';

interface PromptPayConfig {
  promptPayId: string;  // เบอร์โทร หรือ เลขบัตรประชาชน
  amount?: number;
  ref1?: string;
  ref2?: string;
}

function generatePromptPayPayload(config: PromptPayConfig): string {
  const { promptPayId, amount, ref1, ref2 } = config;
  
  // Determine ID type
  const isPhoneNumber = promptPayId.length <= 10;
  const formattedId = isPhoneNumber
    ? `0066${promptPayId.replace(/^0/, '')}` // Convert to international format
    : promptPayId; // National ID (13 digits)
  
  const idType = isPhoneNumber ? '01' : '02'; // 01=phone, 02=national ID
  
  // Build EMVCo payload
  let payload = '';
  
  // Payload Format Indicator
  payload += '000201';
  
  // Point of Initiation Method (11=static, 12=dynamic)
  payload += amount ? '010212' : '010211';
  
  // Merchant Account Information (PromptPay)
  const merchantInfo = 
    `0016A000000677010111${idType}${formattedId.length.toString().padStart(2, '0')}${formattedId}`;
  payload += `29${merchantInfo.length.toString().padStart(2, '0')}${merchantInfo}`;
  
  // Transaction Currency (THB = 764)
  payload += '5303764';
  
  // Transaction Amount (if dynamic QR)
  if (amount) {
    const amountStr = amount.toFixed(2);
    payload += `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
  }
  
  // Country Code
  payload += '5802TH';
  
  // Additional Data (Bill Payment)
  if (ref1 || ref2) {
    let additionalData = '';
    if (ref1) {
      additionalData += `01${ref1.length.toString().padStart(2, '0')}${ref1}`;
    }
    if (ref2) {
      additionalData += `02${ref2.length.toString().padStart(2, '0')}${ref2}`;
    }
    payload += `62${additionalData.length.toString().padStart(2, '0')}${additionalData}`;
  }
  
  // CRC placeholder
  payload += '6304';
  
  // Calculate and append CRC
  const crcValue = crc.crc16xmodem(payload).toString(16).toUpperCase().padStart(4, '0');
  payload += crcValue;
  
  return payload;
}

// Generate QR Code image
export async function generatePromptPayQR(config: PromptPayConfig): Promise<string> {
  const payload = generatePromptPayPayload(config);
  
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
  });
  
  return qrDataUrl;
}

// Usage
const qrCode = await generatePromptPayQR({
  promptPayId: '0812345678',
  amount: 150.00,
  ref1: 'INV-2024-001',
});
```

### 3. Biller Payment API (PromptPay Bill Payment)

```typescript
// สำหรับธุรกิจที่ลงทะเบียนเป็น Biller กับธนาคาร
// ใช้ API ของธนาคารโดยตรง เช่น SCB, KBANK, BBL

// SCB PromptPay Bill Payment API
interface SCBBillPaymentRequest {
  billerCode: string;      // รหัส Biller ที่ลงทะเบียนกับ SCB
  reference1: string;      // Reference 1 (order ID)
  reference2?: string;     // Reference 2 (optional)
  amount: number;
  expiryDate?: string;     // QR expiry (ISO 8601)
}

async function createSCBPromptPayBill(request: SCBBillPaymentRequest): Promise<BillPaymentResponse> {
  const token = await getSCBAccessToken();
  
  const response = await fetch('https://api.scb.co.th/v1/payment/billpayment/qrcode', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'resourceOwnerId': process.env.SCB_API_KEY,
      'requestUId': generateUUID(),
    },
    body: JSON.stringify({
      billerCode: request.billerCode,
      reference1: request.reference1,
      reference2: request.reference2 || '',
      amount: request.amount.toFixed(2),
      expiryDate: request.expiryDate,
    }),
  });
  
  const data = await response.json();
  
  return {
    qrCode: data.data.qrRawData,
    qrImage: data.data.qrImage,
    transactionId: data.data.transactionId,
    expiryTime: data.data.expiryTime,
  };
}
```

### 4. Payment Confirmation Webhook

```typescript
// api/webhooks/promptpay.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface PromptPayWebhookPayload {
  transactionId: string;
  amount: number;
  reference1: string;
  reference2: string;
  sendingBank: string;
  payerAccountNumber: string;  // Masked
  payerName: string;
  transactionDateTime: string;
  status: 'SUCCESS' | 'FAILED';
}

export async function POST(req: NextRequest) {
  // Verify webhook signature (ขึ้นอยู่กับ provider)
  const signature = req.headers.get('x-signature');
  const body = await req.text();
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const payload: PromptPayWebhookPayload = JSON.parse(body);
  
  if (payload.status === 'SUCCESS') {
    // Update order status
    await prisma.order.update({
      where: { id: payload.reference1 },
      data: {
        paymentStatus: 'PAID',
        paidAt: new Date(payload.transactionDateTime),
        paymentTransactionId: payload.transactionId,
        paymentMethod: 'PROMPTPAY',
      },
    });
    
    // Trigger fulfillment
    await queue.add('process-order', { orderId: payload.reference1 });
    
    // Send confirmation to customer
    await notificationService.sendPaymentConfirmation(payload.reference1);
  }
  
  return NextResponse.json({ received: true });
}
```

### 5. Payment Verification (Polling)

```typescript
// สำหรับกรณีที่ไม่มี webhook
async function pollPaymentStatus(
  transactionId: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<PaymentStatus> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkPaymentStatus(transactionId);
    
    if (status === 'SUCCESS') {
      return status;
    }
    
    if (status === 'FAILED' || status === 'EXPIRED') {
      throw new PaymentError(status);
    }
    
    await sleep(intervalMs);
  }
  
  throw new PaymentError('TIMEOUT');
}

// Bank API example (SCB)
async function checkPaymentStatus(transactionId: string): Promise<string> {
  const token = await getSCBAccessToken();
  
  const response = await fetch(
    `https://api.scb.co.th/v1/payment/billpayment/transactions/${transactionId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'resourceOwnerId': process.env.SCB_API_KEY,
      },
    }
  );
  
  const data = await response.json();
  return data.data.status;
}
```

### 6. React Component

```tsx
// components/PromptPayQR.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PromptPayQRProps {
  orderId: string;
  amount: number;
  onPaymentComplete: () => void;
}

export function PromptPayQR({ orderId, amount, onPaymentComplete }: PromptPayQRProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'pending' | 'success' | 'expired'>('loading');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  
  useEffect(() => {
    // Generate QR Code
    fetch('/api/payments/promptpay/generate', {
      method: 'POST',
      body: JSON.stringify({ orderId, amount }),
    })
      .then(res => res.json())
      .then(data => {
        setQrCode(data.qrImage);
        setExpiresAt(new Date(data.expiresAt));
        setStatus('pending');
      });
  }, [orderId, amount]);
  
  // Poll for payment status
  useEffect(() => {
    if (status !== 'pending') return;
    
    const interval = setInterval(async () => {
      const res = await fetch(`/api/payments/promptpay/status/${orderId}`);
      const data = await res.json();
      
      if (data.status === 'SUCCESS') {
        setStatus('success');
        onPaymentComplete();
        clearInterval(interval);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [status, orderId, onPaymentComplete]);
  
  if (status === 'loading') {
    return <div className="animate-pulse">กำลังสร้าง QR Code...</div>;
  }
  
  if (status === 'success') {
    return (
      <div className="text-center text-green-600">
        <CheckCircle className="w-16 h-16 mx-auto" />
        <p className="mt-2">ชำระเงินสำเร็จ!</p>
      </div>
    );
  }
  
  return (
    <div className="text-center">
      <h3 className="text-lg font-semibold mb-4">สแกนเพื่อชำระเงิน</h3>
      
      {qrCode && (
        <Image
          src={qrCode}
          alt="PromptPay QR Code"
          width={300}
          height={300}
          className="mx-auto border rounded-lg"
        />
      )}
      
      <p className="mt-4 text-2xl font-bold">฿{amount.toLocaleString()}</p>
      
      <p className="mt-2 text-sm text-gray-500">
        รหัสอ้างอิง: {orderId}
      </p>
      
      {expiresAt && (
        <CountdownTimer expiresAt={expiresAt} onExpire={() => setStatus('expired')} />
      )}
      
      <div className="mt-4 flex justify-center gap-2">
        <Image src="/banks/scb.png" alt="SCB" width={40} height={40} />
        <Image src="/banks/kbank.png" alt="KBank" width={40} height={40} />
        <Image src="/banks/bbl.png" alt="BBL" width={40} height={40} />
        <span className="text-sm text-gray-500 self-center">และธนาคารอื่นๆ</span>
      </div>
    </div>
  );
}
```

## Quick Start

1. **สร้าง QR Code พื้นฐาน:**
   ```typescript
   const qr = await generatePromptPayQR({
     promptPayId: '0812345678',
     amount: 100,
   });
   ```

2. **ลงทะเบียน Biller** (สำหรับธุรกิจ):
   - ติดต่อธนาคาร (SCB, KBANK, BBL)
   - ส่งเอกสารจดทะเบียนบริษัท
   - ได้รับ Biller Code และ API credentials

3. **Implement webhook handler**

4. **Test with real banks** (sandbox environment)

## Production Checklist

- [ ] QR Code generation ถูกต้องตาม EMVCo standard
- [ ] CRC checksum ถูกต้อง
- [ ] Webhook signature verification
- [ ] Idempotent payment processing
- [ ] Payment timeout handling
- [ ] Duplicate payment detection
- [ ] Refund flow implemented
- [ ] Error handling and logging
- [ ] Bank reconciliation process

## Anti-patterns

1. **ไม่ verify webhook signature**: เสี่ยงต่อ fake payment notification
2. **ไม่มี idempotency**: อาจ process payment ซ้ำ
3. **Hardcode PromptPay ID**: ใช้ environment variables
4. **ไม่มี expiry time**: Dynamic QR ควรมีเวลาหมดอายุ

## Integration Points

- **Banks**: SCB, KBANK, BBL Open APIs
- **Payment Gateways**: 2C2P, Omise (รองรับ PromptPay)
- **E-commerce**: Shopify, WooCommerce plugins

## Further Reading

- [BOT PromptPay Standard](https://www.bot.or.th/Thai/PaymentSystems/PSServices/promptpay)
- [EMVCo QR Code Specification](https://www.emvco.com/emv-technologies/qrcodes/)
- [SCB Open Banking APIs](https://developer.scb/)
