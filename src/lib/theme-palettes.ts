export interface ThemePalette {
  background: string;
  accent: string;
  text: string;
  secondary: string;
}

export const THEME_PALETTES: Record<string, ThemePalette> = {
  "retro-technical": {
    background: "#1a2744",
    accent: "#e87a2e",
    text: "#f0e6d6",
    secondary: "#8b9bb5",
  },
  classic: {
    background: "#ffffff",
    accent: "#374151",
    text: "#111827",
    secondary: "#4b5563",
  },
  "product-manual": {
    background: "#f5f0e8",
    accent: "#c4412b",
    text: "#292524",
    secondary: "#57534e",
  },
};

export function get_theme_palette(theme: string): ThemePalette {
  return THEME_PALETTES[theme] ?? THEME_PALETTES["classic"];
}
