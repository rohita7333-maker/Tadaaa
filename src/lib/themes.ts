export interface Theme {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  price: number;
  colors: {
    background: string;
    backgroundSecondary: string;
    text: string;
    accent: string;
    accentLight: string;
    overlay: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  revealIcon: "envelope" | "gift" | "heart" | "star" | "balloon";
  particleType: "hearts" | "sparkles" | "confetti" | "petals" | "stars";
  previewImage: string;
}

export const themes: Theme[] = [
  {
    id: "warm-embrace",
    name: "Warm Embrace",
    description: "Soft rose and cream — perfect for mom",
    isPremium: false,
    price: 0,
    colors: {
      background: "linear-gradient(135deg, #FFF8F0 0%, #F5E6E0 100%)",
      backgroundSecondary: "#FFF0E8",
      text: "#2D2926",
      accent: "#C4686D",
      accentLight: "#E8A5A8",
      overlay: "rgba(45,41,38,0.4)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "envelope",
    particleType: "hearts",
    previewImage: "/themes/warm-embrace.jpg",
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    description: "Sunset golds and warm amber",
    isPremium: false,
    price: 0,
    colors: {
      background: "linear-gradient(135deg, #FFF8F0 0%, #F5E8D0 100%)",
      backgroundSecondary: "#FFF5E6",
      text: "#2D2926",
      accent: "#C9A96E",
      accentLight: "#E8D5A8",
      overlay: "rgba(45,41,38,0.4)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "gift",
    particleType: "sparkles",
    previewImage: "/themes/golden-hour.jpg",
  },
  {
    id: "midnight-romance",
    name: "Midnight Romance",
    description: "Deep navy and starlight — for that special someone",
    isPremium: false,
    price: 0,
    colors: {
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      backgroundSecondary: "#1a1a2e",
      text: "#F5F0EB",
      accent: "#E8A5A8",
      accentLight: "#C4686D",
      overlay: "rgba(26,26,46,0.5)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "heart",
    particleType: "stars",
    previewImage: "/themes/midnight-romance.jpg",
  },
  {
    id: "garden-party",
    name: "Garden Party",
    description: "Fresh greens and floral pinks",
    isPremium: true,
    price: 4.99,
    colors: {
      background: "linear-gradient(135deg, #F0F5E8 0%, #E8F0E0 100%)",
      backgroundSecondary: "#F5FAF0",
      text: "#2D3B2D",
      accent: "#6B8F71",
      accentLight: "#A8C5AD",
      overlay: "rgba(45,59,45,0.4)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "balloon",
    particleType: "petals",
    previewImage: "/themes/garden-party.jpg",
  },
  {
    id: "velvet-night",
    name: "Velvet Night",
    description: "Rich burgundy and gold — pure luxury",
    isPremium: true,
    price: 4.99,
    colors: {
      background: "linear-gradient(135deg, #2D1B2E 0%, #1A0F1B 100%)",
      backgroundSecondary: "#2D1B2E",
      text: "#F5EDE3",
      accent: "#C9A96E",
      accentLight: "#E8D5A8",
      overlay: "rgba(45,27,46,0.5)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "star",
    particleType: "confetti",
    previewImage: "/themes/velvet-night.jpg",
  },
  {
    id: "cotton-candy",
    name: "Cotton Candy",
    description: "Playful pastels — fun and sweet",
    isPremium: true,
    price: 4.99,
    colors: {
      background: "linear-gradient(135deg, #F0E6F6 0%, #E6F0F8 100%)",
      backgroundSecondary: "#F5F0FA",
      text: "#3D2E4A",
      accent: "#B07CC6",
      accentLight: "#D4B8E0",
      overlay: "rgba(61,46,74,0.4)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "balloon",
    particleType: "confetti",
    previewImage: "/themes/cotton-candy.jpg",
  },
  {
    id: "royal-plum",
    name: "Royal Plum",
    description: "Rich purple and silver — regal and elegant",
    isPremium: true,
    price: 4.99,
    colors: {
      background: "linear-gradient(135deg, #2E1A47 0%, #1A0E2E 100%)",
      backgroundSecondary: "#2E1A47",
      text: "#F0E6F6",
      accent: "#B07CC6",
      accentLight: "#D4B8E0",
      overlay: "rgba(46,26,71,0.5)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "star",
    particleType: "sparkles",
    previewImage: "/themes/royal-plum.jpg",
  },
  {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    description: "Soft pink and white — Spring romance",
    isPremium: true,
    price: 4.99,
    colors: {
      background: "linear-gradient(135deg, #FFF0F5 0%, #FFE4ED 100%)",
      backgroundSecondary: "#FFF5F8",
      text: "#4A2030",
      accent: "#E85D8C",
      accentLight: "#F5A0B8",
      overlay: "rgba(74,32,48,0.4)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "heart",
    particleType: "petals",
    previewImage: "/themes/cherry-blossom.jpg",
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    description: "Calm teal and sand — like a beach sunset",
    isPremium: true,
    price: 4.99,
    colors: {
      background: "linear-gradient(135deg, #F0F8F8 0%, #E6F2F0 100%)",
      backgroundSecondary: "#F5FAFA",
      text: "#1A3B3B",
      accent: "#2B8A8A",
      accentLight: "#7CC5C5",
      overlay: "rgba(26,59,59,0.4)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "star",
    particleType: "sparkles",
    previewImage: "/themes/ocean-breeze.jpg",
  },
  {
    id: "diwali-glow",
    name: "Diwali Glow",
    description: "Deep orange and gold — festive and radiant",
    isPremium: true,
    price: 4.99,
    colors: {
      background: "linear-gradient(135deg, #1A0A00 0%, #2D1500 100%)",
      backgroundSecondary: "#1A0A00",
      text: "#FFF0D6",
      accent: "#FF8C00",
      accentLight: "#FFB347",
      overlay: "rgba(26,10,0,0.5)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "star",
    particleType: "sparkles",
    previewImage: "/themes/diwali-glow.jpg",
  },
  {
    id: "christmas-eve",
    name: "Christmas Eve",
    description: "Classic red and green — holiday magic",
    isPremium: true,
    price: 4.99,
    colors: {
      background: "linear-gradient(135deg, #0D1F0D 0%, #1A0A0A 100%)",
      backgroundSecondary: "#0D1F0D",
      text: "#F5F0E8",
      accent: "#C0392B",
      accentLight: "#E8A5A0",
      overlay: "rgba(13,31,13,0.5)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "gift",
    particleType: "confetti",
    previewImage: "/themes/christmas-eve.jpg",
  },
  {
    id: "sunset-proposal",
    name: "Sunset Proposal",
    description: "Warm amber and coral — the big question",
    isPremium: true,
    price: 4.99,
    colors: {
      background: "linear-gradient(135deg, #FFF5EB 0%, #FFE8D6 100%)",
      backgroundSecondary: "#FFF8F0",
      text: "#3D2B1F",
      accent: "#E07050",
      accentLight: "#F0A890",
      overlay: "rgba(61,43,31,0.4)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "heart",
    particleType: "hearts",
    previewImage: "/themes/sunset-proposal.jpg",
  },
  {
    id: "farewell-skies",
    name: "Farewell Skies",
    description: "Soft lavender and dusk — for goodbyes that matter",
    isPremium: true,
    price: 4.99,
    colors: {
      background: "linear-gradient(135deg, #F0E6F8 0%, #E8E0F5 100%)",
      backgroundSecondary: "#F5F0FA",
      text: "#2D2040",
      accent: "#7B61A6",
      accentLight: "#B8A0D0",
      overlay: "rgba(45,32,64,0.4)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "star",
    particleType: "stars",
    previewImage: "/themes/farewell-skies.jpg",
  },
  {
    id: "neon-party",
    name: "Neon Party",
    description: "Electric pink and black — turn up the energy",
    isPremium: true,
    price: 4.99,
    colors: {
      background: "linear-gradient(135deg, #0A0A0A 0%, #1A0A1A 100%)",
      backgroundSecondary: "#0A0A0A",
      text: "#F5F0FF",
      accent: "#FF1493",
      accentLight: "#FF69B4",
      overlay: "rgba(10,10,10,0.6)",
    },
    fonts: { heading: "Playfair Display", body: "DM Sans" },
    revealIcon: "balloon",
    particleType: "confetti",
    previewImage: "/themes/neon-party.jpg",
  },
];

export function getThemeById(id: string): Theme | undefined {
  return themes.find((t) => t.id === id);
}

export interface Occasion {
  id: string;
  label: string;
  emoji: string;
  prompts: string[];
}

export const occasions: Occasion[] = [
  {
    id: "date",
    label: "Date Invite",
    emoji: "🌹",
    prompts: [
      "Will you go on a date with me?",
      "Dinner this Friday?",
      "Coffee and a walk this weekend?",
    ],
  },
  {
    id: "birthday",
    label: "Birthday Wish",
    emoji: "🎂",
    prompts: [
      "Happy Birthday! Ready for cake?",
      "Another year of you being amazing!",
      "Birthday dinner — you in?",
    ],
  },
  {
    id: "festival",
    label: "Festival Greeting",
    emoji: "✨",
    prompts: [
      "Happy Diwali! Light up my life?",
      "Merry Christmas! Cozy night in?",
      "Happy New Year! New adventure together?",
    ],
  },
  {
    id: "mothers_day",
    label: "Mother's Day",
    emoji: "💐",
    prompts: [
      "Lunch on me, Mom?",
      "You deserve the world. Tea today?",
      "Happy Mother's Day — plans tonight?",
    ],
  },
  {
    id: "apology",
    label: "Apology",
    emoji: "🙏",
    prompts: [
      "Can we start over?",
      "I'm sorry. Can we talk?",
      "Will you forgive me?",
    ],
  },
  {
    id: "custom",
    label: "Custom",
    emoji: "💌",
    prompts: [],
  },
];
