import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

const version = readFileSync("VERSION", "utf-8").trim();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [tailwindcss(), sveltekit()],
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    },
    // Two projects, not one global `environment`: most tests render Svelte
    // components through `svelte/server` (SSR), which needs Svelte's
    // server-compiled output. A handful of component tests need a real DOM
    // (see ResumeCta.test.ts) and need the `browser` resolve condition so
    // Svelte resolves its client build instead - setting that condition
    // globally breaks every svelte/server-based test. See #175.
    projects: [
      {
        extends: true,
        resolve: { conditions: ["browser"] },
        test: {
          name: "dom",
          environment: "happy-dom",
          include: ["src/lib/landing/ResumeCta.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/lib/landing/ResumeCta.test.ts"],
        },
      },
    ],
  },
});
