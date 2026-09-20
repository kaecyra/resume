import { readFileSync } from "node:fs";

import { render } from "svelte/server";

import CodeBlock from "./CodeBlock.svelte";

const CODE = "$ npm run dev\n\n  VITE ready\n  ➜  Local:   http://localhost:5173/\n";

function html_for(code: string): string {
  return render(CodeBlock, { props: { code } }).body;
}

function source(): string {
  return readFileSync(new URL("./CodeBlock.svelte", import.meta.url), "utf8");
}


describe("CodeBlock", () => {
  it("colours the prompt, the arrow and the URL apart from the rest of the line", () => {
    const html = html_for(CODE);

    expect(html).toMatch(/<span class="cb-prompt[^"]*">\$<\/span>/);
    expect(html).toMatch(/<span class="cb-arrow[^"]*">➜<\/span>/);
    expect(html).toMatch(/<span class="cb-url[^"]*">http:\/\/localhost:5173\/<\/span>/);
  });

  it("leaves every other character alone, blank line and indentation included", () => {
    const html = html_for(CODE);
    const text = html.replace(/<[^>]*>/g, "");

    expect(text).toBe("$ npm run dev\n\n  VITE ready\n  ➜  Local:   http://localhost:5173/");
  });

  it("only reads a $ as a prompt where a line starts with one", () => {
    const html = html_for("$ echo $HOME\n  $PATH is not a prompt");

    expect([...html.matchAll(/cb-prompt/g)]).toHaveLength(1);
    expect(html).toContain("echo $HOME");
    expect(html).toContain("$PATH is not a prompt");
  });

  it("still reads an indented $ as a prompt, and keeps the indent as plain text", () => {
    const html = html_for("  $ ls\n\t$ pwd");

    expect([...html.matchAll(/<span class="cb-prompt[^"]*">\$<\/span>/g)]).toHaveLength(2);
    expect(html.replace(/<[^>]*>/g, "")).toBe("  $ ls\n\t$ pwd");
  });

  // Vite 7 builds to `safari16`, which is Safari 16.0; a regex lookbehind
  // needs 16.4. esbuild does not strip one - it rewrites the literal into a
  // `new RegExp(...)` call, moving the SyntaxError from parse time to module
  // evaluation - and the tokenizer's pattern is a module-level const, so on
  // Safari 16.0 through 16.3 the chunk throws and the page never hydrates.
  it("keeps the tokenizer inside the Safari build target, which has no lookbehind", () => {
    expect(source()).not.toMatch(/\(\?<[=!]/);
  });

  it("escapes the transcript rather than letting it into the document as markup", () => {
    const html = html_for("$ cat <b>index.html</b>");

    // Svelte escapes `<` and `&` in text, which is enough to keep the
    // transcript inert. The check that matters is that the component never
    // reaches for `{@html}` to get its spans in.
    expect(html).toContain("&lt;b>index.html&lt;/b>");
    expect(html).not.toContain("<b>");
  });

  it("drops the trailing newline a YAML block scalar leaves behind", () => {
    // `code: |` in data/pipeline.yaml always ends in \n; rendering it would
    // leave a blank last line inside the <pre> and a visible gap.
    expect(html_for(CODE)).not.toMatch(/\n<\/code>/);
  });

  it("renders a transcript that carries none of the three tokens as plain text", () => {
    const html = html_for("just words");

    expect(html).toContain("just words");
    expect(html).not.toContain("<span");
  });

});
