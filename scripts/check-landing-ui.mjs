/* global document,window,requestAnimationFrame */
import assert from 'node:assert/strict'
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {chromium,firefox} from 'playwright'
import {inspectPanel} from './qa-panel-inspection.mjs'

const root=path.resolve('dist/client'),dir=process.argv.includes('--firefox')?'.validation/lp-renewal-firefox':'.validation/lp-renewal'
mkdirSync(dir,{recursive:true})
const plans=[{code:'TEAM_3',seats:3,minProfessionals:1,label:'1 a 3 profissionais',amountCents:7490},{code:'TEAM_6',seats:6,minProfessionals:4,label:'4 a 6 profissionais',amountCents:9990},{code:'TEAM_15',seats:15,minProfessionals:7,label:'7 a 15 profissionais',amountCents:14900}]
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg'}
const browser=await(process.argv.includes('--firefox')?firefox:chromium).launch()
let catalogFails=false,catalogAvailable=false,count=0
const reports=[],requests=[]
async function settle(page){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(async image=>{image.loading='eager';try{await image.decode()}catch{/* Broken images are reported by inspection. */}}));for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish()})}
try{
 const page=await browser.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.hostname!=='naregua.space')return route.abort()
  if(url.pathname.startsWith('/api/')){
   requests.push(url.pathname+url.search);assert.equal(route.request().method(),'GET','LP checks must never create orders or users')
   const body=url.pathname.includes('/billing/plans')?(catalogFails?{message:'Falha de catálogo para teste'}:{teamPlans:plans,checkoutAvailable:catalogAvailable,checkoutSandbox:catalogAvailable}):url.pathname.includes('/auth/me')?{user:null}:url.pathname.includes('/public/legal')?{documents:{termsVersion:'qa',privacyVersion:'qa',updatedAt:'2026-10-27',bundleHash:'qa'}}:url.pathname.includes('/slug-availability')?{slug:url.searchParams.get('slug'),available:url.searchParams.get('slug')!=='ocupado',suggestions:['ocupado-barbearia','ocupado-2']}:url.pathname.includes('/team-quote')?{quote:{amountCents:14900,discountPercent:0,fingerprint:'qa'}}:{}
   return route.fulfill({status:catalogFails&&url.pathname.includes('/billing/plans')?503:200,contentType:'application/json',body:JSON.stringify(body)})
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));assert.ok(file===root||file.startsWith(root+path.sep))
  const target=existsSync(file)&&path.extname(file)?file:path.join(root,'index.html')
  return route.fulfill({body:readFileSync(target),contentType:mime[path.extname(target)]||'application/octet-stream'})
 })
 for(const width of [1440,1280,1024,768]){
  await page.setViewportSize({width,height:1000});await page.goto('https://naregua.space/?ref=demonstracao')
  await page.locator('.lp-hero h1').waitFor();await settle(page)
  const initial=await inspectPanel(page);reports.push({width,state:'initial',...initial})
  assert.equal(initial.overflow,false);assert.equal(await page.getByRole('heading',{level:1}).count(),1)
  assert.equal(await page.locator('.lp-screen-images img.is-active').evaluate(el=>el.complete&&el.naturalWidth>0),true)
  assert.equal(await page.locator('.lp-hero-art img').count(),2)
  assert.equal(await page.locator('.lp-product-brand,.lp-demo-caption,.lp-workspace-image figcaption').count(),0,'Flat demonstrations must have no duplicate masthead or caption')
  assert.equal(await page.locator('.lp-laptop-lid').count(),1)
  assert.equal(await page.locator('.lp-finance-mockup>img').evaluate(el=>window.getComputedStyle(el).objectFit),'contain','Financial illustration must preserve all columns')
  assert.equal(await page.locator('.nr-lp').evaluate(el=>window.getComputedStyle(el).getPropertyValue('--lp-highlight').trim()),'#efd3be','Campaign accent must retain the approved warm palette')
  const dock=await page.evaluate(()=>({opening:document.querySelector('.lp-opening').getBoundingClientRect().bottom,screen:document.querySelector('.lp-screen-shell').getBoundingClientRect().bottom}));assert.ok(Math.abs(dock.opening-dock.screen)<2,'Hero interface must dock to its lower edge')
  if(width<=640){assert.equal(await page.locator('.lp-screen-shell .lp-mobile-preview').isVisible(),true);assert.equal(await page.locator('.lp-screen-images').isVisible(),false);const heroAction=await page.locator('.lp-button-hero').boundingBox();assert.ok(heroAction.y+heroAction.height<640,'Mobile hero CTA must appear before 640px');assert.equal(await page.locator('.lp-mobile-finance').isVisible(),true)}
  await page.screenshot({path:`${dir}/hero-${width}.png`,animations:'disabled'})
  if(width===1440||width===390){await page.screenshot({path:`${dir}/full-${width}.png`,fullPage:true,animations:'disabled'});for(const section of ['intro','workspace','ai','pricing-wrap','close','footer']){const target=page.locator(`.lp-${section}`);await target.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await settle(page);await target.screenshot({path:`${dir}/${section}-${width}.png`,animations:'disabled'})}await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}))}
  if(width===1440){await page.mouse.move(200,300);await page.waitForFunction(()=>Math.abs(parseFloat(document.querySelector('.nr-lp').style.getPropertyValue('--art-x')))>1);assert.ok((await page.locator('#preco').boundingBox()).height<850,'Desktop pricing should fit a compact section')}
  const topic=page.getByRole('button',{name:'Escolher área da demonstração',exact:true})
  await topic.click();await page.getByRole('option',{name:'equipe',exact:true}).click()
  assert.ok((await page.locator('.lp-screen-images img.is-active').getAttribute('src')).endsWith('/team.webp'))
  if(width<=640)assert.equal(await page.locator('.lp-screen-shell .lp-mobile-preview-heading strong').textContent(),'Sua equipe')
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  await topic.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='listbox');await page.keyboard.press('End');await page.keyboard.press('Enter')
  await page.waitForFunction(()=>document.querySelector('.lp-screen-images img.is-active')?.getAttribute('src')?.endsWith('/finance.webp'))
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Escolher área da demonstração')
  await page.getByRole('button',{name:'agenda',exact:true}).click()
  await page.getByRole('button',{name:'Quero minha barbearia na régua',exact:false}).click()
  const slider=page.getByRole('slider',{name:'Quantos profissionais atendem aí?',exact:true});await slider.fill('7')
  await page.waitForFunction(()=>window.scrollY>1000)
  await page.waitForFunction(()=>document.querySelector('.lp-plan-label')?.textContent==='7 a 15 profissionais')
  assert.ok((await page.locator('.lp-price-digits').getAttribute('aria-label')).includes('149,00'))
  await page.locator('.lp-plan-result').getByRole('button',{name:'Ver este plano',exact:false}).click()
  const dialog=page.getByRole('dialog');await dialog.waitFor();await settle(page)
  assert.equal(await dialog.getByRole('radio').count(),3)
  assert.equal(await dialog.getByRole('radio').last().getAttribute('aria-checked'),'true')
  await dialog.getByRole('status').filter({hasText:'Não há desconto aplicado'}).waitFor()
  assert.equal(await dialog.getByText('0% de desconto',{exact:false}).count(),0)
  assert.equal(await dialog.getByText('Etapa 1 de 2 · Equipe',{exact:true}).count(),1)
  assert.equal(await dialog.getByRole('button',{name:'Contratação indisponível',exact:true}).isDisabled(),true)
  const bounds=await dialog.boundingBox();assert.ok(bounds.x>=-1&&bounds.width<=width)
  await page.screenshot({path:`${dir}/checkout-${width}.png`,animations:'disabled'})
  await dialog.getByRole('button',{name:'Fechar compra',exact:true}).click()
  assert.ok(requests.some(url=>url.includes('referralToken=demonstracao')))
  await page.getByRole('button',{name:'Confirmar exemplo',exact:false}).click();assert.equal(await page.locator('.lp-confirmation-demo').getAttribute('aria-hidden'),'false')
  await settle(page);await page.screenshot({path:`${dir}/story-${width}.png`,animations:'disabled'})
  if(width<=640){await page.locator('.lp-mobile-dock button').click();await page.waitForFunction(()=>{const bounds=document.getElementById('preco').getBoundingClientRect();return bounds.top<window.innerHeight&&bounds.bottom>0});assert.equal(await page.locator('.lp-mobile-dock').count(),0)}
  const caption=await page.locator('.lp-story-caption').boundingBox(),confirmation=await page.locator('.lp-confirmation-demo').boundingBox();assert.ok(caption.y>=confirmation.y+confirmation.height,'Demonstration caption must stay below confirmation')
  const question=page.locator('.lp-faq summary').first();await question.click();assert.equal(await page.locator('.lp-faq details').first().getAttribute('open'),'')
  if(width<=900){const menu=page.getByRole('button',{name:'Abrir menu',exact:true});await menu.click();assert.equal(await page.getByRole('navigation',{name:'Navegação principal'}).isVisible(),true);await page.keyboard.press('Escape');assert.equal(await menu.evaluate(el=>el===document.activeElement),true)}
  assert.equal(await page.locator('a.lp-login').getAttribute('href'),'/acessar')
  const final=await inspectPanel(page);reports.push({width,state:'interactive',...final});assert.equal(final.overflow,false)
  console.log(`PASS ${width}px: illustrated assets, hero selection, keyboard, team price, referral checkout, demo, FAQ and menu`);count++
 }
 catalogAvailable=true
 for(const width of [1440]){await page.setViewportSize({width,height:1000});await page.goto('https://naregua.space/');await page.locator('.lp-plan-result button').click();const dialog=page.getByRole('dialog');await dialog.getByRole('status').filter({hasText:'Modo de teste'}).waitFor();await dialog.getByRole('radio').first().focus();await page.keyboard.press('ArrowRight');assert.equal(await dialog.getByRole('radio').nth(1).getAttribute('aria-checked'),'true');await dialog.getByRole('button',{name:'Continuar com',exact:false}).click();await dialog.getByText('Vamos criar seu espaço.',{exact:true}).waitFor();await dialog.locator('#checkout-workspace-slug').fill('ocupado');await dialog.locator('.checkout-slug-choice.is-taken').waitFor();assert.equal(await dialog.locator('#checkout-workspace-slug').getAttribute('aria-invalid'),'true');assert.equal(await dialog.locator('details #checkout-workspace-slug').count(),0);await dialog.locator('.checkout-slug-suggestions button').first().click();await dialog.locator('.checkout-slug-choice.is-available').waitFor();assert.equal(await dialog.locator('#checkout-workspace-slug').inputValue(),'ocupado-barbearia');await settle(page);reports.push({width,state:'checkout-account',...await inspectPanel(page)});await page.screenshot({path:`${dir}/checkout-account-${width}.png`,animations:'disabled'});await dialog.getByRole('button',{name:'Voltar à etapa 1',exact:true}).click();assert.equal(await dialog.getByRole('radio').nth(1).getAttribute('aria-checked'),'true');await dialog.getByRole('button',{name:'Fechar compra',exact:true}).click();count++;console.log(`PASS ${width}px: plan keyboard selection and account step without creating records`)}
 catalogAvailable=false
 catalogFails=true;await page.goto('https://naregua.space/');await page.getByRole('alert').filter({hasText:'Não foi possível atualizar'}).waitFor();assert.equal(await page.locator('.lp-plan-result button').isDisabled(),true)
 catalogFails=false;await page.getByRole('button',{name:'Atualizar planos',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.lp-plan-result button')?.disabled);count++;console.log('PASS catalogue error is explicit and retry recovers')
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('https://naregua.space/');await page.locator('.lp-hero h1').waitFor();await settle(page);await page.getByRole('slider',{name:'Quantos profissionais atendem aí?',exact:true}).fill('15');assert.equal(await page.locator('.lp-digit-strip').first().evaluate(el=>window.getComputedStyle(el).transitionDuration),'0s');count++;console.log('PASS reduced motion retains content and interactive prices without animation')
 await page.goto('https://naregua.space/?checkout=return&workspace=central');await page.locator('.lp-return').waitFor();assert.equal(await page.getByText('Pagamento recebido.',{exact:false}).count(),0);assert.ok((await page.locator('.lp-return a').getAttribute('href')).includes('central.naregua.space/login'));count++;console.log('PASS checkout return keeps workspace access without claiming an unverified payment')
 await page.goto('https://naregua.space/acessar');await page.locator('#workspace-slug').fill('endereço inválido');await page.getByRole('button',{name:'Acessar meu espaço',exact:false}).click();await page.locator('.landing-access-error').waitFor();assert.equal(await page.locator('form input').count(),1);for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});await settle(page);const accessReport=await inspectPanel(page);reports.push({width,state:'access',...accessReport});await page.screenshot({path:`${dir}/access-${width}.png`,animations:'disabled'})}count++;console.log('PASS workspace access redesign and validation preserved')
 assert.deepEqual(errors,[])
 writeFileSync(`${dir}/report${process.argv.includes('--firefox')?'-firefox':''}.json`,JSON.stringify(reports,null,2))
 const findings=reports.filter(r=>r.contrast.length||r.unnamed.length||r.lowContrastIcons.length||r.brokenImages.length||r.overflow)
 console.log('VISUAL FINDINGS',JSON.stringify(findings));console.log(`${count}/${count} landing checks passed; all requests intercepted, no orders or messages created`)
 if(findings.length)process.exitCode=1
}finally{await browser.close()}
