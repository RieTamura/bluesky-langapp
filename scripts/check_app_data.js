import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, '..', 'app-data.json');

function loadData() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read or parse', DATA_PATH, err.message);
    process.exit(2);
  }
}

function main() {
  const data = loadData();
  const words = Array.isArray(data.words) ? data.words : [];

  console.log('Analyzing', DATA_PATH);
  console.log('Total words:', words.length);

  // 1) missing normalizedWord
  const missingNormalized = words.filter(w => w.normalizedWord == null);
  console.log('\n=== Missing normalizedWord ===');
  if (missingNormalized.length === 0) {
    console.log('None');
  } else {
    missingNormalized.forEach(w => console.log(`${w.id} (userId=${w.userId} word=${w.word} lang=${w.languageCode || 'n/a'})`));
  }

  // 2) counts per userId
  const countsByUser = {};
  for (const w of words) {
    const uid = w.userId || '<<missing_userId>>';
    countsByUser[uid] = (countsByUser[uid] || 0) + 1;
  }
  console.log('\n=== Counts per userId ===');
  Object.keys(countsByUser).sort((a,b)=>countsByUser[b]-countsByUser[a]).forEach(uid => {
    console.log(`${countsByUser[uid].toString().padStart(4)}  ${uid}`);
  });

  // 3) duplicates within same userId (by languageCode and normalizedWord)
  const map = new Map();
  for (const w of words) {
    const uid = w.userId || '<<missing_userId>>';
    const lang = w.languageCode || '<<no_lang>>';
    const norm = w.normalizedWord == null ? '<<NULL>>' : w.normalizedWord;
    const key = `${uid}|||${lang}|||${norm}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(w);
  }

  console.log('\n=== Duplicates within same userId (userId | language | normalizedWord) ===');
  let anyDup = false;
  for (const [key, arr] of map) {
    if (arr.length > 1) {
      anyDup = true;
      const [uid, lang, norm] = key.split('|||');
      console.log(`\n${arr.length} entries  userId=${uid} lang=${lang} normalizedWord=${norm}`);
      arr.forEach(w => console.log(`  - ${w.id} word='${w.word}' date=${w.date || 'n/a'}`));
    }
  }
  if (!anyDup) console.log('None');

  // 4) check for mixing default_user and connectobasan.com
  const usersOfInterest = ['default_user'];
  const hasConnect = Object.keys(countsByUser).some(u => u.includes('connectobasan.com') || u === 'connectobasan.com');
  console.log('\n=== Special users presence ===');
  usersOfInterest.forEach(u => {
    console.log(`${u}: ${countsByUser[u] || 0}`);
  });
  console.log(`connectobasan.com present: ${hasConnect}`);

  // 5) migration-risk: normalizedWord present under default_user and also present under another user
  const normToUsers = new Map();
  for (const w of words) {
    const norm = w.normalizedWord == null ? null : w.normalizedWord;
    if (!norm) continue;
    const uid = w.userId || '<<missing_userId>>';
    const set = normToUsers.get(norm) || new Set();
    set.add(uid);
    normToUsers.set(norm, set);
  }

  const conflicts = [];
  for (const [norm, uSet] of normToUsers) {
    if (uSet.has('default_user') && uSet.size > 1) {
      conflicts.push({ normalizedWord: norm, users: Array.from(uSet) });
    }
  }

  console.log('\n=== Migration-risk duplicates (normalizedWord present for default_user AND other user) ===');
  if (conflicts.length === 0) {
    console.log('None');
  } else {
    conflicts.forEach(c => console.log(`${c.normalizedWord}  users=${c.users.join(',')}`));
    console.log('\nNote: If LearningService migrates from default_user only when target user has no matching word, these default_user entries may never surface.');
  }

  // 6) summary counts
  const nullNormCount = words.filter(w => w.normalizedWord == null).length;
  console.log(`\nSummary: total=${words.length} missing_normalized=${nullNormCount} unique_users=${Object.keys(countsByUser).length}`);
}

main();
