/* global document,window */
import { mkdirSync,writeFileSync } from 'node:fs'

export async function runVisualAudit({page,origin,setRole}) {
 const reports=[]
 const onlyViews=process.env.NAREGUA_QA_AUDIT_VIEWS?.split(',')
 const views={dashboard:'.ld-mobile-dashboard-stage,.ld-dashboard-hero',services:'.service-admin-page',clients:'.client-admin-page',calendar:'.ld-agenda',finance:'.finance36',settings:'.settings-page',assistant:'.assistant34',billing:'.billing-shell',team:'.team-page',referrals:'.referral-page',evolution:'.whatsapp-center',support:'.support-center'}
 mkdirSync('.validation/ui-audit',{recursive:true})
 for(const width of [1440,390])for(const theme of ['light','dark'])for(const [view,selector] of Object.entries(views)){
  if(onlyViews&&!onlyViews.includes(view))continue
  setRole('ADMIN');await page.setViewportSize({width,height:900});await page.goto(origin+'/admin?view='+view)
  // Every view has a stable product heading even if a feature reports an API error.
  await page.locator('.ld-page-title').waitFor()
  await page.locator(selector).first().waitFor({timeout:10000}).catch(()=>{})
  await page.evaluate(async theme=>{await document.fonts.ready;document.documentElement.dataset.theme=theme;localStorage.setItem('theme',theme);for(const animation of document.getAnimations())if(animation.effect?.getTiming().iterations!==Infinity)animation.finish()},theme)
  const report=await page.evaluate(()=>{
   const rgba=color=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle=color;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data]}
   const over=(f,b)=>f.slice(0,3).map((v,i)=>v*f[3]/255+b[i]*(1-f[3]/255))
   const lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
   const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05)
   const visible=el=>{const r=el.getBoundingClientRect(),s=window.getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!el.closest('[aria-hidden="true"],[hidden],button:disabled,input:disabled,[inert]')}
   const samples=[],skipped=new Set(),seen=new Set()
   for(const el of document.querySelectorAll('body *')){
    if(!visible(el)||!Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()))continue
    const text=Array.from(el.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();if(!text||el.matches('script,style,option'))continue
    const layers=[];let node=el,complex=false
    while(node){const s=window.getComputedStyle(node);if(s.backgroundImage!=='none'||Number(s.opacity)<.99)complex=true;layers.push(rgba(s.backgroundColor));node=node.parentElement}
    if(complex){skipped.add(el.className||el.tagName);continue}
    const bg=layers.reverse().reduce((b,f)=>over(f,b),[255,255,255]),s=window.getComputedStyle(el),fg=over(rgba(s.color),bg),value=ratio(fg,bg)
    const min=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&parseInt(s.fontWeight)>=700)?3:4.5
    const key=[el.className,s.color,s.backgroundColor,min].join('|')
    if(value+.02<min&&!seen.has(key)){seen.add(key);samples.push({tag:el.tagName,className:el.className,text:text.slice(0,110),ratio:Number(value.toFixed(2)),minimum:min,color:s.color,background:bg.map(Math.round),fontSize:s.fontSize})}
   }
   const unnamed=[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea')].filter(visible).filter(el=>{
    if(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.getAttribute('title'))return false
    if(el.matches('input,select,textarea'))return !el.labels?.length
    return !el.textContent.trim()&&!el.querySelector('img[alt]:not([alt=""])')
   }).map(el=>({tag:el.tagName,className:el.className,type:el.getAttribute('type')}))
   return {contrast:samples,unnamed,overflow:document.documentElement.scrollWidth>window.innerWidth+1,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute('src')),skippedComplexSurfaces:[...skipped].slice(0,20)}
  })
  reports.push({view,theme,width,...report})
  if(process.env.NAREGUA_QA_AUDIT_CAPTURE||report.contrast.length||report.unnamed.length||report.overflow||report.brokenImages.length)await page.screenshot({path:`.validation/ui-audit/${view}-${theme}-${width}.png`,fullPage:true,animations:'disabled'})
  if(process.env.NAREGUA_QA_AUDIT_CAPTURE&&view==='dashboard'){
   await page.getByRole('button',{name:'Copiar link de agendamento',exact:true}).scrollIntoViewIfNeeded()
   await page.screenshot({path:`.validation/ui-audit/booking-link-${theme}-${width}.png`,animations:'disabled'})
  }
  console.log(JSON.stringify({view,theme,width,contrast:report.contrast.length,unnamed:report.unnamed.length,overflow:report.overflow,brokenImages:report.brokenImages.length}))
 }
 writeFileSync('.validation/ui-audit/report.json',JSON.stringify(reports,null,2))
 console.log('Audit complete:',reports.length,'view/theme/viewport combinations; complex photographic/opacity surfaces require visual inspection.')
 if(reports.some(r=>r.contrast.length||r.unnamed.length||r.overflow||r.brokenImages.length))throw new Error('Visual audit found accessibility or layout defects; see .validation/ui-audit/report.json')
}
