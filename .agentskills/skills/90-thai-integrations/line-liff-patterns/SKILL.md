---
name: LINE LIFF Patterns
description: Building LINE Front-end Framework (LIFF) applications สำหรับ Thailand market - mini apps, rich menus, Flex Messages, และ LINE Login.
---

# LINE LIFF Patterns

## Overview

LINE LIFF (LINE Front-end Framework) ช่วยให้สร้าง web apps ที่ทำงานภายใน LINE app ได้ เข้าถึง LINE APIs เช่น profile, share messages, และ send messages to chat ได้โดยตรง สำคัญมากสำหรับ Thai market ที่ LINE เป็น platform หลัก

## Why This Matters

- **Thailand #1**: LINE มี users 50M+ ในไทย
- **Native Experience**: Web app ทำงานใน LINE seamlessly
- **Rich Features**: Access LINE APIs, share, payments
- **No App Install**: Users ไม่ต้อง install app แยก

---

## Core Concepts

### 1. LIFF Setup

```typescript
// lib/liff.ts
import liff from '@line/liff';

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID!;

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

class LiffClient {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await liff.init({ liffId: LIFF_ID });
      this.initialized = true;
    } catch (error) {
      console.error('LIFF init error:', error);
      throw error;
    }
  }

  isLoggedIn(): boolean {
    return liff.isLoggedIn();
  }

  isInClient(): boolean {
    return liff.isInClient();
  }

  getOS(): 'ios' | 'android' | 'web' {
    return liff.getOS();
  }

  getLanguage(): string {
    return liff.getLanguage();
  }

  getVersion(): string {
    return liff.getVersion();
  }

  getContext(): liff.LiffContext | null {
    return liff.getContext();
  }

  login(redirectUri?: string): void {
    if (!this.isLoggedIn()) {
      liff.login({ redirectUri: redirectUri || window.location.href });
    }
  }

  logout(): void {
    if (this.isLoggedIn()) {
      liff.logout();
      window.location.reload();
    }
  }

  async getProfile(): Promise<LiffProfile> {
    if (!this.isLoggedIn()) {
      throw new Error('User not logged in');
    }
    return liff.getProfile();
  }

  async getAccessToken(): Promise<string> {
    const token = liff.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    return token;
  }

  async getIDToken(): Promise<string> {
    const token = liff.getIDToken();
    if (!token) {
      throw new Error('No ID token available');
    }
    return token;
  }

  // Decode ID token to get user info
  getDecodedIDToken(): liff.LiffDecodedIdToken | null {
    return liff.getDecodedIDToken();
  }

  // Close LIFF window
  closeWindow(): void {
    liff.closeWindow();
  }

  // Open external URL
  openWindow(url: string, external = false): void {
    liff.openWindow({ url, external });
  }

  // Share target picker (share to friends/groups)
  async shareTargetPicker(messages: liff.ShareTargetPickerMessage[]): Promise<void> {
    if (!liff.isApiAvailable('shareTargetPicker')) {
      throw new Error('Share target picker not available');
    }
    await liff.shareTargetPicker(messages);
  }

  // Send message to current chat
  async sendMessages(messages: liff.LiffMessage[]): Promise<void> {
    if (!this.isInClient()) {
      throw new Error('sendMessages only available in LINE client');
    }
    await liff.sendMessages(messages);
  }

  // Scan QR code
  async scanCode(): Promise<string> {
    if (!liff.isApiAvailable('scanCodeV2')) {
      throw new Error('Scan code not available');
    }
    const result = await liff.scanCodeV2();
    return result.value || '';
  }
}

export const liffClient = new LiffClient();
```

### 2. React Hook for LIFF

