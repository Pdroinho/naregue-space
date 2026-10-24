import { Router } from 'express'
import type Database from 'better-sqlite3'
import { z } from 'zod'
import { requireRole, requireActiveSubscription } from '../auth.js'
import { badRequest, notFound } from '../http.js'
import { professionalPhotoSchema } from '../professionalPhoto.js'

export function createStaffSelfRouter(db: Database.Database) {
  const router=Router()
  router.use('/staff',requireRole('STAFF'),requireActiveSubscription)
  router.get('/staff/profile',(req,res,next)=>{
    try{
      const professional=db.prepare('SELECT id,name,nickname,color,photo_url as photoUrl FROM professionals WHERE tenant_id=? AND user_id=? AND active=1')
        .get(req.sessionUser!.tenantId,req.sessionUser!.id)
      if(!professional) throw notFound('Perfil não encontrado.')
      res.json({professional})
    }catch(error){next(error)}
  })
  router.patch('/staff/profile',(req,res,next)=>{
    try{
      const body=z.object({name:z.string().trim().min(2).max(120),nickname:z.string().trim().max(80).nullable().optional(),photoUrl:professionalPhotoSchema.optional()}).strict().parse(req.body)
      const changed=db.prepare('UPDATE professionals SET name=?,nickname=?,photo_url=COALESCE(?,photo_url),updated_at=? WHERE tenant_id=? AND user_id=? AND active=1')
        .run(body.name,body.nickname??null,body.photoUrl??null,new Date().toISOString(),req.sessionUser!.tenantId,req.sessionUser!.id)
      if(!changed.changes)throw notFound('Perfil não encontrado.')
      res.json({ok:true})
    }catch(error){next(error)}
  })
  router.patch('/staff/appointments/:id',(req,res,next)=>{
    try{
      const id=z.string().uuid().parse(req.params.id)
      const body=z.object({status:z.enum(['CONFIRMED','CANCELLED'])}).strict().parse(req.body)
      db.transaction(()=>{
        const appointment=db.prepare(`SELECT a.status FROM appointments a JOIN professionals p ON p.id=a.professional_id AND p.tenant_id=a.tenant_id
          WHERE a.id=? AND a.tenant_id=? AND p.user_id=? AND p.active=1`).get(id,req.sessionUser!.tenantId,req.sessionUser!.id) as {status:string}|undefined
        if(!appointment)throw notFound('Agendamento não encontrado.')
        if(appointment.status==='CANCELLED')throw badRequest('Este agendamento já foi cancelado.')
        db.prepare('UPDATE appointments SET status=? WHERE id=? AND tenant_id=?').run(body.status,id,req.sessionUser!.tenantId)
        if(body.status==='CANCELLED')db.prepare("UPDATE appointment_automation_jobs SET status='CANCELLED',updated_at=? WHERE appointment_id=? AND tenant_id=? AND status IN ('PENDING','FAILED')").run(new Date().toISOString(),id,req.sessionUser!.tenantId)
      }).immediate()
      res.json({ok:true})
    }catch(error){next(error)}
  })
  return router
}
