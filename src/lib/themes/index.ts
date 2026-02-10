import type { Component } from "svelte";
import type { ResolvedResume } from "$lib/types.js";

import ClassicTheme from "./classic/ClassicTheme.svelte";

interface ThemeProps {
  resume: ResolvedResume;
}

const THEMES: Record<string, Component<ThemeProps>> = {
  classic: ClassicTheme,
};

export function get_theme(name: string): Component<ThemeProps> {
  const theme = THEMES[name];
  if (!theme) {
    throw new Error(`Unknown theme: "${name}"`);
  }
  return theme;
}
