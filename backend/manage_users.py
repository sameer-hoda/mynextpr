import sqlite3
import argparse
import os

# Path to database
# Assuming script is run from project root (where backend/ exists)
DB_PATH = "backend/users.db"

def manage_user(email, reset, unlimited, revoke):
    # Handle path if run from inside backend dir or root
    db_path = DB_PATH
    if not os.path.exists(db_path):
        # Try looking in current dir
        if os.path.exists("users.db"):
            db_path = "users.db"
        else:
            # Try absolute path on EC2 (common location)
            if os.path.exists("/home/ec2-user/backend/users.db"):
                db_path = "/home/ec2-user/backend/users.db"
            else:
                print(f"Error: Database not found at {db_path} or current directory.")
                return

    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()

        # Check if user exists
        c.execute('SELECT usage_count, is_unlimited FROM users WHERE email = ?', (email,))
        result = c.fetchone()

        if not result:
            print(f"User {email} not found in DB. Creating new record...")
            c.execute('INSERT INTO users (email, usage_count, is_unlimited) VALUES (?, 0, 0)', (email,))
            result = (0, 0)
            conn.commit()

        current_usage, current_unlimited = result
        print(f"Current Status -> Usage: {current_usage} | Unlimited: {bool(current_unlimited)}")

        if reset:
            c.execute('UPDATE users SET usage_count = 0 WHERE email = ?', (email,))
            print(f"ACTION: Reset usage count for {email} to 0.")

        if unlimited:
            c.execute('UPDATE users SET is_unlimited = 1 WHERE email = ?', (email,))
            print(f"ACTION: Set {email} to UNLIMITED.")

        if revoke:
            c.execute('UPDATE users SET is_unlimited = 0 WHERE email = ?', (email,))
            print(f"ACTION: Revoked UNLIMITED status for {email}.")

        conn.commit()
        
        # Verify
        c.execute('SELECT usage_count, is_unlimited FROM users WHERE email = ?', (email,))
        new_usage, new_unlimited = c.fetchone()
        print(f"New Status     -> Usage: {new_usage} | Unlimited: {bool(new_unlimited)}")
        
        conn.close()
    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage user limits.")
    parser.add_argument("email", help="User email address")
    parser.add_argument("--reset", action="store_true", help="Reset usage count to 0")
    parser.add_argument("--unlimited", action="store_true", help="Grant unlimited access")
    parser.add_argument("--revoke", action="store_true", help="Revoke unlimited access")
    
    args = parser.parse_args()
    
    if not (args.reset or args.unlimited or args.revoke):
        print("No action specified. Just showing status.")
        
    manage_user(args.email, args.reset, args.unlimited, args.revoke)
