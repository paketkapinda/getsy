# Migrations Map

## Migration Sequence

### Existing Migrations (from ETSY PLATFORM.MD)
- `001_profiles.sql` - User profiles table
- `002_products.sql` - Products table
- `003_orders.sql` - Orders table
- `004_etsy_accounts.sql` - Etsy OAuth accounts
- `005_messages.sql` - Etsy messages
- `006_payments.sql` - Payment records
- `007_rating_stats.sql` - Product ratings
- `008_top_seller_analysis.sql` - Top seller analysis
- `009_storage_buckets.sql` - Storage bucket setup
- `010_rls_policies.sql` - Row Level Security policies
- `011_functions_and_triggers.sql` - Database functions and triggers

### New Additive Migrations (012-020)

#### 012_rev_products.sql
- **Purpose**: Extend products table with POD/producer type, variants, commission
- **Changes**: Adds `type`, `subcategory`, `platform_commission`, `variants` columns
- **Compatibility**: Fully additive, no breaking changes

#### 013_producers.sql
- **Purpose**: Multi-POD provider support
- **Changes**: Creates `producers` and `producer_products` tables
- **RLS**: User-scoped policies for own producers

#### 014_job_queue.sql
- **Purpose**: Async job processing system
- **Changes**: Creates `job_queue` table with status tracking
- **RLS**: User-scoped policies

#### 015_team_members.sql
- **Purpose**: Team collaboration and roles
- **Changes**: Creates `teams` and `team_members` tables, adds `role` to `profiles`
- **RLS**: Team-based access policies

#### 016_invoices.sql
- **Purpose**: PDF invoice generation
- **Changes**: Creates `invoices` table with storage URLs
- **RLS**: User-scoped via order ownership

#### 017_ai_logs.sql
- **Purpose**: Track AI operations and costs
- **Changes**: Creates `ai_logs` table
- **RLS**: User-scoped policies

#### 018_payment_rev.sql
- **Purpose**: Extended payment breakdown
- **Changes**: Adds `producer_cost`, `payment_gateway_fee`, `wise_fee`, `payoneer_fee`, `platform_fee`, `net_payout`, `producer_id`, `settlement_date` to `payments`
- **Compatibility**: Creates table if missing, otherwise adds columns

#### 019_rating_stats_rev.sql
- **Purpose**: Enhanced top-seller analysis
- **Changes**: Adds `monthly_sales_estimate`, `trend_score`, `forecast_3month`, `last_analysis_at` to `rating_stats`
- **Compatibility**: Creates table if missing, otherwise adds columns

#### 020_rls_updates.sql
- **Purpose**: Additional RLS policies and multi-shop support
- **Changes**: 
  - Adds `is_active` and `shop_display_name` to `etsy_accounts`
  - Removes unique constraint on `user_id` in `etsy_accounts` (allows multiple shops)
  - Adds team-based product access policies
- **Compatibility**: Additive RLS policies, preserves existing access

## Migration Execution Order

1. Run existing migrations (001-011) first
2. Run new migrations (012-020) in sequence
3. No migration should alter primary keys or drop columns
4. All changes are additive and backward-compatible

## Rollback Notes

- Migrations 012-020 can be rolled back by dropping new columns/tables
- RLS policies can be dropped without data loss
- No data migration required (new features only)

## Compatibility Guarantees

- Existing queries continue to work
- No breaking changes to API contracts
- New columns have defaults or are nullable
- RLS policies are additive (existing access preserved)

