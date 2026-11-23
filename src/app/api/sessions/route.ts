import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";

interface ScoreSet {
  problemSolving: number;
  coding: number;
  communication: number;
  complexity: number;
}

function overallOf(rec: { scores?: Partial<ScoreSet> }): number | null {
  const s = rec.scores;
  if (!s) return null;
  const vals = [s.problemSolving, s.coding, s.communication, s.complexity];
  if (vals.some((v) => typeof v !== "number")) return null;
  const avg = (vals as number[]).reduce((a, b) => a + b, 0) / 4;
  return Math.round(avg * 10) / 10;
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Signed out" }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json([]);
  const { data, error } = await db
    .from("sessions")
    .select("data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Could not load sessions" }, { status: 500 });
  return NextResponse.json((data ?? []).map((row) => row.data));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Signed out" }, { status: 401 });
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }
  const rec = body as { id?: unknown; date?: unknown; scores?: Partial<ScoreSet> };
  if (typeof rec.id !== "string" || !rec.id) {
    return NextResponse.json({ error: "Session id is required" }, { status: 400 });
  }
  const db = getDb();
  if (!db) return NextResponse.json({ ok: true, stored: false });

  const { data: existing } = await db.from("sessions").select("user_id").eq("id", rec.id).maybeSingle();
  if (existing && existing.user_id !== userId) {
    return NextResponse.json({ error: "Session belongs to another user" }, { status: 403 });
  }

  const parsedDate = typeof rec.date === "string" ? new Date(rec.date) : new Date(NaN);
  const createdAt = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

  const { error } = await db.from("sessions").upsert(
    {
      id: rec.id,
      user_id: userId,
      user_email: session.user?.email ?? null,
      data: body,
      overall: overallOf(rec),
      created_at: createdAt,
    },
    { onConflict: "id" }
  );
  if (error) return NextResponse.json({ error: "Could not save session" }, { status: 500 });
  return NextResponse.json({ ok: true, stored: true });
}
