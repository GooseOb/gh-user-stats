// src/index.ts
import { writeFile, mkdir } from "node:fs/promises";

// src/env.ts
var getEnvVar = (keys) => {
  for (const key of keys) {
    const val = process.env[key] || "";
    if (val)
      return val;
  }
  throw new Error(`Set at least one of the following env vars: ${keys.join(", ")}`);
};
var ACCESS_TOKEN = getEnvVar(["INPUT_TOKEN", "GITHUB_TOKEN"]);
var GITHUB_ACTOR = getEnvVar(["GITHUB_ACTOR"]);

// src/api.ts
var makeQuery = (query) => fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`
  },
  body: JSON.stringify({ query })
}).then((res) => res.json());

// src/streaks.ts
var getDaysOfWeekByContribution = (contributions) => {
  const days = [
    { name: "Monday", count: 0 },
    { name: "Tuesday", count: 0 },
    { name: "Wednesday", count: 0 },
    { name: "Thursday", count: 0 },
    { name: "Friday", count: 0 },
    { name: "Saturday", count: 0 },
    { name: "Sunday", count: 0 }
  ];
  for (const day of contributions) {
    const dayOfWeek = day.date.getDay();
    const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    days[index].count += day.contributionCount;
  }
  let maxContributions = days[0];
  let mostProductiveDayIndex = 0;
  for (let i = 1;i < days.length; i++) {
    if (days[i].count > maxContributions.count) {
      maxContributions = days[i];
      mostProductiveDayIndex = i;
    }
  }
  return {
    daysOfWeek: days,
    mostProductiveDay: days[mostProductiveDayIndex]
  };
};
var getStreaks = (contributions) => {
  let longest = 0;
  let current = 0;
  const longestTimeframe = {
    from: new Date,
    to: new Date
  };
  const sorted = contributions.slice().sort((a, b) => a.date.getTime() - b.date.getTime());
  for (let i = 0;i < sorted.length; i++) {
    const day = sorted[i];
    if (day.contributionCount > 0) {
      current++;
    } else {
      if (longest < current) {
        longest = current;
        longestTimeframe.from = new Date(sorted[i - current].date);
        longestTimeframe.to = new Date(sorted[i - 1].date);
      }
      current = 0;
    }
  }
  longest = Math.max(longest, current);
  return {
    longest,
    current,
    longestTimeframe: longest > 0 ? longestTimeframe : undefined
  };
};

// src/stats.ts
var query = `
{
  user(login: "${GITHUB_ACTOR}") {
    login
    name
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      totalCount
      nodes {
        name
        stargazerCount
        languages(first: 10) {
          edges {
            size
            node {
              name
            }
          }
        }
		issues(first: 100) {
			nodes {
				closed
				createdAt
				closedAt
			}
		}
      }
    }
	repositoriesContributedTo {
	  totalCount
	}
  }
}
`;
async function fetchGitHubStats() {
  const data = await makeQuery(query);
  if (data.errors) {
    throw new Error(data.errors);
  }
  const { repositories, login, name, repositoriesContributedTo } = data.data.user;
  const stars = repositories.nodes.reduce((sum, repo) => sum + repo.stargazerCount, 0);
  const contribYears = (await makeQuery(`
    query { viewer { contributionsCollection { contributionYears } } }
  `))?.data?.viewer?.contributionsCollection?.contributionYears || [];
  const contribsByYear = await makeQuery(`
    query {
      viewer {
        ${contribYears.map((year) => `
          year${year}: contributionsCollection(
            from: "${year}-01-01T00:00:00Z",
            to: "${year + 1}-01-01T00:00:00Z"
          ) {
          	contributionCalendar {
          		totalContributions
				weeks {
          			contributionDays {
          				date contributionCount
          			}
          		}
          	}
          }
        `).join(`
`)}
      }
    }
  `);
  const years = Object.values(contribsByYear?.data?.viewer || {});
  const contributionsCount = years.reduce((sum, y) => sum + (y?.contributionCalendar?.totalContributions || 0), 0);
  const days = years.flatMap(({ contributionCalendar: { weeks } }) => weeks.flatMap(({ contributionDays }) => contributionDays)).map(({ date, contributionCount }) => ({
    date: new Date(date),
    contributionCount
  }));
  const streaks = getStreaks(days);
  const mostProductiveDay = getDaysOfWeekByContribution(days).mostProductiveDay.name;
  const languageStats = {};
  const issues = {
    count: 0,
    closedCount: 0,
    averageCloseTime: 0
  };
  for (const repo of repositories.nodes) {
    for (const lang of repo.languages?.edges || []) {
      const langName = lang.node.name;
      languageStats[langName] = (languageStats[langName] || 0) + lang.size;
    }
    for (const issue of repo.issues.nodes) {
      if (issue.closed) {
        const createdAt = new Date(issue.createdAt);
        const closedAt = new Date(issue.closedAt);
        const diff = closedAt.getTime() - createdAt.getTime();
        ++issues.closedCount;
        issues.averageCloseTime += diff;
      }
    }
    issues.count += repo.issues.nodes.length;
  }
  if (issues.closedCount > 0) {
    issues.averageCloseTime /= issues.closedCount;
  }
  return {
    login,
    name,
    repoCount: repositories.totalCount + repositoriesContributedTo.totalCount,
    stars,
    contributionsCount,
    languageStats,
    streaks,
    mostProductiveDay,
    issues
  };
}

// src/colors.ts
var getLangToColor = () => fetch("https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml").then((res) => res.text()).then((colorsRaw) => {
  const result = {};
  for (const item of colorsRaw.split(/\n(?=\S)/g)) {
    const nameMatch = /^(\S.*?):/.exec(item);
    const colorMatch = /color:\s*"(#\w{6}|\w+)"/.exec(item);
    if (nameMatch && colorMatch) {
      result[nameMatch[1].toLowerCase()] = colorMatch[1];
    }
  }
  return result;
});

// src/index.ts
var useTemplate = (name, trasform) => writeFile(`generated/${name}.svg`, trasform({ languages: `<svg id="gh-dark-mode-only" width="360" height="210" xmlns="http://www.w3.org/2000/svg">
<style>
svg {
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
  font-size: 14px;
  line-height: 21px;
}

