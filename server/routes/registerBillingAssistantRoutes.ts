import { createAbacatepayWebhookRouter } from '../abacatepayWebhook.js'
import { createAdminAssistantOperationsRouter } from './adminAssistantOperationsRoutes.js'
import type { createAssistantPaymentCredits } from '../assistantPaymentCredits.js'
import type Database from 'better-sqlite3'
import type express from 'express'
import { requireActiveSubscription } from '../auth.js'
import { assistantProvider, generateAssistantAnswer, generateBrandSetupSuggestions } from '../assistant.js'
import { confirmAssistantAction } from '../assistantBridge.js'
import { requireWebhookSecret } from '../middleware/requestSecurity.js'
import { createAdminBillingRouter } from './adminBillingRoutes.js'
import { createInfinitePayWebhookRouter } from './infinitePayWebhookRoutes.js'
import { createAdminAssistantBillingRouter } from './adminAssistantBillingRoutes.js'
import { createAdminAssistantAssistantRouter } from './adminAssistantAssistantRoutes.js'
import { createEvolutionWebhookRouter } from './evolutionWebhookRoutes.js'
import { createAdminReferralRouter } from './referralRoutes.js'
import { createAdminOnboardingRouter } from './adminOnboardingRoutes.js'
import { createAdminServicesRouter } from './adminServicesRoutes.js'
import { createAdminProfessionalsRouter } from './adminProfessionalsRoutes.js'
import { createAdminPaymentRouter } from './paymentRoutes.js'
import type { createPaymentBillingService } from '../paymentBillingService.js'
import type { createPaymentWebhookRuntime } from '../paymentWebhookRuntime.js'
import type { createCommercialConfig } from '../commercialConfig.js'
import type { createInfinitePayRuntime } from '../infinitePay.js'
import type { createRequestLimiters } from '../requestLimiters.js'
import type { createWhatsappEvolutionRuntime } from '../whatsappEvolutionRuntime.js'
import type { createClientMarketingConsentService } from '../clientMarketingConsentService.js'

type BillingAssistantRouteOptions = {
  db: Database.Database
  commercial: ReturnType<typeof createCommercialConfig>
  infinitePay: ReturnType<typeof createInfinitePayRuntime>
  limiters: ReturnType<typeof createRequestLimiters>
  whatsapp: ReturnType<typeof createWhatsappEvolutionRuntime>
  clientConsent: ReturnType<typeof createClientMarketingConsentService>
  infinitePayConfigured: boolean
  assistantEnabled: boolean
  evolutionWebhookSecret?: string
  paymentBilling: ReturnType<typeof createPaymentBillingService> | null
  paymentWebhook: ReturnType<typeof createPaymentWebhookRuntime> | null
  assistantPaymentCredits?: ReturnType<typeof createAssistantPaymentCredits> | null
  paymentEnabled: boolean
  production: boolean
}

export function registerBillingAssistantRoutes(app: express.Express, options: BillingAssistantRouteOptions) {
  const { db, commercial, infinitePay, limiters, whatsapp, clientConsent, infinitePayConfigured, assistantEnabled, evolutionWebhookSecret, paymentBilling, paymentWebhook, paymentEnabled, production } = options

  app.use('/api/admin', createAdminBillingRouter({
    db,
    legacyCheckoutEnabled: false,
    billingPlans: commercial.billingPlans,
    billingPlanByCycle: commercial.billingPlanByCycle,
    firstMonthPromoCents: commercial.firstMonthPromoCents,
    hasPaidSubscriptionPurchase: commercial.hasPaidSubscriptionPurchase,
    subscriptionCheckoutQuote: commercial.subscriptionCheckoutQuote,
    createInfinitePayLink: infinitePay.createInfinitePayLink,
  }))

  app.use('/api/admin/assistant/credits', requireActiveSubscription)
  app.use('/api/admin', createAdminAssistantBillingRouter({ db, createInfinitePayLink: infinitePay.createInfinitePayLink, paymentCredits:options.assistantPaymentCredits, paymentEnabled:true }))
  app.use('/api/admin', createAdminPaymentRouter(db, paymentBilling, paymentEnabled, production))
  app.use('/api/webhooks', createAbacatepayWebhookRouter(db, paymentWebhook))

  app.use('/api/webhooks', createInfinitePayWebhookRouter({
    db,
    infinitePayWebhookLimiter: limiters.infinitePayWebhookLimiter,
    infinitePayConfigured,
    logInfinitePayWebhookEvent: infinitePay.logInfinitePayWebhookEvent,
    verifyInfinitePayPayment: infinitePay.verifyInfinitePayPayment,
  }))

  app.use('/api/admin', requireActiveSubscription)

  app.use('/api/admin', createAdminReferralRouter({
    db,
    referralMutationLimiter: limiters.referralMutationLimiter,
    referralToken: commercial.referralToken,
    publicReferralUrl: commercial.publicReferralUrl,
    teamDiscountsAvailable: paymentEnabled && Boolean(paymentBilling),
    creditPreview: paymentBilling?.creditPreview,
  }))

  app.use('/api/admin', createAdminOnboardingRouter({
    db,
    onboardingAssistantLimiter: limiters.onboardingAssistantLimiter,
    assistantEnabled,
    assistantProvider,
    generateBrandSetupSuggestions,
  }))

  app.use('/api/admin', createAdminAssistantOperationsRouter(db, limiters.assistantAssistantLimiter))
  app.use('/api/admin', createAdminAssistantAssistantRouter({
    db,
    assistantAssistantLimiter: limiters.assistantAssistantLimiter,
    assistantEnabled,
    creditCheckoutAvailable:Boolean(assistantEnabled && assistantProvider.apiKey && options.assistantPaymentCredits),
    assistantProvider,
    generateAssistantAnswer,
    generateBrandSetupSuggestions,
    confirmAssistantAction,
  }))

  app.use('/api/webhooks', createEvolutionWebhookRouter({
    db,
    requireEvolutionWebhookSecret: requireWebhookSecret(evolutionWebhookSecret),
    extractEvolutionInbound: whatsapp.extractEvolutionInbound,
    recordWhatsappMessage: whatsapp.recordWhatsappMessage,
    setClientWhatsappMarketingConsent: clientConsent.setClientWhatsappMarketingConsent,
    sendWhatsappTextForTenant: whatsapp.sendWhatsappTextForTenant,
    updateEvolutionConnectionFromWebhook: whatsapp.updateEvolutionConnectionFromWebhook,
    handleEvolutionConfirmationWebhook: whatsapp.handleEvolutionConfirmationWebhook,
  }))

  app.use('/api/admin', createAdminServicesRouter({ db }))
  app.use('/api/admin', createAdminProfessionalsRouter(db))
}
