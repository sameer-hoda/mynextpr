### **Final Deployment Guide: `mynextpr.com` on AWS EC2**

This guide contains the complete, corrected steps to deploy and update your application. It incorporates all lessons learned from our debugging session.

---

### **Phase 1: Initial Server Setup**

These steps only need to be performed **once** when setting up a new server.

**1. Point Your Domain:**
*   In GoDaddy, edit the `A` record for `mynextpr.com` (`@`).
*   Set the **Value** to your EC2 instance's IP address: `34.229.82.32`.

**2. Connect to Your EC2 Instance:**
*   From your local computer's project root (`/Users/sameerhoda/alt_projects/runna/mynextpr_v3`), use this command:
    ```bash
    ssh -i "aws/mynextpr.pem" ec2-user@ec2-34-229-82-32.compute-1.amazonaws.com
    ```

**3. Install All Required Software:**
*   Once connected, run the following commands to install the web server, Node.js, process manager, and database client.
    ```bash
    # Update all existing packages
    sudo yum update -y

    # Install Nginx, Git, Certbot, and the SQLite command-line tool
    sudo yum install -y nginx git certbot python3-certbot-nginx sqlite

    # Install Node Version Manager (nvm) to manage Node.js versions
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

    # Activate nvm
    source ~/.bashrc
    nvm install --lts
    nvm use --lts

    # Install PM2, a process manager for Node.js, globally
    npm install pm2 -g
    ```

**4. Set Initial Server Permissions:**
*   This allows the Nginx web server to access files in your user's home directory.
    ```bash
    chmod 711 /home/ec2-user
    ```

**5. Create Production `.env` Files:**
*   These files will stay on the server and will not be overwritten by deployments.
*   **Backend Config:**
    ```bash
    # Create and open the backend .env file
    nano /home/ec2-user/runna/backend/.env
    ```
    *   Paste the following content, replacing placeholder keys:
        ```env
        DATABASE_PATH=./data/mynextpr.db
        GOOGLE_CLIENT_ID="your-google-client-id-here"
        GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
        SESSION_SECRET="a-very-long-and-random-secret-string"
        GEMINI_API_KEY="your-gemini-api-key-here"
        FRONTEND_URL="https://mynextpr.com"
        ```
*   **Frontend Config:**
    ```bash
    # Create and open the frontend .env file
    nano /home/ec2-user/runna/plan-my-run/.env
    ```
    *   Paste the following content:
        ```env
        VITE_API_URL="https://mynextpr.com/api"
        ```

**6. Configure Nginx & SSL:**
*   Use this command to create and edit the Nginx config file:
    ```bash
    sudo bash -c 'cat > /etc/nginx/conf.d/mynextpr.com.conf' <<'EOF'
    # Server block to redirect all HTTP traffic to HTTPS
    server {
        listen 80;
        server_name mynextpr.com www.mynextpr.com;
        location /.well-known/acme-challenge/ { root /var/www/html; }
        location / { return 301 https://$host$request_uri; }
    }
    # Server block to handle all HTTPS traffic and serve the site
    server {
        listen 443 ssl http2;
        server_name mynextpr.com www.mynextpr.com;

        ssl_certificate /etc/letsencrypt/live/mynextpr.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/mynextpr.com/privkey.pem;
        include /etc/letsencrypt/options-ssl-nginx.conf;
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

        root /home/ec2-user/runna/plan-my-run/dist;
        index index.html;

        location / { try_files $uri $uri/ /index.html; }

        location /api/ {
            proxy_pass http://localhost:3001/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    EOF
    ```
*   **Run Certbot** to get your SSL certificate (if you haven't already):
    ```bash
    sudo certbot --nginx -d mynextpr.com -d www.mynextpr.com
    ```
*   **Test and restart Nginx:**
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```

**7. Configure PM2 to Start on Reboot:**
    ```bash
    pm2 startup
    ```
*   This will output a command. You must **copy that command and run it**.
*   Save the (currently empty) process list so the startup script is active:
    ```bash
    pm2 save
    ```

---

### **Phase 2: How to Deploy Updates**

Follow these steps each time you want to deploy new code changes from your local machine to the server.

**1. (Local) Create the Deploy Package:**
*   On your **local computer's terminal**, navigate to your project root and run this command. It correctly excludes `node_modules` and `.env` files.
    ```bash
    tar --exclude='*/node_modules/*' --exclude='**/.env' -czvf project.tar.gz backend plan-my-run
    ```

**2. (Local) Upload the Package:**
*   Use `scp` to copy the single archive file to your server.
    ```bash
    scp -i "aws/mynextpr.pem" project.tar.gz ec2-user@ec2-34-229-82-32.compute-1.amazonaws.com:/home/ec2-user/
    ```

**3. (Server) Unpack and Deploy:**
*   Connect to your server via SSH and run the following commands.
    ```bash
    # Connect to your server
    ssh -i "aws/mynextpr.pem" ec2-user@ec2-34-229-82-32.compute-1.amazonaws.com

    # (On Server) Unpack the archive, overwriting old files
    cd /home/ec2-user/runna
    tar -xzvf ../project.tar.gz

    # (On Server) Install backend dependencies
    cd /home/ec2-user/runna/backend
    npm install

    # (On Server) Install frontend dependencies and build the static files
    cd /home/ec2-user/runna/plan-my-run
    npm install
    npm run build

    # (On Server) Restart the backend application, applying any .env changes
    pm2 restart runna-backend --update-env
    ```

---

### **Phase 3: Troubleshooting & Useful Commands**

*   **Check running apps:** `pm2 list`
*   **View backend logs:** `pm2 logs runna-backend`
*   **Check Nginx status:** `sudo systemctl status nginx`
*   **Test Nginx config:** `sudo nginx -t`
*   **Count users in DB:** `sqlite3 /home/ec2-user/runna/backend/runna.db "SELECT count(*) FROM profiles;"`
*   **List user emails in DB:** `sqlite3 /home/ec2-user/runna/backend/runna.db "SELECT email FROM profiles;"`
*   **`500 Internal Server Error`:** Usually Nginx permissions. Run `chmod 711 /home/ec2-user`.
*   **`SQLITE_READONLY`:** Database permissions issue. Run `chmod -R u+w /home/ec2-user/runna/backend/`.
*   **`ERR_TOO_MANY_REDIRECTS`:** Your Nginx config is likely broken. Refer to the correct version in Phase 1.
*   **`redirect_uri_mismatch`:** Ensure Google Console has `https://mynextpr.com/api/auth/google/callback` and your `server.js` has the full absolute URL.