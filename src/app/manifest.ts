import type { MetadataRoute } from "next";

/** Makes Finora installable: home-screen icon, full screen, and shortcuts on the icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Finora",
    short_name: "Finora",
    description: "Seu dinheiro, com clareza.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1f3a",
    theme_color: "#0b1f3a",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Novo lançamento",
        short_name: "Lançar",
        url: "/transactions/new",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      { name: "Contas e faturas", short_name: "Faturas", url: "/accounts", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Metas", short_name: "Metas", url: "/goals", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
