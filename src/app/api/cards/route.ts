import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAllTags, searchCards, getFeedCards, getCardsByDate, getMonthMeta,
  createCard, copyCard,
  moveCardDate, setRepresentative, unsetRepresentative, updateCard,
  deleteCard,
} from "@/lib/db/cards";

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

    if (searchParams.get("q") !== null || searchParams.get("tags") !== null)
      return NextResponse.json(await searchCards(supabase, user.id, {
        q: searchParams.get("q"),
        tags: searchParams.get("tags"),
        page: parseInt(searchParams.get("page") ?? "0", 10),
      }));

    if (feed)
      return NextResponse.json(await getFeedCards(supabase, user.id, {
        sort: searchParams.get("sort") === "asc" ? "asc" : "desc",
        from: searchParams.get("from"),
        to: searchParams.get("to"),
        imagesOnly: searchParams.get("imagesOnly") === "true",
        page: parseInt(searchParams.get("page") ?? "0", 10),
      }));

    if (date)
      return NextResponse.json(await getCardsByDate(supabase, user.id, date, searchParams.get("sort") !== "desc"));

    if (month)
      return NextResponse.json(await getMonthMeta(supabase, user.id, month));

    return NextResponse.json({ error: "Missing query param" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();

  try {
    const copyFrom = formData.get("copy_from") as string | null;
    if (copyFrom) {
      const data = await copyCard(supabase, user.id, copyFrom, formData.get("date") as string);
      if (!data) return NextResponse.json({ error: "Card not found" }, { status: 404 });
      return NextResponse.json(data, { status: 201 });
    }

    const tagsRaw = formData.get("tags") as string | null;
    const imagesRaw = formData.get("images") as string | null;
    const data = await createCard(supabase, user.id, {
      date: formData.get("date") as string,
      type: formData.get("type") as string,
      title: formData.get("title") as string | null,
      content: formData.get("content") as string | null,
      time: formData.get("time") as string | null,
      tags: tagsRaw ? JSON.parse(tagsRaw) : [],
      images: imagesRaw ? JSON.parse(imagesRaw) : [],
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
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
    if (moveToDate)
      return NextResponse.json(await moveCardDate(supabase, user.id, id, moveToDate));

    if (formData.get("unset_representative") === "true")
      return NextResponse.json(await unsetRepresentative(supabase, user.id, id));

    if (formData.get("set_representative") === "true") {
      const data = await setRepresentative(supabase, user.id, id);
      if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(data);
    }

    const tagsRaw = formData.get("tags") as string | null;
    const data = await updateCard(supabase, user.id, id, {
      type: formData.get("type") as string,
      title: formData.get("title") as string | null,
      content: formData.get("content") as string | null,
      time: formData.get("time") as string | null,
      tags: tagsRaw ? JSON.parse(tagsRaw) : undefined,
      newImagesJson: formData.get("images") as string | null,
    });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
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
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
