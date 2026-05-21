import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaDaaaa",
    short_name: "TaDaaaa",
    description: "Create magical surprise invites for the people you love",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FFF8F0",
    theme_color: "#C4686D",
    icons: [
      {
        src: "/icon1",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
