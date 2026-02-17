export interface ThemePalette {
  background: string;
  page_background: string;
  content_width: string;
  accent: string;
  text: string;
  secondary: string;
}

export const THEME_PALETTES: Record<string, ThemePalette> = {
  "retro-technical": {
    background: "#1a2744",
    page_background: "#faf9f7",
    content_width: "64rem",
    accent: "#e87a2e",
    text: "#f0e6d6",
    secondary: "#8b9bb5",
  },
  classic: {
    background: "#ffffff",
    page_background: "#ffffff",
    content_width: "56rem",
    accent: "#374151",
    text: "#111827",
    secondary: "#4b5563",
  },
  "product-manual": {
    background: "#f5f0e8",
    page_background: "#8a9aa4",
    content_width: "56rem",
    accent: "#c4412b",
    text: "#292524",
    secondary: "#57534e",
  },
};

export function get_theme_palette(theme: string): ThemePalette {
  return THEME_PALETTES[theme] ?? THEME_PALETTES["classic"];
}
