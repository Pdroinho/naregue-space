export function shouldAutoStartTour(tourKey: string) {
  if (typeof window === 'undefined') return false
  try {
    const prefix = `naregua:tour:${tourKey}`
    return !['v4', 'v3', 'v2', 'v1'].some((version) => localStorage.getItem(`${prefix}:${version}`))
  } catch {
    return true
  }
}
