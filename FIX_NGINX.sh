#!/bin/bash
# This script will overwrite the Nginx configuration on your EC2 server with the correct version.

echo "--- Updating Nginx configuration file... ---"

sudo bash -c 'cat > /etc/nginx/conf.d/mynextpr.com.conf' <<'EOF'
# Server block to redirect all HTTP traffic to HTTPS
server {
    listen 80;
    server_name mynextpr.com www.mynextpr.com;

    # Required for Certbot renewal
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# Server block to handle all HTTPS traffic and serve the site
server {
    listen 443 ssl http2;
    server_name mynextpr.com www.mynextpr.com;

    # SSL Configuration (from Certbot)
    ssl_certificate /etc/letsencrypt/live/mynextpr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mynextpr.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # --- Serve the Static Frontend Files ---
    root /home/ec2-user/runna/plan-my-run/dist;
    index index.html;

    # This is the rule for Single-Page Applications like React
    location / {
        try_files $uri $uri/ /index.html;
    }

    # --- Proxy API Requests to the Backend ---
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

echo "--- Nginx configuration file has been updated. ---"
echo ""
echo "--- Testing and restarting Nginx... ---"

# Test the new configuration for syntax errors
sudo nginx -t

# Restart Nginx to apply the changes
sudo systemctl restart nginx

echo ""
echo "--- Nginx has been restarted successfully! ---"
echo "Please clear your browser cache and test https://mynextpr.com now."

