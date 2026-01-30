---
name: Thai Bank APIs
description: การเชื่อมต่อ Open Banking APIs ของธนาคารในประเทศไทย รวม SCB, KBank, BBL, KTB สำหรับ payment, transfer และ account services
---

# Thai Bank APIs

## Overview

ธนาคารพาณิชย์หลักในประเทศไทยมี Open Banking APIs สำหรับ developers ใช้เชื่อมต่อบริการต่างๆ เช่น QR Payment, Fund Transfer, Bill Payment, Account Information และ Slip Verification

## Why This Matters

- **Direct Integration**: ไม่ต้องผ่าน payment gateway
- **Lower Fees**: ค่าธรรมเนียมถูกกว่า
- **Real-time**: ข้อมูลและการยืนยัน real-time
- **Customization**: ปรับแต่งได้ตามต้องการ

---

## Core Concepts

### 1. SCB Open Banking

```typescript
// lib/scb-api.ts
interface SCBConfig {
  apiKey: string;
  apiSecret: string;
  billerCode: string;
  merchantId: string;
}

class SCBClient {
  private baseUrl = 'https://api.scb.co.th';
  private config: SCBConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  
  constructor(config: SCBConfig) {
    this.config = config;
  }
  
  // OAuth 2.0 Authentication
  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }
    
    const response = await fetch(`${this.baseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'resourceOwnerId': this.config.apiKey,
        'requestUId': this.generateUUID(),
      },
      body: JSON.stringify({
        applicationKey: this.config.apiKey,
        applicationSecret: this.config.apiSecret,
      }),
    });
    
    const data = await response.json();
    this.accessToken = data.data.accessToken;
    this.tokenExpiry = new Date(Date.now() + data.data.expiresIn * 1000);
    
    return this.accessToken;
  }
  
  // Create QR Payment
  async createQRPayment(params: {
    amount: number;
    reference1: string;
    reference2?: string;
  }): Promise<QRPaymentResult> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/v1/payment/qrcode/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'resourceOwnerId': this.config.apiKey,
        'requestUId': this.generateUUID(),
      },
      body: JSON.stringify({
        qrType: '3',  // PromptPay
        ppType: 'BILLERID',
        ppId: this.config.billerCode,
        amount: params.amount.toFixed(2),
        ref1: params.reference1,
        ref2: params.reference2 || '',
        ref3: 'APP',
      }),
    });
    
    const data = await response.json();
    return {
      qrRawData: data.data.qrRawData,
      qrImage: data.data.qrImage,
      transactionId: data.data.transactionId,
    };
  }
  
  // Verify Slip
  async verifySlip(params: {
    sendingBank: string;
    transRef: string;
  }): Promise<SlipVerificationResult> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/v1/payment/billpayment/inquiry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'resourceOwnerId': this.config.apiKey,
        'requestUId': this.generateUUID(),
      },
      body: JSON.stringify({
        eventCode: '00300100',
        transactionId: params.transRef,
        sendingBank: params.sendingBank,
      }),
    });
    
    const data = await response.json();
    return {
      isValid: data.status.code === 1000,
      amount: parseFloat(data.data.amount),
      transactionDate: data.data.transactionDateAndTime,
      senderName: data.data.sender.name,
    };
  }
  
  private generateUUID(): string {
    return crypto.randomUUID();
  }
}

// Usage
const scb = new SCBClient({
  apiKey: process.env.SCB_API_KEY!,
  apiSecret: process.env.SCB_API_SECRET!,
  billerCode: process.env.SCB_BILLER_CODE!,
  merchantId: process.env.SCB_MERCHANT_ID!,
});
```

### 2. KBank Open API (K PLUS Business)

```typescript
// lib/kbank-api.ts
class KBankClient {
  private baseUrl = 'https://openapi.kasikornbank.com';
  private consumerKey: string;
  private consumerSecret: string;
  
  constructor(consumerKey: string, consumerSecret: string) {
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
  }
  
  // Get OAuth Token
  async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    
    const data = await response.json();
    return data.access_token;
  }
  
  // Thai QR Payment
  async createThaiQR(params: {
    partnerId: string;
    partnerTxnUid: string;
    requestDt: string;
    amount: string;
    ref1: string;
    ref2?: string;
    ref3?: string;
  }): Promise<ThaiQRResult> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/v1/qrpayment/request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-]partner-id': params.partnerId,
      },
      body: JSON.stringify({
        partnerTxnUid: params.partnerTxnUid,
        requestDt: params.requestDt,
        partnerId: params.partnerId,
        partnerSecret: process.env.KBANK_PARTNER_SECRET,
        amount: params.amount,
        ref1: params.ref1,
        ref2: params.ref2 || '',
        ref3: params.ref3 || '',
      }),
    });
    
    const data = await response.json();
    return {
      qrCode: data.qrCode,
      txnId: data.txnId,
    };
  }
  
  // Inquiry Payment Status
  async inquiryPayment(params: {
    partnerId: string;
    partnerTxnUid: string;
    txnId: string;
  }): Promise<PaymentInquiryResult> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/v1/qrpayment/inquiry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        partnerId: params.partnerId,
        partnerSecret: process.env.KBANK_PARTNER_SECRET,
        partnerTxnUid: params.partnerTxnUid,
        origPartnerTxnUid: params.txnId,
        requestDt: new Date().toISOString(),
      }),
    });
    
    const data = await response.json();
    return {
      status: data.statusCode,
      amount: data.amount,
      payerName: data.payerName,
      transactionDate: data.transDt,
    };
  }
}
```

### 3. BBL API

```typescript
// lib/bbl-api.ts
class BBLClient {
  private baseUrl = 'https://api.bangkokbank.com';
  
