const getEnvVar = (keys: string[]): string => {
  for (const key of keys) {
    const val = process.env[key] || "";
    if (val) return val;
  }

  throw new Error(
    `Set at least one of the following env vars: ${keys.join(", ")}`,
  );
};

export const ACCESS_TOKEN = getEnvVar(["INPUT_TOKEN", "GITHUB_TOKEN"]);
export const GITHUB_ACTOR = getEnvVar(["GITHUB_ACTOR"]);
