import os
import json
import glob
from datetime import datetime
import sys

# Path to outputs directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "outputs")

def generate_report():
    print(f"Generating report from {OUTPUT_DIR}...")
    
    if not os.path.exists(OUTPUT_DIR):
        print("No output directory found.")
        return

    # Find all JSON metadata files
    json_files = glob.glob(os.path.join(OUTPUT_DIR, "*.json"))
    
    records = []
    
    for file_path in json_files:
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
                
                # Extract fields
                timestamp_str = data.get("timestamp")
                email = data.get("user_email", "Unknown")
                
                if timestamp_str:
                    # Parse timestamp
                    dt = datetime.fromisoformat(timestamp_str)
                    day = dt.strftime("%Y-%m-%d")
                    time_str = dt.strftime("%H:%M:%S")
                    
                    records.append({
                        "day": day,
                        "email": email,
                        "timestamp": f"{day} {time_str}",
                        "dt": dt
                    })
        except Exception as e:
            print(f"Error reading {file_path}: {e}")

    # Sort by timestamp descending (newest first)
    records.sort(key=lambda x: x["dt"], reverse=True)
    
    # Print Report
    print("-" * 60)
    print(f"{'Day':<12} | {'Email':<30} | {'Timestamp':<20}")
    print("-" * 60)
    
    for r in records:
        print(f"{r['day']:<12} | {r['email']:<30} | {r['timestamp']:<20}")
        
    print("-" * 60)
    print(f"Total Successful Generations: {len(records)}")
    
    # User Summary
    print("\nUser Summary:")
    user_counts = {}
    for r in records:
        user_counts[r['email']] = user_counts.get(r['email'], 0) + 1
        
    for email, count in user_counts.items():
        print(f"{email}: {count}")

if __name__ == "__main__":
    generate_report()
