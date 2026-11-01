# Canal+ Rwanda Calling App: Deployment & Migration Guide
=============================================================

This app runs on **Cloudflare Pages + Cloudflare D1 (Serverless Database)**.
It features a dedicated **Admin Dashboard** and a **Mobile-First Agent Calling Workspace** with:
- ⏱ Call Timer & average call duration tracking
- ⏰ Callback scheduler with reminder alerts
- 💬 1-tap bilingual WhatsApp win-back templates
- 📝 Required payment notes for "Interested" leads
- 🟢 Online/Offline Agent Shift Status toggle
- 🏆 Agent Performance Leaderboard with gamified rankings
- 📦 Smart batch dispatching (10, 20, 30, 50 leads) with live 20-lead preview
- 📍 City & Region filtering (Kigali, Rubavu)
- 🔥 Hot Lead auto-prioritization (Score $\ge 0.95$ & Lapsed $\le 45$ days)
- 📊 Daily Call Target progress bar
- 📈 Per-agent conversion rate & duration analytics table
- ⚡ Bulk Assign to all online agents in 1 click
- 💬 Pre-call warm-up SMS integration
- 📱 Offline PWA support with service worker

---

## 🔑 Official Login Credentials

| Role | Username / Email | Password / PIN | Destination |
| :--- | :--- | :--- | :--- |
| **Administrator** | `everhomedreamltd@gmail.com` | `fau@123` | `/admin.html` (Full Admin Dashboard) |
| **Agent** | `agent1` | `caddet@123` | `/` (Agent Calling Screen) |

---

## 🚀 Step 1: Deploy Latest Code via GitHub
Run the following in PowerShell / Command Prompt:
```powershell
cd c:\Users\user\Downloads\canal\cloudflare-calling-app
git add .
git commit -m "Implement all 15 workflow improvements: callbacks, timers, leaderboard, PWA, analytics, hot leads, city filter, bulk assign, shift status, daily target"
git push origin main
```
*Cloudflare Pages will automatically detect the push and deploy within 45 seconds.*

---

## 🗄 Step 2: Database Setup / Schema Update on Cloudflare D1

### Option A: Clean Quick Setup (Recommended if starting fresh or testing)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) $\rightarrow$ **Workers & Pages** $\rightarrow$ **D1 SQL Database** $\rightarrow$ Select `canal-calling-db`.
2. Click the **Console** tab.
3. Open and copy all contents from `setup_quick.sql` and paste into the Console, then click **Execute**.
   - Creates `contacts` with `callback_at`, `call_duration`, `assigned_to`
   - Creates `users` with `shift_status`, `daily_target`
   - Sets up both Admin & Agent accounts
   - Populates 30 high-priority leads ready for dispatch.

*Or via terminal:*
```bash
npx wrangler d1 execute canal-calling-db --file=./setup_quick.sql --remote
```

---

### Option B: Upgrade Existing Database (Preserves existing records)
If you already ran migrations earlier and just need the new columns:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) $\rightarrow$ **D1 SQL Database** $\rightarrow$ Select `canal-calling-db` $\rightarrow$ **Console**.
2. Run the statements in `schema_update.sql`:
```sql
ALTER TABLE contacts ADD COLUMN assigned_to TEXT;
ALTER TABLE contacts ADD COLUMN callback_at TIMESTAMP;
ALTER TABLE contacts ADD COLUMN call_duration INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN shift_status TEXT DEFAULT 'offline';
ALTER TABLE users ADD COLUMN daily_target INTEGER DEFAULT 30;

CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_callback ON contacts(callback_at);
CREATE INDEX IF NOT EXISTS idx_contacts_city ON contacts(city);
```

---

## 📱 Step 3: Verifying the Setup

1. **Admin Experience**:
   - Go to your live URL (or `/admin.html`).
   - Sign in as `everhomedreamltd@gmail.com` / `fau@123`.
   - Click **"Assign Leads"** in the sidebar.
   - You will see the live preview of leads, city filter, and the **"Assign to Agent"** and **"Bulk to All Online"** buttons.
   - Click **"Agent Analytics"** to inspect conversion rates and call durations.

2. **Agent Experience**:
   - Go to the live URL `/` on mobile or desktop.
   - Sign in as `agent1` / `caddet@123`.
   - Tap **"Online"** to start the shift.
   - Call leads, track the live timer, use the bilingual WhatsApp template, and schedule callbacks.
   - Watch the daily goal progress bar update in real-time.
