/* global document */
import assert from 'node:assert/strict'
import { mkdirSync,writeFileSync } from 'node:fs'
import { inspectPanel } from './qa-panel-inspection.mjs'

export async function runPanelStates(q){
 const {page,origin,pass,shot,failedGetRoutes,requestedPaths,professionalRows}=q
 const reports=[];mkdirSync('.validation/panel-states',{recursive:true})
 const states=[
  {name:'clients-empty',view:'clients',mode:'clients',selector:'.client-empty'},
  {name:'services-empty',view:'services',mode:'services',selector:'.service-admin-page .empty-state'},
  {name:'clients-error',view:'clients',route:'/api/admin/clients'},
  {name:'services-error',view:'services',route:'/api/admin/services'},
  {name:'finance-error',view:'finance',route:'/api/admin/finance'},
  {name:'dashboard-error',view:'dashboard',route:'/api/admin/dashboard'},
  {name:'calendar-error',view:'calendar',route:'/api/admin/appointments'},
  {name:'team-error',view:'team',route:'/api/admin/professionals'},
  {name:'scope-error',view:'clients',route:'/api/admin/professionals'},
 ]
 for(const width of [1440,390])for(const theme of ['light','dark'])for(const state of states){
  q.setClientMode(state.mode==='clients'?'empty':'data');q.setServiceMode(state.mode==='services'?'empty':'data')
  failedGetRoutes.clear();if(state.route)failedGetRoutes.add(state.route)
  await page.setViewportSize({width,height:900});await page.goto(origin+'/admin?view='+state.view)
  const target=page.locator(state.selector||'[role=alert]').filter({visible:true}).first();await target.waitFor()
  if(state.name==='scope-error')await page.locator('.client-admin-page').waitFor()
  await page.evaluate(async theme=>{document.documentElement.dataset.theme=theme;localStorage.setItem('theme',theme);await document.fonts.ready;for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish()},theme)
  const report=await inspectPanel(page);reports.push({state:state.name,width,theme,...report})
  writeFileSync('.validation/panel-states/report.json',JSON.stringify(reports,null,2))
  await page.screenshot({path:`.validation/panel-states/${state.name}-${theme}-${width}.png`,animations:'disabled',fullPage:true})
  if(state.route){
   failedGetRoutes.clear();const retry=target.getByRole('button',{name:'Tentar novamente',exact:true});await retry.click()
   await page.waitForFunction(()=>![...document.querySelectorAll('[role=alert]')].some(el=>el.textContent.includes('Falha de carregamento simulada')))
  }
  pass(`${state.name} ${theme} ${width}px: distinct state${state.route?' and retry recovers':''}`)
 }
 q.setClientMode('data');q.setServiceMode('data');failedGetRoutes.clear()
 await page.setViewportSize({width:1440,height:900});await page.goto(origin+'/admin?view=clients')
 const scope=page.getByRole('button',{name:'Profissional em foco',exact:true});await scope.waitFor();await page.waitForFunction(()=>!document.querySelector('.nr-team-scope-toolbar button')?.disabled)
 const scopedRequest=page.waitForRequest(request=>{const url=new URL(request.url());return url.pathname==='/api/admin/clients'&&url.searchParams.get('professionalId')===professionalRows[0].id})
 await scope.click();await page.getByRole('option',{name:professionalRows[0].name,exact:true}).click();await scopedRequest
 await page.waitForFunction(()=>document.querySelector('.nr-team-scope-toolbar button')?.textContent.includes('Mariana'))
 assert.ok(requestedPaths.some(p=>p==='/api/admin/clients'))
 await scope.click();await page.keyboard.press('Escape');assert.equal(await scope.evaluate(el=>el===document.activeElement),true)
 await scope.click();await page.keyboard.press('Tab');assert.equal(await page.getByRole('textbox',{name:'Buscar clientes',exact:true}).evaluate(el=>el===document.activeElement),true)
 await scope.click();await page.keyboard.press('Shift+Tab');assert.notEqual(await page.evaluate(()=>document.activeElement.tagName),'BODY')
 await shot('panel-scope-keyboard');pass('shared scope select chooses, closes with Escape and follows form Tab order')
 const originalName=professionalRows[0].name
 try{
  professionalRows[0].name='Mariana de Albuquerque Nascimento Ferreira dos Santos — profissional com nome extenso'
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});await page.goto(origin+'/admin?view=clients')
   const trigger=page.getByRole('button',{name:'Profissional em foco',exact:true});await page.waitForFunction(()=>!document.querySelector('.nr-team-scope-toolbar button')?.disabled)
   await trigger.click();const option=page.getByRole('option',{name:professionalRows[0].name,exact:true});await option.waitFor()
   const menu=await page.getByRole('listbox').boundingBox();assert.ok(menu.x>=0&&menu.x+menu.width<=width)
   await option.click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false)
   assert.ok((await trigger.boundingBox()).width<=(width>767?260:width))
   await shot(`panel-scope-long-name-${width}`)
  }
 }finally{professionalRows[0].name=originalName}
 pass('long professional names stay bounded in the shared filter and its menu')
 writeFileSync('.validation/panel-states/report.json',JSON.stringify(reports,null,2))
 const failures=reports.filter(r=>r.contrast.length||r.lowContrastIcons.length||r.unnamed.length||r.fragmentedText.length||r.smallControls.length||r.overflow||r.oversizedScope||r.brokenImages.length)
 console.log('STATE AUDIT',JSON.stringify({states:reports.length,failures:failures.map(r=>({state:r.state,width:r.width,theme:r.theme,contrast:r.contrast,icons:r.lowContrastIcons,unnamed:r.unnamed}))}))
 assert.equal(failures.length,0,'State visual defects: .validation/panel-states/report.json')
}

export async function runPanelDialogs({page,origin,pass}){
 const reports=[];mkdirSync('.validation/panel-dialogs',{recursive:true})
 const dialogs=[{view:'services',button:'Novo serviço'},{view:'finance',button:'Nova movimentação'},{view:'team',button:'Adicionar profissional'}]
 for(const width of [1440,390])for(const theme of ['light','dark'])for(const dialog of dialogs){
  await page.setViewportSize({width,height:900});await page.goto(origin+'/admin?view='+dialog.view)
  await page.getByRole('button',{name:dialog.button,exact:true}).click();await page.getByRole('dialog').waitFor()
  await page.evaluate(async theme=>{document.documentElement.dataset.theme=theme;await document.fonts.ready;for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish()},theme)
  const report=await inspectPanel(page);reports.push({view:dialog.view,width,theme,...report})
  await page.screenshot({path:`.validation/panel-dialogs/${dialog.view}-${theme}-${width}.png`,animations:'disabled',fullPage:true})
  writeFileSync('.validation/panel-dialogs/report.json',JSON.stringify(reports,null,2))
  pass(`dialog ${dialog.view} ${theme} ${width}px inspected`)
 }
 const failures=reports.filter(r=>r.contrast.length||r.lowContrastIcons.length||r.unnamed.length||r.fragmentedText.length||r.smallControls.length||r.overflow||r.brokenImages.length)
 console.log('DIALOG AUDIT',JSON.stringify({dialogs:reports.length,failures}))
 assert.equal(failures.length,0,'Dialog defects: .validation/panel-dialogs/report.json')
}
