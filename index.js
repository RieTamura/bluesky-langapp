import { AtpAgent } from '@atproto/api'
import chalk from 'chalk'
import inquirer from 'inquirer'
import fs from 'fs'

// ==== 設定 ====
const BLUESKY_ID = 'connectobasan.com'
const BLUESKY_PW = 'vzb3-3vm3-7xhw-2w4i' // パスワードではなく "App Password" を使ってください
const WORDS_FILE = 'words.json'

// ==== JSONファイル準備 ====
if (!fs.existsSync(WORDS_FILE)) {
  fs.writeFileSync(WORDS_FILE, JSON.stringify([], null, 2))
}
let savedWords = JSON.parse(fs.readFileSync(WORDS_FILE))

// ==== Blueskyログイン ====
const agent = new AtpAgent({ service: 'https://bsky.social' })
await agent.login({ identifier: BLUESKY_ID, password: BLUESKY_PW })

// ==== 投稿取得（自分の最新5件） ====
const timeline = await agent.getAuthorFeed({
  actor: BLUESKY_ID,
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
