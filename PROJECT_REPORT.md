# FINAL YEAR PROJECT REPORT & VIVA DEFENSE MANUAL

---

# PROJECT TITLE:  
## **Web-Based Secure File Storage and Access Management System**

**Course:** Bachelor of Science in Information Technology (B.Sc. IT)  
**Academic Year:** 2025–2026  
**Technology Stack:** Node.js, Express.js, MongoDB, EJS, Bootstrap 5, AES-256-CBC Cryptography

---

## 1. ABSTRACT
In contemporary computing environments, data breaches, unauthorized file disclosures, and data tampering pose substantial threats to organizational assets. The **Web-Based Secure File Storage and Access Management System** is engineered to provide an end-to-end secure, role-controlled cloud repository for sensitive digital files.

Unlike traditional web-based storage solutions where files are stored in plain, readable formats on public web roots, this platform integrates **AES-256-CBC buffer encryption at rest**, generating a unique 16-byte random Initialization Vector (IV) for every stored asset and calculating SHA-256 data integrity hashes. Access is governed by strict Role-Based Access Control (RBAC), multi-tier storage quotas, expiring signed link sharing with passcode authorization, two-stage soft deletion with recycle bins, and immutable forensic audit logging.

---

## 2. SYSTEM ARCHITECTURE & DATA FLOW

### Cryptographic Upload & Decryption Cycle

```
[ Client Upload ] 
       │ (Multipart Buffer over HTTPS)
       ▼
[ Express Router & Multer ] 
       │ (Memory Buffer Interception)
       ▼
[ Quota Validation Engine ] ──(Exceeded)──> [ Return 400 Quota Error ]
       │ (Within Limit)
       ▼
[ AES-256-CBC Crypto Helper ]
       ├── Master Key (32-byte SHA-256 Digest)
       ├── Generate 16-byte Random IV
       ├── Encrypt Buffer -> Ciphertext (.enc)
       └── Compute SHA-256 Checksum Hash
       │
       ▼
[ Storage Subsystem & MongoDB ]
       ├── Write Encrypted Ciphertext -> /secure_storage/files/<hash>.enc
       └── Write Metadata (IV, Checksum, Quota, Owner) -> MongoDB 'files' Collection
```

### Download & Safe Viewing Stream

```
[ Client Download Request ]
       │ (With Session Cookie or Signed Token)
       ▼
[ Auth & Permission Guard ] ──(Unauthorized)──> [ Return 403 Forbidden ]
       │ (Authorized)
       ▼
[ Read Encrypted Ciphertext (.enc) ]
       │
       ▼
[ AES-256-CBC Decryption Stream ]
       ├── Extract 16-byte IV from Metadata
       └── Decrypt Buffer in Memory
       │
       ▼
[ HTTP Response Stream ]
       └── Stream Decrypted Payload with Content-Disposition & MIME Type
```

---

## 3. DATABASE SCHEMA & ENTITY DEFINITIONS

The system uses 12 normalized Mongoose models:

| Collection / Model | Key Fields | Purpose |
| :--- | :--- | :--- |
| **`users`** | `full_name`, `email`, `password` (BCrypt), `role`, `storage_plan`, `storage_used_bytes`, `storage_limit_bytes`, `status` | Identity, authentication & quota tracking |
| **`roles`** | `name` (`admin`, `user`, `editor`, `viewer`), `permissions` | Granular role definitions |
| **`storage_plans`** | `plan_name`, `storage_bytes`, `price`, `billing_cycle`, `max_file_size`, `is_active` | Tiered capacity definitions |
| **`folders`** | `user`, `parent`, `folder_name`, `color_code`, `is_deleted` | Nested folder hierarchy |
| **`files`** | `user`, `folder`, `original_name`, `stored_name`, `file_size`, `mime_type`, `file_extension`, `encryption_iv`, `sha256_checksum`, `is_deleted` | AES-256 encrypted file catalog |
| **`shared_files`** | `file`, `shared_by`, `shared_with`, `permission`, `share_token`, `passcode_hash`, `expires_at` | Timed link & user file sharing |
| **`payments`** | `user`, `plan`, `transaction_id`, `amount`, `payment_method`, `status`, `payment_date` | Financial transactions & receipts |
| **`support_tickets`** | `user`, `subject`, `priority`, `status` | Customer service tickets |
| **`support_replies`** | `ticket`, `user`, `message`, `is_admin_reply` | Ticket message threads |
| **`notifications`** | `user`, `title`, `message`, `type`, `link`, `is_read` | In-app alerts |
| **`activity_logs`** | `user`, `action_type`, `description`, `ip_address`, `user_agent`, `target_type` | Immutable audit trail |
| **`settings`** | `setting_key`, `setting_value` | Platform identity & upload ceiling |

