import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
  const { card_id, date, expires_in_days } = body as { card_id?: string; date?: string; expires_in_days?: number | null };

  const token = crypto.randomUUID().replace(/-/g, "");
  const expires_at = expires_in_days != null
    ? (() => {
        const d = new Date(Date.now() + expires_in_days * 86400 * 1000);
        d.setHours(23, 59, 59, 999);
        return d.toISOString();
      })()
    : null;

  const { error } = await supabase.from("share_tokens").insert({
    user_id: user.id,
    token,
    card_id: card_id ?? null,
    date: date ?? null,
    expires_at,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ token, expires_at });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  // 토큰 없으면 내 링크 목록 반환 (인증 필요)
  if (!token) {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("share_tokens")
      .select("id, token, card_id, date, expires_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  const admin = createAdminClient();

  const { data: tokenRow, error: tokenError } = await admin
    .from("share_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (tokenError || !tokenRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 404 });
  }

  if (tokenRow.card_id) {
    const { data: card, error: cardError } = await admin
      .from("cards")
      .select("*")
      .eq("id", tokenRow.card_id)
      .single();

    if (cardError || !card) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ type: "card", card, expires_at: tokenRow.expires_at });
  }

  if (tokenRow.date) {
    const { data: cards, error: cardsError } = await admin
      .from("cards")
      .select("*")
      .eq("user_id", tokenRow.user_id)
      .eq("date", tokenRow.date)
      .order("created_at", { ascending: true });

    if (cardsError) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ type: "date", date: tokenRow.date, cards: cards ?? [], expires_at: tokenRow.expires_at });
  }

  return NextResponse.json({ error: "Invalid token" }, { status: 404 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("share_tokens")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
