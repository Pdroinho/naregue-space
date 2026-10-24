import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
let checks = 0

function check(label, condition) {
  checks += 1
  if (condition) console.log(`✓ ${label}`)
  else { console.error(`✗ ${label}`); failures.push(label) }
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8')
}

const packageJson = JSON.parse(read('package.json'))
const sourceFiles = walk(path.join(root, 'src'))
const sourceText = sourceFiles.filter((file) => /\.(?:css|ts|tsx|html)$/.test(file)).map((file) => fs.readFileSync(file, 'utf8')).join('\n')
const cssText = sourceFiles.filter((file) => file.endsWith('.css')).map((file) => fs.readFileSync(file, 'utf8')).join('\n')
const app = read('src/App.tsx')
const main = read('src/main.tsx')
const theme = read('src/theme.ts')
const design = read('src/design-system.css')
const foundation = read('src/foundation.css')
const assistant = read('src/assistant.css')
const mobilePublic = read('src/mobile-public.css')
const booking = read('src/booking.css')
const financeChart = read('src/components/FinanceFlowChart.tsx')
const assistantLauncher = read('src/components/AssistantChatLauncher.tsx')
const devReferrals = read('src/components/DevReferrals.tsx')
const professionalMigration = read('server/professionalsMigration.ts')
const teamAccessMigration = read('server/teamAccessMigration.ts')
const professionalManager = read('src/components/ProfessionalManager.tsx')
const professionalPortal = read('src/components/ProfessionalPortal.tsx')
const teamInvitePage = read('src/components/TeamInvitePage.tsx')
const productSelect = read('src/components/ProductSelect.tsx')
const professionalsCss = read('src/professionals.css')
const dashboardCss = read('src/dashboard.css')
const appointmentCss = read('src/appointment-lifecycle.css')
const selectCss = read('src/select.css')
const agendaCss = read('src/agenda.css')
const mobileCss = read('src/mobile.css')
const brandCss = read('src/brand.css')
const activeInterfaceSource = sourceFiles
  .filter((file) => /\.(?:ts|tsx)$/.test(file) && path.basename(file) !== 'Icons.tsx')
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n')
const html = read('index.html')
const docker = read('Dockerfile')
const serverIndex = read('server/index.ts')
const publicBookingServer = read('server/publicBooking.ts')
const pricingServer = read('server/pricing.ts')
const eslintConfig = read('eslint.config.js')
const backupScript = read('deploy/backup.sh')
const backupCrypto = read('deploy/backup-crypto.mjs')
const envExample = read('.env.example')


check('public booking projects professionals without contact or admin metadata', publicBookingServer.includes('export function listPublicProfessionals') && publicBookingServer.includes('SELECT id, name, nickname, color, photo_url as photoUrl, inherits_hours as inheritsHours') && !/SELECT id, name, nickname, phone, email/.test(publicBookingServer))
check('public booking route variants share the same handlers', serverIndex.includes('sendPublicServices(req, res, next') && serverIndex.includes('sendPublicBookingConfig(req, res, next') && serverIndex.includes('sendPublicAvailability(req, res, next') && !serverIndex.includes("app.get('/api/public/tenant/:slug/booking', (req, res, next) => {"))
check('public availability exposes reservable slots instead of schedule blocks', publicBookingServer.includes('listPublicAvailableSlots') && serverIndex.includes('res.json({ slots })') && app.includes("api<{ slots: string[] }>") && !app.includes("api<{ blocks: Array<{ startsAt: string; endsAt: string; kind: 'appointment'"))
check('admin subscription gate authenticates before revealing subscription state', serverIndex.includes("app.use('/api/admin', requireAuth, requireActiveSubscription)"))
check('admin navigation is URL-driven and shareable', app.includes("calendar: '/admin/agenda'") && app.includes("clients: '/admin/clientes'") && app.includes('<Route path="/admin/*"'))
check('large feature surfaces are loaded through dynamic imports', app.includes("lazy(() => import('./components/FinanceFlowChart')") && app.includes("lazy(() => import('./components/BusinessAssistant')") && app.includes("lazy(() => import('./LandingPage')"))
check('billing catalog has one server-side source of truth', pricingServer.includes('OFFICIAL_BILLING_PRICES') && !/fallbackPlans|FIRST_MONTH_PROMO_CENTS/.test(read('src/LandingPage.tsx')) && !/VITE_SUBSCRIPTION_PRICE_CENTS|PLAN_MONTHLY_CENTS|SUBSCRIPTION_PRICE_CENTS/.test(envExample + docker))
check('React hook safety rules are active in lint', eslintConfig.includes("'react-hooks/rules-of-hooks': 'error'") && eslintConfig.includes("'react-hooks/exhaustive-deps': 'warn'"))
check('backups are encrypted with a dedicated key before leaving local storage', backupScript.includes('.sqlite.gz.enc') && backupScript.includes('BACKUP_ENCRYPTION_KEY') && backupCrypto.includes("createCipheriv('aes-256-gcm'") && envExample.includes('BACKUP_ENCRYPTION_KEY'))