---

## 4. SECURITY & CRYPTOGRAPHIC SPECIFICATIONS

1. **Symmetric Encryption Standard:** AES-256-CBC (`aes-256-cbc`) with 256-bit keys.
2. **Semantic Security:** Every file encryption call invokes `crypto.randomBytes(16)` to guarantee that two identical plaintext documents produce completely distinct ciphertexts.
3. **Data Integrity:** SHA-256 checksums computed during upload and logged in metadata.
4. **Physical Web-Root Isolation:** All `.enc` files reside in `secure_storage/files/` and cannot be accessed via direct URL paths.
5. **Credential Security:** Salted BCrypt password hashing (Cost factor 10).
6. **Session Hardening:** HttpOnly cookies, session hijacking protection, Helmet security headers.

---

## 5. VIVA / ORAL DEFENSE QUESTIONS & SAMPLE ANSWERS

### Q1: Why did you choose AES-256-CBC over AES-ECB or plaintext storage?
**Answer:**  
*AES-ECB encrypts identical plaintext blocks into identical ciphertext blocks, which exposes data patterns (the famous ECB Penguin leak). AES-256-CBC introduces an Initialization Vector (IV) and chains each block with the previous one, ensuring semantic security where identical documents produce completely distinct, random-looking ciphertexts.*

### Q2: How are files protected against unauthorized downloads?
**Answer:**  
*Files are stored in an isolated physical folder outside the Express static directory. No static web server route maps directly to these files. To download or preview a file, a request must pass through the `fileController` and `auth` middleware which verifies session identity, user ownership, role permissions, or cryptographic share token validity.*

### Q3: How is the storage quota managed during file deletion?
**Answer:**  
*The system uses a two-stage deletion model. Moving a file to the Recycle Bin is a soft-delete (`is_deleted: true`), allowing instant restoration. When a user permanently purges a file or empties the bin, the physical `.enc` binary is unlinked from disk, and the file's exact byte size is decremented from `user.storage_used_bytes`.*

### Q4: How does the public link sharing feature prevent link tampering and unauthorized access?
**Answer:**  
*Public links use a 64-character random cryptographic token (`crypto.randomBytes(32).toString('hex')`). The route validates the token against the database, checks if the expiration date has passed, and checks if a passcode hash is attached. If a passcode is required, the user must provide the matching passcode before the decryption pipeline streams the file.*

### Q5: How does the administrator dashboard monitor system health?
**Answer:**  
*The admin portal computes real-time aggregates across MongoDB collections: total active users, file counts, aggregate disk usage in bytes, and financial revenue. It renders interactive Chart.js visualizations for monthly upload volume and revenue trajectories.*

---

## 6. SYSTEM SETUP & EXECUTION

```bash
# 1. Open project directory
cd C:\Users\Lenovo\.gemini\antigravity\scratch\file-storage-node

# 2. Run automated security test suite (5/5 Passing)
npm test

# 3. Start development server with auto-seeding
npm run dev

# 4. Access portal in web browser
http://localhost:3000
```

### Pre-Configured Test Logins
- **Admin Portal:** `admin@filestorage.local` / `Admin@12345`
- **User Portal:** `user@filestorage.local` / `User@12345`
