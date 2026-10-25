/* global document,window */
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
const root=path.resolve('dist/client')
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'}
const browser=await chromium.launch()
let verifySuccess=false
async function readable(page,selectors){
 const results=await page.evaluate(selectors=>{
  const pixel=color=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle=color;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data]}
  const lum=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
  const over=(front,back)=>front.slice(0,3).map((v,i)=>v*front[3]/255+back[i]*(1-front[3]/255))
  return selectors.map(selector=>{const el=document.querySelector(selector);if(!el)return {selector,ratio:0};let parent=el;const layers=[];while(parent){layers.push(pixel(window.getComputedStyle(parent).backgroundColor));parent=parent.parentElement}const bg=layers.reverse().reduce((back,front)=>over(front,back),[255,255,255]);const a=lum(over(pixel(window.getComputedStyle(el).color),bg)),b=lum(bg);return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}})
 },selectors)
 for(const result of results)assert.ok(result.ratio>=4.5,JSON.stringify(result))
 console.log('CONTRAST '+JSON.stringify(results.map(r=>({...r,ratio:Number(r.ratio.toFixed(2))}))))
}
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.hostname!=='dev.naregua.space')return route.abort()
  if(url.pathname.startsWith('/api/')){
   const login=url.pathname==='/api/auth/login',verify=url.pathname==='/api/auth/whatsapp-otp/verify'
   return route.fulfill({status:login?202:verify&&!verifySuccess?401:200,contentType:'application/json',body:JSON.stringify(login?
    {whatsappOtpRequired:true,deliveryFailed:true,operatorRecoveryAvailable:true,phoneMasked:'+55 ** *****-9999'}:
    verify?verifySuccess?{user:{id:'operator',role:'DEV',email:'operator@example.com',tenantId:null}}:{message:'Código inválido ou expirado.',code:'INVALID_MFA_CODE'}:{user:null,allowDevBootstrap:false,primaryColor:'#b85a30'})})
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));assert.ok(file===root||file.startsWith(root+path.sep))
  const target=existsSync(file)&&path.extname(file)?file:path.join(root,'index.html')
  return route.fulfill({body:readFileSync(target),contentType:types[path.extname(target)]||'application/octet-stream'})
 })
 mkdirSync('.validation',{recursive:true})
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});await page.goto('https://dev.naregua.space/login')
  await page.getByPlaceholder('seu@email.com').fill('operator@example.com');await page.getByPlaceholder('••••••••').fill('local-test-password')
  await page.getByRole('button',{name:'Entrar',exact:true}).click()
  await page.getByText('O código não foi enviado: o WhatsApp da plataforma está indisponível.').waitFor()
  assert.equal(await page.getByPlaceholder('000000').isVisible(),true)
  await page.getByText('Recuperar pelo acesso à VPS',{exact:true}).click()
  assert.equal(await page.getByText('docker exec -it naregua-app node dist/server/operatorRecoveryCli.js --dev',{exact:true}).isVisible(),true)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))
  await page.screenshot({path:`.validation/recovery-ui-${width}.png`,fullPage:true})
  await page.getByPlaceholder('000000').fill('123456');await page.getByRole('button',{name:'Verificar e entrar'}).click()
  await page.getByText('Código inválido ou expirado.',{exact:true}).waitFor()
  assert.equal(await page.getByPlaceholder('000000').isVisible(),true)
  console.log(`PASS recovery challenge, SSH instructions and invalid-code handling at ${width}px`)
  for(const theme of ['light','dark']){
   await page.goto('https://dev.naregua.space/login');await page.getByPlaceholder('seu@email.com').waitFor()
   await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.devTheme=theme},theme)
   await page.getByRole('button',{name:'Esqueci minha senha',exact:true}).click();await page.getByRole('heading',{name:'Esqueceu sua senha?',exact:true}).waitFor()
   await readable(page,['.password-recovery .authRefTitle','.password-recovery .authRefSubtitle','.password-recovery .recovery-help'])
   await page.getByRole('button',{name:'Voltar para o login',exact:true}).click()
   await page.getByPlaceholder('seu@email.com').fill('operator@example.com');await page.getByPlaceholder('••••••••').fill('local-test-password')
   await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByPlaceholder('000000').waitFor()
   await readable(page,['.authSecurityPanel .authRefTitle','.authSecurityPanel .authRefSubtitle','.authSecurityPanel .authRefError'])
   await page.getByPlaceholder('000000').fill('123456');verifySuccess=true
   await page.getByRole('button',{name:'Verificar e entrar',exact:true}).click();await page.getByRole('heading',{name:'Login realizado!',exact:true}).waitFor()
   await readable(page,['.authRefSuccessTitle','.authRefSuccessSub'])
   await page.screenshot({path:`.validation/login-success-${theme}-${width}.png`,animations:'disabled',fullPage:true})
   verifySuccess=false
   console.log(`PASS ${theme} recovery, verification and login success contrast at ${width}px`)
  }
 }
 assert.deepEqual(errors,[]);console.log('9/9 authentication state checks passed; no external requests')
}finally{await browser.close()}
