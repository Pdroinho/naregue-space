import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'

export class HttpError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function badRequest(message: string, code?: string) {
  return new HttpError(400, message, code)
}

export function unauthorized(message = 'Não autorizado', code?: string) {
  return new HttpError(401, message, code)
}

export function forbidden(message = 'Proibido', code?: string) {
  return new HttpError(403, message, code)
}

export function notFound(message = 'Não encontrado', code?: string) {
  return new HttpError(404, message, code)
}

export function handleError(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, code: err.code })
    return
  }

  if (err instanceof z.ZodError) {
    res.status(400).json({ message: 'Dados inválidos', code: 'VALIDATION_ERROR' })
    return
  }

  const parserStatus = err && typeof err === 'object' && 'status' in err ? Number(err.status) : 0
  if ([400,413,415].includes(parserStatus)) {
    res.status(parserStatus).json({message: parserStatus===413 ? 'Solicitação muito grande.' : parserStatus===415 ? 'Formato de solicitação não aceito.' : 'Solicitação inválida.',code:'INVALID_REQUEST_BODY'});return
  }

  const requestId = res.getHeader('X-Request-Id')
  console.error('[HTTP] erro interno', {
    requestId,
    method: req.method,
    path: req.path.replace(/(\/domains\/authorize\/)[^/]+/, '$1[redacted]').replace(/(\/professional-invitations\/)[^/]+/, '$1[redacted]'),
    error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err),
  })

  res.status(500).json({ message: 'Erro interno', code: 'INTERNAL_ERROR', requestId })
}
