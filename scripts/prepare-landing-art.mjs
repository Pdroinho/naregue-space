import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import sharp from 'sharp'

// The generated originals stay private; the shipping files retain exact prompts.
const manifest=JSON.parse(readFileSync(process.argv[2],'utf8'))
const outputDir=process.argv[3]??'public/landing/art-v2'
const promptManifest=process.argv[4]??'docs/assets/landing-art-v2-prompts.json'
mkdirSync(outputDir,{recursive:true})
mkdirSync('docs/assets',{recursive:true})
for(const item of manifest){
 const source=sharp(item.source),metadata=await source.metadata()
 let output=source
 if(item.transparent){
  const stats=await source.stats()
  if(!metadata.hasAlpha||stats.channels.at(-1).min!==0)throw new Error(`Missing native transparent alpha: ${item.name}`)
  output=output.trim({background:'#00000000',threshold:5})
 }
 await output.resize({width:item.width??(item.name==='hands'?2200:item.transparent?1400:2000),withoutEnlargement:true}).withMetadata({exif:{IFD0:{ImageDescription:item.prompt,Artist:'NaRégua — generated with OpenAI ImageGen',Copyright:'NaRégua illustrative campaign asset; not an actual product screenshot'}}}).webp({quality:item.transparent?92:95,alphaQuality:100}).toFile(`${outputDir}/${item.name}.webp`)
 const result=await sharp(`${outputDir}/${item.name}.webp`).metadata()
 console.log(`${item.name}: ${result.width}x${result.height}, alpha ${result.hasAlpha}, ${result.size} bytes`)
}
writeFileSync(promptManifest,JSON.stringify(manifest.map(({name,prompt,transparent,originPrompt})=>({name,file:`${outputDir}/${name}.webp`,tool:'built-in image_gen',prompt,originPrompt,transparent})),null,2)+'\n')
