import type { Component } from "svelte";
import type { ResolvedResume } from "$lib/types.js";

import ClassicTheme from "./classic/ClassicTheme.svelte";
import ManualTheme from "./product-manual/ManualTheme.svelte";

interface ThemeProps {
  resume: ResolvedResume;
}

const THEMES: Record<string, Component<ThemeProps>> = {
  classic: ClassicTheme,
  "product-manual": ManualTheme,
};

export function get_theme(name: string): Component<ThemeProps> {
  const theme = THEMES[name];
  if (!theme) {
    throw new Error(`Unknown theme: "${name}"`);
  }
  return theme;
}
