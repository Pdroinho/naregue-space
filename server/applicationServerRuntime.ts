import type Database from 'better-sqlite3'
import { env } from './env.js'
import type express from 'express'
import { createSecurityStateMaintenance } from './securityStateMaintenance.js'
import { createServerLifecycleRuntime } from './serverLifecycleRuntime.js'

type ManagedRuntime = { start: () => unknown; stop: () => unknown }

type ApplicationServerRuntimeOptions = {
  app: express.Express
  db: Database.Database
  nodeEnv: string
  port: number
  managedRuntimes: ManagedRuntime[]
  closeDatabase: () => void
}

export function createApplicationServerRuntime({
  app,
  db,
  nodeEnv: _nodeEnv,
  port,
  managedRuntimes,
  closeDatabase,
}: ApplicationServerRuntimeOptions) {
  const host = env.HOST
  const securityStateMaintenance = createSecurityStateMaintenance({ db })
  return createServerLifecycleRuntime({
    listen: onListening => app.listen(port, host, onListening),
    listeningAddress: `${host}:${port}`,
    managedRuntimes,
    securityStateMaintenance,
    closeDatabase,
  })
}
