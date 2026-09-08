# 🌐 HOW TO MAKE YOUR PROJECT A PUBLIC WEBSITE (LIVE DEPLOYMENT GUIDE)

This guide provides 3 straightforward options to host and deploy your **Web-Based Secure File Storage System** so anyone in the world can access, register, and use your cloud storage website.

---

## ⚡ OPTION 1: Instant Live Public URL (Zero-Install / 2 Minutes)
If you want to share your running project with professors, evaluators, or friends immediately from your PC:

1. Download [ngrok](https://ngrok.com/download) (or use `npx localtunnel`).
2. Run your application in VS Code:
   ```bash
   npm start
   ```
3. In a second terminal window, run:
   ```bash
   npx localtunnel --port 3000
   # or with ngrok:
   # ngrok http 3000
   ```
4. You will receive a live public HTTPS URL (e.g., `https://secure-vault-cloud.loca.lt`) that **anyone on any device can open and use**!

---

## ☁️ OPTION 2: Free 24/7 Cloud Hosting (Render / Railway + MongoDB Atlas)

### Step 1: Set up Free MongoDB Atlas (Cloud Database)
1. Go to **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas)** and sign up for a free M0 cluster.
2. Under **Database Access**, create a database user (e.g., `vaultadmin` / password).
3. Under **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere).
4. Copy your MongoDB Connection String (e.g., `mongodb+srv://vaultadmin:password@cluster0.abcde.mongodb.net/file_storage_db?retryWrites=true&w=majority`).

### Step 2: Deploy to Render.com (Free Node.js Web Service)
1. Push your project folder to a GitHub repository.
2. Log in to **[Render.com](https://render.com/)** and click **New + > Web Service**.
3. Select your GitHub repository.
4. Set the Build and Start commands:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Under **Environment Variables**, add:
   - `PORT`: `10000`
   - `NODE_ENV`: `production`
   - `MONGO_URI`: *(Your MongoDB Atlas connection string)*
   - `SESSION_SECRET`: `securevault_prod_secret_session_2026`
   - `FILE_ENCRYPTION_KEY`: `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`
6. Click **Create Web Service**. Render will build and launch your website at a custom subdomain like `https://secure-vault-storage.onrender.com`!

---

## 🖥️ OPTION 3: Ubuntu VPS / AWS EC2 with Nginx & SSL Certificate

If deploying to a dedicated Linux / Nginx cloud server:

### 1. Install Node.js, PM2 and Nginx
```bash
sudo apt update && sudo apt install -y nodejs npm nginx git
sudo npm install -g pm2
```

### 2. Clone and Start with PM2 Process Manager
```bash
cd /var/www/file-storage-node
npm install
pm2 start server.js --name "securevault"
pm2 startup
pm2 save
```

### 3. Configure Nginx Reverse Proxy (`/etc/nginx/sites-available/securevault`)
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Enable SSL with Let's Encrypt Certbot
```bash
sudo ln -s /etc/nginx/sites-available/securevault /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Your secure cloud storage website is now live on your custom domain with full HTTPS/SSL encryption!
