import type { Component } from "svelte";
import type { ResolvedResume, CoverLetter, Profile } from "$lib/types.js";

import ClassicTheme from "./classic/ClassicTheme.svelte";
import ClassicCoverLetter from "./classic/ClassicCoverLetter.svelte";
import ManualTheme from "./product-manual/ManualTheme.svelte";
import ManualCoverLetter from "./product-manual/ManualCoverLetter.svelte";
import RetroTheme from "./retro-technical/RetroTheme.svelte";
import RetroCoverLetter from "./retro-technical/RetroCoverLetter.svelte";

interface ThemeProps {
  resume: ResolvedResume;
}

export interface CoverLetterProps {
  profile: Profile;
  job: { company: string; title: string };
  cover_letter: CoverLetter;
}

interface ThemeEntry {
  component: Component<ThemeProps>;
  cover_letter: Component<CoverLetterProps>;
  favicon?: string;
}

const THEMES: Record<string, ThemeEntry> = {
  classic: { component: ClassicTheme, cover_letter: ClassicCoverLetter },
  "product-manual": { component: ManualTheme, cover_letter: ManualCoverLetter },
  "retro-technical": { component: RetroTheme, cover_letter: RetroCoverLetter },
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

export function get_cover_letter_theme(name: string): Component<CoverLetterProps> {
  return resolve_theme(name).cover_letter;
}

export function get_theme_favicon(name: string): string | undefined {
  return resolve_theme(name).favicon;
}
