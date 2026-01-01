// NOT USED ANYMORE BECAUSE OF RATE LIMITING

import { req } from "./api";

const fetchAllRepos = async (owner: string) => {
  let page = 1;
  const repos: any[] = [];

  while (true) {
    const data = await req<any[]>(
      `/users/${owner}/repos?per_page=100&page=${page}`,
    );

    if (!data || data.length === 0) break;

    repos.push(...data.filter((r: any) => !r.fork));
    page++;
    if (data.length < 100) break;
  }

  return repos;
};

const fetchContributorStats = (owner: string, repo: string) =>
  req<any>(`/repos/${owner}/${repo}/stats/contributors`);

export type ChangedLines = {
  additions: number;
  deletions: number;
};

export const getChangedLines = (reposOwner: string): Promise<ChangedLines> =>
  fetchAllRepos(reposOwner)
    .then((repos) =>
      Promise.all(
        repos.map(({ name }) => fetchContributorStats(reposOwner, name)),
      ),
    )
    .then((stats) => {
      let additions = 0;
      let deletions = 0;

      for (const repoStats of stats) {
        if (!repoStats) continue;
        const me = repoStats.find((c: any) => c.author?.login === reposOwner);
        if (!me) continue;

        for (const week of me.weeks) {
          additions += week.a;
          deletions += week.d;
        }
      }

      return { additions, deletions };
    });
