import { NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

function isEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

export async function POST(req: Request) {
  let body: { email?: string; source?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "JSON body required." },
      { status: 400 }
    );
  }

  if (!isEmail(body.email)) {
    return NextResponse.json(
      { error: "invalid_email", message: "Valid email required." },
      { status: 400 }
    );
  }

  const email = body.email.trim().toLowerCase();
  const source = typeof body.source === "string" ? body.source : "landing";
  const entry = {
    email,
    source,
    created_at: new Date().toISOString(),
  };

  // Best-effort local append (dev / single-node). Not production durable storage.
  try {
    const dir = path.join(process.cwd(), ".data");
    await mkdir(dir, { recursive: true });
    await appendFile(
      path.join(dir, "waitlist.jsonl"),
      `${JSON.stringify(entry)}\n`,
      "utf8"
    );
  } catch {
    // ignore FS errors on read-only hosts
  }

  const apiBase = process.env.INSTINCTGATE_API_URL?.replace(/\/$/, "");
  if (apiBase) {
    try {
      await fetch(`${apiBase}/v1/billing/waitlist`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
    } catch {
      // stub forward is best-effort
    }
  }

  return NextResponse.json({
    ok: true,
    waitlisted: true,
    email,
    stripe_live: false,
    next: "Stripe Checkout (7-day trial, card required) is not live yet. No free tier.",
  });
}
