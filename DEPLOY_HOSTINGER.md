# PRO PACKS — Hostinger Deployment Guide

## Requirements
- **Hostinger Node.js Web App** (Business / Cloud / VPS) with **Node.js 22.5+ or 24** selected in hPanel.
- SSL/HTTPS enabled for `propacks.club` and `www.propacks.club`.

## Quick Deployment Steps
1. Upload `propacks-deploy.zip` to your Hostinger website root directory and extract it.
2. Create `.env` from `.env.example` (or set Environment Variables in Hostinger hPanel):
   - `NODE_ENV=production`
   - `JWT_SECRET=<your-64-char-random-secret>` (if omitted, the server auto-generates and persists a secure secret in `server/data/.jwt_secret`)
   - `ALLOWED_ORIGINS=https://propacks.club,https://www.propacks.club`
3. Install production dependencies:
   ```bash
   npm install --omit=dev
   ```
4. Create your production Admin account:
   ```bash
   node server/scripts/create_admin.js "telkalogistics@gmail.com" "YourStrongPass!2026" "PRO PACKS Admin"
   ```
5. Start the application (`npm start`).
6. Access:
   - Storefront: `https://propacks.club`
   - Private Admin Dashboard: `https://propacks.club/admin/login`
   - Sitemap: `https://propacks.club/sitemap.xml`
