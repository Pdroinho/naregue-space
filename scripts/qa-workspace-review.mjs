/* global document,window */
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {inspectPanel} from './qa-panel-inspection.mjs'

export async function runWorkspaceReview(q){
 const {page,origin,pass}=q,reports=[]
 mkdirSync('.validation/workspaces',{recursive:true})
 const capture=async(name)=>{
  await page.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish()})
  const report=await inspectPanel(page);reports.push({name,...report})
  await page.screenshot({path:`.validation/workspaces/${name}.png`,fullPage:!name.startsWith('finance-'),animations:'disabled'})
  writeFileSync('.validation/workspaces/report.json',JSON.stringify(reports,null,2))
 }
 const setTheme=theme=>page.evaluate(theme=>{document.documentElement.dataset.theme=theme;localStorage.setItem('theme',theme)},theme)
 if(q.onlyReferrals){
  for(const width of [320,390])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:900});await page.goto(origin+'/admin?view=referrals');await page.locator('.referral-unavailable').waitFor();await setTheme(theme)
   assert.equal(await page.locator('.referral-metrics').evaluate(el=>el.scrollWidth>el.clientWidth),false)
   await capture(`referrals-${theme}-${width}`);pass(`referral metrics fit without hidden horizontal content ${theme} ${width}px`)
  }
  return
 }
 q.setBillingActive(true)
 const remaining=q.professionalRows.splice(1)
 for(const width of [1440,1024,390,320])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:900})
  for(const [view,selector] of [['finance','.nr-finance'],['referrals','.referral-unavailable'],['billing','.billing-summary'],['team','.team-person']]){
   await page.goto(origin+'/admin?view='+view);await page.locator(selector).first().waitFor();await setTheme(theme)
   if(view==='billing'){
    await page.getByRole('radio',{name:/4 a 6 profissionais/}).waitFor();assert.equal(await page.getByRole('radio',{name:/4 a 6 profissionais/}).getAttribute('aria-checked'),'true')
    assert.equal(await page.getByRole('button',{name:'Contratação indisponível',exact:true}).count(),0)
    assert.equal(await page.getByRole('button',{name:'Tentar novamente',exact:true}).count(),0)
    await page.getByRole('radio',{name:/7 a 15 profissionais/}).click();await page.getByText('Faixa selecionada',{exact:true}).waitFor()
    assert.equal(await page.getByRole('radio',{name:/4 a 6 profissionais/}).getByText('Plano atual',{exact:true}).isVisible(),true)
   }
   if(view==='referrals'){assert.equal(await page.locator('.referral-page img').count(),0);if(width<=640)assert.equal(await page.locator('.referral-metrics').evaluate(el=>el.scrollWidth>el.clientWidth),false)}
   if(view==='team')assert.ok((await page.locator('.team-person').first().boundingBox()).width<=361)
   await capture(`${view}-${theme}-${width}`)
   if(view==='finance')for(const [part,selector] of [['movements','.finance36-transactions'],['goals','.finance36-goals'],['chart','.finance36-flow-panel']]){
    await page.locator(selector).scrollIntoViewIfNeeded();await page.screenshot({path:`.validation/workspaces/finance-${part}-${theme}-${width}.png`,animations:'disabled'})
   }
  }
  await page.goto(origin+'/admin?view=settings');await page.getByRole('tab',{name:'Endereço',exact:true}).click();await page.getByText('Nenhum domínio conectado',{exact:true}).waitFor();await setTheme(theme)
  assert.equal(await page.locator('.custom-domains-card .empty-state img').count(),0)
  assert.equal(await page.locator('.domain-input-wrap input').evaluate(el=>window.getComputedStyle(el).borderTopWidth),'0px')
  await capture(`domains-${theme}-${width}`)
  await page.getByRole('tab',{name:'Seu espaço',exact:true}).click();await page.getByRole('button',{name:'Outra cor',exact:true}).click()
  assert.equal(await page.locator('input[type=color]').count(),0)
  for(const [label,value] of [['Tonalidade','120'],['Saturação','100'],['Luminosidade','100']])await page.getByRole('slider',{name:label,exact:true}).fill(value)
  await page.waitForFunction(()=>document.querySelector('.nr-color-hex')?.value==='#00ff00')
  await page.getByRole('slider',{name:'Luminosidade',exact:true}).fill('0');await page.waitForFunction(()=>document.querySelector('.nr-color-hex')?.value==='#000000')
  await page.getByRole('slider',{name:'Luminosidade',exact:true}).fill('100');await page.waitForFunction(()=>document.querySelector('.nr-color-hex')?.value==='#00ff00')
  const field=page.locator('.nr-color-field');await field.scrollIntoViewIfNeeded();const rect=await field.boundingBox();await page.mouse.click(rect.x+rect.width*.5,rect.y+rect.height*.5)
  await page.waitForFunction(()=>document.querySelector('.nr-color-hex')?.value!=='#00ff00')
  await capture(`color-${theme}-${width}`)
  await page.getByRole('slider',{name:'Tonalidade',exact:true}).focus();await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Outra cor',exact:true}).evaluate(el=>el===document.activeElement),true)
  const hex=page.getByLabel('Cor principal em hexadecimal',{exact:true});await hex.fill('#abc');await hex.press('Enter');assert.equal(await hex.inputValue(),'#aabbcc')
  await hex.fill('#zzzzzz');await hex.press('Enter');await page.getByRole('alert').filter({hasText:'Use uma cor'}).waitFor()
  pass(`workspaces ${theme} ${width}px: compact layouts and custom color mouse/keyboard/validation`)
 }
 q.professionalRows.push(...remaining)
 q.setWaUnconfigured(true);await page.goto(origin+'/admin?view=evolution');const connect=page.getByRole('button',{name:'Conectar via QR Code',exact:true});await connect.waitFor();assert.equal(await connect.isEnabled(),true)
 await connect.click();await page.getByRole('img',{name:'QR Code para conectar o WhatsApp',exact:true}).waitFor();assert.ok(q.requestedPaths.includes('/api/admin/whatsapp/qrcode'))
 await capture('whatsapp-first-connection');pass('WhatsApp without an instance can prepare connection and display QR instead of deadlocking')
 await page.goto(origin+'/admin?view=settings');await page.getByRole('tab',{name:'Endereço',exact:true}).click();const domain=page.getByRole('textbox',{name:'Domínio personalizado',exact:true});await domain.fill('https://agenda.suabarbearia.com.br/');await domain.press('Enter');await page.getByText('agenda.suabarbearia.com.br',{exact:true}).waitFor();assert.equal(q.domainWrites.at(-1).domain,'agenda.suabarbearia.com.br');await capture('domains-pending');pass('custom domain form submits normalized hostname and displays DNS instructions')
 q.setExtractFailed(true);await page.goto(origin+'/admin?view=finance');await page.getByRole('button',{name:'Extrato',exact:true}).click();await page.getByRole('alert').filter({hasText:'Falha ao carregar extrato'}).waitFor();assert.equal(await page.getByRole('button',{name:'Exportar CSV',exact:true}).isDisabled(),true)
 q.setExtractFailed(false);await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await page.getByText('Nenhum registro financeiro',{exact:true}).waitFor();pass('financial extract failure is explicit and retry recovers')
 const failures=reports.filter(r=>r.contrast.length||r.unnamed.length||r.lowContrastIcons.length||r.overflow||r.fragmentedText.length)
 console.log('WORKSPACE AUDIT',JSON.stringify(failures))
 assert.equal(failures.length,0,'See .validation/workspaces/report.json')
}
