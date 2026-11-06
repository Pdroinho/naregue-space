import { Router,type Request,type RequestHandler } from 'express'
import type Database from 'better-sqlite3'
import { randomUUID,createHash } from 'node:crypto'
import { z } from 'zod'
import { requireRole } from '../auth.js'
import { badRequest,forbidden,unauthorized } from '../http.js'
import { verifyPassword } from '../security.js'
import { CASH_POLICY,type ReferralCashService } from '../referralCash.js'
import { CASH_RULES } from '../referralCashPolicy.js'

export function createReferralCashRouters(options:{db:Database.Database;cash:ReferralCashService;requireDevHost:RequestHandler;mutationLimiter:RequestHandler;passwordLimiter:RequestHandler;token:()=>string;publicUrl:(token:string)=>string;enabled:boolean;verifyReward:(id:string)=>Promise<boolean>}){
  const {db,cash}=options,admin=Router(),dev=Router()
  function tenant(req:Request){const id=req.sessionUser?.tenantId;if(!id)throw forbidden();if(req.resolvedTenant&&req.resolvedTenant.id!==id)throw forbidden();return id}
  async function reauthenticate(req:Request,password:string){const row=db.prepare('SELECT password_hash AS hash FROM users WHERE id=?').get(req.sessionUser!.id) as {hash:string}|undefined;if(!row||!await verifyPassword(password,row.hash))throw unauthorized('Senha atual incorreta.','INVALID_CURRENT_PASSWORD')}
  admin.get('/referrals/cash',requireRole('ADMIN'),(req,res,next)=>{try{const data=cash.overview(tenant(req));res.json({...data,enabled:options.enabled,canJoin:!req.sessionUser?.billingRecovery,link:data.link?{...data.link,url:options.publicUrl((data.link as {token:string}).token)}:null})}catch(error){next(error)}})
  admin.post('/referrals/cash/link',options.mutationLimiter,requireRole('ADMIN'),(req,res,next)=>{try{
    if(!options.enabled||req.sessionUser?.billingRecovery)throw badRequest('Ative sua assinatura para criar um novo link. Saldos já adquiridos continuam disponíveis.')
    const body=z.object({accepted:z.literal(true),policyVersion:z.literal(CASH_POLICY)}).parse(req.body)
    const tenantId=tenant(req),userId=req.sessionUser!.id
    const result=db.transaction(()=>{
      const existing=db.prepare('SELECT rl.id,rl.token FROM referral_cash_links cl JOIN referral_links rl ON rl.id=cl.link_id WHERE rl.owner_tenant_id=? AND rl.active=1 AND rl.redemptions_count<rl.max_redemptions AND (rl.expires_at IS NULL OR rl.expires_at>?) ORDER BY cl.accepted_at DESC LIMIT 1').get(tenantId,new Date().toISOString()) as {id:string;token:string}|undefined
      if(existing)return existing
      const createdAt=new Date().toISOString()
      const previous=db.prepare('SELECT id,token FROM referral_links WHERE owner_tenant_id=? AND active=1 AND invitee_discount_percent=15 AND redemptions_count<max_redemptions AND (expires_at IS NULL OR expires_at>?) ORDER BY created_at DESC LIMIT 1').get(tenantId,createdAt) as {id:string;token:string}|undefined
      const id=previous?.id??randomUUID(),token=previous?.token??options.token()
      if(!previous)db.prepare('INSERT INTO referral_links(id,owner_tenant_id,created_by_user_id,label,token,invitee_discount_percent,referrer_reward_percent,max_redemptions,created_at) VALUES(?,?,?,?,?,15,0,100000,?)').run(id,tenantId,userId,'Indicação em Pix NaRégua',token,createdAt)
      const snapshot=JSON.stringify({version:CASH_POLICY,rules:CASH_RULES})
      db.prepare('INSERT INTO referral_cash_links(link_id,policy_version,accepted_by,accepted_at,policy_snapshot,policy_hash) VALUES(?,?,?,?,?,?)').run(id,body.policyVersion,userId,createdAt,snapshot,createHash('sha256').update(snapshot).digest('hex'));cash.audit(userId,id,'POLICY_ACCEPTED',body.policyVersion);return{id,token}
    }).immediate();res.json({id:result.id,url:options.publicUrl(result.token)})
  }catch(error){next(error)}})
  admin.post('/referrals/cash/withdrawals',options.mutationLimiter,options.passwordLimiter,requireRole('ADMIN'),async(req,res,next)=>{try{
    if(!options.enabled)throw badRequest('Solicitações indisponíveis no momento.')
    const body=z.object({amountCents:z.number().int().min(10000),pixKey:z.string().min(11).max(18),currentPassword:z.string().min(8).max(128),feesAccepted:z.literal(true)}).parse(req.body)
    await reauthenticate(req,body.currentPassword)
    res.json(cash.requestWithdrawal(tenant(req),req.sessionUser!.id,body.pixKey,body.amountCents))
  }catch(error){next(error)}})
  dev.use(options.requireDevHost,requireRole('DEV'))
  dev.get('/referrals/cash',(_req,res,next)=>{try{res.json(cash.devOverview())}catch(error){next(error)}})
  dev.post('/referrals/cash/rewards/:id',options.mutationLimiter,options.passwordLimiter,async(req,res,next)=>{try{const body=z.object({approve:z.boolean(),note:z.string().trim().min(12).max(500),currentPassword:z.string().min(8).max(128),identityChecked:z.literal(true),fundsAvailable:z.literal(true)}).parse(req.body);await reauthenticate(req,body.currentPassword);const id=z.string().uuid().parse(req.params.id);if(body.approve&&!await options.verifyReward(id))throw badRequest('Não foi possível revalidar o pagamento no provedor. Nenhum saldo foi liberado.');cash.review(id,req.sessionUser!.id,body.approve,body.note);res.json({ok:true})}catch(error){next(error)}})
  dev.post('/referrals/cash/withdrawals/:id/destination',options.passwordLimiter,async(req,res,next)=>{try{const body=z.object({currentPassword:z.string().min(8).max(128)}).parse(req.body);await reauthenticate(req,body.currentPassword);res.json(cash.destination(z.string().uuid().parse(req.params.id),req.sessionUser!.id))}catch(error){next(error)}})
  dev.post('/referrals/cash/withdrawals/:id',options.mutationLimiter,options.passwordLimiter,async(req,res,next)=>{try{
    const body=z.object({action:z.enum(['SEND','REJECT','RECONCILE']),note:z.string().trim().min(12).max(500),currentPassword:z.string().min(8).max(128),identityChecked:z.literal(true),fundsAvailable:z.literal(true),providerId:z.string().max(100).optional(),confirmation:z.string().optional()}).parse(req.body);await reauthenticate(req,body.currentPassword)
    const id=z.string().uuid().parse(req.params.id),actor=req.sessionUser!.id
    if(body.action==='SEND'){if(body.confirmation!=='ENVIAR PIX REAL')throw badRequest('Confirme exatamente ENVIAR PIX REAL.');await cash.sendWithdrawal(id,actor,body.note)}
    else if(body.action==='REJECT')cash.rejectWithdrawal(id,actor,body.note)
    else{if(!body.providerId?.startsWith('tran_'))throw badRequest('Informe o identificador da transferência no provedor.');await cash.reconcileWithdrawal(id,actor,body.providerId)}
    res.json({ok:true})
  }catch(error){next(error)}})
  return{admin,dev}
}
