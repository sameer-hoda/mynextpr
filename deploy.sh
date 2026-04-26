#!/bin/bash
set -e

# Configuration (update these for your environment)
EC2_HOST="ec2-user@YOUR_EC2_IP"
PEM_FILE="your-key.pem"

# Fix permissions
chmod 400 "$PEM_FILE"

# Create tarball (exclude secrets and build artifacts)
echo "Creating deployment archive..."
tar --exclude='node_modules' --exclude='__pycache__' --exclude='backend/uploads/*' --exclude='backend/outputs/*' --exclude='.env' -czvf deploy.tar.gz backend mynextpr-544b6987 requirements.txt run_pipeline.py base_prompt.txt mynextpr_logo.png

# Transfer files
echo "Transferring files to EC2..."
scp -i "$PEM_FILE" -o StrictHostKeyChecking=no deploy.tar.gz "$EC2_HOST":/home/ec2-user/
scp -i "$PEM_FILE" -o StrictHostKeyChecking=no setup_remote.sh "$EC2_HOST":/home/ec2-user/

# Execute remote setup
echo "Executing remote setup..."
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_HOST" "bash setup_remote.sh"

echo "Deployment complete!"
