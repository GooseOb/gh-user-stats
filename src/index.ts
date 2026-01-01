import { writeFile, mkdir } from "node:fs/promises";
import { fetchGitHubStats } from "./stats.ts";
import { getLangToColor } from "./colors.ts";

declare const TEMPLATES: Record<string, string>;

const useTemplate = (name: string, trasform: (template: string) => string) =>
  writeFile(`generated/${name}.svg`, trasform(TEMPLATES[name]!), "utf8");

const stats = await fetchGitHubStats();

await mkdir("generated", { recursive: true });

const langToColor = await getLangToColor();

await Promise.all([
  useTemplate("overview", (template) =>
    template
      .replace(/{{ name }}/g, stats.login)
      .replace(/{{ stars }}/g, stats.stars.toString())
      .replace(/{{ contributions }}/g, stats.contributionsCount.toString())
      .replace(/{{ issues_closed }}/g, stats.issues.closedCount.toString())
      .replace(/{{ issues }}/g, stats.issues.count.toString())
      .replace(
        /{{ avg_issue_close_time }}/g,
        (stats.issues.averageCloseTime / (1000 * 60 * 60)).toFixed(0) + "h",
      )
      .replace(/{{ repos }}/g, stats.repoCount.toString())
      .replace(/{{ productive_day }}/g, stats.mostProductiveDay)
      .replace(/{{ current_streak }}/g, stats.streaks.current.toString())
      .replace(/{{ longest_streak }}/g, stats.streaks.longest.toString())
      .replace(
        /{{ longest_streak_frame }}/g,
        stats.streaks.longestTimeframe
          ? stats.streaks.longestTimeframe.from.toLocaleDateString() +
              " - " +
              stats.streaks.longestTimeframe.to.toLocaleDateString()
          : "N/A",
      ),
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
