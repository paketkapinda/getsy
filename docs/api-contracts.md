# API Contracts

## Edge Function Endpoints

All edge functions are accessible at: `https://<project>.supabase.co/functions/v1/<function-name>`

### Authentication
All functions (except webhooks) require JWT token in `Authorization: Bearer <token>` header.

---

## Etsy Integration

### POST /functions/v1/etsy-auth
**Purpose**: OAuth authentication flow

**Request**:
```json
{
  "code": "oauth_code",
  "shop_id": "optional_shop_id"
}
```

**Response**:
```json
{
  "success": true,
  "shop_id": "shop_123"
}
```

---

### POST /functions/v1/etsy-sync
**Purpose**: Sync orders from Etsy

**Request**:
```json
{
  "shop_id": "shop_123"
}
```

**Response**:
```json
{
  "success": true,
  "synced": 5
}
```

---

### POST /functions/v1/etsy-listing-create
**Purpose**: Create Etsy listing

**Request**:
```json
{
  "product_id": "uuid",
  "shop_id": "optional_shop_id"
}
```

**Response**:
```json
{
  "success": true,
  "listing_id": "listing_123"
}
```

---

### POST /functions/v1/etsy-image-upload
**Purpose**: Upload image to Etsy listing

**Request**:
```json
{
  "listing_id": "listing_123",
  "image_url": "https://storage.url/image.png"
}
```

**Response**:
```json
{
  "success": true,
  "image_id": "image_456"
}
```

---

## POD Integration

### POST /functions/v1/pod-cost
**Purpose**: Calculate POD cost

**Request**:
```json
{
  "product_id": "uuid",
  "producer_id": "uuid",
  "quantity": 1
}
```

**Response**:
```json
{
  "success": true,
  "cost_per_unit": 5.50,
  "shipping": 3.99,
  "total": 9.49
}
```

---

### POST /functions/v1/pod-send-order
**Purpose**: Send order to POD provider

**Request**:
```json
{
  "order_id": "uuid",
  "producer_id": "optional_uuid"
}
```

**Response**:
```json
{
  "success": true,
  "tracking_number": "TRACK123",
  "status": "shipped"
}
```

---

## AI Services

### POST /functions/v1/ai-mockup
**Purpose**: Generate multi-angle mockups

**Request**:
```json
{
  "product_id": "uuid",
  "design_base64": "base64_encoded_image",
  "presets": {
    "category": "tshirt",
    "angles": ["front", "back", "side"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "storage_urls": ["https://storage.url/mockup1.png", ...],
  "mockup_ids": ["mockup_1", ...]
}
```

---

### POST /functions/v1/ai-seo
**Purpose**: Generate SEO content

**Request**:
```json
{
  "product_id": "uuid",
  "type": "description" | "tags",
  "title": "Product Title",
  "context": "optional_context"
}
```

**Response** (description):
```json
{
  "success": true,
  "description": "Generated description text..."
}
```

**Response** (tags):
```json
{
  "success": true,
  "tags": ["tag1", "tag2", "tag3"]
}
```

---

### POST /functions/v1/ai-top-seller
**Purpose**: Top-seller analysis with forecast

**Request**:
```json
{
  "shop_id": "shop_123",
  "months": 12
}
```

**Response**:
```json
{
  "success": true,
  "analysis_id": "analysis_123",
  "trend_scores": [
    {
      "product_id": "uuid",
      "trend_score": 85,
      "monthly_sales_estimate": 120
    }
  ],
  "forecasts": {
    "product_id": {
      "month_1": 125,
      "month_2": 130,
      "month_3": 135
    }
  }
}
```

---

### POST /functions/v1/ai-messageReply
**Purpose**: Generate AI reply to message

**Request**:
```json
{
  "message_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "reply": "Generated reply text..."
}
```

---

## Payments

### POST /functions/v1/payments-distribute
**Purpose**: Calculate and distribute payment

**Request**:
```json
{
  "order_id": "uuid",
  "producer_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "payment_id": "uuid",
  "breakdown": {
    "base_price": 29.99,
    "pod_cost": 5.50,
    "shipping": 3.99,
    "platform_fee": 4.50,
    "payment_gateway_fee": 0.90,
    "wise_fee": 0.30,
    "payoneer_fee": 0,
    "net_payout": 14.80
  }
}
```

---

### POST /functions/v1/payments-invoice
**Purpose**: Generate invoice PDF

**Request**:
```json
{
  "order_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "invoice_id": "uuid",
  "invoice_url": "https://storage.url/invoice.pdf"
}
```

---

## System

### POST /functions/v1/jobs-runner
**Purpose**: Process pending jobs (called by cron)

**Request**: None (uses service role key)

**Response**:
```json
{
  "success": true,
  "processed": 5,
  "results": [
    { "job_id": "uuid", "status": "completed" }
  ]
}
```

---

### POST /functions/v1/admin-reports
**Purpose**: Get KPI dashboard data

**Request**: None (uses user JWT)

**Response**:
```json
{
  "success": true,
  "kpis": {
    "total_products": 42,
    "total_orders": 128,
    "monthly_revenue": 3456.78
  }
}
```

---

## Webhooks

### POST /functions/v1/pod-webhook
**Purpose**: Receive POD shipping updates

**Headers**: `x-pod-signature` (HMAC)

**Request**:
```json
{
  "order_id": "etsy_order_123",
  "tracking_number": "TRACK123",
  "status": "shipped"
}
```

**Response**:
```json
{
  "success": true
}
```

---

### POST /functions/v1/etsy-webhook
**Purpose**: Receive Etsy events

**Headers**: `x-etsy-signature` (HMAC)

**Request**:
```json
{
  "event_type": "order.created",
  "data": { ... }
}
```

**Response**:
```json
{
  "success": true
}
```

---

## Error Responses

All functions return errors in this format:
```json
{
  "error": "Error message"
}
```

Status codes:
- `200` - Success
- `400` - Bad request / validation error
- `401` - Unauthorized (invalid/missing token)
- `500` - Server error

