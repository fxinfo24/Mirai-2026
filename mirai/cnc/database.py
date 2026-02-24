import mysql.connector
import time
from dataclasses import dataclass
import ipaddress
from typing import Tuple, Dict, Optional

@dataclass
class AccountInfo:
    username: str
    max_bots: int
    admin: int

class Database:
    def __init__(self, db_addr: str, db_user: str, db_password: str, db_name: str):
        self.db = mysql.connector.connect(
            host=db_addr,
            user=db_user,
            password=db_password,
            database=db_name
        )
        print("MySQL DB opened")

    def try_login(self, username: str, password: str) -> Tuple[bool, AccountInfo]:
        cursor = self.db.cursor()
        cursor.execute(
            "SELECT username, max_bots, admin FROM users WHERE username = %s AND password = %s "
            "AND (wrc = 0 OR (UNIX_TIMESTAMP() - last_paid < `intvl` * 24 * 60 * 60))",
            (username, password)
        )
        result = cursor.fetchone()
        cursor.close()

        if not result:
            return False, AccountInfo("", 0, 0)
        
        return True, AccountInfo(result[0], result[1], result[2])

    def create_user(self, username: str, password: str, max_bots: int, duration: int, cooldown: int) -> bool:
        try:
            cursor = self.db.cursor()
            
            # Check if user exists
            cursor.execute("SELECT username FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                return False

            # Create new user
            cursor.execute(
                "INSERT INTO users (username, password, max_bots, admin, last_paid, cooldown, duration_limit) "
                "VALUES (%s, %s, %s, 0, UNIX_TIMESTAMP(), %s, %s)",
                (username, password, max_bots, cooldown, duration)
            )
            self.db.commit()
            cursor.close()
            return True
            
        except Exception as e:
            print(f"Error creating user: {e}")
            return False

    # ...remaining functions translated similarly...
