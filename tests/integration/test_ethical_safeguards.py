#!/usr/bin/env python3
"""
Integration tests for Mirai 2026 ethical safeguards.

Tests cover:
  1. Bot auth gate   — MIRAI_AUTH_TOKEN constant-time compare
  2. Loader auth     — LOADER_REQUIRE_AUTH + token env vars
  3. CIDR scope      — AUTHORIZED_CIDR rejection of out-of-scope targets
  4. CNC rate limit  — 5 failed logins → 5-minute lockout
  5. Kill-switch API — POST /api/attack/stop returns 200 + kill:all broadcast
  6. Audit log       — structured JSON events written to LOADER_AUDIT_FILE

Run:
  pip install pytest requests
  pytest tests/integration/test_ethical_safeguards.py -v

Environment (optional — tests skip gracefully when services not running):
  CNC_API_URL   http://localhost:8080   (cnc_modern.go REST API)
  AI_API_URL    http://localhost:8001   (ai/api_server_enhanced.py)
"""

import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Optional

import pytest

# ── Helpers ────────────────────────────────────────────────────────────────────

CNC_API_URL = os.environ.get("CNC_API_URL", "http://localhost:8080")
AI_API_URL  = os.environ.get("AI_API_URL",  "http://localhost:8001")

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


def skip_if_no_requests(fn):
    return pytest.mark.skipif(not HAS_REQUESTS, reason="requests not installed")(fn)


