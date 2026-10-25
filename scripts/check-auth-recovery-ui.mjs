/* global document,window */
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
const root=path.resolve('dist/client')
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'}
const browser=await chromium.launch()
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.hostname!=='dev.naregua.space')return route.abort()
  if(url.pathname.startsWith('/api/')){
   const login=url.pathname==='/api/auth/login',verify=url.pathname==='/api/auth/whatsapp-otp/verify'
   return route.fulfill({status:login?202:verify?401:200,contentType:'application/json',body:JSON.stringify(login?
    {whatsappOtpRequired:true,deliveryFailed:true,operatorRecoveryAvailable:true,phoneMasked:'+55 ** *****-9999'}:
    verify?{message:'Código inválido ou expirado.',code:'INVALID_MFA_CODE'}:{user:null,allowDevBootstrap:false,primaryColor:'#b85a30'})})
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
 }
 assert.deepEqual(errors,[]);console.log('3/3 operator recovery UI checks passed; no external requests')
}finally{await browser.close()}