#background {
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  fill: white;
  stroke: rgb(225, 228, 232);
  stroke-width: 1px;
  rx: 6px;
  ry: 6px;
}

#gh-dark-mode-only #background {
  fill: #0d1117;
  stroke-width: 0.5px;
}

foreignObject {
  width: calc(100% - 10px - 32px);
  height: calc(100% - 10px - 24px);
}

h2 {
  margin-top: 0;
  margin-bottom: 0.75em;
  line-height: 24px;
  font-size: 16px;
  font-weight: 600;
  color: rgb(36, 41, 46);
  fill: rgb(36, 41, 46);
}

#gh-dark-mode-only h2 {
  color: #c9d1d9;
  fill: #c9d1d9;
}

ul {
  list-style: none;
  padding-left: 0;
  margin-top: 0;
  margin-bottom: 0;
}

li {
  display: inline-flex;
  font-size: 12px;
  margin-right: 2ch;
  align-items: center;
  flex-wrap: nowrap;
  transform: translateX(-500%);
  animation: slideIn 2s ease-in-out forwards;
}

@keyframes slideIn {
  to {
    transform: translateX(0);
  }
}

div.ellipsis {
  height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.octicon {
  fill: rgb(88, 96, 105);
  margin-right: 0.5ch;
  vertical-align: top;
}

#gh-dark-mode-only .octicon {
  color: #8b949e;
  fill: #8b949e;
}

.progress {
  display: flex;
  height: 8px;
  overflow: hidden;
  background-color: rgb(225, 228, 232);
  border-radius: 6px;
  outline: 1px solid transparent;
  margin-bottom: 1em;
}

#gh-dark-mode-only .progress {
  background-color: rgba(110, 118, 129, 0.4);
}

