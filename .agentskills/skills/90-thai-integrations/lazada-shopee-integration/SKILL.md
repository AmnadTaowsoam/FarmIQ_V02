---
name: Lazada & Shopee Integration
description: การเชื่อมต่อกับ Lazada และ Shopee Marketplace APIs สำหรับ sync products, orders, inventory และ fulfillment
---

# Lazada & Shopee Integration

## Overview

Lazada และ Shopee เป็น e-commerce marketplace หลักในประเทศไทยและ Southeast Asia การเชื่อมต่อ API ช่วยให้ sellers สามารถจัดการ products, orders, inventory แบบอัตโนมัติจาก central system

## Why This Matters

- **Multi-channel**: ขายได้หลาย platform พร้อมกัน
- **Automation**: ลดงาน manual ในการจัดการ orders
- **Inventory Sync**: ป้องกันขายเกิน stock
- **Analytics**: รวมข้อมูลจากทุก channel

---

## Core Concepts

### 1. Lazada Open Platform

```typescript
// lib/lazada-api.ts
import crypto from 'crypto';

interface LazadaConfig {
  appKey: string;
  appSecret: string;
  accessToken?: string;
  region: 'TH' | 'SG' | 'MY' | 'ID' | 'PH' | 'VN';
}

class LazadaClient {
  private config: LazadaConfig;
  private baseUrl: string;
  
  constructor(config: LazadaConfig) {
    this.config = config;
    this.baseUrl = this.getRegionUrl(config.region);
  }
  
  private getRegionUrl(region: string): string {
    const urls: Record<string, string> = {
      TH: 'https://api.lazada.co.th/rest',
      SG: 'https://api.lazada.sg/rest',
      MY: 'https://api.lazada.com.my/rest',
      ID: 'https://api.lazada.co.id/rest',
      PH: 'https://api.lazada.com.ph/rest',
      VN: 'https://api.lazada.vn/rest',
    };
    return urls[region];
  }
  
  // Generate signature
  private sign(apiPath: string, params: Record<string, string>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');
    
    const signString = `${apiPath}${sortedParams}`;
    
    return crypto
      .createHmac('sha256', this.config.appSecret)
      .update(signString)
      .digest('hex')
      .toUpperCase();
  }
  
  // Make API request
  async request<T>(apiPath: string, params: Record<string, any> = {}): Promise<T> {
    const timestamp = Date.now().toString();
    
    const commonParams: Record<string, string> = {
      app_key: this.config.appKey,
      timestamp,
      sign_method: 'sha256',
      ...(this.config.accessToken && { access_token: this.config.accessToken }),
    };
    
    const allParams = { ...commonParams, ...params };
    const signature = this.sign(apiPath, allParams);
    
    const queryString = new URLSearchParams({
      ...allParams,
      sign: signature,
    }).toString();
    
    const response = await fetch(`${this.baseUrl}${apiPath}?${queryString}`);
    const data = await response.json();
    
    if (data.code !== '0') {
      throw new LazadaAPIError(data.code, data.message);
    }
    
    return data.data;
  }
  
  // Get Orders
  async getOrders(params: {
    created_after?: string;
    created_before?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<LazadaOrder[]> {
    return this.request('/orders/get', params);
  }
  
  // Get Order Items
  async getOrderItems(orderId: string): Promise<LazadaOrderItem[]> {
    return this.request('/order/items/get', { order_id: orderId });
  }
  
  // Update Inventory
  async updateInventory(skuQuantities: Array<{ sku: string; quantity: number }>): Promise<void> {
    const payload = skuQuantities.map(item => ({
      SellerSku: item.sku,
      Quantity: item.quantity,
    }));
    
    await this.request('/product/stock/sellable/update', {
      payload: JSON.stringify(payload),
    });
  }
  
  // Set Order Status to Packed
  async packOrder(params: {
    orderItemIds: string[];
    shippingProvider: string;
    trackingNumber: string;
  }): Promise<void> {
    await this.request('/order/pack', {
      order_item_ids: JSON.stringify(params.orderItemIds),
      delivery_type: 'dropship',
      shipping_provider: params.shippingProvider,
      tracking_number: params.trackingNumber,
    });
  }
  
  // Set Order Status to Ready to Ship
  async readyToShip(params: {
    orderItemIds: string[];
    shippingProvider: string;
    trackingNumber: string;
  }): Promise<void> {
    await this.request('/order/rts', {
      order_item_ids: JSON.stringify(params.orderItemIds),
      delivery_type: 'dropship',
      shipment_provider: params.shippingProvider,
      tracking_number: params.trackingNumber,
    });
  }
  
  // Get Products
  async getProducts(params: {
    filter?: 'all' | 'live' | 'inactive';
    limit?: number;
    offset?: number;
  }): Promise<LazadaProduct[]> {
    return this.request('/products/get', params);
  }
  
  // Create Product
  async createProduct(product: LazadaProductPayload): Promise<{ item_id: string }> {
    return this.request('/product/create', {
      payload: JSON.stringify(product),
    });
  }
}
```

