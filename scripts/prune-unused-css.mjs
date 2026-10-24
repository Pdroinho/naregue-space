import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'

const rootDir = process.cwd()
const sourceDir = path.join(rootDir, 'src')
const targets = process.argv.slice(2)

if (!targets.length) {
  console.error('Uso: node scripts/prune-unused-css.mjs <arquivo.css> [...]')
  process.exit(1)
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

const applicationSource = walk(sourceDir)
  .filter((file) => /\.(?:ts|tsx|html)$/.test(file))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n')
const sourceTokens = new Set(applicationSource.match(/[A-Za-z_][A-Za-z0-9_-]*/g) ?? [])

const classPattern = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g

for (const target of targets) {
  const absolute = path.resolve(rootDir, target)
  const css = fs.readFileSync(absolute, 'utf8')
  const root = postcss.parse(css, { from: absolute })
  let removed = 0
  const removeFromSharedBaseline = ['application.css', 'responsive.css'].includes(path.basename(absolute))
  const ownedPrefixes = [
    'nr-auth',
    'passwordChecklist',
    'fatal-error',
    'notifications-popover',
    'notification-item',
    'notification-mark',
    'landing-',
    'nr-sales-',
  ]

  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes/i.test(rule.parent.name)) return

    const selectors = rule.selectors ?? [rule.selector]
    const usedSelectors = selectors.filter((selector) => {
      const classes = [...selector.matchAll(classPattern)].map((match) => match[1])
      if (!classes.length) return true
      if (removeFromSharedBaseline && classes.some((className) => ownedPrefixes.some((prefix) => className.startsWith(prefix)))) return false
      return classes.every((className) => sourceTokens.has(className))
    })

    if (!usedSelectors.length) {
      rule.remove()
      removed += 1
      return
    }

    if (usedSelectors.length !== selectors.length) rule.selectors = usedSelectors
  })

  root.walkAtRules((rule) => {
    if (rule.nodes && rule.nodes.length === 0) rule.remove()
  })

  fs.writeFileSync(absolute, root.toString())
  console.log(`${target}: ${removed} regras sem consumidor removidas`)
}
