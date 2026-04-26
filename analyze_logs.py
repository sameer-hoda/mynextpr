import re
from datetime import datetime, timedelta
import sys

def parse_logs():
    log_files = ['backend-out.log', 'backend-error.log']
    
    # Regex for PM2 timestamp format: 2026-01-24 13:02:00
    # Note: PM2 logs usually look like: "2026-01-24 13:02:00: ..." or just the message if not configured.
    # Based on previous `pm2 logs` output, the format in `backend-out.log` (access logs) seems to be:
    # "0|backend  | INFO:     49.207.148.219:0 - "POST /api/generate HTTP/1.1" 200 OK"
    # This doesn't have a timestamp in the line itself unless PM2 adds it. 
    # However, `backend-error.log` usually has timestamps if using standard logging.
    # Let's assume standard python logging format from `run_pipeline.py`: '%(asctime)s - %(levelname)s - %(message)s'
    # Datefmt: '%Y-%m-%d %H:%M:%S'
    
    # We will look for the python logging timestamp first.
    
    now = datetime.utcnow() # Logs are likely UTC
    start_time = now - timedelta(hours=24)
    
    stats = {
        "attempts": 0,
        "success": 0,
        "failures": 0,
        "reasons": {}
    }
    
    print(f"Analyzing logs from {start_time} to {now} (UTC)...")

    for log_file in log_files:
        try:
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    # Try to extract timestamp
                    # Python logging: 2026-01-24 13:00:19 - INFO - ...
                    match = re.search(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})', line)
                    if match:
                        log_time_str = match.group(1)
                        try:
                            log_time = datetime.strptime(log_time_str, '%Y-%m-%d %H:%M:%S')
                            
                            # Filter by last 24 hours
                            if log_time < start_time:
                                continue
                                
                            # Analyze content
                            if "POST /api/generate" in line:
                                stats["attempts"] += 1
                            elif "Pipeline completed successfully" in line:
                                stats["success"] += 1
                            elif "ERROR" in line or "Exception" in line:
                                # Categorize errors
                                if "NO_RUNNER_DETECTED" in line:
                                    stats["reasons"]["No Runner Detected"] = stats["reasons"].get("No Runner Detected", 0) + 1
                                    stats["failures"] += 1
                                elif "LIMIT_EXCEEDED" in line:
                                    stats["reasons"]["Quota Exceeded"] = stats["reasons"].get("Quota Exceeded", 0) + 1
                                    stats["failures"] += 1
                                elif "Step 1 Failed" in line:
                                    stats["reasons"]["AI Analysis Failed (Step 1)"] = stats["reasons"].get("AI Analysis Failed (Step 1)", 0) + 1
                                    stats["failures"] += 1
                                elif "Step 2 Failed" in line:
                                    stats["reasons"]["Image Generation Failed (Step 2)"] = stats["reasons"].get("Image Generation Failed (Step 2)", 0) + 1
                                    stats["failures"] += 1
                                else:
                                    # Generic error, extract message if possible
                                    stats["reasons"]["Generic Error"] = stats["reasons"].get("Generic Error", 0) + 1
                                    stats["failures"] += 1
                                    
                        except ValueError:
                            continue
                    else:
                        # Fallback for access logs without explicit timestamp in line (PM2 might prefix)
                        # If no timestamp, we can't reliably filter by time, but for "POST /api/generate" in backend-out.log
                        # we might assume recent if the file is rotated. 
                        # But let's stick to lines with timestamps for accuracy.
                        pass
                        
        except FileNotFoundError:
            print(f"File {log_file} not found.")

    print("\n--- Report ---")
    print(f"Total Upload Attempts: {stats['attempts']}")
    print(f"Successful Analyses: {stats['success']}")
    print(f"Total Failures: {stats['failures']}")
    print("\nFailure Reasons:")
    for reason, count in stats['reasons'].items():
        print(f"- {reason}: {count}")

if __name__ == "__main__":
    parse_logs()
