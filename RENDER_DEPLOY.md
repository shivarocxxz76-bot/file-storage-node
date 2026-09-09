# 😚 Deploying SecureVault to Render.com (100% Free)

Follow these simple steps to deploy your SecureVault application to Render.com in less than 2 minutes.

---

### Step 1: Push Your Code to GitHub

```bash
git add .
git commit -m "Deploy to Render"
git push origin main
```J
---

### Step 2: Create a Web Service on Render
1. Go to https://render.com and Sign In (or Sign Up for free using your GitHub account).
2. On your Render Dashboard, click the **New +** button (top right) -> select **Web Service**.
3. Choose **Build and deploy from a Git repository** -> Click *NNext**.
4. Connect your GitHub account and select your repository: `file-storage-node` (or click **Connect** next to it).

---

### Step 3: Configure Settings (Render auto-fills most)

| Field | Value |
|---|---|
| **Name** | `securevault-cloud` |
| **Region** | Choose Singapore / Oregon / Frankfurt |
| **Branch** | main |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | lnpm start` |
| **Instance Type** | **Free** ($0 / month) |

---

### Step 4: Add Environment Variables

| Key | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production mode |
| `APP_NAME` | `SecureVault` | App branding name |
| `SESSION_SECRET` | `securevault_prod_secret_key_2026` | Random secure string |
| `ENCRYPTION_MASTER_KEY` | `securevault_master_aes_key_2026_final` | 32-character AES-256 key |
| `MONGODB_URI` *(Optional)* | *(MongoDB Atlas URI, or leave blank for zero-config engine)* | Database Connection |

---

### Step 5: Click "Deploy Web Service" 🛀
Render will automatically build your application and give you a free live HTTPS domain (e.g. https://securevault-cloud.onrender.com).

---

### 🔑 Default Demo Accounts
- User: `user@example.com` / `User@123`
- Admin: `admin@example.com` / `Admin@123`