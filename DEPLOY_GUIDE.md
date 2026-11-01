# Cloudflare Calling App: Deployment Guide
=============================================

This app runs on **Cloudflare Pages + Cloudflare D1 (Serverless Database)**.
It is **100% free**, secure (HTTPS), and accessible from your mobile phone anywhere in Rwanda on 4G/5G or Wi-Fi.

---

## Prerequisites (Takes 2 minutes)
1. A free Cloudflare account: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Node.js installed on your PC (to run `npx wrangler`). If you don't have it, download from [nodejs.org](https://nodejs.org/).

---

## Step 1: Open Terminal in this Folder
Open PowerShell or Command Prompt, and navigate to this folder:
```powershell
cd c:\Users\user\Downloads\canal\cloudflare-calling-app
```

---

## Step 2: Log into Cloudflare from Terminal
```bash
npx wrangler login
```
*A browser window will open. Click **Allow** to authorize Wrangler.*

---

## Step 3: Create Your Cloudflare D1 Database
Run:
```bash
npx wrangler d1 create canal-calling-db
```
Wrangler will output something like this:
```text
[[d1_databases]]
binding = "DB"
database_name = "canal-calling-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy that `database_id`** and paste it into [wrangler.toml](file:///c:/Users/user/Downloads/canal/cloudflare-calling-app/wrangler.toml):
```toml
database_id = "paste-your-database-id-here"
```

---

## Step 4: Initialize the Database Schema & Seed Data

1. **Create the table**:
```bash
npx wrangler d1 execute canal-calling-db --file=./schema.sql --remote
```

2. **Load Tier 1 Priority Leads (4,633 accounts - Recommended for fast start)**:
```bash
npx wrangler d1 execute canal-calling-db --file=./seed_tier1.sql --remote
```
*(Optional: If you want all 45,699 leads at once, run with `--file=./seed_all.sql` instead).*

---

## Step 5: Deploy the Mobile Web App to Cloudflare Pages
Run:
```bash
npx wrangler pages deploy ./public --project-name=canal-calling
```

Wrangler will upload your app and print your live link:
```text
✨ Success! Uploaded files
✨ Deployment complete! Take a peek over at https://canal-calling.pages.dev
```

---

## Step 6: Link Database in Cloudflare Dashboard (One-Time Link)
1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Click **Workers & Pages** $\rightarrow$ Click your project **`canal-calling`**.
3. Go to **Settings** $\rightarrow$ **Functions** (or **Bindings**).
4. Scroll to **D1 Database Bindings** $\rightarrow$ Click **Add binding**.
   * **Variable name**: `DB`
   * **D1 database**: Select `canal-calling-db`
5. Click **Save and Deploy**.

---

## Step 7: Open on Your Mobile Phone! 📱

1. On your phone, open Chrome or Safari and go to your live link:
   ```
   https://canal-calling.pages.dev
   ```
2. **Add to Home Screen (Optional but Recommended)**:
   * **iPhone (Safari)**: Tap the Share button $\rightarrow$ Tap **"Add to Home Screen"**.
   * **Android (Chrome)**: Tap the 3 dots menu $\rightarrow$ Tap **"Add to Home screen"** / **"Install app"**.
3. The app will open full screen like a native mobile app!
   * Tap **Copy** $\rightarrow$ Copies phone number instantly.
   * Tap **Call** $\rightarrow$ Opens your mobile phone dialer.
   * Tap an outcome $\rightarrow$ Card disappears and saves to Cloudflare D1.
   * Tap **"Next 20"** $\rightarrow$ Fetches 20 fresh unseen numbers.

