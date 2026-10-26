/* global document,window */
import assert from 'node:assert/strict'

export async function runClientsRefinement({page,origin,pass,shot,setClientMode}) {
 const capture=async name=>{
  await page.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish()})
  await shot(name)
 }
 for(const width of [1440,390,320])for(const theme of ['light','dark']) {
  await page.setViewportSize({width,height:900})
  setClientMode('empty');await page.goto(origin+'/admin?view=clients')
  await page.locator('.client-empty').waitFor()
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;localStorage.setItem('theme',theme)},theme)
  assert.equal(await page.locator('.client-desktop-table:visible').count(),0)
  assert.equal(await page.locator('.client-mobile-overview:visible').count(),0)
  assert.equal(await page.locator('.client-empty .nr-icon').count(),1)
  assert.equal(await page.locator('.client-empty img').count(),0)
  assert.equal(await page.locator('.ld-mobile-menu-button:visible').count(),0)
  if(width<=900)assert.equal(await page.locator('.ld-mobile-tabbar button').last().isVisible(),true)
  if(width>900) {
   assert.equal(await page.locator('.ld-sidebar-collapse:visible').count(),1)
   const head=await page.locator('.client-admin-header').boundingBox(),search=await page.locator('.client-search').boundingBox()
   assert.ok(search.y-head.y-head.height>=19)
   await page.locator('.ld-sidebar-collapse').click();await page.waitForFunction(()=>document.querySelector('.ld-shell').classList.contains('is-sidebar-collapsed'))
   await page.locator('.ld-sidebar-collapse').click()
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false)
  await capture(`clients-empty-${theme}-${width}`)
  pass(`clients empty ${theme} ${width}px has one menu control, themed icon and spaced search`)
  setClientMode('data');await page.goto(origin+'/admin?view=clients')
  await page.locator('.client-desktop-table:visible,.client-mobile-list:visible').getByText('Amanda Oliveira',{exact:true}).first().waitFor()
  await page.getByRole('textbox',{name:'Buscar clientes',exact:true}).fill('zzzzmissing')
  await page.locator('.client-empty').getByText('Nenhum cliente encontrado',{exact:true}).waitFor()
  await page.locator('.client-empty').getByRole('button',{name:'Limpar busca',exact:true}).click()
  await page.locator('.client-desktop-table:visible,.client-mobile-list:visible').getByText('Amanda Oliveira',{exact:true}).first().waitFor()
  await page.getByRole('textbox',{name:'Buscar clientes',exact:true}).fill('Bianca')
  assert.equal(await page.locator('.client-desktop-table:visible,.client-mobile-list:visible').getByText('Amanda Oliveira',{exact:true}).count(),0)
  await capture(`clients-data-${theme}-${width}`)
  pass(`clients search ${theme} ${width}px distinguishes no results and clears back to data`)
 }
 setClientMode('error');await page.goto(origin+'/admin?view=clients')
 await page.getByRole('alert').waitFor();assert.equal(await page.locator('.client-empty').count(),0)
 setClientMode('data');await page.getByRole('button',{name:'Tentar novamente',exact:true}).click()
 await page.locator('.client-desktop-table:visible,.client-mobile-list:visible').getByText('Amanda Oliveira',{exact:true}).first().waitFor()
 pass('client API failure remains an error and retry restores data')
}
