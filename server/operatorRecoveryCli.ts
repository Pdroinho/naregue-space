import { getDb, closeDb } from './db.js'
import { issueOperatorRecoveryCode } from './operatorRecovery.js'

try {
  const args = process.argv.slice(2)
  const email = args[0] === '--email' ? args[1]?.trim() : undefined
  if (!((args.length === 1 && args[0] === '--dev') || (args.length === 2 && args[0] === '--email' && email))) {
    throw new Error('Uso: node dist/server/operatorRecoveryCli.js --dev | --email operador@exemplo.com')
  }
  const recovery = issueOperatorRecoveryCode(getDb(), email)
  console.log(`Código de recuperação do operador: ${recovery.code}`)
  console.log(`Válido até ${recovery.expiresAt}. Uso único, somente no navegador em que a senha foi validada.`)
  console.log('Digite este código na verificação do login DEV. Não clique em Reenviar código após gerar a recuperação.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Não foi possível gerar a recuperação.')
  process.exitCode = 1
} finally {
  closeDb()
}
