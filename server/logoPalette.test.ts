import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import {extractLogoPalettes} from './logoPalette.js'
test('image palettes follow actual green and blue pixels rather than the default copper',async()=>{
 for(const color of ['#35a322','#245cce']){
  const image=await sharp({create:{width:80,height:80,channels:4,background:color}}).png().toBuffer()
  const palettes=await extractLogoPalettes('data:image/png;base64,'+image.toString('base64'))
  assert.equal(palettes?.length,3)
  const rgb=palettes![0].primary.slice(1).match(/../g)!.map(c=>parseInt(c,16))
  assert.ok(color==='#35a322'?rgb[1]>rgb[0]&&rgb[1]>rgb[2]:rgb[2]>rgb[0]&&rgb[2]>rgb[1])
 }
 assert.equal(await extractLogoPalettes('data:image/png;base64,AAAA'),null)
})