  async createQRCode(params: {
    billerId: string;
    amount: number;
    ref1: string;
    ref2?: string;
  }): Promise<BBLQRResult> {
    const response = await fetch(`${this.baseUrl}/v1/payment/qrcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.BBL_API_KEY!,
      },
      body: JSON.stringify({
        merchantId: process.env.BBL_MERCHANT_ID,
        billerId: params.billerId,
        amount: params.amount.toFixed(2),
        ref1: params.ref1,
        ref2: params.ref2 || '',
        currency: 'THB',
      }),
    });
    
    const data = await response.json();
    return {
      qrData: data.qrData,
      qrImage: data.qrImage,
      transRef: data.transRef,
    };
  }
}
```

### 4. Slip Verification Service

```typescript
// services/slip-verification.ts
interface SlipData {
  transRef: string;
  sendingBank: string;
  amount: number;
  date: string;
}

// ใช้ third-party service เช่น SlipOK, OpenSlip
async function verifySlipViaOCR(slipImage: Buffer): Promise<SlipData> {
  // ใช้ OCR หรือ API service
  const response = await fetch('https://api.slipok.com/api/v1/verify', {
    method: 'POST',
    headers: {
      'x-authorization': process.env.SLIPOK_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: slipImage.toString('base64'),
    }),
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Slip verification failed');
  }
  
  return {
    transRef: data.data.transRef,
    sendingBank: data.data.sendingBank,
    amount: data.data.amount,
    date: data.data.transDate,
  };
}

// Cross-verify with bank API
async function crossVerifyWithBank(slipData: SlipData, orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  // Verify amount matches
  if (Math.abs(slipData.amount - order.totalAmount) > 0.01) {
    return false;
  }
  
  // Verify with bank API
  const scb = new SCBClient({ /* config */ });
  const verification = await scb.verifySlip({
    sendingBank: slipData.sendingBank,
    transRef: slipData.transRef,
  });
  
  if (!verification.isValid) {
    return false;
  }
  
  // Check if slip already used
  const existingPayment = await prisma.payment.findFirst({
    where: { transactionRef: slipData.transRef },
  });
  
  if (existingPayment) {
    return false; // Duplicate slip
  }
  
  return true;
}
```

### 5. Unified Payment Service

```typescript
// services/payment.service.ts
type BankProvider = 'SCB' | 'KBANK' | 'BBL' | 'KTB';

class UnifiedPaymentService {
  private providers: Map<BankProvider, any>;
  
  constructor() {
    this.providers = new Map([
      ['SCB', new SCBClient({ /* config */ })],
      ['KBANK', new KBankClient(/* config */)],
      ['BBL', new BBLClient()],
    ]);
  }
  
  async createPayment(params: {
    orderId: string;
    amount: number;
    preferredBank?: BankProvider;
  }): Promise<PaymentResult> {
    const bank = params.preferredBank || 'SCB';
    const provider = this.providers.get(bank);
    
    if (!provider) {
      throw new Error(`Bank provider ${bank} not configured`);
    }
    
    const reference = `ORD-${params.orderId}`;
    
    // Create QR with bank API
    const qrResult = await provider.createQRPayment({
      amount: params.amount,
      reference1: reference,
    });
    
    // Save payment record
    const payment = await prisma.payment.create({
      data: {
        orderId: params.orderId,
        amount: params.amount,
        status: 'PENDING',
        provider: bank,
        transactionId: qrResult.transactionId,
        qrCode: qrResult.qrRawData,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });
    
    return {
      paymentId: payment.id,
      qrCode: qrResult.qrImage,
      qrRawData: qrResult.qrRawData,
      expiresAt: payment.expiresAt,
    };
  }
  
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (payment.status !== 'PENDING') {
      return payment.status;
    }
    
    // Check with bank
    const provider = this.providers.get(payment.provider as BankProvider);
    const status = await provider.inquiryPayment({
      transactionId: payment.transactionId,
    });
    
    if (status.status === 'SUCCESS') {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
          payerName: status.payerName,
        },
      });
      return 'COMPLETED';
    }
    
    return 'PENDING';
  }
}
```

## Quick Start

1. **สมัคร Developer Account:**
   - [SCB Open Banking](https://developer.scb/)
   - [KBank Open API](https://apiportal.kasikornbank.com/)
   - [BBL API](https://developer.bangkokbank.com/)

2. **ลงทะเบียน Biller ID** (ถ้าต้องการ)

3. **รับ API Credentials** (API Key, Secret)

4. **Implement OAuth flow**

5. **Test in Sandbox** ก่อน Production

## Production Checklist

- [ ] OAuth token refresh handling
- [ ] Idempotency keys for requests
- [ ] Request/response logging
- [ ] Error handling and retry logic
- [ ] Webhook signature verification
- [ ] Rate limiting respect
- [ ] IP whitelist configured
- [ ] SSL certificate validation
- [ ] Reconciliation process

## Anti-patterns

1. **Hardcode credentials**: ใช้ environment variables
2. **ไม่ handle token expiry**: Implement token refresh
3. **ไม่ log transactions**: ต้อง log ทุก transaction
4. **Single point of failure**: มี fallback provider

## Integration Points

- **PromptPay**: QR Payment, Bill Payment
- **Fund Transfer**: Inter-bank, Intra-bank
- **Account Services**: Balance, Statement
- **Slip Verification**: OCR + Bank API

## Further Reading

- [SCB Developer Portal](https://developer.scb/)
- [KBank API Portal](https://apiportal.kasikornbank.com/)
- [BOT Open Banking Standard](https://www.bot.or.th/Thai/FinancialInstitutions/OpenBanking)
