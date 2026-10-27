/* global document */
import { mkdirSync,writeFileSync } from 'node:fs'
import { inspectPanel } from './qa-panel-inspection.mjs'

export async function runVisualAudit({page,origin,setRole}) {
 const reports=[]
 const onlyViews=process.env.NAREGUA_QA_AUDIT_VIEWS?.split(',')
 const views={dashboard:'.ld-dashboard-page',services:'.service-admin-page',clients:'.client-admin-page',calendar:'.ld-agenda',finance:'.finance36',settings:'.settings-page',assistant:'.assistant34',billing:'.billing-shell',team:'.team-page',referrals:'.referral-page',evolution:'.wa39',support:'.support-center'}
 mkdirSync('.validation/ui-audit',{recursive:true})
 for(const width of (process.env.NAREGUA_QA_AUDIT_WIDTHS||'1440,768,390,320').split(',').map(Number))for(const theme of ['light','dark'])for(const [view,selector] of Object.entries(views)){
  if(onlyViews&&!onlyViews.includes(view))continue
  setRole('ADMIN');await page.setViewportSize({width,height:900});await page.goto(origin+'/admin?view='+view)
  // Every view has a stable product heading even if a feature reports an API error.
  await page.locator('.ld-page-title').waitFor()
  await page.locator(selector).first().waitFor({timeout:10000})
  await page.evaluate(async theme=>{await document.fonts.ready;document.documentElement.dataset.theme=theme;localStorage.setItem('theme',theme);for(const animation of document.getAnimations())if(animation.effect?.getTiming().iterations!==Infinity)animation.finish()},theme)
  const report=await inspectPanel(page)
  reports.push({view,theme,width,...report})
  writeFileSync('.validation/ui-audit/report.json',JSON.stringify(reports,null,2))
  if(process.env.NAREGUA_QA_AUDIT_CAPTURE||report.contrast.length||report.lowContrastIcons.length||report.smallControls.length||report.fragmentedText.length||report.oversizedScope||report.unnamed.length||report.overflow||report.brokenImages.length)await page.screenshot({path:`.validation/ui-audit/${view}-${theme}-${width}.png`,fullPage:true,animations:'disabled'})
  if(process.env.NAREGUA_QA_AUDIT_CAPTURE&&view==='dashboard'){
   await page.getByRole('button',{name:'Copiar link de agendamento',exact:true}).scrollIntoViewIfNeeded()
   await page.screenshot({path:`.validation/ui-audit/booking-link-${theme}-${width}.png`,animations:'disabled'})
  }
  console.log(JSON.stringify({view,theme,width,contrast:report.contrast.length,icons:report.lowContrastIcons.length,smallControls:report.smallControls.length,fragmentedText:report.fragmentedText.length,oversizedScope:report.oversizedScope,unnamed:report.unnamed.length,overflow:report.overflow,brokenImages:report.brokenImages.length}))
 }
 writeFileSync('.validation/ui-audit/report.json',JSON.stringify(reports,null,2))
 console.log('Audit complete:',reports.length,'view/theme/viewport combinations; complex photographic/opacity surfaces require visual inspection.')
 if(reports.some(r=>r.contrast.length||r.lowContrastIcons.length||r.smallControls.length||r.fragmentedText.length||r.oversizedScope||r.unnamed.length||r.overflow||r.brokenImages.length))throw new Error('Visual audit found accessibility or layout defects; see .validation/ui-audit/report.json')
}