.progress-item {
  outline: 2px solid rgb(225, 228, 232);
  border-collapse: collapse;
}

#gh-dark-mode-only .progress-item {
  outline: 2px solid #393f47;
}

.lang {
  font-weight: 600;
  margin-right: 4px;
  color: rgb(36, 41, 46);
}

#gh-dark-mode-only .lang {
  color: #c9d1d9;
}

.percent {
  color: rgb(88, 96, 105)
}

#gh-dark-mode-only .percent {
  color: #8b949e;
}
</style>
<g>
<rect x="5" y="5" id="background" />
<g>
<foreignObject x="21" y="17" width="318" height="176">
<div xmlns="http://www.w3.org/1999/xhtml" class="ellipsis">

<h2>Languages Used (By File Size)</h2>

<div>
<span class="progress">
{{ progress }}
</span>
</div>

<ul>

{{ lang_list }}

</ul>

</div>
</foreignObject>
</g>
</g>
</svg>
`, overview: `<svg id="gh-dark-mode-only" width="360" height="210" xmlns="http://www.w3.org/2000/svg">
<style>
svg {
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
  font-size: 14px;
  line-height: 21px;
}

#background {
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  fill: white;
  stroke: rgb(225, 228, 232);
  stroke-width: 1px;
  rx: 6px;
  ry: 6px;
}

#gh-dark-mode-only #background {
  fill: #0d1117;
  stroke-width: 0.5px;
}

foreignObject {
  width: calc(100% - 10px - 32px);
  height: calc(100% - 10px - 32px);
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

th {
  padding: 0.5em;
  padding-top: 0;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: rgb(3, 102, 214);
}

#gh-dark-mode-only th {
  color: #58a6ff;
}

td {
  margin-bottom: 16px;
  margin-top: 8px;
  padding: 0.25em;
  font-size: 12px;
  line-height: 18px;
  color: rgb(88, 96, 105);
}

#gh-dark-mode-only td {
  color: #c9d1d9;
}

tr {
  transform: translateX(-200%);
  animation: slideIn 2s ease-in-out forwards;
}

.octicon {
  fill: rgb(88, 96, 105);
  margin-right: 1ch;
  vertical-align: top;
}

#gh-dark-mode-only .octicon {
  fill: #8b949e;
}

@keyframes slideIn {
  to {
    transform: translateX(0);
  }
}
</style>
<g>
<rect x="5" y="5" id="background" />
<g>
<foreignObject x="21" y="21" width="318" height="168">
<div xmlns="http://www.w3.org/1999/xhtml">

<table>
<thead><tr style="transform: translateX(0);">
<th colspan="2">{{ name }}'s GitHub Statistics</th>
</tr></thead>
<tbody>

<tr><td><svg class="octicon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" version="1.1" width="16" height="16"><path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694v.001z"></path></svg>Stars</td><td>{{ stars }}</td></tr>

<tr style="animation-delay: 300ms"><td><svg class="octicon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M1 2.5A2.5 2.5 0 013.5 0h8.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V1.5h-8a1 1 0 00-1 1v6.708A2.492 2.492 0 013.5 9h3.25a.75.75 0 010 1.5H3.5a1 1 0 100 2h5.75a.75.75 0 010 1.5H3.5A2.5 2.5 0 011 11.5v-9zm13.23 7.79a.75.75 0 001.06-1.06l-2.505-2.505a.75.75 0 00-1.06 0L9.22 9.229a.75.75 0 001.06 1.061l1.225-1.224v6.184a.75.75 0 001.5 0V9.066l1.224 1.224z"></path></svg>All-time contributions</td><td>{{ contributions }}</td></tr>

<tr style="animation-delay: 450ms"><td><svg class="octicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path></svg>Closed {{ issues_closed }}/{{ issues }} issues in</td><td>{{ avg_issue_close_time }} on average</td></tr>

<tr style="animation-delay: 750ms"><td><svg class="octicon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"></path></svg>Repos with contributions</td><td>{{ repos }}</td></tr>


