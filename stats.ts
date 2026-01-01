import { makeQuery } from "./api";
import { getChangedLines } from "./changed-lines";
import { GITHUB_ACTOR } from "./env";

const query = `
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

export type Stats = {
  login: string;
  name: string;
  repoCount: number;
  stars: number;
  contributionsCount: number;
  languageStats: Record<string, number>;
  changedLines: { additions: number; deletions: number };
};

export async function fetchGitHubStats(): Promise<Stats> {
  const data = await makeQuery(query);

  if (data.errors) {
    throw new Error(data.errors);
  }

  const { repositories, login, name, repositoriesContributedTo } =
    data.data.user;
  const stars = repositories.nodes.reduce(
    (sum: number, repo: any) => sum + repo.stargazerCount,
    0,
  );

  const contribYears: number[] =
    (
      await makeQuery(`
    query { viewer { contributionsCollection { contributionYears } } }
  `)
    )?.data?.viewer?.contributionsCollection?.contributionYears || [];

  const contribsByYear = await makeQuery(`
    query {
      viewer {
        ${contribYears
          .map(
            (year) => `
          year${year}: contributionsCollection(
            from: "${year}-01-01T00:00:00Z",
            to: "${year + 1}-01-01T00:00:00Z"
          ) { contributionCalendar { totalContributions } }
        `,
          )
          .join("\n")}
      }
    }
  `);

  const contributionsCount = Object.values(
    contribsByYear?.data?.viewer || {},
  ).reduce(
    (sum: number, y: any) =>
      sum + (y?.contributionCalendar?.totalContributions || 0),
    0,
  );

  const languageStats: Record<string, number> = {};
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
    changedLines: await getChangedLines(GITHUB_ACTOR),
  };
}