check('team access schema binds one user to one professional and hashes invitation tokens', teamAccessMigration.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_user') && teamAccessMigration.includes('token_hash TEXT NOT NULL UNIQUE') && teamAccessMigration.includes("role = 'ADMIN'"))
check('team access database guards enforce tenant and role scope', teamAccessMigration.includes('professionals_user_scope_guard_insert') && teamAccessMigration.includes('professional_invites_scope_guard_insert') && teamAccessMigration.includes("u.role IN ('ADMIN', 'PROFESSIONAL')"))
check('professional API is limited to the authenticated professional profile and appointments', serverIndex.includes("app.get('/api/professional/profile', requireRole('PROFESSIONAL')") && serverIndex.includes("app.get('/api/professional/appointments', requireRole('PROFESSIONAL')") && serverIndex.includes('a.professional_id = ?') && serverIndex.includes("app.patch('/api/professional/appointments/:id', requireRole('PROFESSIONAL')"))
check('professional self profile is a minimal projection instead of the admin model', serverIndex.includes('function professionalSelfProfile') && serverIndex.includes('SELECT id, name, nickname, phone, color, photo_url as photoUrl, active') && !/function professionalSelfProfile[\s\S]*?serviceIds/.test(serverIndex.slice(serverIndex.indexOf('function professionalSelfProfile'), serverIndex.indexOf('const appVersion'))))
check('non-admin session identity omits billing state', serverIndex.includes("if (user && user.role !== 'ADMIN')") && serverIndex.includes('delete user.subscriptionStatus') && serverIndex.includes('delete user.subscriptionPeriodEnd'))
check('professional appointment contract omits client email and internal scheduling metadata', /app\.get\('\/api\/professional\/appointments'[\s\S]*?SELECT a\.id, a\.starts_at as startsAt, a\.ends_at as endsAt, a\.status,[\s\S]*?c\.name as clientName, c\.phone as clientPhone,[\s\S]*?s\.name as serviceName, s\.price_cents as priceCents/.test(serverIndex) && !/clientEmail|confirmationStatus|serviceId/.test(professionalPortal))
check('professional appointment writes are least privilege', (() => { const section = serverIndex.slice(serverIndex.indexOf("app.patch('/api/professional/appointments/:id'"), serverIndex.indexOf("app.get('/api/admin/appointments'")); return section.includes("z.enum(['CONFIRMED', 'CANCELLED'])") && !section.includes("'PENDING'") })())
check('team invitations keep raw secrets out of persistence and access logs', serverIndex.includes("randomBytes(32).toString('base64url')") && serverIndex.includes('teamInviteTokenHash(token)') && serverIndex.includes('token_hash') && teamInvitePage.includes('window.location.hash') && teamInvitePage.includes('window.history.replaceState') && professionalManager.includes("#token=${encodeURIComponent(result.data.invite.token)}"))
check('team invitation acceptance is tenant-host scoped and creates professional-only accounts', serverIndex.includes('TEAM_INVITE_HOST_MISMATCH') && serverIndex.includes("'PROFESSIONAL', ?") && app.includes('<Route path="/convite/equipe"') && app.includes('<Route path="/profissional/*"'))
check('team invitation policy is revalidated inside the acceptance transaction', serverIndex.includes('if (teamInviteSecurityIssue(current, req.resolvedTenant?.id) !== null)'))
check('professional workspace never loads the admin application surface', professionalPortal.includes("'/api/professional/profile'") && professionalPortal.includes('/api/professional/appointments') && !professionalPortal.includes('/api/admin/'))
check('team management supports manual profiles and owner-generated individual access', professionalManager.includes("'/api/admin/professionals'") && professionalManager.includes("`/api/admin/professionals/${professional.id}/invite`") && professionalManager.includes('Criar acesso') && professionalManager.includes('Enxerga somente a própria rotina'))
check('owner profile edits update the persistent sidebar identity contract', app.includes('props.user?.photoUrl') && app.includes('ownProfile.nickname || ownProfile.name') && app.includes('professionalId: ownProfile.id'))
check('canonical dropdown uses a keyboard listbox without the rejected check glyph', productSelect.includes('role="listbox"') && productSelect.includes('aria-selected') && productSelect.includes('createPortal') && !/\bCheck\b|<Check(?:\s|\/|>)/.test(productSelect))
check('rejected check glyph is absent from active interface code', !/\bCheck\b|<Check(?:\s|\/|>)/.test(activeInterfaceSource))
check('rejected check glyph is removed from the application icon contract', !read('src/components/Icons.tsx').includes('export const Check') && !fs.existsSync(path.join(root, 'public/icons/hugeicons/tick-01.svg')))
check('team visual direction avoids decorative rails and blinking status decoration', !professionalManager.includes('nr-professionals-intro-rail') && !professionalsCss.includes('.nr-professionals-intro-rail') && !/pulse|blink/i.test(professionalsCss))
check('professional custom hours preserve multiple daily ranges', professionalManager.includes('day.ranges.map((range, rangeIndex)') && professionalManager.includes('day.ranges.map((range) => ({ weekday, ...range }))'))
check('professional editor persists profile, services and schedule in one backend transaction', professionalManager.includes('schedule: { inheritsHours: form.inheritsHours, hours }') && !professionalManager.includes('/hours') && serverIndex.includes('if (schedule) replaceProfessionalHours(tenantId, id, schedule, now)'))
check('dashboard keeps a clean day command without decorative appointment rails', app.includes('nr-dashboard-command') && !app.includes('nr-dashboard-runway') && !dashboardCss.includes('.nr-dashboard-runway'))
check('dashboard metric icons are unboxed and confirmation states use compact dots', dashboardCss.includes('.nr-dashboard-page > .stats-grid .stat-icon') && dashboardCss.includes('background: transparent') && appointmentCss.includes('.appointment-confirmation-overview__metrics i') && appointmentCss.includes('border-radius: 50%'))
check('agenda navigation uses the shared segmented-control visual language', app.includes('<Calendar size={15} /><span>Calendário</span>') && app.includes('<Clock size={15} /><span>Horários</span>') && agendaCss.includes('grid-template-columns: repeat(3, minmax(0, 1fr))') && agendaCss.includes('border-radius: 14px'))
check('canonical dropdown sizes detailed options without exposing native scroll chrome', productSelect.includes('estimatedContentHeight') && productSelect.includes('option.description ? 58 : 48') && selectCss.includes('scrollbar-width: none') && selectCss.includes('.nr-select-menu-scroll::-webkit-scrollbar { display: none; }'))
check('collapsed desktop sidebar suppresses tenant and account copy', brandCss.includes('.nr-shell.has-tenant-brand.is-sidebar-collapsed .nr-sidebar-brand-copy') && brandCss.includes('.nr-shell.is-sidebar-collapsed .nr-sidebar-account-copy'))
check('mobile agenda removes redundant scope copy while preserving block context', mobileCss.includes('.nr-agenda-scope-note { display: none; }') && mobileCss.includes('.nr-agenda-scope-note.is-critical-context'))
check('mobile clients use one spacious overview and a deliberate empty state', mobileCss.includes('.client-mobile-overview { grid-template-columns: 1fr;') && mobileCss.includes('.client-mobile-list > .empty-state {') && mobileCss.includes('min-height: 350px') && mobileCss.includes('.client-mobile-highlight.is-empty { display: none; }'))

check('release uses the stable 2.2.2 version', packageJson.version === '2.2.2' && !/rc|beta|alpha/i.test(packageJson.version))
check('release check is focused and reproducible', packageJson.scripts.check === 'npm run typecheck && npm run lint && npm run test && npm run test:migrations && npm run test:security && npm run test:whatsapp && npm run test:release && npm run build')
check('active frontend is free from the former product vocabulary', !/lash\s*designer|lashdesigner|\bluma\b|cílios|extensão de cílios|salão de beleza|beauty studio/i.test(sourceText))
check('active styles contain no rejected palette vocabulary', !/\b(?:pink|magenta|blush|lilac|wine|rose|vinho|rosa)\b/i.test(cssText))
check('active styles contain no important overrides', !/!important/.test(cssText))
check('active styles do not use viewport-width hacks', !/100d?vw/.test(cssText))
check('static JSX layout styles were moved into semantic CSS', !/style=\{\{\s*(?:height|maxWidth|minHeight|padding|margin|display|gap|justifyContent)\s*:/.test(sourceText))
check('Hugeicons remains the application icon contract', main.includes("./components/OverlayCoordinator") && fs.existsSync(path.join(root, 'src/components/Icons.tsx')) && fs.existsSync(path.join(root, 'public/icons/hugeicons/README.md')))
check('Manrope is the deterministic UI and display family', /family=Manrope/.test(html) && /--font-display:\s*'Manrope'/.test(design) && !/Corify/.test(sourceText + html + docker))
check('operational workspace defaults to light and persists user choice', theme.includes("savedTheme ?? 'light'") && app.includes('toggleTheme()'))
check('dark mode remains an explicit operational option', design.includes(":root[data-mode='admin'][data-theme='dark']") && design.includes(":root[data-mode='tenant'][data-theme='dark']"))
check('keyboard skip link stays outside normal document flow', /\.skip-link\s*\{[^}]*position:\s*fixed[^}]*transform:/s.test(foundation) && /\.skip-link:focus/.test(foundation))
check('tenant accents derive accessible tones for light and dark surfaces', theme.includes('contrastRatio') && theme.includes('readableTone') && theme.includes("'--primary-on-light'") && theme.includes("'--primary-on-dark'"))
check('assistant page and drawer own a complete bottom-anchored layout', /\.nr-assistant--page,\s*\.nr-assistant--drawer\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(0, 1fr\)/s.test(assistant) && assistant.includes('.nr-assistant-workspace { grid-row: 3; }'))
check('mobile referrals use a contained grid instead of a clipped carousel', /\.referral-metrics\s*\{[^}]*display:\s*grid[^}]*overflow:\s*visible/s.test(mobilePublic) && !/\.referral-metrics\s*\{[^}]*overflow-x:\s*auto/s.test(mobilePublic))
check('sidebar renders either the platform wordmark or the tenant identity', app.includes("!props.brand ? <img decoding=\"async\" className=\"nr-sidebar-wordmark\"") && app.includes("props.brand ? <span className=\"nr-sidebar-brand-copy\"><strong>{props.brand.name}</strong><small>Gestão do espaço</small></span> : null"))
check('booking has one progress system only', !/nr-booking-step-count/.test(sourceText) && /nr-booking-steps/.test(app + booking))
check('booking keeps mobile service and time direction', app.includes('nr-booking-mobile-time-groups') && app.includes("label: 'Manhã'") && app.includes("label: 'Noite'"))
check('booking mobile progress keeps all five steps on one row', mobileCss.includes('grid-template-columns: repeat(5, minmax(0, 1fr));') && !mobileCss.includes('grid-template-columns: repeat(4, minmax(0, 1fr));'))
check('booking mobile back action is viewport-fixed and safe-area aware', /\.nr-booking-footer \{[\s\S]*?position: fixed;[\s\S]*?bottom: 0;[\s\S]*?env\(safe-area-inset-bottom\)/.test(mobileCss) && mobileCss.includes('padding-bottom: calc(var(--booking-mobile-footer-height) + env(safe-area-inset-bottom) + 18px)'))
check('booking mobile confirmation CTA clears the fixed back footer', mobileCss.includes('bottom: calc(var(--booking-mobile-footer-height) + env(safe-area-inset-bottom) + 10px);'))
check('booking surfaces availability failures instead of inventing an empty agenda', app.includes('availabilityError') && app.includes('Tentar novamente'))
check('multi-professional operation has management, team scope and public choice', fs.existsSync(path.join(root, 'src/components/ProfessionalManager.tsx')) && app.includes('TeamScopeSelect') && app.includes('Próximo disponível'))
check('professional scheduling is protected by database conflict guards', professionalMigration.includes('appointments_slot_guard_insert') && professionalMigration.includes('time_off_appointment_guard_insert'))
check('finance uses the pinned production chart library', packageJson.dependencies['chart.js'] === '4.5.1' && financeChart.includes("from 'chart.js'") && financeChart.includes("type: 'line'"))
check('assistant launcher is fixed to the viewport through a body portal', assistantLauncher.includes('createPortal') && assistantLauncher.includes('document.body'))
check('rejected circled verification icon is absent from the active interface', !/CheckCircle/.test(sourceText) && !fs.existsSync(path.join(root, 'public/icons/hugeicons/checkmark-circle-01.svg')))
check('DEV command and metrics preserve section spacing', /\.nr-dev-command\s*\{[^}]*margin-bottom:\s*14px/s.test(cssText))
check('DEV referral metrics follow the shared icon and content contract', devReferrals.includes('platform-metric-icon') && devReferrals.includes('<div><span>Links ativos'))
check('photographic booking copy has a legibility overlay', /nr-booking-dossier-photo::after[^}]+linear-gradient/s.test(booking))
check('customer access, referrals and billing have owned visual contracts', main.includes("./client-access.css") && main.includes("./referrals.css") && fs.existsSync(path.join(root, 'src/client-access.css')) && fs.existsSync(path.join(root, 'src/referrals.css')))
check('dialogs use the canonical overlay root', !/className=["'`]modal-overlay/.test(sourceText) && app.includes('<ModalRoot'))
check('production container is non-root and health checked', docker.includes('USER node') && docker.includes('HEALTHCHECK') && docker.includes('/api/ready'))
check('production build has no missing licensed-font gate', !/Corify|public\/fonts\//.test(docker))

const serverFiles = walk(path.join(root, 'server')).filter((file) => /\.(?:ts|mjs)$/.test(file))
const legacyServerMatches = serverFiles.flatMap((file) => {
  const text = fs.readFileSync(file, 'utf8')
  return /lashdesigner/i.test(text) ? [path.relative(root, file)] : []
}).sort()
check('former identifiers are restricted to the compatibility allowlist', JSON.stringify(legacyServerMatches) === JSON.stringify(['server/domains.ts', 'server/legal.ts', 'server/secretCryptoCore.ts']))
check('compatibility identifiers retain their exact persisted values', read('server/secretCryptoCore.ts').includes("lashdesigner:v5:root") && read('server/legal.ts').includes("lashdesigner-marketing-whatsapp-v1") && read('server/domains.ts').includes('_lashdesigner-verification'))

const forbiddenReleaseFiles = [
  'AUDITORIA_REBRANDING_1.5.0-RC1.md', 'RELEASE_1.6.0-RC1.md', 'RELEASE_1.7.0-RC1.md',
  'RELEASE_1.8.0-RC1.md', 'RELEASE_FILES.sha256', 'visual-fixtures',
]
check('stale release artifacts are not shipped', forbiddenReleaseFiles.every((item) => !fs.existsSync(path.join(root, item))))
check('only the stable release audit is shipped', fs.readdirSync(path.join(root, 'scripts')).filter((name) => name.endsWith('-audit.mjs')).every((name) => name === 'stable-release-audit.mjs'))

if (failures.length) {
  console.error(`\n${failures.length}/${checks} checks failed.`)
  process.exit(1)
}
console.log(`\nStable release audit: ${checks}/${checks} checks passed.`)
