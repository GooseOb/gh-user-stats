const getEnvVar = (key: string): string => {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return val;
};

export const ACCESS_TOKEN = getEnvVar("ACCESS_TOKEN");
export const GITHUB_ACTOR = getEnvVar("GITHUB_ACTOR");
