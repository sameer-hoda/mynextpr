#!/bin/bash

# Configuration (update these for your environment)
EC2_HOST="ec2-user@YOUR_EC2_IP"
PEM_FILE="your-key.pem"

# Connect to EC2 and run the view_attempts.py script
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_HOST" "cd /home/ec2-user && python3 backend/view_attempts.py"
