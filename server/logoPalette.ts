import sharp from 'sharp'

/** Extract artwork colors locally, ignoring transparent pixels and neutral backgrounds. */
export async function extractLogoPalettes(dataUrl?:string|null){
 const match=/^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl||'')
 if(!match)return null
 try{
  const {data}=await sharp(Buffer.from(match[1],'base64'),{limitInputPixels:8_000_000}).rotate().resize(96,96,{fit:'inside'}).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const bins=new Map<string,{rgb:number[];weight:number}>()
  for(let i=0;i<data.length;i+=4){const rgb=[data[i],data[i+1],data[i+2]],max=Math.max(...rgb),min=Math.min(...rgb);if(data[i+3]<180||max-min<30||max<35||min>225)continue;const key=rgb.map(c=>Math.round(c/24)).join(',');const weight=(max-min)/255;const bin=bins.get(key)||{rgb:[0,0,0],weight:0};rgb.forEach((c,n)=>bin.rgb[n]+=c*weight);bin.weight+=weight;bins.set(key,bin)}
  const ranked=[...bins.values()].sort((a,b)=>b.weight-a.weight)
  if(!ranked.length)return null
  const color=ranked[0].rgb.map(c=>Math.round(c/ranked[0].weight))
  const mix=(rgb:number[],target:number,factor:number)=>rgb.map(c=>Math.round(c*(1-factor)+target*factor))
  const hex=(rgb:number[])=>'#'+rgb.map(c=>c.toString(16).padStart(2,'0')).join('')
  const luminance=(rgb:number[])=>rgb.map(c=>{const n=c/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0)
  const readable=(rgb:number[])=>{let result=rgb;while(1.05/(luminance(result)+.05)<4.5)result=mix(result,0,.08);return result}
  return [0,.13,.26].map((shade,index)=>({name:['Cores da sua logo','Marca em contraste','Tom mais profundo'][index],primary:hex(readable(mix(color,0,shade))),secondary:hex(mix(color,0,.82)),background:hex(mix(color,255,.96)),rationale:'Paleta extraída dos pixels da imagem, com contraste ajustado para leitura.'}))
 }catch{return null}
}
