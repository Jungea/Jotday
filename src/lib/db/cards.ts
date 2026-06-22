import { uploadImage, deleteImage } from "@/lib/cloudinary/config";
import type { Card, DayMeta } from "@/types";
import type { createClient } from "@/lib/supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

// ── GET ──────────────────────────────────────────────────────────────────────

export async function getAllTags(db: DB, userId: string): Promise<string[]> {
  const { data } = await db.from("cards").select("tags").eq("user_id", userId);
  return [...new Set((data ?? []).flatMap((c: { tags: string[] }) => c.tags ?? []))].sort();
}

export async function searchCards(db: DB, userId: string, opts: {
  q: string | null; tags: string | null; page: number;
}): Promise<{ cards: Card[]; hasMore: boolean }> {
  const limit = 20;
  let query = db
    .from("cards")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(opts.page * limit, (opts.page + 1) * limit - 1);
  if (opts.q) query = query.ilike("content", `%${opts.q}%`);
  if (opts.tags) {
    const tags = opts.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (tags.length > 0) query = query.contains("tags", tags);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const cards = data ?? [];
  return { cards, hasMore: cards.length === limit };
}

export async function getFeedCards(db: DB, userId: string, opts: {
  sort: "asc" | "desc"; from: string | null; to: string | null; imagesOnly: boolean; page: number;
}): Promise<{ cards: Card[]; hasMore: boolean }> {
  const limit = 20;
  const asc = opts.sort === "asc";
  let query = db
    .from("cards")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: asc })
    .order("created_at", { ascending: asc })
    .range(opts.page * limit, (opts.page + 1) * limit - 1);
  if (opts.from) query = query.gte("date", opts.from);
  if (opts.to) query = query.lte("date", opts.to);
  if (opts.imagesOnly) query = query.not("image_url", "is", null);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const cards = data ?? [];
  return { cards, hasMore: cards.length === limit };
}

export async function getMemoryCards(db: DB, userId: string, dates: string[]): Promise<Record<string, Card[]>> {
  const { data, error } = await db
    .from("cards")
    .select("*")
    .eq("user_id", userId)
    .in("date", dates)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const result: Record<string, Card[]> = {};
  for (const card of (data ?? []) as Card[]) {
    if (!result[card.date]) result[card.date] = [];
    result[card.date].push(card);
  }
  return result;
}

export async function getCardsByDate(db: DB, userId: string, date: string, ascending: boolean): Promise<Card[]> {
  const { data, error } = await db
    .from("cards")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending });
  if (error) throw new Error(error.message);
  return data ?? [];
}

function aggregateMonthMeta(rows: { date: string; image_url: string | null; emojis: string[] | null; is_representative: boolean }[]): DayMeta[] {
  const map = new Map<string, { count: number; preview_image: string | null; preview_emoji: string | null }>();
  for (const row of rows) {
    const firstEmoji = row.emojis?.[0] ?? null;
    const existing = map.get(row.date);
    if (!existing) {
      map.set(row.date, { count: 1, preview_image: row.image_url, preview_emoji: row.image_url ? null : firstEmoji });
    } else {
      existing.count++;
      if (row.is_representative) {
        if (row.image_url) { existing.preview_image = row.image_url; existing.preview_emoji = null; }
        else if (firstEmoji) { existing.preview_emoji = firstEmoji; }
      } else if (!existing.preview_image) {
        if (row.image_url) existing.preview_image = row.image_url;
        else if (!existing.preview_emoji && firstEmoji) existing.preview_emoji = firstEmoji;
      }
    }
  }
  return Array.from(map.entries()).map(([date, meta]) => ({ date, ...meta }));
}

