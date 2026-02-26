#!/usr/bin/env python3
"""Test OpenRouter integration"""

import os
import sys  # noqa: F401
from llm_integration.llm_client import LLMClient, LLMConfig, LLMProvider


def test_openrouter():
    """Test OpenRouter API"""

    # Check for API key
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("❌ Error: OPENROUTER_API_KEY not set")
        print("\n📝 Setup instructions:")
        print("1. Get API key: https://openrouter.ai/keys")
        print("2. Export: export OPENROUTER_API_KEY='sk-or-v1-...'")
        print("3. Run: python3 ai/test_openrouter.py")
        return

    print("🚀 Testing OpenRouter integration...\n")

    # Test different models
    models_to_test = [
        ("meta-llama/llama-2-70b-chat", "FREE model"),
        ("openai/gpt-3.5-turbo", "Cheap & fast ($0.002/1k)"),
        ("anthropic/claude-3-sonnet-20240229", "Best balance ($0.003/1k)"),
    ]

    for model, description in models_to_test:
        print(f"📊 Testing: {model} ({description})")

        try:
            config = LLMConfig(
                provider=LLMProvider.OPENROUTER,
                api_key=api_key,
                model=model,
                temperature=0.7,
                max_tokens=100
            )

            client = LLMClient(config)

            # Test credential generation
            prompt = "Generate 3 likely default credentials for a TP-Link router"
            response = client.generate(prompt)

            print(f"✅ Success! Response preview:")  # noqa: F541
            print(f"   {response[:150]}...\n")

        except Exception as e:
            print(f"❌ Error: {e}\n")

if __name__ == "__main__":
    test_openrouter()
