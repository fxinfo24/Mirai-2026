"""
Authentication Service for Mirai 2026 Dashboard
Implements JWT-based authentication with RBAC

Features:
- JWT token generation (access + refresh)
- Secure password hashing (bcrypt)
- Role-based access control
- PostgreSQL user storage
- Session management
"""

import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, List

import jwt
import bcrypt
from flask import Blueprint, request, jsonify, current_app
from functools import wraps

# JWT Configuration
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', secrets.token_hex(32))
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRY = timedelta(hours=1)
REFRESH_TOKEN_EXPIRY = timedelta(days=7)

# Create Blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# In-memory user storage (replace with PostgreSQL in production)
# This is a temporary implementation - full PostgreSQL integration follows
USERS_DB = {
    'admin': {
        'id': 1,
        'username': 'admin',
        'password_hash': bcrypt.hashpw(b'admin', bcrypt.gensalt()).decode('utf-8'),
        'email': 'admin@mirai2026.local',
        'role': 'admin',
        'created_at': datetime.utcnow().isoformat()
    },
    'operator': {
        'id': 2,
        'username': 'operator',
        'password_hash': bcrypt.hashpw(b'operator', bcrypt.gensalt()).decode('utf-8'),
        'email': 'operator@mirai2026.local',
        'role': 'operator',
        'created_at': datetime.utcnow().isoformat()
    },
    'viewer': {
        'id': 3,
        'username': 'viewer',
        'password_hash': bcrypt.hashpw(b'viewer', bcrypt.gensalt()).decode('utf-8'),
        'email': 'viewer@mirai2026.local',
        'role': 'viewer',
        'created_at': datetime.utcnow().isoformat()
    }
}

# Role permissions
ROLE_PERMISSIONS = {
    'admin': ['manage_bots', 'manage_attacks', 'manage_users', 'view_all', 'system_config'],
    'operator': ['manage_bots', 'manage_attacks', 'view_all'],
    'viewer': ['view_all']
}

# Active sessions (refresh tokens)
ACTIVE_SESSIONS = {}


