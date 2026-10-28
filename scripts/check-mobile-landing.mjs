/* global document,window */
import assert from 'node:assert/strict'
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {chromium,firefox} from 'playwright'
import {inspectPanel} from './qa-panel-inspection.mjs'

const root=path.resolve('dist/client'),dir=process.argv.includes('--firefox')?'.validation/mobile-art-firefox':'.validation/mobile-art'
mkdirSync(dir,{recursive:true})
const plans=[{code:'TEAM_3',seats:3,minProfessionals:1,label:'1 a 3 profissionais',amountCents:7490},{code:'TEAM_6',seats:6,minProfessionals:4,label:'4 a 6 profissionais',amountCents:9990},{code:'TEAM_15',seats:15,minProfessionals:7,label:'7 a 15 profissionais',amountCents:14900}]
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg'}
const browser=await(process.argv.includes('--firefox')?firefox:chromium).launch()
let catalogFails=false,catalogAvailable=false,count=0
const reports=[],requests=[]
async function settle(page){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(async image=>{image.loading='eager';try{await image.decode()}catch{/* Broken images are reported by inspection. */}}));for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish()})}
try{
 const page=await browser.newPage({hasTouch:true}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.hostname!=='naregua.space')return route.abort()
  if(url.pathname.startsWith('/api/')){
   requests.push(url.pathname+url.search);assert.equal(route.request().method(),'GET','LP checks must never create orders or users')
   const body=url.pathname.includes('/billing/plans')?(catalogFails?{message:'Falha de catálogo para teste'}:{teamPlans:plans,checkoutAvailable:catalogAvailable,checkoutSandbox:catalogAvailable}):url.pathname.includes('/auth/me')?{user:null}:url.pathname.includes('/public/legal')?{documents:{termsVersion:'qa',privacyVersion:'qa',updatedAt:'2026-10-27',bundleHash:'qa'}}:url.pathname.includes('/team-quote')?{quote:{amountCents:14900,discountPercent:0,fingerprint:'qa'}}:{}
   return route.fulfill({status:catalogFails&&url.pathname.includes('/billing/plans')?503:200,contentType:'application/json',body:JSON.stringify(body)})
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));assert.ok(file===root||file.startsWith(root+path.sep))
  const target=existsSync(file)&&path.extname(file)?file:path.join(root,'index.html')
  return route.fulfill({body:readFileSync(target),contentType:mime[path.extname(target)]||'application/octet-stream'})
 })
 for(const width of [320,360,390,430]){
  await page.setViewportSize({width,height:844});await page.goto('https://naregua.space/?ref=demonstracao');await page.locator('.ma-hero h1').waitFor();await settle(page);
  assert.equal(await page.getByRole('heading',{level:1}).count(),1);assert.equal(await page.locator('.nr-lp').count(),0);
  const heroAction=await page.locator('.ma-hero-cta').boundingBox();assert.ok(heroAction.y+heroAction.height<640,'Main action must appear before 640px');
  reports.push({width,state:'hero',...await inspectPanel(page)});await page.screenshot({path:`${dir}/hero-${width}.png`,animations:'disabled'});
  if(width===390){await page.screenshot({path:`${dir}/full-${width}.png`,fullPage:true,animations:'disabled'});for(const section of ['story','finance','pricing','closing']){await page.locator('.ma-'+section).scrollIntoViewIfNeeded();await settle(page);await page.locator('.ma-'+section).screenshot({path:`${dir}/${section}-${width}.png`,animations:'disabled'})}}
  await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await page.getByRole('navigation',{name:'Navegação principal',exact:true}).waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Abrir menu',exact:true}).evaluate(el=>el===document.activeElement),true);
  await page.locator('.ma-story-list article').nth(1).getByRole('button').click();assert.equal(await page.locator('.ma-story-list article').nth(1).getByRole('button').getAttribute('aria-expanded'),'true');
  await page.getByRole('button',{name:'Confirmar exemplo',exact:false}).click();assert.equal(await page.getByRole('button',{name:'Exemplo confirmado',exact:false}).getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>{document.querySelector('.ma-story').scrollIntoView({behavior:'instant'});window.scrollBy(0,20)});await page.locator('.ma-dock button').click();await page.waitForFunction(()=>!document.querySelector('.ma-dock'));
  await page.locator('.ma-plan-list button').last().click();const dialog=page.getByRole('dialog');await dialog.waitFor();await settle(page);assert.equal(await dialog.getByRole('radio').last().getAttribute('aria-checked'),'true');await dialog.getByRole('status').filter({hasText:'Não há desconto aplicado'}).waitFor();assert.equal(await dialog.getByRole('button',{name:'Contratação indisponível',exact:true}).isDisabled(),true);reports.push({width,state:'checkout',...await inspectPanel(page)});await page.screenshot({path:`${dir}/checkout-${width}.png`,animations:'disabled'});await dialog.getByRole('button',{name:'Fechar compra',exact:true}).click();
  await page.locator('.ma-faq summary').first().click();assert.equal(await page.locator('.ma-faq details').first().getAttribute('open'),'');count++;console.log(`PASS ${width}px: separate mobile page, early CTA, artwork, menu keyboard, story, confirmation, dock, plans, referral and FAQ`)
 }
 catalogAvailable=true;await page.goto('https://naregua.space/');await page.locator('.ma-plan-list button').nth(1).click();const dialog=page.getByRole('dialog');await dialog.getByRole('status').filter({hasText:'Modo de teste'}).waitFor();await dialog.getByRole('button',{name:'Continuar com',exact:false}).click();await dialog.getByText('Vamos criar seu espaço.',{exact:true}).waitFor();await dialog.locator('input[autocomplete=name]').fill('Teste de orientação');await page.setViewportSize({width:844,height:390});assert.equal(await dialog.locator('input[autocomplete=name]').inputValue(),'Teste de orientação');assert.equal(await page.locator('.nr-mobile-atelier').count(),1);await page.setViewportSize({width:430,height:844});await settle(page);await page.screenshot({path:`${dir}/checkout-account.png`,animations:'disabled'});reports.push({width:430,state:'account',...await inspectPanel(page)});await dialog.getByRole('button',{name:'Fechar compra',exact:true}).click();count++;console.log('PASS sandbox checkout reaches account form without creating records');
 catalogAvailable=false;catalogFails=true;await page.goto('https://naregua.space/');await page.locator('.ma-catalog-error').waitFor();assert.equal(await page.locator('.ma-plan-list button').first().isDisabled(),true);catalogFails=false;await page.getByRole('button',{name:'Atualizar planos',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.ma-plan-list button')?.disabled);count++;console.log('PASS catalogue errors recover and do not allow unverified prices');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('https://naregua.space/');await page.locator('.ma-hero h1').waitFor();assert.equal(await page.locator('.ma-hero-art img').evaluate(el=>window.getComputedStyle(el).animationName),'none');count++;console.log('PASS reduced motion preserves the mobile page');
 await page.setViewportSize({width:1440,height:1000});await page.locator('.lp-hero h1').waitFor();assert.equal(await page.locator('.nr-mobile-atelier').count(),0);await page.setViewportSize({width:390,height:844});await page.locator('.ma-hero h1').waitFor();assert.equal(await page.locator('.nr-lp').count(),0);count++;console.log('PASS breakpoint switches between independent desktop and mobile compositions');
 assert.deepEqual(errors,[]);assert.ok(requests.some(url=>url.includes('referralToken=demonstracao')));
 const findings=reports.filter(r=>r.contrast.length||r.unnamed.length||r.lowContrastIcons.length||r.brokenImages.length||r.overflow);writeFileSync(`${dir}/report.json`,JSON.stringify(reports,null,2));console.log('VISUAL FINDINGS',JSON.stringify(findings));console.log(`${count}/${count} mobile checks passed; all APIs intercepted, no orders or messages created`);if(findings.length)process.exitCode=1;
}finally{await browser.close()}
