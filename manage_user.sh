#!/bin/bash
EMAIL=$1
shift
ARGS="$@"

# Configuration (update these for your environment)
EC2_HOST="ec2-user@YOUR_EC2_IP"
PEM_FILE="your-key.pem"

if [ -z "$EMAIL" ]; then
    echo "Usage: ./manage_user.sh <email> [--reset] [--unlimited] [--revoke]"
    echo "Example: ./manage_user.sh user@example.com --reset"
    exit 1
fi

echo "Managing user $EMAIL on EC2..."
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_HOST" "python3 backend/manage_users.py $EMAIL $ARGS"
