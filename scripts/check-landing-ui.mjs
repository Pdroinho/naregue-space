/* global window,document */
import assert from 'node:assert/strict'
import { readFileSync,existsSync,mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
const root=path.resolve('dist/client')
const plans=[{code:'TEAM_3',seats:3,minProfessionals:1,label:'1 a 3 profissionais',amountCents:7490},{code:'TEAM_6',seats:6,minProfessionals:4,label:'4 a 6 profissionais',amountCents:9990},{code:'TEAM_15',seats:15,minProfessionals:7,label:'7 a 15 profissionais',amountCents:14900}]
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg'}
const browser=await chromium.launch()
let count=0
try{
 const page=await browser.newPage();const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.hostname!=='naregua.space')return route.abort()
  if(url.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:JSON.stringify(url.pathname.includes('/billing/plans')?{teamPlans:plans,checkoutAvailable:false}:url.pathname.includes('/auth/me')?{user:null}:{})})
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname))
  assert.ok(file===root||file.startsWith(root+path.sep))
  const target=existsSync(file)&&path.extname(file)?file:path.join(root,'index.html')
  return route.fulfill({body:readFileSync(target),contentType:mime[path.extname(target)]||'application/octet-stream'})
 })
 mkdirSync('.validation',{recursive:true})
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:900});await page.goto('https://naregua.space/')
  await page.locator('.nr-sales-hero h1').waitFor();await page.evaluate(()=>document.fonts.ready)
  const metrics=await page.evaluate(()=>{
   const logo=document.querySelector('.nr-sales-header .nr-brand-logo'),header=document.querySelector('.nr-sales-nav')
   return {overflow:document.documentElement.scrollWidth>window.innerWidth+1,logoHeight:logo.getBoundingClientRect().height,logoWidth:logo.getBoundingClientRect().width,navDisplay:window.getComputedStyle(header).display,background:window.getComputedStyle(document.querySelector('.nr-sales-header')).backgroundColor}
  })
  assert.equal(metrics.overflow,false);assert.ok(metrics.logoHeight>=20&&metrics.logoHeight<=60);assert.ok(metrics.logoWidth<300);assert.equal(metrics.navDisplay,'grid')
  await page.screenshot({path:`.validation/landing-fixed-${width}.png`})
  await page.locator('.nr-sales-plan-grid article').last().scrollIntoViewIfNeeded();assert.equal(await page.locator('.nr-sales-plan-grid article').count(),3)
  await page.locator('.nr-sales-plan-button').first().click();const dialog=page.getByRole('dialog');await dialog.waitFor()
  assert.equal(await dialog.getByRole('radio').count(),3);assert.equal(await dialog.getByRole('button',{name:'Contratação indisponível'}).isDisabled(),true)
  const bounds=await dialog.boundingBox();assert.ok(bounds.width<=width&&bounds.x>=-1)
  await page.screenshot({path:`.validation/landing-checkout-fixed-${width}.png`})
  await dialog.getByRole('button',{name:'Fechar compra'}).click()
  console.log(`PASS landing styles, brand dimensions, plan catalog and disabled checkout at ${width}px`);count++
 }
 assert.deepEqual(errors,[]);console.log(`${count}/${count} landing regression checks passed; all network requests intercepted locally`)
}finally{await browser.close()}
