# Web-Based Secure File Storage and Access Management System
> **B.Sc. IT Final-Year Capstone Project**  
> *A Production-Ready, Turnkey Cloud Storage Web Application with AES-256-CBC Encryption at Rest, Role-Based Access Control, Storage Quota Management, Forensic Audit Trails, and Helpdesk Ticketing.*

---

## 📖 Executive Summary
In contemporary cloud storage environments, data confidentiality, access integrity, and cryptographic privacy are paramount. The **Web-Based Secure File Storage and Access Management System** is a full-stack platform engineered with Node.js, Express.js, MongoDB (Mongoose), and Bootstrap 5. 

Files uploaded to the platform are never stored in plaintext and are strictly isolated outside the public web root. Each file payload undergoes real-time **AES-256-CBC buffer encryption** with a unique 16-byte cryptographic Initialization Vector (IV) and SHA-256 data integrity verification. Files are served and decrypted on-the-fly strictly to authenticated users with verified permission tokens.

---

## 🏗️ System Architecture

```
                                  +---------------------------------------+
                                  |         Web Browser Client            |
                                  |   (HTML5, Bootstrap 5, Dark Mode, JS) |
                                  +-------------------+-------------------+
                                                      |
                                           HTTPS / Session Cookie
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |          Node.js + Express.js         |
                                  |         (App Server & Security)       |
                                  +-------------------+-------------------+
                                                      |
                    +---------------------------------+---------------------------------+
                    |                                 |                                 |
                    v                                 v                                 v
    +-------------------------------+ +-------------------------------+ +-------------------------------+
    |       Security Middleware     | |    Business Controllers       | |        MongoDB Database       |
    | - AES-256-CBC Crypto Engine   | | - User & Admin Dashboards     | | - Users, Roles & Plans        |
    | - SHA-256 Checksum Engine     | | - File & Folder Management    | | - Files & Encrypted Metadata  |
    | - Role Access Control (RBAC)  | | - Timed Link Sharing Engine   | | - Audit & Activity Logs       |
    | - Multer Memory Stream Buffer | | - Demo Checkout & Invoices    | | - Notifications & Tickets     |
    +---------------+---------------+ +-------------------------------+ +-------------------------------+
                    |
                    v
    +-------------------------------+
    |  Isolated Physical Storage    |
    |  (secure_storage/files/*.enc) |
    +-------------------------------+
```

---

## 🌟 Key Features & Modules

### 1. Cryptography & Data Security
- **AES-256-CBC Encryption at Rest:** Every uploaded file is transformed into ciphertext before reaching physical disk storage.
- **Per-File Random IVs:** Distinct 16-byte initialization vectors eliminate pattern leakage across identical files.
- **SHA-256 Checksum Verification:** Ensures file tamper-resistance and cryptographic payload integrity.
- **Protected File Storage Root:** Physical files reside in `secure_storage/files/` outside of Express static directory paths.

### 2. User Workspace & File Management
- **Interactive Drag & Drop:** Multi-file drag-and-drop uploader with real-time progress indicators.
- **Nested Folder Hierarchy:** Organize assets in infinite nested folders with custom color tagging.
- **In-Browser File Previews:** Safe streaming for PDFs, images, text, and videos directly inside modal dialogs without saving decrypted copies to server disk.
- **Two-Stage Recycle Bin:** Soft delete mechanism with instant restoration and permanent quota-refunding purging.
- **Search, Sort & Filter:** Filter by file category (Documents, Images, Videos, Audio, Archives, Code) with instant search.

### 3. Secure File Sharing Engine
- **Direct User-to-User Sharing:** Share files with granular permissions (`viewer` or `editor`).
- **Expiring Signed Public Links:** Generate tamper-proof URLs with customizable lifespans (1 hour, 1 day, 7 days, 30 days, or permanent).
- **Passcode Protection:** Optional SHA-256 hashed passcodes required before downloading shared files.

### 4. Storage Quotas & Simulated Payment Gateway
- **Tiered Storage Plans:** Free Starter (500 MB), Pro Vault (5 GB), and Enterprise Cloud (20 GB).
- **Interactive Checkout:** Realistic payment simulation supporting Credit/Debit Cards, UPI / QR Scan, Net Banking, and PayPal.
- **Automated Quota Provisioning:** Instant quota allocation upon simulated payment completion.
- **Financial Invoices:** Printable official subscription receipts with unique transaction IDs.

### 5. Helpdesk & Support Ticketing
- Interactive user-to-admin communication system.
- Ticket status triage (`open`, `in_progress`, `resolved`, `closed`) and priority ratings (`low`, `medium`, `high`, `urgent`).
- Real-time conversation thread with admin staff replies.

### 6. Administrative Control Center
- **System KPIs & Analytics:** High-level metrics for total users, files, physical vault space, and platform revenue.
- **Interactive Data Visualizations:** Chart.js monthly file upload activity and revenue growth analytics.
- **User Account Moderation:** Suspend or activate accounts, adjust custom storage quotas, and assign administrative roles.
- **Global Content Moderation:** Inspect all stored files, verify IV hashes, and permanently remove prohibited files.
- **Forensic Security Audit Logs:** Real-time logging of user logins, file operations, IP addresses, and user-agent devices.

