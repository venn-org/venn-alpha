#!/usr/bin/env node
// Finds Reddit posts about flatmates/roommates and drafts a reply for manual review.
// It never posts anything itself — matches + drafts are written to data/matches.json,
// which the dashboard (dashboard/index.html) reads directly from GitHub.

const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const CONFIG_PATH = path.join(DIR, "config.json");
const MATCHES_PATH = path.join(DIR, "data", "matches.json");
const USER_AGENT = "venn-flatmate-watch/1.0 (manual-review script; contact via repo owner)";

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function matchesKeywords(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

async function fetchNewPosts(subreddit, limit) {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    console.error(`  ! failed to fetch r/${subreddit}: ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  return (data?.data?.children ?? []).map((c) => c.data);
}

function draftComment({ productName, websiteUrl }, post) {
  return [
    `Hey, saw your post — we're building ${productName} (${websiteUrl}), a flatmate-matching tool `,
    `that pairs people on budget, location, and lifestyle instead of scrolling endless threads. `,
    `Still early days, but thought it might help with what you're looking for. Good luck with the search either way!`,
  ].join("");
}

async function main() {
  const config = loadJson(CONFIG_PATH, null);
  if (!config) {
    console.error(`Missing config at ${CONFIG_PATH}`);
    process.exit(1);
  }

  const existing = loadJson(MATCHES_PATH, []);
  const existingIds = new Set(existing.map((m) => m.id));

  const newMatches = [];

  for (const subreddit of config.subreddits) {
    console.log(`Checking r/${subreddit}...`);
    const posts = await fetchNewPosts(subreddit, config.postLimit ?? 25);

    for (const post of posts) {
      if (existingIds.has(post.id)) continue;
      const haystack = `${post.title ?? ""} ${post.selftext ?? ""}`;
      if (!matchesKeywords(haystack, config.keywords)) continue;

      existingIds.add(post.id);
      newMatches.push({
        id: post.id,
        subreddit,
        title: post.title,
        permalink: `https://www.reddit.com${post.permalink}`,
        author: post.author,
        createdUtc: post.created_utc,
        draft: draftComment(config, post),
        foundAt: new Date().toISOString(),
      });
    }
  }

  if (newMatches.length === 0) {
    console.log("No new matching posts found.");
    return;
  }

  const combined = [...newMatches, ...existing].sort((a, b) => b.createdUtc - a.createdUtc);
  fs.mkdirSync(path.dirname(MATCHES_PATH), { recursive: true });
  fs.writeFileSync(MATCHES_PATH, JSON.stringify(combined, null, 2));
  console.log(`\nFound ${newMatches.length} new post(s). Total tracked: ${combined.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
