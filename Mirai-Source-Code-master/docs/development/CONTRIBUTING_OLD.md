# Contributing to Mirai 2026

Thank you for your interest in contributing to the Mirai 2026 research project!

## Code of Conduct

### Research Ethics First

This project exists **solely for cybersecurity research and education**. All contributions must:

1. **Never enable malicious use**
2. **Improve security understanding**
3. **Include safeguards and ethical guidelines**
4. **Follow responsible disclosure practices**

## How to Contribute

### 1. Areas for Contribution

**High Priority:**
- 🤖 AI/ML models for threat intelligence
- 🔒 Additional security safeguards
- 📊 Observability and monitoring improvements
- 📚 Documentation and tutorials
- 🧪 Test coverage expansion
- 🏗️ IoT device emulators for testing

**Medium Priority:**
- 🌐 Additional protocol support (MQTT, CoAP)
- ⚡ Performance optimizations
- 🐳 Kubernetes operator
- 📈 Analytics dashboards

**Ideas Welcome:**
- Novel research methodologies
- Integration with security tools
- Educational materials

### 2. Getting Started

```bash
# Fork and clone
git clone https://github.com/yourusername/mirai-2026.git
cd mirai-2026

# Create feature branch
git checkout -b feature/your-feature-name

# Set up development environment
make debug
docker-compose up -d

# Run tests
make test
```

### 3. Development Workflow

#### Code Standards

**C Code:**
- Follow C17 standard
- Use clang-format (`.clang-format` provided)
- No compiler warnings (`-Werror`)
- Comprehensive error handling
- Memory safety (use sanitizers)

```bash
# Format code
make format

# Run static analysis
make lint

# Run with sanitizers
make debug
```

**Python Code:**
- Use type hints
- Follow PEP 8 (black formatter)
- Docstrings for all public functions
- Unit tests for new features

```bash
# Format Python code
black ai/

# Type checking
mypy ai/

# Run tests
pytest ai/tests/
```

#### Commit Messages

Use conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `perf`: Performance improvement
- `security`: Security enhancement

**Example:**
```
feat(ai): add LLM-based credential generation

- Integrate local LLM for credential prediction
- Add breach database analysis
- Include manufacturer-specific patterns

Closes #42
```

### 4. Pull Request Process

#### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass (`make test`)
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No compiler warnings
- [ ] Security implications considered
- [ ] Ethical review completed

#### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed

## Ethical Review
- [ ] No new attack vectors introduced
- [ ] Safeguards still effective
- [ ] Research value clearly demonstrated

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Security reviewed
```

### 5. Testing Requirements

**Unit Tests:**
```c
// src/bot/tests/test_scanner.c
void test_credential_validation() {
    credential_t cred = {"root", "admin", 5};
    assert(validate_credential(&cred) == true);
}
```

**Integration Tests:**
```python
# tests/integration/test_ai_bridge.py
def test_credential_generation():
    response = ai_service.generate_credentials("router")
    assert len(response.credentials) > 0
    assert response.confidence > 0.5
```

**Fuzzing:**
```bash
# Fuzz config parser
AFL_HARDEN=1 make debug
afl-fuzz -i tests/fuzz/inputs -o findings build/debug/mirai_bot
```

### 6. Documentation

**Required Documentation:**
- API documentation for new functions
- Usage examples
- Architecture Decision Records (ADRs) for significant changes
- Security considerations
- Research applications

**Example ADR:**
```markdown
# ADR-001: Use libsodium for Cryptography

## Status
Accepted

## Context
Need modern, secure encryption for C&C communication

## Decision
Use libsodium (NaCl) instead of OpenSSL

## Consequences
- Simpler API
- Modern crypto (ChaCha20-Poly1305)
- Smaller binary size
```

### 7. Security

**Reporting Vulnerabilities:**
- Email: security@example.com
- Use PGP: [key ID]
- Allow 90 days for fixes

**Security Reviews:**
All contributions undergo:
- Static analysis (CodeQL, Semgrep)
- Dependency scanning (Trivy)
- Manual code review
- Fuzzing for parsers/protocols

### 8. Research Ethics Review

**Checklist for New Features:**

1. **Dual-Use Assessment**
   - Could this be misused? How?
   - Do safeguards prevent misuse?
   - Is research value clear?

2. **Harm Reduction**
   - Does it reduce potential harm?
   - Are there emergency shutdowns?
   - Can it be easily disabled?

3. **Transparency**
   - Is functionality clearly documented?
   - Are limitations disclosed?
   - Can auditors understand it?

4. **Legal Compliance**
   - Complies with CFAA (US)?
   - Complies with Computer Misuse Act (UK)?
   - Other jurisdictions considered?

### 9. Community

**Communication:**
- GitHub Discussions for ideas
- GitHub Issues for bugs/features
- Discord: [invite link]
- Monthly research calls

**Recognition:**
Contributors are acknowledged in:
- CONTRIBUTORS.md
- Release notes
- Research publications

### 10. License

By contributing, you agree that your contributions will be licensed under the same terms as the project (Research License).

---

## Examples of Good Contributions

### Example 1: AI Feature

```python
# ai/credential_intel/manufacturer_analyzer.py
"""
Analyzes manufacturer default credential patterns.

Research Application:
- Measure security posture across manufacturers
- Track improvement over time
- Identify industry trends
"""

class ManufacturerAnalyzer:
    def analyze(self, manufacturer: str) -> SecurityReport:
        """
        Analyze manufacturer credential security.
        
        Args:
            manufacturer: Manufacturer name
            
        Returns:
            SecurityReport with metrics
        """
        # Implementation...
```

### Example 2: Security Enhancement

```c
// src/common/network_filter.c
/**
 * Implement safeguard network filtering.
 * 
 * SECURITY: Prevents scanning of unauthorized networks.
 * AUDIT: Logs all blocked attempts for review.
 */
bool network_is_allowed(uint32_t ip, const safeguards_config_t *config) {
    if (!config->enabled) {
        return true;
    }
    
    // Check against allowed networks
    for (size_t i = 0; i < config->allowed_network_count; i++) {
        if (ip_in_network(ip, config->allowed_networks[i])) {
            return true;
        }
    }
    
    // Log blocked attempt
    log_audit("network_filter", ip_to_string(ip), "blocked");
    return false;
}
```

### Example 3: Documentation

```markdown
# docs/research/credential-evolution.md

# Credential Evolution Analysis

## Objective
Track how IoT device default credentials change from 2020-2026.

## Methodology
1. Collect credentials from breach databases (2020, 2022, 2024, 2026)
2. Categorize by manufacturer and device type
3. Analyze patterns and improvements

## Results
[Research findings...]

## Ethical Considerations
- Only publicly disclosed breaches used
- No active exploitation performed
- Findings shared with manufacturers
```

---

## Questions?

- **General**: Open a GitHub Discussion
- **Bugs**: Create an Issue
- **Security**: Email security@example.com
- **Ethics**: Email ethics@example.com

Thank you for helping advance cybersecurity research responsibly!
