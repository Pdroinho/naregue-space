import { createCipheriv, createDecipheriv } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { appendFile, open, stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'

const MAGIC = Buffer.from('NRBK1')
const IV_BYTES = 12
const TAG_BYTES = 16

function keyFromEnv() {
  const raw = String(process.env.BACKUP_ENCRYPTION_KEY ?? '').trim()
  if (!/^[A-Za-z0-9_-]{43,}$/.test(raw)) throw new Error('BACKUP_ENCRYPTION_KEY deve ser base64url e conter 32 bytes aleatórios.')
  const key = Buffer.from(raw, 'base64url')
  if (key.length !== 32) throw new Error('BACKUP_ENCRYPTION_KEY deve decodificar exatamente 32 bytes.')
  return key
}

async function encrypt(input, output) {
  const { randomBytes } = await import('node:crypto')
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', keyFromEnv(), iv)
  const destination = createWriteStream(output, { flags: 'wx', mode: 0o600 })
  destination.write(Buffer.concat([MAGIC, iv]))
  await pipeline(createReadStream(input), cipher, destination)
  await appendFile(output, cipher.getAuthTag())
}

async function decrypt(input, output) {
  const info = await stat(input)
  const headerBytes = MAGIC.length + IV_BYTES
  if (info.size <= headerBytes + TAG_BYTES) throw new Error('Backup criptografado inválido.')
  const handle = await open(input, 'r')
  try {
    const header = Buffer.alloc(headerBytes)
    await handle.read(header, 0, header.length, 0)
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Formato de backup criptografado desconhecido.')
    const tag = Buffer.alloc(TAG_BYTES)
    await handle.read(tag, 0, TAG_BYTES, info.size - TAG_BYTES)
    const decipher = createDecipheriv('aes-256-gcm', keyFromEnv(), header.subarray(MAGIC.length))
    decipher.setAuthTag(tag)
    await pipeline(
      createReadStream(input, { start: headerBytes, end: info.size - TAG_BYTES - 1 }),
      decipher,
      createWriteStream(output, { flags: 'wx', mode: 0o600 }),
    )
  } finally {
    await handle.close()
  }
}

const [mode, input, output] = process.argv.slice(2)
if (!['encrypt', 'decrypt'].includes(mode) || !input || !output) {
  console.error('Uso: node backup-crypto.mjs <encrypt|decrypt> <entrada> <saida>')
  process.exit(2)
}

try {
  if (mode === 'encrypt') await encrypt(input, output)
  else await decrypt(input, output)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
