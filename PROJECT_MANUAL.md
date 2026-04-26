# MyNextPR - Master Project Manual

**Version:** 2.0 (Detailed)
**Last Updated:** January 2026

## 1. Executive Summary
**MyNextPR** is an AI-powered SaaS platform designed to democratize professional running gait analysis. It solves the problem of expensive, inaccessible coaching by allowing users to upload a simple photo and receive a "World Class Coach" analysis in the form of a vintage engineering blueprint.

The system uses a 2-step AI pipeline (Google Gemini) to first analyze biomechanics (Step 1) and then generate a stylized, annotated visual (Step 2). It includes a usage tracking system (3 free generations) and a payment gateway placeholder.

---

## 2. System Architecture

### High-Level Flow
1.  **User** uploads image via React Frontend (`/upload`).
2.  **Nginx** (Reverse Proxy) receives request on port 443 (SSL) and forwards `/api/*` requests to the Backend.
3.  **FastAPI Backend** (Python) receives the image at `POST /api/generate`.
4.  **Auth Check:** Backend verifies Google ID Token and checks `users.db` for usage limits.
5.  **AI Pipeline (`run_pipeline.py`):**
    *   **Step 1:** `gemini-3-flash-preview` analyzes the image for runner detection and biomechanics.
    *   **Step 2:** `gemini-3-pro-image-preview` generates the blueprint image.
6.  **Post-Processing:** Watermark and logo are added.
7.  **Response:** Backend returns the image URL. Frontend displays it.

### Tech Stack
*   **Frontend:** React 18, Vite, Tailwind CSS, Shadcn UI, TypeScript.
*   **Backend:** Python 3.9+, FastAPI, Uvicorn.
*   **Database:** SQLite (`users.db`).
*   **AI Models:** Google Gemini 1.5 Flash (Analysis), Gemini 1.5 Pro (Image Generation).
*   **Infrastructure:** AWS EC2 (Amazon Linux 2023), Nginx, PM2.

---

## 3. Infrastructure & Access

