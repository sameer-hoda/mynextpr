#!/bin/bash

# Configuration (update these for your environment)
EC2_HOST="ec2-user@YOUR_EC2_IP"
PEM_FILE="your-key.pem"

# Ensure local directory exists
mkdir -p downloaded_images

echo "Syncing generated images from EC2 to downloaded_images/..."

rsync -avz -e "ssh -i $PEM_FILE -o StrictHostKeyChecking=no" \
    --include="*_output.png" \
    --exclude="*" \
    "$EC2_HOST":/home/ec2-user/backend/outputs/ \
    downloaded_images/

echo "Sync complete."
