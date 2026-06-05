import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("user_settings")
    .select("theme, card_actions, feed_presets, share_settings")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json(data ?? {});
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, unknown> = { user_id: user.id };

  if (body.theme !== undefined) updates.theme = body.theme;
  if (body.card_actions !== undefined) updates.card_actions = body.card_actions;
  if (body.feed_presets !== undefined) updates.feed_presets = body.feed_presets;
  if (body.share_settings !== undefined) updates.share_settings = body.share_settings;

  await supabase.from("user_settings").upsert(updates, { onConflict: "user_id" });

  return NextResponse.json({ ok: true });
}
