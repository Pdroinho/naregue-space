import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { SessionUser } from '../../types'
export function useSupportNotifications(user?: SessionUser | null) {
  const userId=user?.id, role=user?.role
  const [count, setCount] = useState(0)
  useEffect(() => {
    let current = true,
      inFlight = false
    setCount(0)
    if (!userId || !role || !['DEV', 'ADMIN', 'STAFF'].includes(role)) return
    const controller = new AbortController()
    async function load() {
      if (inFlight || document.visibilityState !== 'visible') return
      inFlight = true
      const result = await api<{ unreadCount: number }>(
        '/api/support/notifications',
        { signal: controller.signal },
      )
      if (current && result.ok) setCount(result.data.unreadCount)
      inFlight = false
    }
    void load()
    const timer = window.setInterval(() => void load(), 25000)
    window.addEventListener('support-notifications-updated', load)
    document.addEventListener('visibilitychange', load)
    return () => {
      current = false
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('support-notifications-updated', load)
      document.removeEventListener('visibilitychange', load)
    }
  }, [userId, role])
  return count
}
