import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/cloudinary/config";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const month = searchParams.get("month"); // YYYY-MM

  if (date) {
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (month) {
    const start = `${month}-01`;
    const [year, mon] = month.split("-").map(Number);
    const end = `${year}-${String(mon === 12 ? 1 : mon + 1).padStart(2, "0")}-01`;

    const { data, error } = await supabase
      .from("cards")
      .select("date, image_url")
      .eq("user_id", user.id)
      .gte("date", start)
      .lt("date", end);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Aggregate by date
    const metaMap = new Map<string, { count: number; preview_image: string | null }>();
    for (const row of data ?? []) {
      const existing = metaMap.get(row.date);
      if (!existing) {
        metaMap.set(row.date, { count: 1, preview_image: row.image_url });
      } else {
        existing.count++;
        if (!existing.preview_image && row.image_url) {
          existing.preview_image = row.image_url;
        }
      }
    }

    return NextResponse.json(
      Array.from(metaMap.entries()).map(([date, meta]) => ({ date, ...meta }))
    );
  }

  return NextResponse.json({ error: "Missing query param" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const date = formData.get("date") as string;
  const type = formData.get("type") as string;
  const title = formData.get("title") as string | null;
  const content = formData.get("content") as string | null;
  const imageFile = formData.get("image") as File | null;

  let image_url: string | null = null;
  let image_public_id: string | null = null;

  if (imageFile && imageFile.size > 0) {
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:${imageFile.type};base64,${base64}`;
    const uploaded = await uploadImage(dataUri, user.id);
    image_url = uploaded.url;
    image_public_id = uploaded.public_id;
  }

  const { data, error } = await supabase.from("cards").insert({
    user_id: user.id,
    date,
    type,
    title: title || null,
    content: content || null,
    image_url,
    image_public_id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const id = formData.get("id") as string;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const type = formData.get("type") as string;
  const title = formData.get("title") as string | null;
  const content = formData.get("content") as string | null;
  const imageFile = formData.get("image") as File | null;
  const removeImage = formData.get("remove_image") === "true";
  const time = formData.get("time") as string | null; // HH:mm

  const { data: existing } = await supabase
    .from("cards")
    .select("image_public_id, date, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let image_url: string | null | undefined = undefined;
  let image_public_id: string | null | undefined = undefined;

  if (imageFile && imageFile.size > 0) {
    if (existing.image_public_id) {
      const { deleteImage } = await import("@/lib/cloudinary/config");
      await deleteImage(existing.image_public_id);
    }
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:${imageFile.type};base64,${base64}`;
    const uploaded = await uploadImage(dataUri, user.id);
    image_url = uploaded.url;
    image_public_id = uploaded.public_id;
  } else if (removeImage && existing.image_public_id) {
    const { deleteImage } = await import("@/lib/cloudinary/config");
    await deleteImage(existing.image_public_id);
    image_url = null;
    image_public_id = null;
  }

  const updates: Record<string, unknown> = {
    type,
    title: title || null,
    content: content || null,
  };
  if (image_url !== undefined) updates.image_url = image_url;
  if (image_public_id !== undefined) updates.image_public_id = image_public_id;
  if (time && existing.date) {
    updates.created_at = new Date(`${existing.date}T${time}:00`).toISOString();
  }

  const { data, error } = await supabase
    .from("cards")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Get card to delete image
  const { data: card } = await supabase
    .from("cards")
    .select("image_public_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (card?.image_public_id) {
    const { deleteImage } = await import("@/lib/cloudinary/config");
    await deleteImage(card.image_public_id);
  }

  const { error } = await supabase.from("cards").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
