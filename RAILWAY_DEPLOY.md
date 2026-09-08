# 🚂 DEPLOYING SECUREVAULT TO RAILWAY.APP

Deploy your full-stack cloud storage website live to the internet using **[Railway.app](https://railway.app/)**.

---

## 🚀 1-Click Deployment via GitHub (Recommended)

### Step 1: Push Your Project to GitHub
1. Create a new GitHub repository (e.g. `secure-file-storage`).
2. Open your terminal in `C:\Users\Lenovo\.gemini\antigravity\scratch\file-storage-node` and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of SecureVault Cloud Storage"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/secure-file-storage.git
   git push -u origin main
   ```

### Step 2: Create a Project on Railway
1. Go to **[Railway.app](https://railway.app/)** and sign in with your GitHub account.
2. Click **+ New Project** > **Deploy from GitHub repo**.
3. Select your repository: `secure-file-storage`.

### Step 3: Add MongoDB Database (1-Click)
1. Inside your Railway project canvas, click **+ New** > **Database** > **Add MongoDB**.
2. Railway will spin up a dedicated MongoDB instance and generate a connection URL.

### Step 4: Configure Environment Variables
Click on your Node.js application service > **Variables** tab > click **Add Variable**:
- `MONGO_URI`: `${{MongoDB.MONGO_URL}}` *(or paste your MongoDB connection string)*
- `SESSION_SECRET`: `securevault_railway_production_secret_2026`
- `FILE_ENCRYPTION_KEY`: `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`
- `NODE_ENV`: `production`

### Step 5: Generate Public Domain
1. In your Node.js service settings on Railway, go to the **Settings** tab.
2. Under **Networking**, click **Generate Domain**.
3. Railway will assign a public HTTPS address like `https://secure-file-storage-production.up.railway.app`.

---

## ⚡ Direct Deployment via Railway CLI

If you prefer deploying directly from your VS Code terminal without pushing to GitHub first:

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
2. Log in and initialize:
   ```bash
   railway login
   railway init
   ```
3. Add MongoDB plugin:
   ```bash
   railway add
   # Select "MongoDB"
   ```
4. Deploy:
   ```bash
   railway up
   ```
5. Generate domain:
   ```bash
   railway domain
   ```

---

## 👑 Live Administrator Credentials
Once live, log in at `https://your-domain.railway.app/auth/login`:
- **Admin Email:** `admin@filestorage.local`
- **Admin Password:** `Admin@12345`

*Your cloud storage system is now live on the internet!*