### Server Details
*   **Provider:** AWS EC2
*   **Instance Type:** t2.micro (or similar)
*   **OS:** Amazon Linux 2023
*   **Public IP:** `3.107.152.28`
*   **Domain:** `mynextpr.com` (Managed via Route53/GoDaddy, SSL via Let's Encrypt)

### Accessing the Server (SSH)
You need the `mynextpr.pem` private key file.
**Command:**
```bash
ssh -i mynextpr.pem -o StrictHostKeyChecking=no ec2-user@3.107.152.28
```
*Troubleshooting:* If you get a "Permissions 0644 are too open" error, run `chmod 400 mynextpr.pem`.

### File Structure Map (On Server)
All application code resides in `/home/ec2-user/`.

```text
/home/ec2-user/
├── backend/                  # Python Backend
│   ├── main.py               # API Server
│   ├── run_pipeline.py       # AI Logic
│   ├── database.py           # DB Logic
│   ├── users.db              # SQLite Database
│   ├── base_prompt.txt       # AI Prompt Template
│   ├── mynextpr_logo.png     # Watermark Asset
│   ├── uploads/              # Temp storage for input images
│   └── outputs/              # Storage for generated images & JSON metadata
├── mynextpr-544b6987/        # React Frontend Source
│   ├── src/                  # Source code
│   ├── public/               # Static assets (robots.txt, sitemap.xml)
│   └── dist/                 # COMPILED Production Build (Served by Nginx)
└── .env                      # Environment Variables (API Keys)
```

---

## 4. Configuration & Environment

### Environment Variables (`.env`)
Located at `/home/ec2-user/.env`. **CRITICAL:** Do not commit this file to git.

```ini
GEMINI_API_KEY="AIzaSy..."
GOOGLE_CLIENT_ID="438224997825-..."
```

### Nginx Configuration
Located at `/etc/nginx/conf.d/mynextpr.conf`.
**Key Settings:**
*   **SSL:** Managed by Certbot.
*   **Root:** Points to `/home/ec2-user/mynextpr-544b6987/dist`.
*   **Proxy:** Forwards `/api/` to `http://localhost:3000`.
*   **Timeouts:** `proxy_read_timeout 120;` (Extended for AI generation).

**To Reload Nginx:** `sudo systemctl reload nginx`

---

## 5. Database Schema (`users.db`)
A simple SQLite database to track usage.

**Table: `users`**
| Column | Type | Description |
| :--- | :--- | :--- |
| `email` | TEXT (PK) | User's Google Email. |
| `usage_count` | INTEGER | Number of successful generations. Default 0. |
| `is_unlimited` | BOOLEAN | `1` if user has paid/unlimited access, `0` otherwise. |

---

## 6. The AI Pipeline (`run_pipeline.py`)

This is the core intellectual property of the project.

**Function: `process_image(input_bytes)`**
1.  **Input Validation:** Checks if image is valid.
2.  **Step 1 (Analysis):**
    *   Constructs prompt: `base_prompt.txt` + "CRITICAL INSTRUCTION: Detect runner...".
    *   Calls `gemini-3-flash-preview`.
    *   **Guardrail:** If model outputs "ERROR: NO_RUNNER_DETECTED", pipeline aborts (HTTP 400).
3.  **Step 2 (Generation):**
    *   Constructs prompt: Step 1 Output + "IMPORTANT: Full rectangular frame...".
    *   Calls `gemini-3-pro-image-preview`.
4.  **Post-Processing:**
    *   **Compositing:** Pastes generated image over a solid blue background (`#1E3A68`) to fix any oval cropping artifacts.
    *   **Watermarking:** Calls `add_watermark()` to overlay logo and text.

---

## 7. Operational Guide & Scripts

These scripts are in your **local** project folder for remote management.

### A. View Activity Report
See who is using the app and when.
```bash
./get_report.sh
```
*Output:* List of successful generations with timestamps and emails.

### B. Manage User Limits
Reset a user's count or give them unlimited access.
```bash
# Check status
./manage_user.sh user@example.com

# Reset usage to 0 (Give them 3 more free tries)
./manage_user.sh user@example.com --reset

# Grant unlimited access (Bypass payment wall)
./manage_user.sh user@example.com --unlimited
```

### C. Sync Images
Download all generated images from the server to your local machine.
```bash
./sync_images.sh
```
*Destination:* `downloaded_images/` folder.

---

## 8. Debugging & Troubleshooting

### Scenario 1: "Limit Exceeded" Error
*   **Cause:** User has generated 3 images.
*   **Fix:** Run `./manage_user.sh <email> --reset`.

### Scenario 2: "Generation Failed" (504 Gateway Timeout)
*   **Symptoms:** Frontend spins for 2 minutes, then shows error.
*   **Cause:** AI took longer than 120s.
*   **Check Logs:**
    ```bash
    ssh -i mynextpr.pem ec2-user@3.107.152.28 "pm2 logs backend --lines 50"
    ```
*   **Fix:** Usually transient. If persistent, check if `gemini-3-pro` is experiencing latency.

### Scenario 3: "No Runner Detected"
*   **Cause:** Step 1 guardrail triggered.
*   **Fix:** Upload a clearer photo of a runner.

### Scenario 4: Frontend Changes Not Visible
*   **Cause:** Browser cache or Nginx didn't pick up new build.
*   **Fix:**
    1.  Hard Refresh (Cmd+Shift+R).
    2.  Verify build on server: `ls -l /home/ec2-user/mynextpr-544b6987/dist/index.html` (Check timestamp).

---

## 9. Development & Deployment Workflow

### Making Backend Changes
1.  Edit `backend/main.py` or `run_pipeline.py` locally.
2.  **Deploy:**
    ```bash
    scp -i mynextpr.pem backend/main.py ec2-user@3.107.152.28:/home/ec2-user/backend/
    ```
3.  **Restart:**
    ```bash
    ssh -i mynextpr.pem ec2-user@3.107.152.28 "pm2 restart backend"
    ```

### Making Frontend Changes
1.  Edit React files in `src/`.
2.  **Deploy Source:**
    ```bash
    scp -i mynextpr.pem src/pages/Upload.tsx ec2-user@3.107.152.28:/home/ec2-user/mynextpr-544b6987/src/pages/
    ```
3.  **Rebuild on Server:**
    ```bash
    ssh -i mynextpr.pem ec2-user@3.107.152.28 "cd mynextpr-544b6987 && VITE_API_URL=https://mynextpr.com npm run build"
    ```
