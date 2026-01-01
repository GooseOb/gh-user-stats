import { makeQuery } from "./api";
import { GITHUB_ACTOR } from "./env";
import {
  getDaysOfWeekByContribution,
  getStreaks,
  type StreakInfo,
} from "./streaks";

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

export type Stats = {
  login: string;
  name: string;
  repoCount: number;
  stars: number;
  contributionsCount: number;
  languageStats: Record<string, number>;
  streaks: StreakInfo;
  mostProductiveDay: string;
  issues: {
    count: number;
    closedCount: number;
    averageCloseTime: number;
  };
};

export async function fetchGitHubStats(): Promise<Stats> {
  const data = await makeQuery<any>(query);

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
      await makeQuery<any>(`
    query { viewer { contributionsCollection { contributionYears } } }
  `)
    )?.data?.viewer?.contributionsCollection?.contributionYears || [];

  const contribsByYear = await makeQuery<any>(`
    query {
      viewer {
        ${contribYears
          .map(
            (year) => `
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
        `,
          )
          .join("\n")}
      }
    }
  `);

  const years = Object.values(contribsByYear?.data?.viewer || {});

  const contributionsCount = years.reduce(
    (sum: number, y: any) =>
      sum + (y?.contributionCalendar?.totalContributions || 0),
    0,
  );

  const days = years
    .flatMap(({ contributionCalendar: { weeks } }: any) =>
      weeks.flatMap(({ contributionDays }: any) => contributionDays),
    )
    .map(({ date, contributionCount }: any) => ({
      date: new Date(date),
      contributionCount,
    }));

  const streaks = getStreaks(days);

  const mostProductiveDay =
    getDaysOfWeekByContribution(days).mostProductiveDay.name;

  const languageStats: Record<string, number> = {};
  const issues = {
    count: 0,
    closedCount: 0,
    // in hours
    averageCloseTime: 0,
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
    issues,
  };
}
