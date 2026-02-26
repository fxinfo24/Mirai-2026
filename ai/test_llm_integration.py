#!/usr/bin/env python3
"""
Test script for LLM integration
"""

import os
import sys

# Test imports
try:
    from llm_integration.llm_client import LLMClient, LLMConfig, LLMProvider
    print("✅ LLM client imports successful")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)


def test_ollama():
    """Test local Ollama integration (free, no API key needed)"""
    print("\n🧪 Testing Ollama (local model)...")

    config = LLMConfig(
        provider=LLMProvider.OLLAMA,
        model="llama2",
        base_url="http://localhost:11434"
    )

    client = LLMClient(config)

    try:
        response = client.generate("Say 'Hello from Ollama!'")
        print(f"✅ Ollama response: {response[:100]}...")
        return True
    except Exception as e:
        print(f"⚠️  Ollama not available: {e}")
        print("   Install: curl https://ollama.ai/install.sh | sh")
        print("   Run: ollama serve")
        return False


def test_openai():
    """Test OpenAI integration"""
    print("\n🧪 Testing OpenAI...")

    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("⚠️  OPENAI_API_KEY not set")
        return False

    config = LLMConfig(provider=LLMProvider.OPENAI)
    client = LLMClient(config)

    try:
        response = client.generate("Say 'Hello from OpenAI!'")
        print(f"✅ OpenAI response: {response[:100]}...")
        return True
    except Exception as e:
        print(f"❌ OpenAI failed: {e}")
        return False


def test_credential_generation():
    """Test credential generation"""
    print("\n🧪 Testing credential generation...")

    from llm_integration.llm_client import CredentialGenerator

    # Try Ollama first (free)
    config = LLMConfig(provider=LLMProvider.OLLAMA)
    client = LLMClient(config)
    gen = CredentialGenerator(client)

    try:
        creds = gen.generate_for_device("Hikvision IP Camera", count=3)
        print(f"✅ Generated {len(creds)} credentials:")
        for cred in creds:
            print(f"   - {cred['username']}:{cred['password']} (confidence: {cred['confidence']})")
        return True
    except Exception as e:
        print(f"⚠️  Credential generation failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("LLM Integration Test Suite")
    print("=" * 60)

    results = {
        "ollama": test_ollama(),
        "openai": test_openai(),
        "credentials": test_credential_generation()
    }

    print("\n" + "=" * 60)
    print("Test Results:")
    print("=" * 60)
    for test, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test:20s}: {status}")

    print("\nRecommendation:")
    if results["ollama"]:
        print("✅ Use Ollama for free, local LLM inference")
    else:
        print("💡 Install Ollama for free local models:")
        print("   curl https://ollama.ai/install.sh | sh")
        print("   ollama pull llama2")
