import type { Metadata } from "next";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import ShareClient from "./ShareClient";

type Props = { params: Promise<{ token: string }> };

async function fetchShareData(token: string) {
  const admin = createAdminClient();

  const { data: tokenRow } = await admin
    .from("share_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (!tokenRow) return null;
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) return null;

  if (tokenRow.card_id) {
    const { data: card } = await admin.from("cards").select("*").eq("id", tokenRow.card_id).single();
    if (!card) return null;
    return { type: "card" as const, card, expires_at: tokenRow.expires_at };
  }

  if (tokenRow.date) {
    const { data: cards } = await admin
      .from("cards")
      .select("*")
      .eq("user_id", tokenRow.user_id)
      .eq("date", tokenRow.date)
      .order("created_at", { ascending: true });
    return { type: "date" as const, date: tokenRow.date, cards: cards ?? [], expires_at: tokenRow.expires_at };
  }

  return null;
}

function getImageUrl(data: Awaited<ReturnType<typeof fetchShareData>>): string | null {
  if (!data) return null;
  if (data.type === "card") {
    const { card } = data;
    return card.images?.[0]?.url ?? card.image_url ?? null;
  }
  const repCard = data.cards.find((c) => c.is_representative) ?? data.cards[0];
  if (!repCard) return null;
  return repCard.images?.[0]?.url ?? repCard.image_url ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await fetchShareData(token);

  if (!data) {
    return { title: "Jotday", description: "링크가 만료되었거나 존재하지 않습니다." };
  }

  const dateLabel =
    data.type === "date"
      ? format(parseISO(data.date), "yyyy년 M월 d일 (E)", { locale: ko })
      : format(parseISO(data.card.date), "yyyy년 M월 d일 (E)", { locale: ko });

  const title =
    data.type === "card"
      ? dateLabel
      : `${dateLabel} — ${data.cards.length}개의 기록`;

  const description =
    data.type === "card"
      ? (data.card.content?.slice(0, 120) || null)
      : data.cards
          .map((c) => c.content)
          .filter(Boolean)
          .join(" · ")
          .slice(0, 120) || null;

  const imageUrl = getImageUrl(data);

  return {
    title: `${title} | Jotday`,
    ...(description && { description }),
    openGraph: {
      title: `${title} | Jotday`,
      ...(description && { description }),
      type: "website",
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: `${title} | Jotday`,
      ...(description && { description }),
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default function SharePage() {
  return <ShareClient />;
}
