#!/usr/bin/env node
// Finds Reddit posts about flatmates/roommates and drafts a reply for manual review.
// It never posts anything itself — output is a Markdown file you read, edit, and post by hand.

const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const CONFIG_PATH = path.join(DIR, "config.json");
const SEEN_PATH = path.join(DIR, "state", "seen.json");
const DRAFTS_DIR = path.join(DIR, "drafts");
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

  const seenState = loadJson(SEEN_PATH, { seenPostIds: [] });
  const seenIds = new Set(seenState.seenPostIds);

  const matches = [];

  for (const subreddit of config.subreddits) {
    console.log(`Checking r/${subreddit}...`);
    const posts = await fetchNewPosts(subreddit, config.postLimit ?? 25);

    for (const post of posts) {
      if (seenIds.has(post.id)) continue;
      const haystack = `${post.title ?? ""} ${post.selftext ?? ""}`;
      if (!matchesKeywords(haystack, config.keywords)) continue;

      seenIds.add(post.id);
      matches.push({
        subreddit,
        id: post.id,
        title: post.title,
        permalink: `https://www.reddit.com${post.permalink}`,
        author: post.author,
        createdUtc: post.created_utc,
        draft: draftComment(config, post),
      });
    }
  }

  seenState.seenPostIds = Array.from(seenIds);
  fs.writeFileSync(SEEN_PATH, JSON.stringify(seenState, null, 2));

  if (matches.length === 0) {
    console.log("No new matching posts found.");
    return;
  }

  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(DRAFTS_DIR, `${stamp}.md`);

  const lines = [`# Reddit flatmate matches — ${new Date().toISOString()}`, ""];
  for (const m of matches) {
    lines.push(`## r/${m.subreddit} — ${m.title}`);
    lines.push(`- Link: ${m.permalink}`);
    lines.push(`- Author: u/${m.author}`);
    lines.push("");
    lines.push("**Draft reply (edit before posting):**");
    lines.push("");
    lines.push("> " + m.draft);
    lines.push("");
  }

  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`\nFound ${matches.length} new post(s). Drafts written to:\n${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
