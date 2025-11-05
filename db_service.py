import sqlite3
import json
import uuid
from datetime import datetime

class ChatHistoryDB:
    def __init__(self, db_path='chat_history.db'):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    response TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            ''')
            # Add session_id column if it doesn't exist (for existing databases)
            try:
                conn.execute('ALTER TABLE chat_history ADD COLUMN session_id TEXT')
            except sqlite3.OperationalError:
                pass
    
    def save_chat(self, prompt, response, session_id, metadata=None):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                'INSERT INTO chat_history (session_id, prompt, response, metadata) VALUES (?, ?, ?, ?)',
                (session_id, prompt, response, json.dumps(metadata) if metadata else None)
            )
    
    def get_sessions(self, limit=50):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                '''SELECT session_id, MIN(prompt) as first_prompt, MAX(timestamp) as last_timestamp, COUNT(*) as message_count
                   FROM chat_history 
                   WHERE session_id IS NOT NULL
                   GROUP BY session_id 
                   ORDER BY last_timestamp DESC 
                   LIMIT ?''',
                (limit,)
            )
            return [{'session_id': row[0], 'first_prompt': row[1], 'last_timestamp': row[2], 'message_count': row[3]} for row in cursor.fetchall()]
    
    def get_session_messages(self, session_id):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                'SELECT prompt, response, timestamp FROM chat_history WHERE session_id = ? ORDER BY timestamp ASC',
                (session_id,)
            )
            return [{'prompt': row[0], 'response': row[1], 'timestamp': row[2]} for row in cursor.fetchall()]
    
    def clear_history(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM chat_history')
    
    def delete_session(self, session_id):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM chat_history WHERE session_id = ?', (session_id,))
    
    def get_session_context(self, session_id, limit=8):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                'SELECT prompt, response FROM chat_history WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?',
                (session_id, limit)
            )
            return [{'prompt': row[0], 'response': row[1]} for row in cursor.fetchall()]
    
    def generate_session_id(self):
        return str(uuid.uuid4())

db_service = ChatHistoryDB()