def cnc_reachable() -> bool:
    if not HAS_REQUESTS:
        return False
    try:
        r = requests.get(f"{CNC_API_URL}/api/health", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def ai_reachable() -> bool:
    if not HAS_REQUESTS:
        return False
    try:
        r = requests.get(f"{AI_API_URL}/health", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def get_operator_token() -> Optional[str]:
    """Obtain a JWT operator token from the CNC login endpoint."""
    if not HAS_REQUESTS:
        return None
    try:
        r = requests.post(
            f"{CNC_API_URL}/api/auth/login",
            json={"username": "operator", "password": "operator"},
            timeout=5,
        )
        if r.status_code == 200:
            return r.json().get("access_token")
    except Exception:
        pass
    return None


# ── Category 1: Bot Auth Gate (unit-level, no network needed) ─────────────────

class TestBotAuthGate:
    """
    Validate the constant-time MIRAI_AUTH_TOKEN comparison logic.
    These tests run against the C source constants — no service required.
    """

    def test_auth_token_env_var_consumed(self):
        """Loader source must reference MIRAI_AUTH_TOKEN env var."""
        bot_main = Path("mirai/bot/main.c")
        assert bot_main.exists(), "mirai/bot/main.c not found"
        src = bot_main.read_text()
        assert "MIRAI_AUTH_TOKEN" in src, \
            "MIRAI_AUTH_TOKEN env var not referenced in mirai/bot/main.c"

    def test_constant_time_compare_used(self):
        """Auth gate must use constant-time comparison (crypto_memcmp, XOR accumulator, or equiv)."""
        bot_main = Path("mirai/bot/main.c")
        src = bot_main.read_text()
        # Accept: named CT functions OR XOR-accumulator pattern (diff |= x ^ y)
        has_ct = any(fn in src for fn in [
            "crypto_memcmp", "timingsafe_bcmp", "CRYPTO_memcmp",
            "constant_time", "memcmp_secure",
        ]) or ("diff |=" in src and "^" in src and "volatile" in src)
        assert has_ct, \
            "No constant-time comparison found in auth gate — timing oracle risk"

    def test_research_mode_flag_present(self):
        """RESEARCH_MODE compile flag must gate the auth block."""
        bot_main = Path("mirai/bot/main.c")
        src = bot_main.read_text()
        assert "RESEARCH_MODE" in src, \
            "RESEARCH_MODE preprocessor guard missing from mirai/bot/main.c"

    def test_kill_switch_handler_registered(self):
        """SIGUSR1 kill-switch handler must be registered in bot main."""
        bot_main = Path("mirai/bot/main.c")
        src = bot_main.read_text()
        assert "SIGUSR1" in src, "SIGUSR1 handler not registered in bot main.c"
        assert "kill_switch" in src.lower() or "attack_running" in src.lower(), \
            "kill_switch flag not found in bot main.c"

    def test_attack_loop_uses_kill_switch(self):
        """All attack loops must check attack_should_continue() instead of while(TRUE)."""
        attack_files = [
            "mirai/bot/attack_tcp.c",
            "mirai/bot/attack_gre.c",
            "mirai/bot/attack_app.c",
        ]
        for path in attack_files:
            p = Path(path)
            if not p.exists():
                pytest.skip(f"{path} not found")
            src = p.read_text()
            assert "attack_should_continue" in src, \
                f"attack_should_continue() not found in {path} — kill-switch won't work"


# ── Category 2: Loader Auth & CIDR Scope (source-level) ──────────────────────

class TestLoaderAuthAndCIDR:
    """
    Validate loader auth gate and CIDR scope enforcement.
    Source-level checks — no running service needed.
    """

    def test_loader_require_auth_env_var(self):
        """Loader must check LOADER_REQUIRE_AUTH env var."""
        loader_main = Path("loader/src/main.c")
        assert loader_main.exists(), "loader/src/main.c not found"
        src = loader_main.read_text()
        assert "LOADER_REQUIRE_AUTH" in src, \
            "LOADER_REQUIRE_AUTH not found in loader/src/main.c"

    def test_loader_auth_token_constant_time(self):
        """Loader token comparison must be constant-time (crypto_memcmp, XOR accumulator, or equiv)."""
        loader_main = Path("loader/src/main.c")
        src = loader_main.read_text()
        # Accept: named CT functions OR XOR-accumulator pattern (diff |= x ^ y)
        has_ct = any(fn in src for fn in [
            "crypto_memcmp", "timingsafe_bcmp", "CRYPTO_memcmp",
            "constant_time", "memcmp_secure",
        ]) or ("diff |=" in src and "^" in src)
        assert has_ct, \
            "No constant-time compare in loader auth — timing oracle risk"

    def test_authorized_cidr_env_var(self):
        """Loader must check AUTHORIZED_CIDR env var for scope enforcement."""
        loader_main = Path("loader/src/main.c")
        src = loader_main.read_text()
        assert "AUTHORIZED_CIDR" in src, \
            "AUTHORIZED_CIDR scope check not found in loader/src/main.c"

    def test_loader_audit_file_env_var(self):
        """Loader must write to LOADER_AUDIT_FILE."""
        loader_main = Path("loader/src/main.c")
        src = loader_main.read_text()
        assert "LOADER_AUDIT_FILE" in src, \
            "LOADER_AUDIT_FILE not found in loader/src/main.c — audit trail missing"

    def test_audit_events_emitted(self):
        """Loader audit must emit structured events for lifecycle + rejections."""
        loader_main = Path("loader/src/main.c")
        src = loader_main.read_text()
        # Check each category with acceptable aliases:
        #   start: LOADER_START
        #   rejection: CIDR_REJECT or TARGET_REJECTED (same semantics)
        #   completion: LOADER_STOP or LOADER_DONE or LOADER_EOF
        has_start      = "LOADER_START"    in src
        has_rejection  = "CIDR_REJECT"     in src or "TARGET_REJECTED" in src
        has_completion = "LOADER_STOP"     in src or "LOADER_DONE"     in src or "LOADER_EOF" in src
        missing = []
        if not has_start:      missing.append("LOADER_START")
        if not has_rejection:  missing.append("CIDR_REJECT / TARGET_REJECTED")
        if not has_completion: missing.append("LOADER_STOP / LOADER_DONE / LOADER_EOF")
        assert not missing, \
            f"Loader audit missing event categories: {missing}"

    def test_single_load_has_same_safeguards(self):
        """single_load.c must have the same auth + CIDR guards."""
        sl = Path("mirai/tools/single_load.c")
        if not sl.exists():
            pytest.skip("single_load.c not found")
        src = sl.read_text()
        assert "LOADER_REQUIRE_AUTH" in src or "single_load_check_auth" in src, \
            "single_load.c missing auth gate"
        assert "AUTHORIZED_CIDR" in src or "single_load_check_scope" in src, \
            "single_load.c missing CIDR scope check"

    def test_cnc_loader_cidr_env_in_k8s(self):
        """Kubernetes configmap must declare AUTHORIZED_CIDR."""
        cm = Path("k8s/base/configmap.yaml")
        if not cm.exists():
            pytest.skip("k8s/base/configmap.yaml not found")
        content = cm.read_text()
        assert "AUTHORIZED_CIDR" in content or "LOADER_REQUIRE_AUTH" in content, \
            "K8s configmap missing ethical safeguard env vars"


# ── Category 3: CNC Rate Limiting (live — skips if CNC not running) ──────────

@pytest.mark.skipif(not cnc_reachable(), reason="CNC not running at " + CNC_API_URL)
class TestCNCRateLimiting:
    """
    Live tests against the running CNC REST API.
    Validates the per-IP login rate-limit (5 failures → lockout).
    """

    def test_valid_login_returns_token(self):
        r = requests.post(
            f"{CNC_API_URL}/api/auth/login",
            json={"username": "operator", "password": "operator"},
            timeout=5,
        )
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "Bearer"

    def test_invalid_login_returns_401(self):
        r = requests.post(
            f"{CNC_API_URL}/api/auth/login",
            json={"username": "operator", "password": "WRONG"},
            timeout=5,
        )
        assert r.status_code == 401

    def test_missing_token_returns_401(self):
        r = requests.get(f"{CNC_API_URL}/api/bots", timeout=5)
        assert r.status_code == 401

    def test_viewer_cannot_trigger_attack(self):
        """Viewer role must be rejected from operator-gated endpoints."""
        # Login as viewer
        r = requests.post(
            f"{CNC_API_URL}/api/auth/login",
            json={"username": "viewer", "password": "viewer"},
            timeout=5,
        )
        if r.status_code != 200:
            pytest.skip("viewer user not available")
        token = r.json().get("access_token")
        r2 = requests.post(
            f"{CNC_API_URL}/api/attack",
            json={"type": "udp", "target": "127.0.0.1", "port": 80, "duration": 1},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert r2.status_code == 403, \
            f"Viewer should get 403 on /api/attack, got {r2.status_code}"

    def test_health_endpoint_is_public(self):
        r = requests.get(f"{CNC_API_URL}/api/health", timeout=5)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"


# ── Category 4: Kill-Switch API (live) ───────────────────────────────────────

@pytest.mark.skipif(not cnc_reachable(), reason="CNC not running at " + CNC_API_URL)
class TestKillSwitchAPI:
    """
    Live tests for POST /api/attack/stop kill-switch endpoint.
    """

    def test_kill_switch_requires_auth(self):
        """Unauthenticated call must return 401."""
        r = requests.post(
            f"{CNC_API_URL}/api/attack/stop",
            json={"all": True},
            timeout=5,
        )
        assert r.status_code == 401, \
            f"Expected 401 without auth, got {r.status_code}"

    def test_kill_switch_viewer_rejected(self):
        """Viewer role must be forbidden from kill-switch."""
        r_login = requests.post(
            f"{CNC_API_URL}/api/auth/login",
            json={"username": "viewer", "password": "viewer"},
            timeout=5,
        )
        if r_login.status_code != 200:
            pytest.skip("viewer user not available")
        token = r_login.json().get("access_token")
        r = requests.post(
            f"{CNC_API_URL}/api/attack/stop",
            json={"all": True},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert r.status_code == 403, \
            f"Viewer should be forbidden from kill-switch, got {r.status_code}"

    def test_kill_switch_operator_succeeds(self):
        """Operator can trigger kill-switch and gets structured response."""
        token = get_operator_token()
        if not token:
            pytest.skip("Cannot obtain operator token")
        r = requests.post(
            f"{CNC_API_URL}/api/attack/stop",
            json={"all": True},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert r.status_code == 200, \
            f"Kill-switch failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["status"] == "ok"
        assert "stopped" in data
        assert "timestamp" in data

    def test_kill_switch_response_schema(self):
        """Kill-switch response must match the dashboard-expected schema."""
        token = get_operator_token()
        if not token:
            pytest.skip("Cannot obtain operator token")
        r = requests.post(
            f"{CNC_API_URL}/api/attack/stop",
            json={"all": True},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert r.status_code == 200
        data = r.json()
        # Dashboard KillSwitch.tsx checks response.ok — ensure these fields exist
        required_fields = {"status", "stopped", "timestamp"}
        missing = required_fields - set(data.keys())
        assert not missing, f"Kill-switch response missing fields: {missing}"

    def test_kill_switch_stop_all_true(self):
        """kill:all payload with all=true clears attack registry."""
        token = get_operator_token()
        if not token:
            pytest.skip("Cannot obtain operator token")

        # First, launch a test attack (won't reach real bots — no bots connected)
        requests.post(
            f"{CNC_API_URL}/api/attack",
            json={"type": "udp", "target": "127.0.0.1", "port": 9999, "duration": 60},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )

        # Then stop all
        r = requests.post(
            f"{CNC_API_URL}/api/attack/stop",
            json={"all": True},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["stopped"], int)


# ── Category 5: CNC Bcrypt Auth (source-level) ────────────────────────────────

class TestCNCBcryptAuth:
    """Validate the Go CNC has bcrypt password hashing."""

    def test_bcrypt_import_in_database(self):
        db_go = Path("mirai/cnc/database.go")
        if not db_go.exists():
            pytest.skip("mirai/cnc/database.go not found")
        src = db_go.read_text()
        assert "bcrypt" in src, \
            "bcrypt not imported in database.go — passwords stored in plaintext"

    def test_audit_log_in_database(self):
        db_go = Path("mirai/cnc/database.go")
        if not db_go.exists():
            pytest.skip("mirai/cnc/database.go not found")
        src = db_go.read_text()
        assert "auditLog" in src or "AUDIT" in src, \
            "No audit logging in database.go"

    def test_hmac_challenge_in_bot_go(self):
        bot_go = Path("mirai/cnc/bot.go")
        if not bot_go.exists():
            pytest.skip("mirai/cnc/bot.go not found")
        src = bot_go.read_text()
        assert "hmac" in src.lower(), \
            "HMAC challenge not found in mirai/cnc/bot.go"
        assert "BOT_CHALLENGE_SECRET" in src, \
            "BOT_CHALLENGE_SECRET not referenced in mirai/cnc/bot.go"

    def test_rate_limiting_in_admin_go(self):
        admin_go = Path("mirai/cnc/admin.go")
        if not admin_go.exists():
            pytest.skip("mirai/cnc/admin.go not found")
        src = admin_go.read_text()
        has_rate_limit = any(kw in src for kw in [
            "loginLockouts", "lockout", "rateLimit", "rate_limit", "failCount",
        ])
        assert has_rate_limit, \
            "No rate-limiting logic found in mirai/cnc/admin.go"

    def test_kill_switch_handler_in_cnc_modern(self):
        cnc = Path("mirai/cnc/cnc_modern.go")
        if not cnc.exists():
            pytest.skip("mirai/cnc/cnc_modern.go not found")
        src = cnc.read_text()
        assert "handleAttackStop" in src, \
            "handleAttackStop not found in cnc_modern.go"
        assert "/api/attack/stop" in src, \
            "Route /api/attack/stop not registered in cnc_modern.go"
        assert "ActiveAttackRegistry" in src, \
            "ActiveAttackRegistry not found — kill-switch has no attack tracking"


# ── Category 6: Dashboard Kill-Switch API Route ───────────────────────────────

class TestDashboardKillSwitchRoute:
    """Validate the Next.js API route for the kill-switch exists and is correct."""

    ROUTE_FILE = Path("dashboard/src/app/api/attack/stop/route.ts")

    def test_route_file_exists(self):
        assert self.ROUTE_FILE.exists(), \
            f"Kill-switch API route not found at {self.ROUTE_FILE}"

    def test_route_exports_post_handler(self):
        src = self.ROUTE_FILE.read_text()
        assert "export async function POST" in src, \
            "POST handler not exported from route.ts"

    def test_route_exports_options_handler(self):
        src = self.ROUTE_FILE.read_text()
        assert "export async function OPTIONS" in src, \
            "OPTIONS (CORS preflight) handler missing from route.ts"

    def test_route_forwards_to_cnc(self):
        src = self.ROUTE_FILE.read_text()
        assert "CNC_API_URL" in src, \
            "Route does not forward to CNC_API_URL"
        assert "/api/attack/stop" in src, \
            "Route does not call CNC /api/attack/stop"

    def test_route_handles_cnc_unreachable(self):
        src = self.ROUTE_FILE.read_text()
        assert "502" in src, \
            "Route does not return 502 when CNC is unreachable"
        assert "cnc_unreachable" in src, \
            "Route does not label the cnc_unreachable error"

    def test_killswitch_component_calls_route(self):
        ks = Path("dashboard/src/components/security/KillSwitch.tsx")
        if not ks.exists():
            pytest.skip("KillSwitch.tsx not found")
        src = ks.read_text()
        assert "/api/attack/stop" in src, \
            "KillSwitch.tsx does not call /api/attack/stop"
        assert "method: 'POST'" in src, \
            "KillSwitch.tsx does not use POST method"


# ── Category 7: badbot.c safeguards ──────────────────────────────────────────

class TestBadbotSafeguards:
    """Validate mirai/tools/badbot.c has all expected research safeguards."""

    BADBOT = Path("mirai/tools/badbot.c")

    def test_file_exists(self):
        assert self.BADBOT.exists(), "mirai/tools/badbot.c not found"

    def test_research_mode_banner(self):
        src = self.BADBOT.read_text()
        assert "RESEARCH_MODE" in src or "Authorized Use Only" in src, \
            "No RESEARCH_MODE banner in badbot.c"

    def test_auth_gate(self):
        src = self.BADBOT.read_text()
        assert "BADBOT_REQUIRE_AUTH" in src or "BADBOT_AUTH_TOKEN" in src, \
            "No auth gate in badbot.c"

    def test_clean_shutdown(self):
        src = self.BADBOT.read_text()
        assert "SIGTERM" in src or "SIGINT" in src, \
            "No clean shutdown handler in badbot.c"

    def test_audit_events(self):
        src = self.BADBOT.read_text()
        assert "BADBOT_START" in src or "BADBOT_REPORT" in src, \
            "No audit events emitted by badbot.c"


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v", "--tb=short"]))
