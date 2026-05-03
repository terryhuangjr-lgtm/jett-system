# StoreIQ Dashboard - Quick Context for Agents/Coding

## What It Is
AI-powered Shopify analytics dashboard for inventory alerts, sales intelligence, and reports. Live data from Superare demo store (fight gear). Dark theme, responsive SPA.

## Hosting & Access
- **Repo**: `~/clawd/storeiq-dashboard` (Vite + React/TS + Tailwind + Supabase JS)
- **Live Demo**: Vercel auto-deploys from GitHub `main` → https://storeiq-dashboard.vercel.app (refresh after pushes)
- **Key Pages**: `/` (Overview), `/inventory-alerts` (live Supabase alerts + badge), `/sales-intelligence` (period-filtered products/channels: 7d/30d/60d/90d)

## Data Pipeline
- **Shopify**: `superare-demo.myshopify.com` (token in `~/clawd/clawd/automation/.env`)
- **Supabase**: `fhmjvnphxsbtwcutqkvq.supabase.co`
  - Anon key: `~/storeiq-dashboard/.env` (VITE_SUPABASE_ANON_KEY)
  - Service key: `~/clawd/clawd/automation/.env`
- **Sync Script**: `node ~/clawd/clawd/automation/hermes-to-supabase.js` → Fetches orders/products → Computes alerts/metrics → Upserts tables (`alerts`, `product_performance`, `channel_breakdown`, etc.)

## Quick Workflow
1. Edit code → `cd ~/clawd/storeiq-dashboard && npm run build && git add . && git commit -m "changes" && git push`
2. Sync data: `cd ~/clawd/clawd/automation && node hermes-to-supabase.js`
3. Test live: Refresh Vercel URL

## Recent Features
- Inventory Alerts: Live Supabase fetch, acknowledge button, sidebar badge (# unacknowledged).
- Sales Intelligence: Date toggle refetches by `period` (7d/30d/etc.), pattern badges, channel pie.

Extend via `PERFORMANCE_PERIODS` array in sync script. Ping Jett (main agent) for deploys/syncs!