import { readdir } from "fs/promises";

const templateFiles = await readdir("./templates");

const templates: Record<string, string> = {};

for (const file of templateFiles) {
  templates[file.replace(/\.[^/.]+$/, "")] = await Bun.file(
    `./templates/${file}`,
  ).text();
}

Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  define: {
    TEMPLATES: JSON.stringify(templates),
  },
  target: "node",
});
