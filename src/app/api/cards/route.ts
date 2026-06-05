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
  const feed = searchParams.get("feed");

  const q = searchParams.get("q");
  const tagsParam = searchParams.get("tags");

  if (q !== null || tagsParam !== null) {
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const limit = 20;

    let query = supabase
      .from("cards")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (q) query = query.ilike("content", `%${q}%`);
    if (tagsParam) {
      const tags = tagsParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (tags.length > 0) query = query.contains("tags", tags);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ cards: data ?? [], hasMore: (data ?? []).length === limit });
  }

  if (feed) {
    const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const limit = 20;

    let query = supabase
      .from("cards")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: sort === "asc" })
      .order("created_at", { ascending: sort === "asc" })
      .range(page * limit, (page + 1) * limit - 1);

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      cards: data ?? [],
      hasMore: (data ?? []).length === limit,
    });
  }

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
      .select("date, image_url, is_representative")
      .eq("user_id", user.id)
      .gte("date", start)
      .lt("date", end)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Aggregate by date — representative card's image takes priority
    const metaMap = new Map<string, { count: number; preview_image: string | null }>();
    for (const row of data ?? []) {
      const existing = metaMap.get(row.date);
      if (!existing) {
        metaMap.set(row.date, { count: 1, preview_image: row.image_url });
      } else {
        existing.count++;
        if (row.is_representative && row.image_url) {
          existing.preview_image = row.image_url;
        } else if (!existing.preview_image && row.image_url) {
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
  const time = formData.get("time") as string | null;
  const tagsRaw = formData.get("tags") as string | null;
  const tags = tagsRaw ? JSON.parse(tagsRaw) : [];
  const imageFiles = formData.getAll("image") as File[];

  const uploadedImages: { url: string; public_id: string }[] = [];
  for (const file of imageFiles) {
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUri = `data:${file.type};base64,${base64}`;
      const uploaded = await uploadImage(dataUri, user.id);
      uploadedImages.push({ url: uploaded.url, public_id: uploaded.public_id });
    }
  }

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    date,
    type,
    title: title || null,
    content: content || null,
    image_url: uploadedImages[0]?.url ?? null,
    image_public_id: uploadedImages[0]?.public_id ?? null,
    images: uploadedImages,
    tags,
  };
  if (time) insertData.created_at = new Date(`${date}T${time}:00`).toISOString();

  const { data, error } = await supabase.from("cards").insert(insertData).select().single();

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

  // 대표 카드 설정 (별도 처리)
  if (formData.get("set_representative") === "true") {
    const { data: card } = await supabase
      .from("cards")
      .select("date")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await supabase
      .from("cards")
      .update({ is_representative: false })
      .eq("user_id", user.id)
      .eq("date", card.date);

    const { data, error } = await supabase
      .from("cards")
      .update({ is_representative: true })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const type = formData.get("type") as string;
  const title = formData.get("title") as string | null;
  const content = formData.get("content") as string | null;
  const time = formData.get("time") as string | null;
  const tagsRaw2 = formData.get("tags") as string | null;
  const patchTags = tagsRaw2 ? JSON.parse(tagsRaw2) : undefined;
  const updateImages = formData.get("update_images") === "true";
  const keepIds = formData.getAll("keep_id") as string[];
  const newFiles = (formData.getAll("image") as File[]).filter((f) => f && f.size > 0);

  const { data: existing } = await supabase
    .from("cards")
    .select("image_public_id, images, date, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let newImages: { url: string; public_id: string }[] | undefined = undefined;

  if (updateImages) {
    const { deleteImage } = await import("@/lib/cloudinary/config");
    const storedImages: { url: string; public_id: string }[] = existing.images ?? [];

    // Legacy single-image cards: add to storedImages if images array is empty
    if (storedImages.length === 0 && existing.image_public_id) {
      storedImages.push({ url: "", public_id: existing.image_public_id });
    }

    // Delete images not in keepIds
    for (const img of storedImages) {
      if (!keepIds.includes(img.public_id)) await deleteImage(img.public_id);
    }

    // Keep existing images in slot order
    const kept = keepIds
      .map((id) => storedImages.find((img) => img.public_id === id))
      .filter((img): img is { url: string; public_id: string } => !!img);

    // Upload new files
    const uploaded: { url: string; public_id: string }[] = [];
    for (const file of newFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUri = `data:${file.type};base64,${base64}`;
      const result = await uploadImage(dataUri, user.id);
      uploaded.push({ url: result.url, public_id: result.public_id });
    }

    newImages = [...kept, ...uploaded];
  }

  const updates: Record<string, unknown> = {
    type,
    title: title || null,
    content: content || null,
    ...(patchTags !== undefined && { tags: patchTags }),
  };
  if (newImages !== undefined) {
    updates.images = newImages;
    updates.image_url = newImages[0]?.url ?? null;
    updates.image_public_id = newImages[0]?.public_id ?? null;
  }
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
    .select("image_public_id, images")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (card) {
    const { deleteImage } = await import("@/lib/cloudinary/config");
    const imgs: { url: string; public_id: string }[] = card.images ?? [];
    for (const img of imgs) await deleteImage(img.public_id);
    if (card.image_public_id && imgs.length === 0) await deleteImage(card.image_public_id);
  }

  const { error } = await supabase.from("cards").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
