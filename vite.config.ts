import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defaultClientConditions } from "vite";
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
    // (see *.dom.test.ts files) and need the `browser` resolve condition so
    // Svelte resolves its client build instead - setting that condition
    // globally breaks every svelte/server-based test. See #175.
    //
    // Membership is a naming convention, not a list of paths: a test file
    // opts into the `dom` project by naming itself `*.dom.test.ts`. Nothing
    // here needs editing when the next DOM test is added.
    projects: [
      {
        extends: true,
        resolve: { conditions: ["browser", ...defaultClientConditions] },
        test: {
          name: "dom",
          environment: "happy-dom",
          include: ["src/**/*.dom.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
          exclude: ["src/**/*.dom.test.ts"],
        },
      },
    ],
  },
});
