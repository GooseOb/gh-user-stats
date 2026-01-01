import { readFile, writeFile, mkdir } from "fs/promises";
import { fetchGitHubStats } from "./stats.ts";
import { getLangToColor } from "./colors.ts";

const useTemplate = (name: string, trasform: (template: string) => string) =>
  readFile(`templates/${name}.svg`, "utf8").then((template) =>
    writeFile(`generated/${name}.svg`, trasform(template), "utf8"),
  );

const stats = await fetchGitHubStats();

await mkdir("generated", { recursive: true });

const langToColor = await getLangToColor();

await Promise.all([
  useTemplate("overview", (template) =>
    template
      .replace(/{{ name }}/g, stats.login)
      .replace(/{{ stars }}/g, stats.stars.toString())
      .replace(/{{ contributions }}/g, stats.contributionsCount.toString())
      .replace(
        /{{ lines_changed }}/g,
        `+${stats.changedLines.additions} / -${stats.changedLines.deletions}`,
      )
      .replace(/{{ repos }}/g, stats.repoCount.toString()),
  ),

  useTemplate("languages", (template) => {
    let progress = "";
    let langList = "";

    const totalSize = Object.values(stats.languageStats).reduce(
      (sum, size) => sum + size,
      0,
    );
    const sortedLanguages = Object.entries(stats.languageStats).sort(
      (a, b) => b[1] - a[1],
    );
    const delayBetween = 150;
    sortedLanguages.forEach(([lang, size], i) => {
      const color = langToColor[lang.toLowerCase()] || "#000000";
      const prop = (size / totalSize) * 100;

      progress += `
<span style="background-color: ${color};
width: ${prop.toFixed(3)}%;" 
class="progress-item"></span>`;
      langList += `
<li style="animation-delay: ${i * delayBetween}ms;">
<svg xmlns="http://www.w3.org/2000/svg" class="octicon" style="fill:${color};"
viewBox="0 0 16 16" width="16" height="16">
<path fill-rule="evenodd"
d="M8 4a4 4 0 100 8 4 4 0 000-8z"></path>
</svg>
<span class="lang">${lang}</span>
<span class="percent">${prop.toFixed(2)}%</span>
</li>
`;
    });

    return template
      .replace(/{{ progress }}/g, progress)
      .replace(/{{ lang_list }}/g, langList);
  }),
]);