<tr style="animation-delay: 750ms"><td><svg class="octicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Zm10.75-4H2.75a.25.25 0 0 0-.25.25V6h11V3.75a.25.25 0 0 0-.25-.25Z"></path></svg>Most productive day</td><td>{{ productive_day }}</td></tr>

<tr style="animation-delay: 750ms"><td><svg class="octicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M9.6 2.279a.426.426 0 0 1 .8 0l.407 1.112a6.386 6.386 0 0 0 3.802 3.802l1.112.407a.426.426 0 0 1 0 .8l-1.112.407a6.386 6.386 0 0 0-3.802 3.802l-.407 1.112a.426.426 0 0 1-.8 0l-.407-1.112a6.386 6.386 0 0 0-3.802-3.802L4.279 8.4a.426.426 0 0 1 0-.8l1.112-.407a6.386 6.386 0 0 0 3.802-3.802L9.6 2.279Zm-4.267 8.837a.178.178 0 0 1 .334 0l.169.464a2.662 2.662 0 0 0 1.584 1.584l.464.169a.178.178 0 0 1 0 .334l-.464.169a2.662 2.662 0 0 0-1.584 1.584l-.169.464a.178.178 0 0 1-.334 0l-.169-.464a2.662 2.662 0 0 0-1.584-1.584l-.464-.169a.178.178 0 0 1 0-.334l.464-.169a2.662 2.662 0 0 0 1.584-1.584l.169-.464ZM2.8.14a.213.213 0 0 1 .4 0l.203.556a3.2 3.2 0 0 0 1.901 1.901l.556.203a.213.213 0 0 1 0 .4l-.556.203a3.2 3.2 0 0 0-1.901 1.901L3.2 5.86a.213.213 0 0 1-.4 0l-.203-.556A3.2 3.2 0 0 0 .696 3.403L.14 3.2a.213.213 0 0 1 0-.4l.556-.203A3.2 3.2 0 0 0 2.597.696L2.8.14Z"></path></svg>Longest streak</td><td>{{ longest_streak }} ({{ longest_streak_frame }})</td></tr>

</tbody>
</table>

</div>
</foreignObject>
</g>
</g>
</svg>
` }[name]), "utf8");
var stats = await fetchGitHubStats();
await mkdir("generated", { recursive: true });
var langToColor = await getLangToColor();
await Promise.all([
  useTemplate("overview", (template) => template.replace(/{{ name }}/g, stats.login).replace(/{{ stars }}/g, stats.stars.toString()).replace(/{{ contributions }}/g, stats.contributionsCount.toString()).replace(/{{ issues_closed }}/g, stats.issues.closedCount.toString()).replace(/{{ issues }}/g, stats.issues.count.toString()).replace(/{{ avg_issue_close_time }}/g, (stats.issues.averageCloseTime / (1000 * 60 * 60)).toFixed(0) + "h").replace(/{{ repos }}/g, stats.repoCount.toString()).replace(/{{ productive_day }}/g, stats.mostProductiveDay).replace(/{{ current_streak }}/g, stats.streaks.current.toString()).replace(/{{ longest_streak }}/g, stats.streaks.longest.toString()).replace(/{{ longest_streak_frame }}/g, stats.streaks.longestTimeframe ? stats.streaks.longestTimeframe.from.toLocaleDateString() + " - " + stats.streaks.longestTimeframe.to.toLocaleDateString() : "N/A")),
  useTemplate("languages", (template) => {
    let progress = "";
    let langList = "";
    const totalSize = Object.values(stats.languageStats).reduce((sum, size) => sum + size, 0);
    const sortedLanguages = Object.entries(stats.languageStats).sort((a, b) => b[1] - a[1]);
    const delayBetween = 150;
    sortedLanguages.forEach(([lang, size], i) => {
      const color = langToColor[lang.toLowerCase()] || "#000000";
      const prop = size / totalSize * 100;
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
    return template.replace(/{{ progress }}/g, progress).replace(/{{ lang_list }}/g, langList);
  })
]);
