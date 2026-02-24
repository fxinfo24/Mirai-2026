# LLM Integration Module

## Overview

Real LLM integration for Mirai 2026 supporting multiple providers.

## Supported Providers

- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Anthropic** (Claude 3)
- **Ollama** (Local models - Llama2, Mistral)
- **Azure OpenAI** (Enterprise deployments)

## Quick Start

1. **Install dependencies:**
```bash
cd ai/llm_integration
pip install -r requirements.txt
```

2. **Configure API keys:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Use in code:**
```python
from llm_integration.llm_client import LLMClient, LLMConfig, LLMProvider

# OpenAI
config = LLMConfig(provider=LLMProvider.OPENAI)
client = LLMClient(config)
response = client.generate("Generate IoT default credentials")

# Local Ollama (free!)
config = LLMConfig(provider=LLMProvider.OLLAMA)
client = LLMClient(config)
```

## Use Cases

- Credential generation
- Attack strategy synthesis
- Evasion technique suggestions
- Traffic pattern generation
