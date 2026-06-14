import { format } from "date-fns";
import type { Card } from "@/types";

function cardFilename(card: Card, index?: number) {
  const time = format(new Date(), "HHmmss");
  const base = `jotday-${card.date}-${time}`;
  return index !== undefined ? `${base}-${index + 1}.jpg` : `${base}.jpg`;
}

async function downloadImageUrl(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

function getImages(card: Card): { url: string }[] {
  if (card.images?.length > 0) return card.images;
  if (card.image_url) return [{ url: card.image_url }];
  return [];
}

export async function downloadCard(card: Card) {
  const images = getImages(card);
  if (!images.length) return;
  await downloadImageUrl(images[0].url, cardFilename(card));
}

export async function downloadAllCards(card: Card) {
  const images = getImages(card);
  for (let i = 0; i < images.length; i++) {
    await downloadImageUrl(images[i].url, cardFilename(card, i));
    if (i < images.length - 1) await new Promise((r) => setTimeout(r, 300));
  }
}