### 2. Shopee Open Platform

```typescript
// lib/shopee-api.ts
import crypto from 'crypto';

interface ShopeeConfig {
  partnerId: number;
  partnerKey: string;
  shopId: number;
  accessToken?: string;
}

class ShopeeClient {
  private config: ShopeeConfig;
  private baseUrl = 'https://partner.shopeemobile.com/api/v2';
  
  constructor(config: ShopeeConfig) {
    this.config = config;
  }
  
  // Generate signature
  private sign(path: string, timestamp: number): string {
    const baseString = `${this.config.partnerId}${path}${timestamp}${this.config.accessToken || ''}${this.config.shopId || ''}`;
    
    return crypto
      .createHmac('sha256', this.config.partnerKey)
      .update(baseString)
      .digest('hex');
  }
  
  // Make API request
  async request<T>(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body?: object
  ): Promise<T> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.sign(path, timestamp);
    
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.append('partner_id', this.config.partnerId.toString());
    url.searchParams.append('timestamp', timestamp.toString());
    url.searchParams.append('sign', signature);
    
    if (this.config.accessToken) {
      url.searchParams.append('access_token', this.config.accessToken);
    }
    if (this.config.shopId) {
      url.searchParams.append('shop_id', this.config.shopId.toString());
    }
    
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url.toString(), options);
    const data = await response.json();
    
    if (data.error) {
      throw new ShopeeAPIError(data.error, data.message);
    }
    
    return data.response;
  }
  
  // Get Order List
  async getOrderList(params: {
    time_range_field: 'create_time' | 'update_time';
    time_from: number;
    time_to: number;
    page_size?: number;
    cursor?: string;
    order_status?: string;
  }): Promise<{ order_list: ShopeeOrder[]; next_cursor: string }> {
    return this.request('/order/get_order_list', 'GET', params);
  }
  
  // Get Order Detail
  async getOrderDetail(orderSns: string[]): Promise<ShopeeOrderDetail[]> {
    return this.request('/order/get_order_detail', 'POST', {
      order_sn_list: orderSns,
      response_optional_fields: [
        'buyer_user_id',
        'buyer_username',
        'estimated_shipping_fee',
        'recipient_address',
        'actual_shipping_fee',
        'item_list',
        'pay_time',
        'pickup_done_time',
      ],
    });
  }
  
  // Ship Order
  async shipOrder(params: {
    orderSn: string;
    trackingNumber: string;
  }): Promise<void> {
    await this.request('/logistics/ship_order', 'POST', {
      order_sn: params.orderSn,
      tracking_number: params.trackingNumber,
    });
  }
  
  // Update Stock
  async updateStock(itemId: number, modelId: number, stock: number): Promise<void> {
    await this.request('/product/update_stock', 'POST', {
      item_id: itemId,
      stock_list: [
        {
          model_id: modelId,
          seller_stock: [{ stock }],
        },
      ],
    });
  }
  
  // Get Product List
  async getProductList(params: {
    offset: number;
    page_size: number;
    item_status?: 'NORMAL' | 'BANNED' | 'DELETED' | 'UNLIST';
  }): Promise<{ item: ShopeeProduct[]; total_count: number }> {
    return this.request('/product/get_item_list', 'GET', params);
  }
  
  // Create Product
  async createProduct(product: ShopeeProductPayload): Promise<{ item_id: number }> {
    return this.request('/product/add_item', 'POST', product);
  }
}
```

