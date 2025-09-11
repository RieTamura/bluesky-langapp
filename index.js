import { AtpAgent } from '@atproto/api'
import chalk from 'chalk'
import inquirer from 'inquirer'
import fs from 'fs'

// ==== 設定（環境変数経由） ====
// NOTE: Do NOT default identifiers to empty strings because that hides missing env values
// and can make presence checks ambiguous. Purpose & priority:
//  - BLUESKY_PW: required App Password for login.
//  - BLUESKY_ID: optional legacy identifier used for login if provided (e.g. handle).
//  - BLUESKY_ACTOR: explicit actor to use for fetching feeds (handle or DID). If both
//    BLUESKY_ACTOR and BLUESKY_ID are provided, BLUESKY_ACTOR takes precedence for
//    feed fetching. After successful login, session DID/handle override both.
const BLUESKY_ID = process.env.BLUESKY_ID ?? undefined;
const BLUESKY_ACTOR = process.env.BLUESKY_ACTOR ?? undefined;
const BLUESKY_SERVICE_URL = process.env.BLUESKY_SERVICE_URL || 'https://bsky.social';
const BLUESKY_PW = process.env.BLUESKY_PW; // App Password を environment variable に設定して使ってください
const WORDS_FILE = 'words.json';

async function main() {

// ==== JSONファイル準備 ====
if (!fs.existsSync(WORDS_FILE)) {
  fs.writeFileSync(WORDS_FILE, JSON.stringify([], null, 2))
}
let savedWords = JSON.parse(fs.readFileSync(WORDS_FILE, 'utf8'))

// ==== Blueskyログイン ====
  if (!BLUESKY_PW) {
    console.error('Error: BLUESKY_PW not set. Set environment variable BLUESKY_PW to your App Password to run this script.')
    process.exitCode = 1
    return
  }

const agent = new AtpAgent({ service: BLUESKY_SERVICE_URL })
await agent.login({ identifier: BLUESKY_ID ?? undefined, password: BLUESKY_PW })

// Determine actor to fetch feed for. Priority (highest -> lowest):
// 1) session DID (agent.session?.did)
// 2) session handle (agent.session?.handle)
// 3) BLUESKY_ACTOR env
// 4) BLUESKY_ID env
const sessionDid = agent.session?.did;
const sessionHandle = agent.session?.handle;
const actor = sessionDid ?? sessionHandle ?? BLUESKY_ACTOR ?? BLUESKY_ID ?? undefined;
// Use explicit presence checks (avoid truthiness on empty strings)
if (typeof actor !== 'string' || actor.length === 0) {
  console.warn('No actor resolved to fetch feed for. Set BLUESKY_ACTOR or BLUESKY_ID env, or ensure login succeeded.');
}

// ==== 投稿取得（自分の最新5件） ====
const timeline = await agent.getAuthorFeed({
  actor: actor,
  limit: 5
})

for (const post of timeline.data.feed) {
  const text = post.post.record.text
  console.log(chalk.blue(`\n投稿: ${text}\n`))

  // 単語分割（超シンプル: 空白で分ける）
  const words = text.split(/\s+/)

  for (const word of words) {
    const known = savedWords.find(w => w.word === word)
    if (known) {
      console.log(chalk.green(word)) // 既知語 → 緑
    } else {
      console.log(chalk.red(word))   // 未知語 → 赤
      const answer = await inquirer.prompt([
        { type: 'confirm', name: 'save', message: `この単語を保存しますか？ (${word})` }
      ])
      if (answer.save) {
        savedWords.push({ word, status: 'unknown', date: new Date().toISOString() })
        fs.writeFileSync(WORDS_FILE, JSON.stringify(savedWords, null, 2))
        console.log(chalk.yellow(`${word} を保存しました！`))
      }
    }
  }
}

}

main().catch(err => {
  console.error('Fatal error in script:', err);
  process.exitCode = 1;
});
