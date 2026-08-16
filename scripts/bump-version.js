// 커밋할 때마다 pre-commit 훅에서 실행되어 src/lib/version.ts의 버전을 자동 갱신한다.
// 버전 형식: yyyy-mm-dd-v.NN
//   - 같은 날 재커밋   → NN 증가 (v.01 → v.02 → …)
//   - 날짜가 바뀌면    → v.01로 리셋
const fs = require('fs')
const path = require('path')

const VERSION_RE = /(\d{4}-\d{2}-\d{2})-v\.?(\d+)/

function nextVersion(current, today) {
  const match = typeof current === 'string' ? current.match(VERSION_RE) : null
  if (!match) return `${today}-v.01`
  const [, existingDate, nStr] = match
  const n = existingDate === today ? parseInt(nStr, 10) + 1 : 1
  return `${today}-v.${String(n).padStart(2, '0')}`
}

function localToday(now) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

function bump() {
  const target = path.join(__dirname, '..', 'src', 'lib', 'version.ts')
  const src = fs.readFileSync(target, 'utf8')
  const match = src.match(VERSION_RE)
  const newVersion = nextVersion(match ? match[0] : null, localToday(new Date()))
  const updated = match
    ? src.replace(VERSION_RE, newVersion)
    : src.replace(/APP_VERSION = '[^']*'/, `APP_VERSION = '${newVersion}'`)
  fs.writeFileSync(target, updated, 'utf8')
  console.log(`Version bumped → ${newVersion}`)
}

if (require.main === module) bump()

module.exports = { nextVersion, VERSION_RE }
