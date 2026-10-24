import type Database from 'better-sqlite3'
import type { Request } from 'express'
import { z } from 'zod'
import { notFound } from './http.js'

export function readScopeId(db: Database.Database, req: Request): string | null {
  if (req.method !== 'GET' || req.query.professionalId === undefined || req.query.professionalId === '') return null
  const id = z.string().uuid().parse(req.query.professionalId)
  if (!db.prepare('SELECT 1 FROM professionals WHERE id=? AND tenant_id=?').get(id, req.sessionUser?.tenantId)) {
    throw notFound('Profissional não encontrado neste espaço.', 'PROFESSIONAL_NOT_FOUND')
  }
  return id
}

/** Request-local read projections; no global views, connection mutation or SQL values interpolated. */
export function professionalReadDatabase(db: Database.Database, professionalId?: string | null): Database.Database {
  if (!professionalId) return db
  return new Proxy(db, {
    get(target, property) {
      if (property !== 'prepare') {
        const value = Reflect.get(target, property, target)
        return typeof value === 'function' ? value.bind(target) : value
      }
      return (sql: string) => {
        if (!/^\s*SELECT\b/i.test(sql)) return target.prepare(sql)
        const tables = ['appointments','cash_transactions','clients'].filter(table => new RegExp(`\\b(?:FROM|JOIN)\\s+${table}\\b`, 'i').test(sql))
        if (!tables.length) return target.prepare(sql)
        let projection = sql
        for (const table of tables) projection = projection.replace(new RegExp(`\\b(FROM|JOIN)\\s+${table}\\b`, 'gi'), `$1 scoped_${table}`)
        const definitions = tables.map(table => table === 'clients'
          ? 'scoped_clients AS (SELECT c.* FROM clients c WHERE EXISTS(SELECT 1 FROM appointments a WHERE a.tenant_id=c.tenant_id AND a.client_user_id=c.user_id AND a.professional_id=?))'
          : `scoped_${table} AS (SELECT * FROM ${table} WHERE professional_id=?)`)
        const statement = target.prepare(`WITH ${definitions.join(',')} ${projection}`)
        return new Proxy(statement, { get(stmt, method) {
          if (['all','get','iterate'].includes(String(method))) return (...params: unknown[]) =>
            (stmt[method as 'all'] as (...args: unknown[]) => unknown).call(stmt, ...tables.map(() => professionalId), ...params)
          const value = Reflect.get(stmt,method,stmt)
          return typeof value === 'function' ? value.bind(stmt) : value
        } })
      }
    },
  })
}
