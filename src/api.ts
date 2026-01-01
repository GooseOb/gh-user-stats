import { ACCESS_TOKEN } from "./env";

const sleep = (ms: number) =>
  new Promise((res) => {
    setTimeout(res, ms);
  });

export const req = async <T>(endpoint: string) => {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`https://api.github.com${endpoint}`, {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: "application/vnd.github+json",
    });

    if (res.status === 202) {
      await sleep(2000);
      continue;
    }

    if (!res.ok) {
      console.error(
        `Request to ${endpoint} failed: ${res.status} ${res.statusText}`,
      );
      return null;
    }

    return res.json() as T;
  }

  console.error(
    `GitHub API request failed after multiple attempts: ${endpoint}`,
  );

  return null;
};

export const makeQuery = <T>(query: string) =>
  fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query }),
  }).then((res) => res.json()) as Promise<T>;
