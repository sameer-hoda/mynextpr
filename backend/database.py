import sqlite3
import os

DB_PATH = "backend/users.db"

def init_db():
    """Initialize the database with the users table."""
    # Ensure backend directory exists (it should, but good practice)
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            usage_count INTEGER DEFAULT 0,
            is_unlimited BOOLEAN DEFAULT 0
        )
    ''')
    
    # New table for observability
    c.execute('''
        CREATE TABLE IF NOT EXISTS analysis_attempts (
            id TEXT PRIMARY KEY,
            user_email TEXT,
            timestamp TEXT,
            status TEXT,
            error_stage TEXT,
            error_message TEXT,
            client_status TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

def get_user_usage(email):
    """Get the usage count for a user. Returns (count, is_unlimited)."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT usage_count, is_unlimited FROM users WHERE email = ?', (email,))
    result = c.fetchone()
    conn.close()
    
    if result:
        return result[0], bool(result[1])
    else:
        return 0, False

def increment_usage(email):
    """Increment the usage count for a user."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Check if user exists
    c.execute('SELECT usage_count FROM users WHERE email = ?', (email,))
    result = c.fetchone()
    
    if result:
        c.execute('UPDATE users SET usage_count = usage_count + 1 WHERE email = ?', (email,))
    else:
        c.execute('INSERT INTO users (email, usage_count) VALUES (?, 1)', (email,))
        
    conn.commit()
    conn.close()

# --- Observability Functions ---

def log_attempt_start(request_id, email):
    """Log the start of an analysis attempt."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    from datetime import datetime
    timestamp = datetime.now().isoformat()
    c.execute('''
        INSERT INTO analysis_attempts (id, user_email, timestamp, status)
        VALUES (?, ?, ?, 'STARTED')
    ''', (request_id, email, timestamp))
    conn.commit()
    conn.close()

def update_attempt_status(request_id, status):
    """Update the status of an analysis attempt."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        UPDATE analysis_attempts 
        SET status = ? 
        WHERE id = ?
    ''', (status, request_id))
    conn.commit()
    conn.close()

def log_attempt_error(request_id, stage, message):
    """Log an error for an analysis attempt."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        UPDATE analysis_attempts 
        SET status = 'FAILED', error_stage = ?, error_message = ? 
        WHERE id = ?
    ''', (stage, str(message), request_id))
    conn.commit()
    conn.close()

def log_client_status(request_id, status, error_message=None):
    """Log the client-side rendering status."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if error_message:
        c.execute('''
            UPDATE analysis_attempts 
            SET client_status = ?, error_message = ?
            WHERE id = ?
        ''', (status, str(error_message), request_id))
    else:
        c.execute('''
            UPDATE analysis_attempts 
            SET client_status = ? 
            WHERE id = ?
        ''', (status, request_id))
    conn.commit()
    conn.close()

# Initialize DB on module load (or call explicitly)
init_db()
