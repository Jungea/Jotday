export type CardType = "image" | "text" | "mixed";
export type Theme = "cork" | "card";

export interface Card {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: CardType;
  title: string | null;
  content: string | null;
  image_url: string | null;
  image_public_id: string | null;
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
