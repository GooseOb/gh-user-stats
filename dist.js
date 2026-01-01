// index.ts
var {readFile, writeFile, mkdir} = (() => ({}));

// env.ts
var getEnvVar = (key) => {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return val;
};
var ACCESS_TOKEN = getEnvVar("ACCESS_TOKEN");
var GITHUB_ACTOR = getEnvVar("GITHUB_ACTOR");

// api.ts
var sleep = (ms) => new Promise((res) => {
  setTimeout(res, ms);
});
var req = async (endpoint) => {
  for (let i = 0;i < 6; i++) {
    const res = await fetch(`https://api.github.com${endpoint}`, {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: "application/vnd.github+json"
    });
    if (res.status === 202) {
      await sleep(2000);
      continue;
    }
    if (!res.ok) {
      console.error(`Request to ${endpoint} failed: ${res.status} ${res.statusText}`);
      return null;
    }
    return res.json();
  }
  console.error(`GitHub API request failed after multiple attempts: ${endpoint}`);
  return null;
};
var makeQuery = (query) => fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`
  },
  body: JSON.stringify({ query })
}).then((res) => res.json());

// changed-lines.ts
var fetchAllRepos = async (owner) => {
  let page = 1;
  const repos = [];
  while (true) {
    const data = await req(`/users/${owner}/repos?per_page=100&page=${page}`);
    if (!data || data.length === 0)
      break;
    repos.push(...data.filter((r) => !r.fork));
    page++;
    if (data.length < 100)
      break;
  }
  return repos;
};
var fetchContributorStats = (owner, repo) => req(`/repos/${owner}/${repo}/stats/contributors`);
var getChangedLines = async (reposOwner) => {
  const repos = await fetchAllRepos(reposOwner);
  let additions = 0;
  let deletions = 0;
  const stats = await Promise.all(repos.map(({ name }) => fetchContributorStats(reposOwner, name)));
  for (const repoStats of stats) {
    if (!repoStats)
      continue;
    const me = repoStats.find((c) => c.author?.login === reposOwner);
    if (!me)
      continue;
    for (const week of me.weeks) {
      additions += week.a;
      deletions += week.d;
    }
  }
  return { additions, deletions };
};

// stats.ts
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
          ) { contributionCalendar { totalContributions } }
        `).join(`
`)}
      }
    }
  `);
  const contributionsCount = Object.values(contribsByYear?.data?.viewer || {}).reduce((sum, y) => sum + (y?.contributionCalendar?.totalContributions || 0), 0);
  const languageStats = {};
  for (const repo of repositories.nodes) {
    for (const lang of repo.languages?.edges || []) {
      const langName = lang.node.name;
      languageStats[langName] = (languageStats[langName] || 0) + lang.size;
    }
  }
  return {
    login,
    name,
    repoCount: repositories.totalCount + repositoriesContributedTo.totalCount,
    stars,
    contributionsCount,
    languageStats,
    changedLines: await getChangedLines(GITHUB_ACTOR)
  };
}

// colors.ts
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

// index.ts
var useTemplate = (name, trasform) => readFile(`templates/${name}.svg`, "utf8").then((template) => writeFile(`generated/${name}.svg`, trasform(template), "utf8"));
var stats = await fetchGitHubStats();
await mkdir("generated", { recursive: true });
var langToColor = await getLangToColor();
await Promise.all([
  useTemplate("overview", (template) => template.replace(/{{ name }}/g, stats.login).replace(/{{ stars }}/g, stats.stars.toString()).replace(/{{ contributions }}/g, stats.contributionsCount.toString()).replace(/{{ lines_changed }}/g, `+${stats.changedLines.additions} / -${stats.changedLines.deletions}`).replace(/{{ repos }}/g, stats.repoCount.toString())),
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
