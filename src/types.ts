export type Role = 'DEV' | 'ADMIN' | 'PROFESSIONAL' | 'CLIENT'

export type AppointmentConfirmationStatus =
  | 'NOT_REQUESTED'
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'NO_RESPONSE'
  | 'DELIVERY_FAILED'
  | 'MANUALLY_CONFIRMED'

export type TenantPublic = {
  id: string
  slug: string
  name: string
  primaryColor: string
  logoUrl: string | null
  publicBaseUrl?: string | null
}

export type TenantDev = TenantPublic & {
  createdAt: string
  adminEmail: string | null
  userCount: number
  status?: 'ACTIVE' | 'SUSPENDED' | 'DISABLED'
  subscriptionStatus?: string | null
  subscriptionPeriodEnd?: string | null
}

export type SessionUser = {
  id: string
  name?: string
  email: string
  role: Role
  tenantId: string | null
  tenantSlug: string | null
  subscriptionStatus?: string | null
  professionalId?: string | null
  photoUrl?: string | null
  professionalColor?: string | null
}

export type PublicProfessional = {
  id: string
  name: string
  nickname: string | null
  color: string
  photoUrl: string | null
  inheritsHours: boolean
  serviceIds: string[]
}

export type Professional = {
  id: string
  name: string
  nickname: string | null
  phone: string | null
  email: string | null
  color: string
  photoUrl: string | null
  active: boolean
  inheritsHours: boolean
  sortOrder: number
  serviceIds: string[]
  hours: Array<{ id: string; professionalId: string; weekday: number; startMinute: number; endMinute: number }>
  createdAt: string
  updatedAt: string
  userId: string | null
  accessStatus: 'OWNER' | 'ACTIVE' | 'INVITED' | 'NONE'
  inviteExpiresAt: string | null
}

export type CalendarEvent = {
  id: string
  title: string
  clientName: string
  start: string // ISO date string
  end: string // ISO date string
  color?: string
  textColor?: string
  status: 'confirmed' | 'pending' | 'cancelled'
  confirmationStatus?: AppointmentConfirmationStatus
  confirmationSentAt?: string | null
  confirmationRespondedAt?: string | null
  appointmentReminderSentAt?: string | null
  clientPhone?: string | null
  professionalId?: string
  professionalName?: string
  professionalColor?: string
  professionalPhotoUrl?: string | null
}
