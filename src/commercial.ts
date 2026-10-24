export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'

export type BillingPlan = {
  cycle: BillingCycle
  months: number
  label: string
  amountCents: number
  monthlyEquivalentCents: number
  savingsPercent: number
  featured: boolean
}

export type PublicBillingCatalog = {
  plans: BillingPlan[]
  firstMonthPromoCents: number
  checkoutProvider: 'INFINITEPAY'
  methods: Array<'PIX' | 'CARD'>
}

export function currencyBRLFromCents(cents: number, options?: Intl.NumberFormatOptions) {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
    ...options,
  })
}
