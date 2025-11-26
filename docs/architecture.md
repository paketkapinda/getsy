# Architecture Overview

## System Components

### Frontend (Pure HTML + Vanilla JS)
- **Location**: `/frontend` and `/public`
- **Stack**: HTML5, Tailwind CSS (CDN), ES6 modules
- **No build step**: All JS loaded via `<script type="module">`
- **Authentication**: Supabase Auth with JWT tokens
- **State**: Direct Supabase client queries + Edge Function calls

### Backend (Supabase)
- **Database**: PostgreSQL with RLS policies
- **Storage**: Supabase Storage buckets (`mockups`, `invoices`)
- **Edge Functions**: Deno-based serverless functions
- **Auth**: Supabase Auth (email/password, OAuth)

## Data Flow

```
Frontend → Supabase Client (anon key) → Postgres (RLS enforced)
Frontend → Edge Functions (JWT auth) → External APIs (Etsy, POD, OpenAI)
Edge Functions → Supabase Storage → Public URLs
```

## Key Tables (from ETSY PLATFORM.MD + extensions)

### Core Tables (existing)
- `profiles` - User profiles with role
- `products` - Product catalog
- `orders` - Etsy orders
- `etsy_accounts` - Etsy OAuth tokens (supports multiple shops)
- `messages` - Etsy messages
- `payments` - Payment records
- `rating_stats` - Product ratings

### Extended Tables (migrations 012-020)
- `producers` - POD providers (Printify, Printful, custom)
- `producer_products` - Product-to-producer mapping
- `job_queue` - Async job processing
- `teams` - Team collaboration
- `team_members` - Team membership with roles
- `invoices` - PDF invoice records
- `ai_logs` - AI operation tracking
- `top_seller_analysis` - Trend analysis and forecasts

## Edge Functions

### Etsy Integration
- `etsy-auth` - OAuth flow and token storage
- `etsy-sync` - Sync orders from Etsy
- `etsy-listing-create` - Publish products to Etsy
- `etsy-image-upload` - Upload mockups to listings
- `etsy-webhook` - Handle Etsy webhooks

### POD Integration
- `pod-cost` - Calculate POD costs
- `pod-send-order` - Route orders to POD providers
- `pod-webhook` - Handle POD shipping updates

### AI Services
- `ai-mockup` - Generate multi-angle mockups
- `ai-seo` - Generate descriptions and tags
- `ai-top-seller` - Time-series analysis and forecasting
- `ai-messageReply` - Auto-reply to messages

### Payments
- `payments-distribute` - Calculate and distribute payments
- `payments-invoice` - Generate PDF invoices

### System
- `jobs-runner` - Process job queue
- `admin-reports` - KPI dashboards

## Security

- **RLS Policies**: All tables enforce user ownership or team membership
- **Edge Functions**: JWT authentication required (except webhooks with HMAC)
- **API Keys**: Stored server-side only (Edge Function env vars)
- **Token Encryption**: Etsy tokens stored encrypted in DB

## Job Queue System

- **Table**: `job_queue`
- **Runner**: `jobs-runner` edge function (called by cron)
- **Job Types**: `mockup_generation`, `top_seller_analysis`, `order_sync`, `payment_distribution`, `invoice_generation`
- **Scheduling**: Supabase scheduled functions or pg_cron

## Multi-Shop Support

- `etsy_accounts` supports multiple rows per user
- `is_active` flag selects active shop for publish operations
- Frontend UI allows switching active shop

## Multi-POD Support

- `producers` table stores multiple POD providers per user
- `producer_products` maps products to specific producers
- `pod-send-order` routes to selected producer

## Team & Roles

- `teams` - Team ownership
- `team_members` - Membership with roles (admin, producer, operator)
- RLS policies allow team members to view team owner's data

