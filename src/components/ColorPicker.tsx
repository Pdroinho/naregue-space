import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Check, ChevronDown } from './Icons'
import './color-picker.css'

type HSV = { h:number;s:number;v:number }
const clamp=(n:number,max=100)=>Math.max(0,Math.min(max,n))
function normalizeHex(raw:string){
 const text=raw.trim().replace(/^#/,'')
 if(/^[\da-f]{3}$/i.test(text))return '#'+[...text].map(c=>c+c).join('').toLowerCase()
 return /^[\da-f]{6}$/i.test(text)?'#'+text.toLowerCase():null
}
function toHSV(hex:string):HSV{
 const rgb=(normalizeHex(hex)||'#b85a30').slice(1).match(/../g)!.map(c=>parseInt(c,16)/255)
 const [r,g,b]=rgb,max=Math.max(...rgb),min=Math.min(...rgb),d=max-min
 let h=d===0?0:max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4
 h=(h*60+360)%360
 return {h,s:max===0?0:d/max*100,v:max*100}
}
function toHex({h,s,v}:HSV){
 const sat=clamp(s)/100,val=clamp(v)/100,c=val*sat,x=c*(1-Math.abs((h/60)%2-1)),m=val-c
 const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x]
 return '#'+rgb.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('')
}
export function ColorPicker({value,onChange}:{value:string;onChange:(color:string)=>void}){
 const id=useId(),button=useRef<HTMLButtonElement>(null)
 const [text,setText]=useState(value),[error,setError]=useState(false),[open,setOpen]=useState(false),[hsv,setHSV]=useState(()=>toHSV(value))
 useEffect(()=>{setText(value);setError(false);setHSV(previous=>{if(normalizeHex(value)===toHex(previous))return previous;const next=toHSV(value);return {...next,h:next.s===0?previous.h:next.h}})},[value])
 const update=(next:HSV)=>{setHSV(next);setError(false);onChange(toHex(next))}
 const commit=()=>{const hex=normalizeHex(text);if(hex){setError(false);setText(hex);onChange(hex)}else setError(true)}
 const point=(event:PointerEvent<HTMLDivElement>)=>{
  const r=event.currentTarget.getBoundingClientRect()
  update({...hsv,s:clamp((event.clientX-r.left)/r.width*100),v:clamp(100-(event.clientY-r.top)/r.height*100)})
 }
 const presets=['#b85a30','#082a39','#5c674d','#267657','#0e7490','#d99a3d','#111827']
 return <div className="nr-color-picker">
  <div className="nr-color-presets" aria-label="Cores sugeridas">{presets.map(color=><button type="button" key={color} className="color-preset" style={{background:color}} aria-label={`Usar a cor ${color}`} aria-pressed={normalizeHex(value)===color} onClick={()=>onChange(color)}>{normalizeHex(value)===color?<Check size={16} style={{color:color==='#d99a3d'?'#102832':'#fff'}}/>:null}</button>)}</div>
  <div className="nr-color-input-row">
   <button ref={button} type="button" className="btn nr-color-toggle" aria-expanded={open} aria-controls={id+'-panel'} onClick={()=>setOpen(v=>!v)}><span className="nr-color-swatch" style={{background:value}} aria-hidden="true"/>Outra cor<ChevronDown size={15}/></button>
   <input className="input nr-color-hex" aria-label="Cor principal em hexadecimal" aria-invalid={error} aria-describedby={error?id+'-error':undefined} value={text} onChange={e=>{setText(e.target.value);setError(false)}} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit()}}} spellCheck={false} autoComplete="off" maxLength={7}/>
  </div>
  {error?<p id={id+'-error'} className="form-error" role="alert">Use uma cor no formato #RGB ou #RRGGBB.</p>:null}
  {open?<div id={id+'-panel'} className="nr-color-panel" style={{'--picker-hue':hsv.h} as CSSProperties} role="group" aria-label="Personalizar cor" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);button.current?.focus()}}}>
   <div className="nr-color-field" aria-hidden="true" style={{backgroundColor:`hsl(${hsv.h} 100% 50%)`}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);point(e)}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))point(e)}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}><span style={{left:`${hsv.s}%`,top:`${100-hsv.v}%`}}/></div>
   <div className="nr-color-sliders">{([{key:'h',label:'Tonalidade',max:359},{key:'s',label:'Saturação',max:100},{key:'v',label:'Luminosidade',max:100}] as const).map(({key,label,max})=><label key={key}><span>{label}<output>{Math.round(hsv[key])}{key==='h'?'°':'%'}</output></span><input type="range" min={0} max={max} step={1} value={hsv[key]} aria-label={label} onChange={e=>update({...hsv,[key]:Number(e.target.value)})}/></label>)}</div>
   <div className="nr-color-preview"><span className="nr-color-swatch" style={{background:value}} aria-hidden="true"/><span>Prévia da cor<strong>{normalizeHex(value)}</strong></span></div>
  </div>:null}
 </div>
}
