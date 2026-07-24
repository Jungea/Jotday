import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAllTags, searchCards, getFeedCards, getCardsByDate, getMonthMeta, getMonthMetaByTag,
  getMemoryCards, getPhotoCards,
  createCard, copyCard,
  moveCardDate, setRepresentative, unsetRepresentative, updateCard,
  deleteCard,
} from "@/lib/db/cards";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function validateDate(v: string | null): boolean {
  return v !== null && DATE_RE.test(v);
}

function parseAndValidateTags(raw: string | null): string[] {
  if (!raw) return [];
  const tags = JSON.parse(raw) as unknown[];
  if (!Array.isArray(tags) || tags.length > 20) throw new Error("태그는 최대 20개까지 허용됩니다");
  if (tags.some((t) => typeof t !== "string" || t.length > 50)) throw new Error("태그 형식이 올바르지 않습니다");
  return tags as string[];
}

function parseAndValidateImages(raw: string | null): { url: string; public_id: string }[] {
  if (!raw) return [];
  const imgs = JSON.parse(raw) as unknown[];
  if (!Array.isArray(imgs) || imgs.length > 20) throw new Error("이미지는 최대 20개까지 허용됩니다");
  return imgs as { url: string; public_id: string }[];
}

function parseAndValidateEmojis(raw: string | null): string[] {
  if (!raw) return [];
  const emojis = JSON.parse(raw) as unknown[];
  if (!Array.isArray(emojis) || emojis.some((e) => typeof e !== "string")) throw new Error("이모티콘 형식이 올바르지 않습니다");
  return emojis as string[];
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const month = searchParams.get("month");
  const feed = searchParams.get("feed");

  try {
    if (searchParams.get("alltags") === "true")
      return NextResponse.json(await getAllTags(supabase, user.id));

    if (searchParams.get("photos") === "true") {
      const page = parseInt(searchParams.get("page") ?? "0", 10);
      return NextResponse.json(await getPhotoCards(supabase, user.id, isNaN(page) ? 0 : page));
    }

    if (searchParams.get("memories") === "true") {
      const datesParam = searchParams.get("dates");
      if (!datesParam) return NextResponse.json({ error: "Missing dates" }, { status: 400 });
      const dates = datesParam.split(",").filter((d) => DATE_RE.test(d));
      if (dates.length === 0 || dates.length > 12) return NextResponse.json({ error: "잘못된 날짜 형식입니다" }, { status: 400 });
      return NextResponse.json(await getMemoryCards(supabase, user.id, dates));
    }

    if (searchParams.get("q") !== null || searchParams.get("tags") !== null) {
      const q = searchParams.get("q");
      if (q && q.length > 200) return NextResponse.json({ error: "검색어가 너무 깁니다" }, { status: 400 });
      const page = parseInt(searchParams.get("page") ?? "0", 10);
      return NextResponse.json(await searchCards(supabase, user.id, {
        q,
        tags: searchParams.get("tags"),
        page: isNaN(page) ? 0 : page,
      }));
    }

    if (feed) {
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      if (from && !validateDate(from)) return NextResponse.json({ error: "잘못된 날짜 형식입니다" }, { status: 400 });
      if (to && !validateDate(to)) return NextResponse.json({ error: "잘못된 날짜 형식입니다" }, { status: 400 });
      const page = parseInt(searchParams.get("page") ?? "0", 10);
      return NextResponse.json(await getFeedCards(supabase, user.id, {
        sort: searchParams.get("sort") === "asc" ? "asc" : "desc",
        from,
        to,
        imagesOnly: searchParams.get("imagesOnly") === "true",
        page: isNaN(page) ? 0 : page,
      }));
    }

    if (date) {
      if (!validateDate(date)) return NextResponse.json({ error: "잘못된 날짜 형식입니다" }, { status: 400 });
      return NextResponse.json(await getCardsByDate(supabase, user.id, date, searchParams.get("sort") !== "desc"));
    }

    if (month) {
      if (!MONTH_RE.test(month)) return NextResponse.json({ error: "잘못된 월 형식입니다" }, { status: 400 });
      const tag = searchParams.get("tag");
      if (tag) {
        if (tag.length > 50) return NextResponse.json({ error: "태그가 너무 깁니다" }, { status: 400 });
        return NextResponse.json(await getMonthMetaByTag(supabase, user.id, month, tag));
      }
      return NextResponse.json(await getMonthMeta(supabase, user.id, month));
    }

    return NextResponse.json({ error: "Missing query param" }, { status: 400 });
  } catch (e) {
    console.error("[GET /api/cards]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();

  try {
    const copyFrom = formData.get("copy_from") as string | null;
    if (copyFrom) {
      const copyDate = formData.get("date") as string;
      if (!validateDate(copyDate)) return NextResponse.json({ error: "잘못된 날짜 형식입니다" }, { status: 400 });
      const data = await copyCard(supabase, user.id, copyFrom, copyDate);
      if (!data) return NextResponse.json({ error: "Card not found" }, { status: 404 });
      return NextResponse.json(data, { status: 201 });
    }

    const postDate = formData.get("date") as string;
    if (!validateDate(postDate)) return NextResponse.json({ error: "잘못된 날짜 형식입니다" }, { status: 400 });

    const data = await createCard(supabase, user.id, {
      date: postDate,
      type: formData.get("type") as string,
      title: formData.get("title") as string | null,
      content: formData.get("content") as string | null,
      time: formData.get("time") as string | null,
      tags: parseAndValidateTags(formData.get("tags") as string | null),
      images: parseAndValidateImages(formData.get("images") as string | null),
      emojis: parseAndValidateEmojis(formData.get("emojis") as string | null),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("[POST /api/cards]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const id = formData.get("id") as string;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const moveToDate = formData.get("move_to_date") as string | null;
    if (moveToDate) {
      if (!validateDate(moveToDate)) return NextResponse.json({ error: "잘못된 날짜 형식입니다" }, { status: 400 });
      return NextResponse.json(await moveCardDate(supabase, user.id, id, moveToDate));
    }

    if (formData.get("unset_representative") === "true")
      return NextResponse.json(await unsetRepresentative(supabase, user.id, id));

    if (formData.get("set_representative") === "true") {
      const data = await setRepresentative(supabase, user.id, id);
      if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(data);
    }

    const tagsRaw = formData.get("tags") as string | null;
    const imagesRaw = formData.get("images") as string | null;
    const emojisRaw = formData.get("emojis") as string | null;
    if (imagesRaw) parseAndValidateImages(imagesRaw); // 검증만, 실제 파싱은 updateCard 내부에서
    const data = await updateCard(supabase, user.id, id, {
      type: formData.get("type") as string,
      title: formData.get("title") as string | null,
      content: formData.get("content") as string | null,
      time: formData.get("time") as string | null,
      tags: tagsRaw ? parseAndValidateTags(tagsRaw) : undefined,
      newImagesJson: imagesRaw,
      emojis: emojisRaw !== null ? parseAndValidateEmojis(emojisRaw) : undefined,
    });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[PATCH /api/cards]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await deleteCard(supabase, user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/cards]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
