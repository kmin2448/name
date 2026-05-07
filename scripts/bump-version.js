// Automatically updates the version string in src/app/page.tsx before push.
// Version format: yyyy-mm-dd-vN
//   - Same calendar day  → N increments (v1 → v2 → v3 …)
//   - New day            → resets to v1
const fs = require('fs')
const path = require('path')

const TARGET = path.join(__dirname, '..', 'src', 'app', 'page.tsx')
const VERSION_RE = /(\d{4}-\d{2}-\d{2})-v(\d+)/

const src = fs.readFileSync(TARGET, 'utf8')
const match = src.match(VERSION_RE)

// Today's date in local timezone (YYYY-MM-DD)
const now = new Date()
const today = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-')

let newVersion
if (match) {
  const [, existingDate, nStr] = match
  const n = parseInt(nStr, 10)
  newVersion = existingDate === today ? `${today}-v${n + 1}` : `${today}-v1`
} else {
  newVersion = `${today}-v1`
}

const updated = match
  ? src.replace(VERSION_RE, newVersion)
  : src

fs.writeFileSync(TARGET, updated, 'utf8')
console.log(`Version bumped → ${newVersion}`)
