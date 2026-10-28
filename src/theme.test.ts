import assert from 'node:assert/strict'
import test from 'node:test'
import {applyPrimaryColor,clearTenantTheme} from './theme.js'
test('tenant hover color follows every new accent and clears with tenant theme',()=>{
 const original=globalThis.document,values=new Map<string,string>()
 const root={dataset:{theme:'light',mode:'admin'},style:{setProperty:(k:string,v:string)=>values.set(k,v),removeProperty:(k:string)=>values.delete(k)}}
 globalThis.document={documentElement:root,querySelector:()=>null} as unknown as Document
 try{
  const hover=[]
  for(const accent of ['#218436','#245cce','#b85a30']){applyPrimaryColor(accent);assert.equal(values.get('--primary-on-light'),values.get('--primary-700'));hover.push(values.get('--primary-on-light'))}
  assert.equal(new Set(hover).size,3);clearTenantTheme();assert.equal(values.has('--primary-on-light'),false)
 }finally{globalThis.document=original}
})
