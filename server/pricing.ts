import { buildBillingPlans } from './plans.js'

export const OFFICIAL_BILLING_PRICES = {
  MONTHLY: 5_990,
  QUARTERLY: 16_990,
  SEMIANNUAL: 32_990,
  ANNUAL: 59_880,
} as const

export const FIRST_MONTH_PROMO_CENTS = 3_990
export const billingPlans = buildBillingPlans(OFFICIAL_BILLING_PRICES)
