import type { Component } from "svelte";
import type { ResolvedResume } from "$lib/types.js";

import ClassicTheme from "./classic/ClassicTheme.svelte";
import ManualTheme from "./product-manual/ManualTheme.svelte";

interface ThemeProps {
  resume: ResolvedResume;
}

interface ThemeEntry {
  component: Component<ThemeProps>;
  favicon?: string;
}

const THEMES: Record<string, ThemeEntry> = {
  classic: { component: ClassicTheme },
  "product-manual": { component: ManualTheme },
};

function resolve_theme(name: string): ThemeEntry {
  const entry = THEMES[name];
  if (!entry) {
    throw new Error(`Unknown theme: "${name}"`);
  }
  return entry;
}

export function get_theme(name: string): Component<ThemeProps> {
  return resolve_theme(name).component;
}

export function get_theme_favicon(name: string): string | undefined {
  return resolve_theme(name).favicon;
}
