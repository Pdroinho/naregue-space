import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const read=p=>fs.readFileSync(p,'utf8')
const pkg=JSON.parse(read('package.json'))
assert.equal(pkg.name,'naregua');assert.equal(pkg.version,'3.0.0')
const required=['server/routes/registerPlatformRoutes.ts','server/routes/registerBillingAssistantRoutes.ts','server/routes/registerTenantRoutes.ts','server/payment.ts','server/abacatepayWebhook.ts','server/nareguaUpgrade.ts','server/support/schema.ts','src/app/AppRoutes.tsx','src/features/team/AdminTeam.tsx','src/features/booking/BookingPage.tsx','src/features/support/SupportCenter.tsx','docs/PARIDADE_5_14_2.md','docs/PRODUCAO_3_0.md']
for(const file of required)assert.ok(fs.existsSync(file),file)
assert.ok(read('server/index.ts').split('\n').length<300,'composition stays modular')
assert.ok(read('src/App.tsx').split('\n').length<20,'routes own screen composition')
assert.ok(read('server/secretCryptoCore.ts').includes('lashdesigner:v5:root'),'persistent encryption salt must stay compatible')
assert.ok(read('server/migrate.ts').includes('apply(101,'),'NaRegua lineage bridge is mandatory')
assert.ok(read('server/migrate.ts').includes('apply(115,'),'payment inbox schema is mandatory')
assert.ok(read('server/appFoundation.ts').includes('inflate: false'),'compressed body parsing is disabled')
assert.ok(read('server/abacatepayWebhook.ts').includes('webhookSecret'),'webhook origin authentication is mandatory')
assert.ok(read('server/abacatepayWebhook.ts').includes('validAbacatepaySignature'),'raw-body integrity is mandatory')
assert.ok(read('deploy/backup.sh').includes('.backup'),'online SQLite backup is mandatory')
assert.ok(read('deploy/backup.sh').includes('encrypt'),'backups are encrypted')
assert.ok(read('docker-compose.yml').includes('127.0.0.1:3000:3000'),'application port is private')
assert.ok(read('Dockerfile').includes('USER node'),'runtime must not be root')
assert.ok(!read('Dockerfile').includes('VOLUME ['),'no anonymous recovery volumes')
for(const asset of ['public/brand/logo-wordmark-approved-web.png','public/naregua/hero.webp','public/fonts/manrope-latin.woff2'])assert.ok(fs.statSync(asset).size>100,asset)
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])
for(const file of walk('deploy').filter(p=>p.endsWith('.sh')))assert.ok(!fs.readFileSync(file).includes(Buffer.from('\r\n')),`${file}: shell scripts require LF`)
for(const file of walk('src').filter(p=>/\.(tsx?|css)$/.test(p))){
 const source=read(file)
 assert.ok(!/Lash Designer|Luma|Appmax|APP MAX|profissionais de cílios/.test(source),`${file}: reference branding leaked`)
}
console.log(`Release 3.0: ${required.length} required modules and deployment/security/identity contracts passed.`)
