import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import sharp from 'sharp'

// The generated originals stay private; the shipping files retain exact prompts.
const manifest=JSON.parse(readFileSync(process.argv[2],'utf8'))
mkdirSync('public/landing/art',{recursive:true})
mkdirSync('docs/assets',{recursive:true})
for(const item of manifest){
 const source=sharp(item.source),metadata=await source.metadata()
 let output=source
 if(item.transparent){
  const stats=await source.stats()
  if(!metadata.hasAlpha||stats.channels.at(-1).min!==0)throw new Error(`Missing native transparent alpha: ${item.name}`)
  output=output.trim({background:'#00000000',threshold:5})
 }
 await output.resize({width:item.transparent?1100:1800,withoutEnlargement:true}).withMetadata({exif:{IFD0:{ImageDescription:item.prompt,Artist:'NaRégua — generated with OpenAI ImageGen',Copyright:'NaRégua illustrative campaign asset; not an actual product screenshot'}}}).webp({quality:item.transparent?88:93,alphaQuality:100}).toFile(`public/landing/art/${item.name}.webp`)
 const result=await sharp(`public/landing/art/${item.name}.webp`).metadata()
 console.log(`${item.name}: ${result.width}x${result.height}, alpha ${result.hasAlpha}, ${result.size} bytes`)
}
writeFileSync('docs/assets/landing-art-prompts.json',JSON.stringify(manifest.map(({name,prompt,transparent,originPrompt})=>({name,file:`public/landing/art/${name}.webp`,tool:'built-in image_gen',prompt,originPrompt,transparent})),null,2)+'\n')
