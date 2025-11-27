# etsy-ai-pod-supabase-extended

Complete Etsy AI POD platform implementation with Supabase backend. This repository extends the system defined in ETSY PLATFORM.MD and Sİstem.MD with new features while preserving all existing migrations and RLS policies.

## Stack

- **Frontend**: Pure HTML + Vanilla JavaScript (ES6 modules), Tailwind CSS via CDN
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Integrations**: Etsy API, Multiple POD providers (Printify/Printful/custom), OpenAI, Wise/Payoneer

## Features

### Core Features
- ✅ Multi-Etsy shop connections per user
- ✅ AI-powered mockup generation (multi-angle, category-aware)
- ✅ Multi-POD provider routing
- ✅ Order management and POD fulfillment
- ✅ Payment distribution with fee calculation
- ✅ PDF invoice generation
- ✅ AI assistant (SEO, descriptions, top-seller analysis)
- ✅ Team collaboration with roles
- ✅ Job queue for async processing
- ✅ Webhook handlers for Etsy and POD providers

### Extended Features (Migrations 012-020)
- Top-seller analysis with time-series forecasting
- Multi-angle mockup pipeline with canvas editor
- Producer management and product mapping
- Team members and role-based access
- Invoice generation and storage
- AI operation logging and cost tracking
- Enhanced payment breakdown (Wise/Payoneer fees)

## Quickstart

### 1. Prerequisites
- Node.js 18+ (for Supabase CLI)
- Supabase account and project

### 2. Setup Supabase
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref <your-project-ref>
```

### 3. Run Migrations
```bash
# Run existing migrations (001-011) from ETSY PLATFORM.MD first
# Then run new migrations (012-020)
supabase db push
```

Or via Supabase Dashboard SQL Editor:
- Execute `supabase/migrations/012_rev_products.sql` through `020_rls_updates.sql` in order

### 4. Create Storage Buckets
In Supabase Dashboard → Storage:
- Create `mockups` bucket (public)
- Create `invoices` bucket (private, with RLS)

### 5. Configure Environment
```bash
# Copy example env
cp .env.example .env.local

# Fill in your Supabase keys and API credentials
# Set MOCK_PROVIDER=true for development
```

### 6. Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy etsy-auth
supabase functions deploy etsy-sync
supabase functions deploy etsy-listing-create
supabase functions deploy etsy-image-upload
supabase functions deploy pod-cost
supabase functions deploy pod-send-order
supabase functions deploy pod-webhook
supabase functions deploy ai-mockup
supabase functions deploy ai-seo
supabase functions deploy ai-top-seller
supabase functions deploy ai-messageReply
supabase functions deploy payments-distribute
supabase functions deploy payments-invoice
supabase functions deploy jobs-runner
supabase functions deploy admin-reports
supabase functions deploy etsy-webhook
```

### 7. Configure Frontend
Update `frontend/assets/js/supabaseClient.js` with your Supabase URL and anon key:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 8. Deploy Frontend
- **Option A**: Static hosting (Vercel/Netlify) - upload `/public` and `/frontend`
- **Option B**: Supabase Hosting - `supabase hosting deploy`
- **Option C**: Any static host - serve files as-is

## Development

### Local Edge Functions
```bash
# Serve functions locally
npm run dev

# Functions will be available at http://localhost:54321/functions/v1/<function-name>
```

### Mock Mode
Set `MOCK_PROVIDER=true` in Edge Function environment variables to use mock responses for all external APIs. This allows development without real API keys.

## Project Structure

```
/
├── public/                 # Marketing homepage
│   └── index.html
├── frontend/              # Application pages
│   ├── login.html
│   ├── dashboard.html
│   ├── products.html
│   ├── product-detail.html
│   ├── orders.html
│   ├── order-detail.html
│   ├── ai-assistant.html
│   ├── settings.html
│   └── assets/
│       ├── css/
│       └── js/
│           ├── supabaseClient.js
│           ├── auth.js
│           ├── api.js
│           ├── products.js
│           ├── orders.js
│           ├── ai.js
│           ├── payments.js
│           ├── team.js
│           ├── mockup-editor.js
│           ├── ui.js
│           └── helpers.js
├── supabase/
│   └── migrations/
│       ├── 012_rev_products.sql
│       ├── 013_producers.sql
│       ├── 014_job_queue.sql
│       ├── 015_team_members.sql
│       ├── 016_invoices.sql
│       ├── 017_ai_logs.sql
│       ├── 018_payment_rev.sql
│       ├── 019_rating_stats_rev.sql
│       └── 020_rls_updates.sql
├── edge-functions/        # Supabase Edge Functions (TypeScript)
│   ├── etsy-auth/
│   ├── etsy-sync/
│   ├── etsy-listing-create/
│   ├── etsy-image-upload/
│   ├── pod-cost/
│   ├── pod-send-order/
│   ├── pod-webhook/
│   ├── ai-mockup/
│   ├── ai-seo/
│   ├── ai-top-seller/
│   ├── ai-messageReply/
│   ├── payments-distribute/
│   ├── payments-invoice/
│   ├── jobs-runner/
│   ├── admin-reports/
│   └── etsy-webhook/
├── docs/
│   ├── architecture.md
│   ├── migrations-map.md
│   ├── api-contracts.md
│   └── ops.md
├── .env.example
├── package.json
└── README.md
```

## Modes

### Development (Mock)
- Set `MOCK_PROVIDER=true` in Edge Function env
- All external API calls return mock data
- No real API keys required

### Production (Real)
- Set `MOCK_PROVIDER=false` or remove
- Configure real API keys (Etsy, OpenAI, POD, Wise/Payoneer)
- All integrations use real providers

## Key Concepts

### Multi-Shop Support
Users can connect multiple Etsy shops. The `is_active` flag on `etsy_accounts` determines which shop is used for publish operations.

### Multi-POD Support
Products can be mapped to different POD providers via `producer_products`. Orders are routed to the selected producer.

### Team Collaboration
Teams allow multiple users to collaborate. Roles (admin, producer, operator) control access levels. RLS policies enforce team-based access.

### Job Queue
Heavy operations (mockup generation, top-seller analysis) are enqueued in `job_queue` and processed by `jobs-runner` (scheduled via cron).

## Documentation

- **[Architecture](./docs/architecture.md)** - System design and components
- **[Migrations Map](./docs/migrations-map.md)** - Migration sequence and compatibility
- **[API Contracts](./docs/api-contracts.md)** - Edge Function request/response formats
- **[Operations](./docs/ops.md)** - Deployment, monitoring, troubleshooting

## Migration Notes

All new migrations (012-020) are **additive** and **backward-compatible**:
- No existing columns are dropped
- No primary keys are altered
- New columns have defaults or are nullable
- RLS policies are additive (existing access preserved)

See [migrations-map.md](./docs/migrations-map.md) for details.

## Security

- **RLS Policies**: All tables enforce user ownership or team membership
- **Edge Functions**: JWT authentication required (except webhooks with HMAC)
- **API Keys**: Stored server-side only (Edge Function env vars)
- **Token Encryption**: Etsy tokens stored encrypted in database

## License

MIT

## Support

For issues and questions, refer to:
- [Operations Guide](./docs/ops.md) for deployment help
- [API Contracts](./docs/api-contracts.md) for integration details
- Supabase documentation for platform-specific issues