def generate_access_token(user: Dict) -> str:
    """Generate JWT access token"""
    payload = {
        'user_id': user['id'],
        'username': user['username'],
        'role': user['role'],
        'permissions': ROLE_PERMISSIONS.get(user['role'], []),
        'exp': datetime.utcnow() + ACCESS_TOKEN_EXPIRY,
        'iat': datetime.utcnow(),
        'type': 'access'
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def generate_refresh_token(user: Dict) -> str:
    """Generate JWT refresh token"""
    payload = {
        'user_id': user['id'],
        'username': user['username'],
        'exp': datetime.utcnow() + REFRESH_TOKEN_EXPIRY,
        'iat': datetime.utcnow(),
        'type': 'refresh',
        'jti': secrets.token_hex(16)  # Unique token ID
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    # Store refresh token
    ACTIVE_SESSIONS[payload['jti']] = {
        'user_id': user['id'],
        'created_at': datetime.utcnow(),
        'expires_at': datetime.utcnow() + REFRESH_TOKEN_EXPIRY
    }
    
    return token


def verify_token(token: str, token_type: str = 'access') -> Optional[Dict]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        if payload.get('type') != token_type:
            return None
            
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token, 'access')
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Add user info to request context
        request.user = payload
        
        return f(*args, **kwargs)
    
    return decorated_function


def require_permission(permission: str):
    """Decorator to require specific permission"""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            user_permissions = request.user.get('permissions', [])
            
            if permission not in user_permissions:
                return jsonify({'error': f'Permission denied: {permission} required'}), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator


def require_role(role: str):
    """Decorator to require specific role"""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            user_role = request.user.get('role')
            
            if user_role != role and user_role != 'admin':
                return jsonify({'error': f'Role {role} required'}), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    
    return decorator


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login endpoint
    
    Request:
        {
            "username": "admin",
            "password": "admin"
        }
    
    Response:
        {
            "access_token": "eyJ...",
            "refresh_token": "eyJ...",
            "user": {...},
            "expires_in": 3600
        }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Invalid request body'}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    # Find user
    user = USERS_DB.get(username)
    
    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Verify password
    if not verify_password(password, user['password_hash']):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Generate tokens
    access_token = generate_access_token(user)
    refresh_token = generate_refresh_token(user)
    
    # Return user without password hash
    user_response = {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role'],
        'permissions': ROLE_PERMISSIONS.get(user['role'], [])
    }
    
    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user_response,
        'expires_in': int(ACCESS_TOKEN_EXPIRY.total_seconds())
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """
    Refresh access token using refresh token
    
    Request:
        {
            "refresh_token": "eyJ..."
        }
    
    Response:
        {
            "access_token": "eyJ...",
            "expires_in": 3600
        }
    """
    data = request.get_json()
    
    if not data or not data.get('refresh_token'):
        return jsonify({'error': 'Refresh token required'}), 400
    
    refresh_token = data['refresh_token']
    payload = verify_token(refresh_token, 'refresh')
    
    if not payload:
        return jsonify({'error': 'Invalid or expired refresh token'}), 401
    
    # Check if token is still active
    jti = payload.get('jti')
    if jti not in ACTIVE_SESSIONS:
        return jsonify({'error': 'Refresh token has been revoked'}), 401
    
    # Find user
    username = payload.get('username')
    user = USERS_DB.get(username)
    
    if not user:
        return jsonify({'error': 'User not found'}), 401
    
    # Generate new access token
    access_token = generate_access_token(user)
    
    return jsonify({
        'access_token': access_token,
        'expires_in': int(ACCESS_TOKEN_EXPIRY.total_seconds())
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """
    Logout endpoint - invalidates refresh token
    
    Request:
        {
            "refresh_token": "eyJ..."
        }
    """
    data = request.get_json()
    
    if data and data.get('refresh_token'):
        refresh_token = data['refresh_token']
        payload = verify_token(refresh_token, 'refresh')
        
        if payload:
            jti = payload.get('jti')
            if jti in ACTIVE_SESSIONS:
                del ACTIVE_SESSIONS[jti]
    
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    """
    Get current authenticated user info
    
    Response:
        {
            "id": 1,
            "username": "admin",
            "email": "admin@mirai2026.local",
            "role": "admin",
            "permissions": [...]
        }
    """
    user_id = request.user.get('user_id')
    username = request.user.get('username')
    
    user = USERS_DB.get(username)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user_response = {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role'],
        'permissions': ROLE_PERMISSIONS.get(user['role'], [])
    }
    
    return jsonify(user_response), 200


@auth_bp.route('/verify', methods=['POST'])
def verify():
    """
    Verify if a token is valid
    
    Request:
        {
            "token": "eyJ..."
        }
    
    Response:
        {
            "valid": true,
            "user": {...}
        }
    """
    data = request.get_json()
    
    if not data or not data.get('token'):
        return jsonify({'error': 'Token required'}), 400
    
    token = data['token']
    payload = verify_token(token, 'access')
    
    if not payload:
        return jsonify({'valid': False}), 200
    
    return jsonify({
        'valid': True,
        'user': {
            'id': payload.get('user_id'),
            'username': payload.get('username'),
            'role': payload.get('role'),
            'permissions': payload.get('permissions', [])
        }
    }), 200


@auth_bp.route('/register', methods=['POST'])
@require_permission('manage_users')
def register():
    """
    Register new user (admin only)
    
    Request:
        {
            "username": "newuser",
            "password": "password",
            "email": "user@example.com",
            "role": "operator"
        }
    """
    data = request.get_json()
    
    required_fields = ['username', 'password', 'email', 'role']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'error': 'All fields required: username, password, email, role'}), 400
    
    username = data['username']
    
    if username in USERS_DB:
        return jsonify({'error': 'Username already exists'}), 409
    
    if data['role'] not in ROLE_PERMISSIONS:
        return jsonify({'error': 'Invalid role'}), 400
    
    # Create new user
    new_user = {
        'id': len(USERS_DB) + 1,
        'username': username,
        'password_hash': hash_password(data['password']),
        'email': data['email'],
        'role': data['role'],
        'created_at': datetime.utcnow().isoformat()
    }
    
    USERS_DB[username] = new_user
    
    return jsonify({
        'message': 'User created successfully',
        'user': {
            'id': new_user['id'],
            'username': new_user['username'],
            'email': new_user['email'],
            'role': new_user['role']
        }
    }), 201


# Export decorators and functions for use in other modules
__all__ = [
    'auth_bp',
    'require_auth',
    'require_permission',
    'require_role',
    'verify_token',
    'JWT_SECRET_KEY',
    'JWT_ALGORITHM'
]