---

## 🚀 Installation & Setup Guide

### 1. Prerequisites
- **Node.js** (v16.x or higher)
- **MongoDB** (Local instance running at `mongodb://localhost:27017` or a MongoDB Atlas connection string)
- **VS Code** (Recommended IDE)

### 2. Clone / Open Project
Open the project directory in VS Code:
```bash
cd C:\Users\Lenovo\.gemini\antigravity\scratch\file-storage-node
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` (already pre-configured with secure defaults):
```bash
# Server Port
PORT=3000

# MongoDB Database URI
MONGODB_URI=mongodb://localhost:27017/secure_file_storage

# Session Secret Key
SESSION_SECRET=sec_file_vault_session_secret_key_2026

# AES-256-CBC Cryptographic Master Key (32 bytes)
FILE_ENCRYPTION_KEY=f9c2d1e4a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1
```

### 5. Run Database Auto-Seeder & Server
Start the development server (automatically seeds roles, admin account, starter plans, and platform settings on first run):
```bash
npm run dev
# or standard start:
npm start
```

Visit the application at: **`http://localhost:3000`**

---

## 🔐 Pre-Seeded Demo Credentials

| Role | Email | Password | Default Storage Quota |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@filestorage.local` | `Admin@12345` | 20 GB (Full Admin Access) |
| **Standard User** | `user@filestorage.local` | `User@12345` | 500 MB (Starter Tier) |

---

## 🧪 Running Security Test Suite
Verify cryptographic buffer encryption, bit-for-bit decryption, SHA-256 hashing, and token validation by executing:
```bash
npm test
```

---

## 📂 Project Structure

```
file-storage-node/
├── .vscode/                   # VS Code launch & editor preferences
│   ├── extensions.json
│   ├── launch.json
│   └── settings.json
├── config/                    # Database connection & seed script
│   ├── db.js
│   └── seed.js
├── controllers/               # Business logic controllers
│   ├── adminController.js
│   ├── authController.js
│   ├── billingController.js
│   ├── fileController.js
│   ├── folderController.js
│   ├── shareController.js
│   ├── supportController.js
│   └── userController.js
├── middleware/                # Security, Multer & Cryptography helpers
│   ├── activityLogger.js
│   ├── auth.js
│   ├── cryptoHelper.js        # AES-256-CBC engine
│   ├── helpers.js
│   └── upload.js
├── models/                    # Mongoose Data Models
│   ├── ActivityLog.js
│   ├── File.js
│   ├── Folder.js
│   ├── Notification.js
│   ├── Payment.js
│   ├── Role.js
│   ├── Setting.js
│   ├── SharedFile.js
│   ├── StoragePlan.js
│   ├── SupportReply.js
│   ├── SupportTicket.js
│   └── User.js
├── public/                    # Static Assets (CSS, JS, Logos)
│   ├── css/
│   │   ├── dark-mode.css
│   │   └── style.css
│   └── js/
│       ├── charts.js
│       ├── files.js
│       └── main.js
├── routes/                    # Express Router Endpoints
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── billingRoutes.js
│   ├── fileRoutes.js
│   ├── folderRoutes.js
│   ├── shareRoutes.js
│   ├── supportRoutes.js
│   └── userRoutes.js
├── secure_storage/            # Physical storage isolated outside web root
│   └── files/                 # Encrypted ciphertext files (.enc)
├── tests/                     # Automated unit and security tests
│   └── security_tests.js
├── views/                     # EJS UI Views
│   ├── admin/                 # Administrator portal templates
│   ├── auth/                  # Authentication templates (Login, Register)
│   ├── partials/              # Modular UI components (Header, Sidebar, Modals)
│   ├── public/                # Public shared link viewing template
│   ├── user/                  # User workspace templates
│   └── index.ejs              # Landing Page
├── .env                       # Environment configuration
├── package.json               # Dependencies & scripts
├── README.md                  # Comprehensive Documentation
└── server.js                  # Application entry point
```

---

## 🎓 Academic Defense & Viva Discussion Points

1. **Why AES-256-CBC instead of storing plaintext on disk?**  
   *Even if an attacker obtains physical access to the server disk or cloud bucket, the files are indistinguishable from random noise without the 256-bit encryption key and the unique per-file initialization vector.*

2. **How is memory consumption managed during encryption of large files?**  
   *Multer receives uploads via memory buffers and pipes data through Node's native `crypto.createCipheriv` streams, eliminating intermediate plaintext disk writes.*

3. **How does the system prevent unauthorized file access?**  
   *File endpoints strictly enforce session authentication and role-based access checks (`isAuth`, `isAdmin`, file ownership verification, and signed URL token parsing).*

---
*Developed for B.Sc. IT Final Year Capstone Project (2026).*
