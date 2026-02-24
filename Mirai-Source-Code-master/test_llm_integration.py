#!/usr/bin/env python3
"""
Quick test script for LLM integration
"""
import os
import sys

# Add ai directory to path
sys.path.insert(0, 'ai')

from llm_integration.llm_client import LLMClient, LLMConfig, LLMProvider

def test_local_ollama():
    """Test with free local Ollama (no API key needed)"""
    print("\n=== Testing Ollama (Local - FREE) ===")
    config = LLMConfig(
        provider=LLMProvider.OLLAMA,
        model="llama2"
    )
    client = LLMClient(config)
    
    result = client.generate_credentials("router", count=3)
    print(f"✅ Generated {len(result)} credentials")
    for cred in result[:3]:
        print(f"   - {cred}")

def test_openai():
    """Test with OpenAI (requires API key)"""
    if not os.getenv('OPENAI_API_KEY'):
        print("\n⚠️  Skipping OpenAI test (no API key)")
        return
    
    print("\n=== Testing OpenAI ===")
    config = LLMConfig(
        provider=LLMProvider.OPENAI,
        api_key=os.getenv('OPENAI_API_KEY'),
        model="gpt-3.5-turbo"
    )
    client = LLMClient(config)
    
    result = client.generate_credentials("camera", count=5)
    print(f"✅ Generated {len(result)} credentials")

if __name__ == "__main__":
    print("Testing LLM Integration...")
    
    # Test local first (free)
    try:
        test_local_ollama()
    except Exception as e:
        print(f"❌ Ollama test failed: {e}")
        print("   Install Ollama: https://ollama.ai")
    
    # Test OpenAI if available
    test_openai()
    
    print("\n✅ LLM Integration Tests Complete!")
