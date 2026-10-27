export function workspaceLoginUrl(slug: string) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) return '/acessar'
  const configured = String(import.meta.env.VITE_APP_BASE_URL ?? '').trim()
  try {
    const base = configured ? new URL(configured) : new URL(window.location.origin)
    const port = base.port ? `:${base.port}` : ''
    return `${base.protocol}//${slug}.${base.hostname.replace(/^www\./, '')}${port}/login?welcome=1`
  } catch { return '/acessar' }
}
