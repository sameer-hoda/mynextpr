import sqlite3
import os
from datetime import datetime
import sys

# Add parent directory to path to find database module if needed, 
# but we can just connect directly to the db file for simplicity in a standalone script
DB_PATH = "backend/users.db"

def view_attempts():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Check if table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='analysis_attempts'")
        if not c.fetchone():
            print("Table 'analysis_attempts' does not exist yet.")
            return

        c.execute('''
            SELECT timestamp, user_email, status, error_stage, error_message, client_status 
            FROM analysis_attempts 
            ORDER BY timestamp DESC 
            LIMIT 50
        ''')
        rows = c.fetchall()
        conn.close()

        print(f"{'TIMESTAMP':<25} | {'EMAIL':<30} | {'STATUS':<15} | {'CLIENT':<15} | {'ERROR'}")
        print("-" * 120)

        for row in rows:
            timestamp, email, status, error_stage, error_msg, client_status = row
            
            # Format timestamp for readability
            try:
                dt = datetime.fromisoformat(timestamp)
                ts_str = dt.strftime("%Y-%m-%d %H:%M:%S")
            except:
                ts_str = str(timestamp)

            # Handle None values
            email = email or "Unknown"
            status = status or "UNKNOWN"
            client_status = client_status or "-"
            
            error_details = ""
            if error_stage:
                error_details = f"[{error_stage}] "
            if error_msg:
                error_details += str(error_msg)
            
            # Truncate email if too long
            if len(email) > 28:
                email = email[:25] + "..."

            print(f"{ts_str:<25} | {email:<30} | {status:<15} | {client_status:<15} | {error_details}")

    except Exception as e:
        print(f"Error reading database: {e}")

if __name__ == "__main__":
    view_attempts()
