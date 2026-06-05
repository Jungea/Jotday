import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jotday — 나만의 이미지 달력 일기",
    short_name: "Jotday",
    description: "소중한 순간을 달력에 기록하세요",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon-192-light.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512-light.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