```typescript
// hooks/useLiff.ts
import { useState, useEffect, useCallback } from 'react';
import { liffClient, LiffProfile } from '@/lib/liff';

interface UseLiffReturn {
  isInitialized: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  profile: LiffProfile | null;
  error: Error | null;
  login: () => void;
  logout: () => void;
  getAccessToken: () => Promise<string>;
}

export function useLiff(): UseLiffReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInClient, setIsInClient] = useState(false);
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liffClient.init();
        setIsInitialized(true);
        setIsLoggedIn(liffClient.isLoggedIn());
        setIsInClient(liffClient.isInClient());

        if (liffClient.isLoggedIn()) {
          const userProfile = await liffClient.getProfile();
          setProfile(userProfile);
        }
      } catch (err) {
        setError(err as Error);
      }
    };

    initLiff();
  }, []);

  const login = useCallback(() => {
    liffClient.login();
  }, []);

  const logout = useCallback(() => {
    liffClient.logout();
    setProfile(null);
    setIsLoggedIn(false);
  }, []);

  const getAccessToken = useCallback(async () => {
    return liffClient.getAccessToken();
  }, []);

  return {
    isInitialized,
    isLoggedIn,
    isInClient,
    profile,
    error,
    login,
    logout,
    getAccessToken,
  };
}
```

### 3. LIFF Provider Component

```tsx
// providers/LiffProvider.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useLiff } from '@/hooks/useLiff';
import { LiffProfile } from '@/lib/liff';

interface LiffContextType {
  isInitialized: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  profile: LiffProfile | null;
  login: () => void;
  logout: () => void;
}

const LiffContext = createContext<LiffContextType | null>(null);

export function LiffProvider({ children }: { children: ReactNode }) {
  const liff = useLiff();

  if (!liff.isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
      </div>
    );
  }

  return (
    <LiffContext.Provider value={liff}>
      {children}
    </LiffContext.Provider>
  );
}

export function useLiffContext() {
  const context = useContext(LiffContext);
  if (!context) {
    throw new Error('useLiffContext must be used within LiffProvider');
  }
  return context;
}
```

### 4. Flex Messages

```typescript
// lib/flex-message.ts
import { FlexMessage, FlexContainer, FlexBubble } from '@line/bot-sdk';

// Product card template
export function createProductCard(product: {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  actionUrl: string;
}): FlexBubble {
  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: product.imageUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: product.name,
          weight: 'bold',
          size: 'xl',
        },
        {
          type: 'text',
          text: product.description,
          size: 'sm',
          color: '#999999',
          margin: 'md',
          wrap: true,
        },
        {
          type: 'box',
          layout: 'baseline',
          margin: 'md',
          contents: [
            {
              type: 'text',
              text: `฿${product.price.toLocaleString()}`,
              size: 'xl',
              weight: 'bold',
              color: '#00B900',
            },
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#00B900',
          action: {
            type: 'uri',
            label: 'ซื้อเลย',
            uri: product.actionUrl,
          },
        },
        {
          type: 'button',
          style: 'secondary',
          action: {
            type: 'uri',
            label: 'ดูรายละเอียด',
            uri: product.actionUrl,
          },
        },
      ],
    },
  };
}

// Receipt template
export function createReceiptMessage(order: {
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  date: string;
}): FlexBubble {
  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'ใบเสร็จรับเงิน',
          weight: 'bold',
          size: 'xl',
          color: '#00B900',
        },
        {
          type: 'text',
          text: `Order #${order.orderId}`,
          size: 'xs',
          color: '#999999',
          margin: 'md',
        },
        {
          type: 'separator',
          margin: 'lg',
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'sm',
          contents: order.items.map(item => ({
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: `${item.name} x${item.quantity}`,
                size: 'sm',
                color: '#555555',
                flex: 0,
              },
              {
                type: 'text',
                text: `฿${(item.price * item.quantity).toLocaleString()}`,
                size: 'sm',
                color: '#111111',
                align: 'end',
              },
            ],
          })),
        },
        {
          type: 'separator',
          margin: 'lg',
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'lg',
          contents: [
            {
              type: 'text',
              text: 'รวมทั้งหมด',
              size: 'md',
              weight: 'bold',
            },
            {
              type: 'text',
              text: `฿${order.total.toLocaleString()}`,
              size: 'md',
              weight: 'bold',
              color: '#00B900',
              align: 'end',
            },
          ],
        },
      ],
    },
  };
}

