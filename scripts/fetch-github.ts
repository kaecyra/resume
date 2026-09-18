import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { load_landing_data } from "../src/lib/landing.js";

// Not itself unit tested (ENGINEERING.md #13: don't test passthroughs to a
// third-party library). All the logic worth testing - grid shaping, level
// bucketing - lives in src/lib/github.ts, which has its own fixture-driven
// tests. This script is thin glue: call the API, write the file.
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

const CONTRIBUTION_CALENDAR_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

interface GraphqlContributionDay {
  date: string;
  contributionCount: number;
}

interface GraphqlContributionWeek {
  contributionDays: GraphqlContributionDay[];
}

interface GraphqlResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions: number;
          weeks: GraphqlContributionWeek[];
        };
      };
    };
  };
  errors?: unknown[];
}

async function fetch_contribution_calendar(
  login: string,
  token: string,
): Promise<{ total_count: number; days: { date: string; count: number }[] }> {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `bearer ${token}`,
      "User-Agent": "resume-fetch-github-script",
    },
    body: JSON.stringify({ query: CONTRIBUTION_CALENDAR_QUERY, variables: { login } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as GraphqlResponse;

  if (payload.errors) {
    throw new Error(`GitHub GraphQL returned errors: ${JSON.stringify(payload.errors)}`);
  }

  const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    throw new Error("GitHub GraphQL response is missing contributionCalendar");
  }

  // Only date and count ever leave this function - the GraphQL response
  // carries no repository names for this query, and nothing here reaches
  // for any that could identify one.
  const days = calendar.weeks.flatMap((week) =>
    week.contributionDays.map((day) => ({ date: day.date, count: day.contributionCount })),
  );

  return { total_count: calendar.totalContributions, days };
}

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_CONTRIB_PAT;
  if (!token) {
    throw new Error("GITHUB_TOKEN (or GH_CONTRIB_PAT) is not set");
  }

  const landing = load_landing_data();
  const { total_count, days } = await fetch_contribution_calendar(landing.github.user, token);

  const output_dir = resolve("data", "generated");
  mkdirSync(output_dir, { recursive: true });

  const output = {
    generated_at: new Date().toISOString(),
    total_count,
    days,
  };

  const output_path = resolve(output_dir, "github.json");
  writeFileSync(output_path, JSON.stringify(output, null, 2));

  console.log(`GitHub contribution data written: ${output_path} (${days.length} days, ${total_count} total)`);
}

main().catch((err) => {
  console.error("Failed to fetch GitHub contribution data:", err);
  process.exit(1);
});