export async function getMonthMeta(db: DB, userId: string, month: string): Promise<DayMeta[]> {
  const start = `${month}-01`;
  const [year, mon] = month.split("-").map(Number);
  const end = `${year}-${String(mon === 12 ? 1 : mon + 1).padStart(2, "0")}-01`;
  const { data, error } = await db
    .from("cards")
    .select("date, image_url, emojis, is_representative")
    .eq("user_id", userId)
    .gte("date", start)
    .lt("date", end)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return aggregateMonthMeta(data ?? []);
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function createCard(db: DB, userId: string, opts: {
  date: string; type: string; title: string | null; content: string | null;
  time: string | null; tags: string[]; images: { url: string; public_id: string }[];
  emojis: string[];
}): Promise<Card> {
  const insert: Record<string, unknown> = {
    user_id: userId,
    date: opts.date,
    type: opts.type,
    title: opts.title || null,
    content: opts.content || null,
    image_url: opts.images[0]?.url ?? null,
    image_public_id: opts.images[0]?.public_id ?? null,
    images: opts.images,
    emojis: opts.emojis,
    tags: opts.tags,
  };
  if (opts.time) insert.created_at = opts.time;
  const { data, error } = await db.from("cards").insert(insert).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function copyCard(db: DB, userId: string, copyFrom: string, copyDate: string): Promise<Card | null> {
  const { data: original, error: fetchErr } = await db
    .from("cards").select("*").eq("id", copyFrom).eq("user_id", userId).single();
  if (fetchErr || !original) return null;

  const srcImages: { url: string; public_id: string }[] =
    original.images?.length > 0
      ? original.images
      : original.image_url ? [{ url: original.image_url, public_id: original.image_public_id }] : [];

  const newImages: { url: string; public_id: string }[] = [];
  for (const img of srcImages) {
    try {
      const res = await fetch(img.url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const dataUri = `data:${res.headers.get("content-type") ?? "image/jpeg"};base64,${buffer.toString("base64")}`;
      newImages.push(await uploadImage(dataUri, userId));
    } catch { /* 건너뜀 */ }
  }

  const orig = new Date(original.created_at);
  orig.setSeconds(orig.getSeconds() + 1);
  const created_at = new Date(
    `${copyDate}T${String(orig.getUTCHours()).padStart(2, "0")}:${String(orig.getUTCMinutes()).padStart(2, "0")}:${String(orig.getUTCSeconds()).padStart(2, "0")}Z`
  ).toISOString();

  const { data, error } = await db.from("cards").insert({
    user_id: userId, date: copyDate, type: original.type, title: original.title,
    content: original.content, image_url: newImages[0]?.url ?? null,
    image_public_id: newImages[0]?.public_id ?? null, images: newImages,
    emojis: original.emojis ?? [],
    tags: original.tags, created_at,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ── PATCH ────────────────────────────────────────────────────────────────────

export async function moveCardDate(db: DB, userId: string, id: string, newDate: string): Promise<Card> {
  const { data: orig } = await db.from("cards").select("created_at").eq("id", id).eq("user_id", userId).single();
  const origDate = orig ? new Date(orig.created_at) : new Date();
  const created_at = new Date(
    `${newDate}T${String(origDate.getUTCHours()).padStart(2, "0")}:${String(origDate.getUTCMinutes()).padStart(2, "0")}:${String(origDate.getUTCSeconds()).padStart(2, "0")}Z`
  ).toISOString();
  const { data, error } = await db.from("cards")
    .update({ date: newDate, created_at }).eq("id", id).eq("user_id", userId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function unsetRepresentative(db: DB, userId: string, id: string): Promise<Card> {
  const { data, error } = await db.from("cards")
    .update({ is_representative: false }).eq("id", id).eq("user_id", userId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setRepresentative(db: DB, userId: string, id: string): Promise<Card | null> {
  const { data: card } = await db.from("cards").select("date").eq("id", id).eq("user_id", userId).single();
  if (!card) return null;
  await db.from("cards").update({ is_representative: false }).eq("user_id", userId).eq("date", card.date);
  const { data, error } = await db.from("cards")
    .update({ is_representative: true }).eq("id", id).eq("user_id", userId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCard(db: DB, userId: string, id: string, opts: {
  type: string; title: string | null; content: string | null;
  time: string | null; tags: string[] | undefined; newImagesJson: string | null;
  emojis: string[] | undefined;
}): Promise<Card | null> {
  const { data: existing } = await db.from("cards")
    .select("image_public_id, images, date, created_at").eq("id", id).eq("user_id", userId).single();
  if (!existing) return null;

  let newImages: { url: string; public_id: string }[] | undefined;
  if (opts.newImagesJson !== null) {
    const newImageList: { url: string; public_id: string }[] = JSON.parse(opts.newImagesJson);
    const storedImages: { url: string; public_id: string }[] = existing.images ?? [];
    if (storedImages.length === 0 && existing.image_public_id) {
      storedImages.push({ url: "", public_id: existing.image_public_id });
    }
    const newPublicIds = new Set(newImageList.map((img) => img.public_id));
    for (const img of storedImages) {
      if (!newPublicIds.has(img.public_id)) await deleteImage(img.public_id);
    }
    newImages = newImageList;
  }

  const updates: Record<string, unknown> = {
    type: opts.type,
    title: opts.title || null,
    content: opts.content || null,
    ...(opts.tags !== undefined && { tags: opts.tags }),
    ...(opts.emojis !== undefined && { emojis: opts.emojis }),
    ...(newImages !== undefined && {
      images: newImages,
      image_url: newImages[0]?.url ?? null,
      image_public_id: newImages[0]?.public_id ?? null,
    }),
    ...(opts.time && { created_at: opts.time }),
  };

  const { data, error } = await db.from("cards")
    .update(updates).eq("id", id).eq("user_id", userId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteCard(db: DB, userId: string, id: string): Promise<void> {
  const { data: card } = await db.from("cards")
    .select("image_public_id, images").eq("id", id).eq("user_id", userId).single();
  if (card) {
    const imgs: { url: string; public_id: string }[] = card.images ?? [];
    for (const img of imgs) await deleteImage(img.public_id);
    if (card.image_public_id && imgs.length === 0) await deleteImage(card.image_public_id);
  }
  const { error } = await db.from("cards").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
}