// Share to LINE
export async function shareProducts(products: any[]) {
  const messages: FlexMessage[] = [{
    type: 'flex',
    altText: 'สินค้าแนะนำ',
    contents: {
      type: 'carousel',
      contents: products.map(createProductCard),
    },
  }];

  await liffClient.shareTargetPicker(messages);
}
```

### 5. LINE Login Integration (Backend)

```typescript
// app/api/auth/line/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  if (!code) {
    return NextResponse.redirect('/login?error=no_code');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_URL}/api/auth/line/callback`,
        client_id: process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      throw new Error(tokens.error_description);
    }

    // Verify ID token
    const decoded = jwt.decode(tokens.id_token) as {
      sub: string;
      name: string;
      picture: string;
      email?: string;
    };

    // Get or create user
    const user = await prisma.user.upsert({
      where: { lineUserId: decoded.sub },
      update: {
        displayName: decoded.name,
        pictureUrl: decoded.picture,
        email: decoded.email,
      },
      create: {
        lineUserId: decoded.sub,
        displayName: decoded.name,
        pictureUrl: decoded.picture,
        email: decoded.email,
      },
    });

    // Create session
    const sessionToken = await createSession(user.id);

    const response = NextResponse.redirect(
      state ? decodeURIComponent(state) : '/'
    );

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('LINE login error:', error);
    return NextResponse.redirect('/login?error=auth_failed');
  }
}

// Verify LIFF access token (from frontend)
// app/api/auth/liff/route.ts
export async function POST(req: NextRequest) {
  const { accessToken } = await req.json();

  // Verify with LINE
  const verifyResponse = await fetch(
    `https://api.line.me/oauth2/v2.1/verify?access_token=${accessToken}`
  );

  const verifyData = await verifyResponse.json();

  if (verifyData.error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Get profile
  const profileResponse = await fetch('https://api.line.me/v2/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const profile = await profileResponse.json();

  // Create/update user and return session
  const user = await prisma.user.upsert({
    where: { lineUserId: profile.userId },
    update: { displayName: profile.displayName, pictureUrl: profile.pictureUrl },
    create: {
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    },
  });

  const sessionToken = await createSession(user.id);

  return NextResponse.json({ user, sessionToken });
}
```

### 6. Rich Menu

```typescript
// scripts/create-rich-menu.ts
import { Client, RichMenu } from '@line/bot-sdk';

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

async function createRichMenu() {
  const richMenu: RichMenu = {
    size: {
      width: 2500,
      height: 1686,
    },
    selected: true,
    name: 'Main Menu',
    chatBarText: 'เมนู',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: {
          type: 'uri',
          uri: `https://liff.line.me/${process.env.LIFF_ID}/products`,
        },
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: {
          type: 'uri',
          uri: `https://liff.line.me/${process.env.LIFF_ID}/orders`,
        },
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: {
          type: 'uri',
          uri: `https://liff.line.me/${process.env.LIFF_ID}/profile`,
        },
      },
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: {
          type: 'message',
          text: 'โปรโมชัน',
        },
      },
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: {
          type: 'message',
          text: 'ติดต่อเรา',
        },
      },
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: {
          type: 'uri',
          uri: 'https://example.com/help',
        },
      },
    ],
  };

  // Create rich menu
  const richMenuId = await client.createRichMenu(richMenu);
  console.log('Rich menu created:', richMenuId);

  // Upload image
  const fs = require('fs');
  const imageBuffer = fs.readFileSync('./rich-menu-image.png');
  await client.setRichMenuImage(richMenuId, imageBuffer);
  console.log('Rich menu image uploaded');

  // Set as default
  await client.setDefaultRichMenu(richMenuId);
  console.log('Set as default rich menu');
}

