import { brandColumns, logoLayoutSchema, logoSizeSchema, saveBrandPresentation, logoSuggestionSchema } from '../brandPresentation.js'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { requireRole } from '../auth.js'
import { badRequest } from '../http.js'

type BrandSuggestionInput = {
  businessName: string
  preferences: string
  logoDataUrl?: string | null
}

type BrandPalette = {
  name: string
  primary: string
  secondary: string
  background: string
  rationale: string
}

type BrandSuggestionResult = {
  palettes: BrandPalette[]
  logoPresentation?: {layout: 'SYMBOL_NAME' | 'FULL'; size: 'S' | 'M' | 'L'; rationale: string}
  inputTokens: number
  outputTokens: number
  costUsd: number
  model: string
}

type AdminOnboardingRouterOptions = {
  db: Database.Database
  onboardingAssistantLimiter: RequestHandler
  assistantEnabled: boolean
  assistantProvider: { apiKey: string | undefined; visionModel: string; setupModel?: string }
  generateBrandSetupSuggestions: (input: BrandSuggestionInput) => Promise<BrandSuggestionResult>
  now?: () => Date
}

const curatedBrandPalettes = (_preferences: string): BrandPalette[] => [
  {name:'Cobre e petróleo',primary:'#b85a30',secondary:'#031722',background:'#f7f0e4',rationale:'Contraste, precisão e acolhimento para a barbearia.'},
  {name:'Ofício clássico',primary:'#82605b',secondary:'#312927',background:'#faf7f3',rationale:'Neutros quentes com uma assinatura discreta.'},
  {name:'Petróleo essencial',primary:'#0b3b4d',secondary:'#102832',background:'#fffdf8',rationale:'Estrutura nítida e leitura confortável.'},
]

