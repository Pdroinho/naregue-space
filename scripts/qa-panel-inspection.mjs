/* global document,window */
export async function inspectPanel(page) {
 return await page.evaluate(()=>{
   const rgba=color=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle=color;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data]}
   const over=(f,b)=>f.slice(0,3).map((v,i)=>v*f[3]/255+b[i]*(1-f[3]/255))
   const lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
   const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05)
   const visible=el=>{const r=el.getBoundingClientRect(),s=window.getComputedStyle(el);return r.width>0&&r.height>0&&r.right>0&&r.left<window.innerWidth&&s.visibility!=='hidden'&&s.display!=='none'&&!el.closest('[hidden],[inert]')}
   const samples=[],skipped=new Set(),seen=new Set()
   for(const el of document.querySelectorAll('body *')){
    if(!visible(el)||el.closest('[aria-hidden="true"],button:disabled,input:disabled')||!Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()))continue
    const text=Array.from(el.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();if(!text||el.matches('script,style,option'))continue
    const layers=[];let node=el,complex=false
    while(node){const s=window.getComputedStyle(node);if(s.backgroundImage!=='none'||Number(s.opacity)<.99)complex=true;layers.push(rgba(s.backgroundColor));node=node.parentElement}
    if(complex){skipped.add(el.className||el.tagName);continue}
    const bg=layers.reverse().reduce((b,f)=>over(f,b),[255,255,255]),s=window.getComputedStyle(el),fg=over(rgba(s.color),bg),value=ratio(fg,bg)
    const min=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&parseInt(s.fontWeight)>=700)?3:4.5
    const key=[el.className,s.color,s.backgroundColor,min].join('|')
    if(value+.02<min&&!seen.has(key)){seen.add(key);samples.push({tag:el.tagName,className:el.className,text:text.slice(0,110),ratio:Number(value.toFixed(2)),minimum:min,color:s.color,background:bg.map(Math.round),fontSize:s.fontSize})}
   }
   const unnamed=[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea')].filter(visible).filter(el=>{
    if(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.getAttribute('title'))return false
    if(el.matches('input,select,textarea'))return !el.labels?.length
    return !el.textContent.trim()&&!el.querySelector('img[alt]:not([alt=""])')
   }).map(el=>({tag:el.tagName,className:el.className,type:el.getAttribute('type')}))
   const lowContrastIcons=[]
   for(const el of document.querySelectorAll('button:not(:disabled) .nr-icon,.empty-state-icon>.nr-icon')){
    if(!visible(el))continue
    let node=el.parentElement,complex=false;const layers=[]
    while(node){const s=window.getComputedStyle(node);if(s.backgroundImage!=='none'||Number(s.opacity)<.99)complex=true;layers.push(rgba(s.backgroundColor));node=node.parentElement}
    if(complex)continue
    const bg=layers.reverse().reduce((b,f)=>over(f,b),[255,255,255]),s=window.getComputedStyle(el),value=ratio(over(rgba(s.color),bg),bg)
    if(value<3)lowContrastIcons.push({className:el.className,label:el.closest('button')?.getAttribute('aria-label'),ratio:Number(value.toFixed(2))})
   }
   const oversizedScope=window.innerWidth>767&&[...document.querySelectorAll('.nr-team-scope-toolbar>.ld-select-trigger')].some(el=>el.getBoundingClientRect().width>360)
   const smallControls=[...document.querySelectorAll('button:not(:disabled)')].filter(visible).filter(el=>{const r=el.getBoundingClientRect();return r.width<24||r.height<24}).map(el=>({className:el.className,label:el.getAttribute('aria-label')||el.textContent.trim().slice(0,60)}))
   const fragmentedText=[]
   for(const el of document.querySelectorAll('.ld-page-title,.data-table th,.data-table .pill,.data-table .status-badge,.client-desktop-table td:nth-child(2)')){
    if(!visible(el))continue
    for(const node of el.childNodes){
     if(node.nodeType!==3)continue
     for(const match of node.textContent.matchAll(/\S{4,}/g)){
      const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length)
      const lines=new Set([...range.getClientRects()].filter(r=>r.width>0&&r.height>0).map(r=>Math.round(r.top)))
      if(lines.size>1)fragmentedText.push({className:el.className,text:match[0]})
     }
    }
   }
   return {contrast:samples,unnamed,lowContrastIcons,oversizedScope,smallControls,fragmentedText,overflow:document.documentElement.scrollWidth>window.innerWidth+1,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute('src')),skippedComplexSurfaces:[...skipped].slice(0,20)}
  })
}