### 3. Unified Multi-Channel Service

```typescript
// services/marketplace.service.ts
interface MarketplaceOrder {
  channel: 'LAZADA' | 'SHOPEE' | 'WEBSITE';
  externalOrderId: string;
  status: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  shipping: {
    name: string;
    phone: string;
    address: string;
    province: string;
    postalCode: string;
  };
  totalAmount: number;
  createdAt: Date;
}

class MarketplaceService {
  private lazada: LazadaClient;
  private shopee: ShopeeClient;
  
  constructor() {
    this.lazada = new LazadaClient({
      appKey: process.env.LAZADA_APP_KEY!,
      appSecret: process.env.LAZADA_APP_SECRET!,
      accessToken: process.env.LAZADA_ACCESS_TOKEN,
      region: 'TH',
    });
    
    this.shopee = new ShopeeClient({
      partnerId: parseInt(process.env.SHOPEE_PARTNER_ID!),
      partnerKey: process.env.SHOPEE_PARTNER_KEY!,
      shopId: parseInt(process.env.SHOPEE_SHOP_ID!),
      accessToken: process.env.SHOPEE_ACCESS_TOKEN,
    });
  }
  
  // Sync orders from all channels
  async syncOrders(since: Date): Promise<MarketplaceOrder[]> {
    const [lazadaOrders, shopeeOrders] = await Promise.all([
      this.fetchLazadaOrders(since),
      this.fetchShopeeOrders(since),
    ]);
    
    const allOrders = [...lazadaOrders, ...shopeeOrders];
    
    // Save to database
    for (const order of allOrders) {
      await prisma.order.upsert({
        where: {
          channel_externalOrderId: {
            channel: order.channel,
            externalOrderId: order.externalOrderId,
          },
        },
        update: { status: order.status },
        create: order,
      });
    }
    
    return allOrders;
  }
  
  private async fetchLazadaOrders(since: Date): Promise<MarketplaceOrder[]> {
    const orders = await this.lazada.getOrders({
      created_after: since.toISOString(),
      status: 'pending',
    });
    
    return orders.map(order => ({
      channel: 'LAZADA',
      externalOrderId: order.order_id,
      status: this.mapLazadaStatus(order.status),
      items: order.items.map(item => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: parseFloat(item.paid_price),
      })),
      shipping: {
        name: order.address_shipping.first_name,
        phone: order.address_shipping.phone,
        address: order.address_shipping.address1,
        province: order.address_shipping.city,
        postalCode: order.address_shipping.post_code,
      },
      totalAmount: parseFloat(order.price),
      createdAt: new Date(order.created_at),
    }));
  }
  
  private async fetchShopeeOrders(since: Date): Promise<MarketplaceOrder[]> {
    const { order_list } = await this.shopee.getOrderList({
      time_range_field: 'create_time',
      time_from: Math.floor(since.getTime() / 1000),
      time_to: Math.floor(Date.now() / 1000),
      page_size: 100,
    });
    
    const orderDetails = await this.shopee.getOrderDetail(
      order_list.map(o => o.order_sn)
    );
    
    return orderDetails.map(order => ({
      channel: 'SHOPEE',
      externalOrderId: order.order_sn,
      status: this.mapShopeeStatus(order.order_status),
      items: order.item_list.map(item => ({
        sku: item.model_sku || item.item_sku,
        name: item.item_name,
        quantity: item.model_quantity_purchased,
        price: parseFloat(item.model_discounted_price),
      })),
      shipping: {
        name: order.recipient_address.name,
        phone: order.recipient_address.phone,
        address: order.recipient_address.full_address,
        province: order.recipient_address.state,
        postalCode: order.recipient_address.zipcode,
      },
      totalAmount: parseFloat(order.total_amount),
      createdAt: new Date(order.create_time * 1000),
    }));
  }
  
  // Sync inventory to all channels
  async syncInventory(sku: string, quantity: number): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { sku },
      include: { marketplaceListings: true },
    });
    
    if (!product) return;
    
    const syncPromises = product.marketplaceListings.map(async listing => {
      if (listing.channel === 'LAZADA') {
        await this.lazada.updateInventory([{ sku, quantity }]);
      } else if (listing.channel === 'SHOPEE') {
        await this.shopee.updateStock(
          listing.externalItemId,
          listing.externalModelId,
          quantity
        );
      }
    });
    
    await Promise.all(syncPromises);
  }
  
  // Ship order
  async shipOrder(orderId: string, trackingNumber: string): Promise<void> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    
    if (!order) throw new Error('Order not found');
    
    if (order.channel === 'LAZADA') {
      const items = await this.lazada.getOrderItems(order.externalOrderId);
      await this.lazada.packOrder({
        orderItemIds: items.map(i => i.order_item_id),
        shippingProvider: 'Kerry',
        trackingNumber,
      });
      await this.lazada.readyToShip({
        orderItemIds: items.map(i => i.order_item_id),
        shippingProvider: 'Kerry',
        trackingNumber,
      });
    } else if (order.channel === 'SHOPEE') {
      await this.shopee.shipOrder({
        orderSn: order.externalOrderId,
        trackingNumber,
      });
    }
    
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        trackingNumber,
        shippedAt: new Date(),
      },
    });
  }
}
```