export function createAdminOnboardingRouter({
  db,
  onboardingAssistantLimiter,
  assistantEnabled,
  assistantProvider,
  generateBrandSetupSuggestions,
  now = () => new Date(),
}: AdminOnboardingRouterOptions) {
  const router = Router()

  router.get('/onboarding', requireRole('ADMIN'), (req, res, next) => {
    try {
      const tenantId = req.sessionUser?.tenantId
      if (!tenantId) return next(badRequest('Tenant inválido', 'INVALID_TENANT'))
      const onboarding = db.prepare(`
        SELECT status, mode, current_step as currentStep, answers_json as answersJson,
               ai_attempts as aiAttempts, completed_at as completedAt
        FROM tenant_onboarding WHERE tenant_id = ?
      `).get(tenantId) as { status: string; mode: string | null; currentStep: number; answersJson: string; aiAttempts: number; completedAt: string | null } | undefined
      res.json({
        onboarding: onboarding
          ? { ...onboarding, answers: JSON.parse(onboarding.answersJson || '{}'), answersJson: undefined }
          : { status: 'COMPLETED', mode: null, currentStep: 4, answers: {}, aiAttempts: 0, completedAt: null },
        assistantEnabled: Boolean(assistantEnabled && assistantProvider.apiKey),
        visionModel: assistantProvider.setupModel || assistantProvider.visionModel,
      })
    } catch (err) {
      next(err)
    }
  })

  // Preserve the original order: AI throttling happens before authentication.
  router.post('/onboarding/brand-suggestions', onboardingAssistantLimiter, requireRole('ADMIN'), async (req, res, next) => {
    try {
      const tenantId = req.sessionUser?.tenantId
      const userId = req.sessionUser?.id
      if (!tenantId || !userId) return next(badRequest('Tenant inválido', 'INVALID_TENANT'))
      const body = z.object({
        businessName: z.string().trim().min(2).max(120),
        preferences: z.string().trim().max(280).default(''),
        logoDataUrl: z.string().max(450_000).refine((value) => /^data:image\/(?:png|jpeg|webp);base64,/i.test(value), 'Logo inválida').nullable().optional(),
      }).parse(req.body ?? {})
      const fallback = curatedBrandPalettes(body.preferences)
      if (!assistantEnabled || !assistantProvider.apiKey) return res.json({ palettes: fallback, source: 'CURATED' })

      const timestamp = now().toISOString()
      const reserved = db.prepare(`
        UPDATE tenant_onboarding SET ai_attempts = ai_attempts + 1, updated_at = ?
        WHERE tenant_id = ? AND status = 'PENDING' AND ai_attempts < 3
      `).run(timestamp, tenantId)
      if (reserved.changes !== 1) return res.json({ palettes: fallback, source: 'CURATED', limitReached: true })
      try {
        const answer = await generateBrandSetupSuggestions(body)
        db.prepare(`
          INSERT INTO assistant_usage
            (id, tenant_id, user_id, request_day, input_chars, input_tokens, output_tokens,
             cost_usd, vision_inputs, status, model, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)
        `).run(
          randomUUID(), tenantId, userId, timestamp.slice(0, 10), body.preferences.length,
          answer.inputTokens, answer.outputTokens, answer.costUsd, body.logoDataUrl ? 1 : 0,
          answer.model, timestamp,
        )
        const logo = logoSuggestionSchema.safeParse(answer.logoPresentation)
        return res.json({ palettes: answer.palettes, logoPresentation: logo.success ? logo.data : undefined, source: 'VISION' })
      } catch (error) {
        console.warn('[Onboarding visual]', error instanceof Error ? error.message : error)
        return res.json({ palettes: fallback, source: 'CURATED', fallback: true })
      }
    } catch (err) {
      next(err)
    }
  })

  router.post('/onboarding/complete', requireRole('ADMIN'), (req, res, next) => {
    try {
      const tenantId = req.sessionUser?.tenantId
      if (!tenantId) return next(badRequest('Tenant inválido', 'INVALID_TENANT'))
      const imageUrl = z.string().max(450_000).refine(
        (value) => /^data:image\/(?:png|jpeg|webp);base64,/i.test(value) || /^https:\/\//i.test(value),
        'Logo inválida',
      )
      const body = z.object({
        mode: z.enum(['ASSISTED', 'MANUAL']),
        businessName: z.string().trim().min(2).max(120),
        primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
        secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
        backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
        logoLayout: logoLayoutSchema.optional(),
        logoSize: logoSizeSchema.optional(),
        logoUrl: imageUrl.nullable().optional(),
        workingDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
        startMinute: z.number().int().min(0).max(1380),
        endMinute: z.number().int().min(60).max(1440),
        services: z.array(z.object({
          name: z.string().trim().min(2).max(100),
          durationMinutes: z.number().int().min(15).max(480),
          priceCents: z.number().int().min(0).max(10_000_000),
        })).min(1).max(8),
        answers: z.record(z.string(), z.union([z.string().max(280), z.number(), z.boolean()])).default({}),
      }).refine((value) => value.endMinute > value.startMinute, {
        message: 'Horário final deve ser posterior ao inicial',
        path: ['endMinute'],
      }).parse(req.body ?? {})
      const timestamp = now().toISOString()
      db.transaction(() => {
        saveBrandPresentation(db, tenantId, body.logoLayout, body.logoSize, body.backgroundColor, body.backgroundColor ? body.secondaryColor : undefined)
        db.prepare(`UPDATE tenants SET name = ?, primary_color = ?, logo_url = ? WHERE id = ?`)
          .run(body.businessName, body.primaryColor.toUpperCase(), body.logoUrl || null, tenantId)
        db.prepare(`UPDATE tenant_settings SET secondary_color = ?, updated_at = ? WHERE tenant_id = ?`)
          .run(body.secondaryColor.toUpperCase(), timestamp, tenantId)
        db.prepare(`DELETE FROM business_hours WHERE tenant_id = ?`).run(tenantId)
        const insertHour = db.prepare(`
          INSERT INTO business_hours (id, tenant_id, weekday, start_minute, end_minute, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        for (const weekday of [...new Set(body.workingDays)].sort()) {
          insertHour.run(randomUUID(), tenantId, weekday, body.startMinute, body.endMinute, timestamp)
        }
        const activeServices = Number((db.prepare(`
          SELECT COUNT(*) AS count FROM services WHERE tenant_id = ? AND active = 1
        `).get(tenantId) as { count: number }).count)
        if (activeServices === 0) {
          const insertService = db.prepare(`
            INSERT INTO services
              (id, tenant_id, name, duration_minutes, price_cents, cover_url, active, created_at)
            VALUES (?, ?, ?, ?, ?, NULL, 1, ?)
          `)
          for (const service of body.services) {
            insertService.run(randomUUID(), tenantId, service.name, service.durationMinutes, service.priceCents, timestamp)
          }
        }
        db.prepare(`
          UPDATE tenant_onboarding
          SET status = 'COMPLETED', mode = ?, current_step = 4, answers_json = ?, completed_at = ?, updated_at = ?
          WHERE tenant_id = ?
        `).run(body.mode, JSON.stringify(body.answers), timestamp, timestamp, tenantId)
      })()
      const tenant = db.prepare(`
        SELECT id, slug, name, primary_color as primaryColor, logo_url as logoUrl${brandColumns(db)}
        FROM tenants WHERE id = ?
      `).get(tenantId)
      res.json({ onboarding: { status: 'COMPLETED' }, tenant })
    } catch (err) {
      next(err)
    }
  })

  router.post('/onboarding/skip', requireRole('ADMIN'), (req, res, next) => {
    try {
      const tenantId = req.sessionUser?.tenantId
      if (!tenantId) return next(badRequest('Tenant inválido', 'INVALID_TENANT'))
      const timestamp = now().toISOString()
      db.prepare(`
        UPDATE tenant_onboarding
        SET status = 'SKIPPED', current_step = 4, completed_at = ?, updated_at = ?
        WHERE tenant_id = ? AND status = 'PENDING'
      `).run(timestamp, timestamp, tenantId)
      res.json({ onboarding: { status: 'SKIPPED' } })
    } catch (err) {
      next(err)
    }
  })

  return router
}
