import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaDaaaa",
    short_name: "TaDaaaa",
    description: "Create magical surprise invites for the people you love",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FAF9F6",
    theme_color: "#3E6B5C",
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
