#!/bin/bash
set -e

echo "Updating system..."
sudo dnf update -y

echo "Installing dependencies..."
sudo dnf install -y python3 python3-pip nodejs npm
sudo npm install -g pm2

echo "Unpacking archive..."
tar -xzvf deploy.tar.gz

echo "Installing Python requirements..."
pip3 install -r requirements.txt

echo "Installing Frontend dependencies and building..."
cd mynextpr-544b6987
npm install
# NOTE: You must manually create .env from .env.example before building
npm run build
cd ..

echo "Starting services with PM2..."
pm2 delete all || true
pm2 start backend/main.py --name backend --interpreter python3
pm2 save
echo "Services started!"
