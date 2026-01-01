type ContributionDay = {
  date: Date;
  contributionCount: number;
};

export type StreakInfo = {
  longest: number;
  current: number;
  longestTimeframe?: { from: Date; to: Date };
};

export type Day = {
  name: string;
  count: number;
};

export const getDaysOfWeekByContribution = (
  contributions: ContributionDay[],
): {
  daysOfWeek: Day[];
  mostProductiveDay: Day;
} => {
  const days: Day[] = [
    { name: "Monday", count: 0 },
    { name: "Tuesday", count: 0 },
    { name: "Wednesday", count: 0 },
    { name: "Thursday", count: 0 },
    { name: "Friday", count: 0 },
    { name: "Saturday", count: 0 },
    { name: "Sunday", count: 0 },
  ];

  for (const day of contributions) {
    const dayOfWeek = day.date.getDay(); // 0 (Sun) to 6 (Sat)
    const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon(0)-Sun(6)
    days[index]!.count += day.contributionCount;
  }

  let maxContributions = days[0]!;
  let mostProductiveDayIndex = 0;

  for (let i = 1; i < days.length; i++) {
    if (days[i]!.count > maxContributions.count) {
      maxContributions = days[i]!;
      mostProductiveDayIndex = i;
    }
  }

  return {
    daysOfWeek: days,
    mostProductiveDay: days[mostProductiveDayIndex]!,
  };
};

export const getStreaks = (contributions: ContributionDay[]): StreakInfo => {
  let longest = 0;
  let current = 0;
  const longestTimeframe: { from: Date; to: Date } = {
    from: new Date(),
    to: new Date(),
  };

  // Sort by date ascending just in case
  const sorted = contributions
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i]!;
    if (day.contributionCount > 0) {
      current++;
    } else {
      if (longest < current) {
        longest = current;
        longestTimeframe.from = new Date(sorted[i - current]!.date);
        longestTimeframe.to = new Date(sorted[i - 1]!.date);
      }
      // longest = Math.max(longest, current);
      current = 0;
    }
  }

  // Check last streak
  longest = Math.max(longest, current);

  return {
    longest,
    current,
    longestTimeframe: longest > 0 ? longestTimeframe : undefined,
  };
};