### 4. Webhook Handlers

```typescript
// api/webhooks/lazada.ts
export async function POST(req: Request) {
  const body = await req.json();
  
  // Verify webhook signature
  const signature = req.headers.get('x-lazada-signature');
  if (!verifyLazadaSignature(body, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const { message_type, data } = body;
  
  switch (message_type) {
    case '0':  // Order status change
      await handleOrderStatusChange(data);
      break;
    case '1':  // Item change
      await handleItemChange(data);
      break;
    case '2':  // Refund status change
      await handleRefundChange(data);
      break;
  }
  
  return Response.json({ success: true });
}

// api/webhooks/shopee.ts
export async function POST(req: Request) {
  const body = await req.json();
  
  // Verify webhook
  const signature = req.headers.get('authorization');
  if (!verifyShopeeWebhook(body, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const { code, data } = body;
  
  switch (code) {
    case 3:  // Order status update
      await handleShopeeOrderUpdate(data);
      break;
    case 5:  // Tracking number update
      await handleShopeeTrackingUpdate(data);
      break;
  }
  
  return Response.json({ success: true });
}
```

## Quick Start

1. **สมัคร Developer Account:**
   - [Lazada Open Platform](https://open.lazada.com/)
   - [Shopee Open Platform](https://open.shopee.com/)

2. **สร้าง App และรับ credentials**

3. **Authorize shop** (OAuth flow)

4. **Implement API client**

5. **Setup webhooks**

## Production Checklist

- [ ] OAuth token refresh automation
- [ ] Rate limiting respect
- [ ] Retry logic for API failures
- [ ] Order deduplication
- [ ] Inventory sync scheduling
- [ ] Webhook signature verification
- [ ] Error alerting
- [ ] Reconciliation reports

## Anti-patterns

1. **Sync ทุก request**: ใช้ queue และ batch processing
2. **ไม่ handle rate limits**: Implement backoff
3. **ไม่ verify webhooks**: เสี่ยงต่อ fake events
4. **Manual inventory update**: ใช้ automatic sync

## Further Reading

- [Lazada Open Platform Docs](https://open.lazada.com/doc/doc.htm)
- [Shopee Open Platform Docs](https://open.shopee.com/documents)
