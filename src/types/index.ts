export type CardType = "image" | "text" | "mixed";
export type Theme = "light" | "dark";

export interface Card {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: CardType;
  title: string | null;
  content: string | null;
  image_url: string | null;
  image_public_id: string | null;
  images: { url: string; public_id: string }[];
  tags: string[];
  is_representative: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  theme: Theme;
}

export interface DayMeta {
  date: string; // YYYY-MM-DD
  count: number;
  preview_image: string | null;
}