createRichMenu();
```

### 7. Complete LIFF App Page

```tsx
// app/page.tsx
'use client';

import { useLiffContext } from '@/providers/LiffProvider';
import { liffClient } from '@/lib/liff';
import { shareProducts, createProductCard } from '@/lib/flex-message';

export default function HomePage() {
  const { isLoggedIn, profile, login, logout, isInClient } = useLiffContext();

  const handleShare = async () => {
    const products = [
      {
        name: 'iPhone 15 Pro',
        description: 'สมาร์ทโฟนรุ่นล่าสุด',
        price: 45900,
        imageUrl: 'https://example.com/iphone.jpg',
        actionUrl: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/product/1`,
      },
    ];

    try {
      await shareProducts(products);
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!isInClient) {
      alert('ฟีเจอร์นี้ใช้ได้เฉพาะใน LINE เท่านั้น');
      return;
    }

    await liffClient.sendMessages([
      {
        type: 'text',
        text: 'สวัสดี! นี่คือข้อความจาก LIFF App',
      },
    ]);

    liffClient.closeWindow();
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">ยินดีต้อนรับ</h1>
        <button
          onClick={login}
          className="bg-[#00B900] text-white px-6 py-3 rounded-lg font-medium"
        >
          เข้าสู่ระบบด้วย LINE
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#00B900] text-white p-4">
        <div className="flex items-center gap-3">
          {profile?.pictureUrl && (
            <img
              src={profile.pictureUrl}
              alt={profile.displayName}
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <p className="font-medium">{profile?.displayName}</p>
            <p className="text-sm opacity-80">สมาชิก</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <h2 className="font-bold text-lg mb-3">เมนูหลัก</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-gray-100 p-4 rounded-lg text-center">
              🛍️ สินค้า
            </button>
            <button className="bg-gray-100 p-4 rounded-lg text-center">
              📦 คำสั่งซื้อ
            </button>
            <button
              onClick={handleShare}
              className="bg-gray-100 p-4 rounded-lg text-center"
            >
              📤 แชร์
            </button>
            <button
              onClick={handleSendMessage}
              className="bg-gray-100 p-4 rounded-lg text-center"
            >
              💬 ส่งข้อความ
            </button>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full bg-red-500 text-white py-3 rounded-lg"
        >
          ออกจากระบบ
        </button>
      </main>
    </div>
  );
}
```

## Quick Start

1. **สร้าง LINE Login Channel:**
   - ไปที่ [LINE Developers Console](https://developers.line.biz/)
   - สร้าง Provider → Channel (LINE Login)

2. **สร้าง LIFF App:**
   - ใน Channel → LIFF → Add
   - กำหนด Endpoint URL

3. **Install SDK:**
   ```bash
   npm install @line/liff @line/bot-sdk
   ```

4. **Setup environment:**
   ```bash
   NEXT_PUBLIC_LIFF_ID=your-liff-id
   LINE_CHANNEL_ID=your-channel-id
   LINE_CHANNEL_SECRET=your-channel-secret
   ```

5. **Initialize LIFF** (see examples above)

## Production Checklist

- [ ] LIFF ID configured correctly
- [ ] Error handling for LIFF init failures
- [ ] Fallback for non-LINE browsers
- [ ] Access token validation on backend
- [ ] Rich menu designed and uploaded
- [ ] Flex messages tested on mobile
- [ ] Deep linking configured
- [ ] Analytics tracking

## Anti-patterns

1. **ไม่ check isInClient()**: บาง API ใช้ได้เฉพาะใน LINE
2. **Expose Channel Secret**: ต้องเก็บไว้ backend เท่านั้น
3. **ไม่ handle login state**: ต้อง handle ทั้ง logged in/out
4. **ใช้ LIFF ใน SSR**: LIFF ต้อง init ฝั่ง client เท่านั้น

## Further Reading

- [LIFF Documentation](https://developers.line.biz/en/docs/liff/)
- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/)
- [Flex Message Simulator](https://developers.line.biz/flex-simulator/)
