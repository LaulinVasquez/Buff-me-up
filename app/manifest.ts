import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Buff Me Up — Workout Tracker",
    short_name: "Buff Me Up",
    description: "A simple workout tracker built for the gym.",
    start_url: "/app",
    display: "standalone",
    background_color: "#070b12",
    theme_color: "#a3e635",
    orientation: "portrait",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }],
  };
}
