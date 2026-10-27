import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { api } from '../../api'
import { PUBLIC_TEAM_PLANS, validTeamPlans, orderedTeamPlans, type TeamPlan } from '../../teamPlans'
import { ArrowRight, Calendar, Check, ChevronDown, Menu, MessageSquare, Scissors, ShieldCheck, Sparkles, Users, Wallet, X } from '../../components/Icons'
import { ProductSelect } from '../../components/ProductSelect'
import { LandingCheckout } from '../../components/LandingCheckout'
import { workspaceLoginUrl } from './landingLinks'
import './landing-experience.css'

const areas = [
  { id:'calendar',label:'agenda',image:'/landing/renewal/calendar.webp',alt:'Agenda semanal do NaRégua com horários e confirmações de demonstração' },
  { id:'team',label:'equipe',image:'/landing/renewal/team.webp',alt:'Gestão de profissionais no NaRégua com dados de demonstração' },
  { id:'dashboard',label:'gestão',image:'/landing/renewal/dashboard.webp',alt:'Visão geral do NaRégua com dados de demonstração' },
] as const
const steps = [
  {title:'Seu cliente escolhe.',text:'Você compartilha o link. Ele escolhe o serviço, o profissional e um horário disponível, pelo próprio navegador.'},
  {title:'A conversa continua.',text:'Conecte o WhatsApp da barbearia para enviar confirmações e lembretes. A resposta do cliente acompanha o agendamento.'},
  {title:'Você acompanha.',text:'Horários, confirmações e histórico ficam organizados no painel. Cada profissional tem acesso à própria rotina.'},
]
const faqs = [
  ['Meus clientes precisam baixar um aplicativo?','Não. Seu link de agendamento abre no navegador do celular. O cliente escolhe o serviço, o profissional e o horário disponível.'],
  ['Como conecto o WhatsApp da barbearia?','Na área de WhatsApp do painel, você prepara a conexão e lê o QR Code em Aparelhos conectados no seu celular. Depois de conectado, o espaço pode usar a central de conversas, confirmações e lembretes.'],
  ['Posso usar com a minha equipe?','Sim. Você cadastra os profissionais, define os serviços e a disponibilidade de cada um. A assinatura é por barbearia, em faixas de até 3, 6 ou 15 profissionais.'],
  ['O financeiro substitui a contabilidade?','Não. Ele organiza os valores dos atendimentos confirmados e as receitas e despesas registradas na plataforma. Os indicadores ajudam a acompanhar a operação; não substituem a contabilidade.'],
  ['O que o Mestre AI faz?','Ele ajuda com perguntas sobre agenda, financeiro, clientes e a rotina do espaço, usando os dados disponíveis no sistema. É opcional e tem condições de uso próprias, apresentadas no painel.'],
  ['Como funciona a assinatura?','Você escolhe a faixa da sua equipe e consulta o valor mensal antes de contratar. O pagamento usa a AbacatePay. A contratação depende da disponibilidade informada no checkout; a renovação é manual, sem cobrança automática.'],
] as const
const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
function track(location:string){
  window.dispatchEvent(new CustomEvent('naregua:cta',{detail:{location}}))
  const analytics=window as Window & {dataLayer?:Array<Record<string,unknown>>}
  analytics.dataLayer?.push({event:'landing_cta_click',location})
}
function RollingPrice({cents}:{cents:number}){
 const formatted=money(cents)
 return <strong className="lp-price-digits" aria-label={formatted}><span aria-hidden="true">{[...formatted].map((char,index)=>/\d/.test(char)?<span className="lp-digit" key={index}><span className="lp-digit-strip" style={{transform:`translateY(-${Number(char)}em)`}}>{Array.from({length:10},(_,n)=><span key={n}>{n}</span>)}</span></span>:<span className="lp-digit-punctuation" key={index}>{char}</span>)}</span></strong>
}

export function LandingExperience(){
 const root=useRef<HTMLDivElement>(null),menuButton=useRef<HTMLButtonElement>(null)
 const [area,setArea]=useState<string>('calendar'),[step,setStep]=useState(0),[confirmed,setConfirmed]=useState(false)
 const [menuOpen,setMenuOpen]=useState(false),[scrolled,setScrolled]=useState(false)
 const [people,setPeople]=useState(3),[plans,setPlans]=useState<readonly TeamPlan[]>(PUBLIC_TEAM_PLANS),[pricingError,setPricingError]=useState(''),[pricingLoading,setPricingLoading]=useState(true),[retry,setRetry]=useState(0)
 const [checkoutOpen,setCheckoutOpen]=useState(false),[checkoutPlan,setCheckoutPlan]=useState<TeamPlan['code']>('TEAM_3')
 const [params]=useState(()=>new URLSearchParams(window.location.search))
 const referral=params.get('ref')?.trim()||undefined,returnWorkspace=params.get('workspace')?.trim().toLowerCase()||''
 const supportUrl=String(import.meta.env.VITE_SUPPORT_URL??import.meta.env.VITE_SALES_URL??'').trim()
 const terms=String(import.meta.env.VITE_TERMS_URL??'').trim()||'/termos',privacy=String(import.meta.env.VITE_PRIVACY_URL??'').trim()||'/privacidade'
 const plan=plans.find(p=>p.seats>=people)??plans[plans.length-1]
 useEffect(()=>{
  document.body.classList.add('nr-landing-body');document.title='NaRégua — sua barbearia, organizada do agendamento ao caixa'
  const onScroll=()=>setScrolled(window.scrollY>32);onScroll();window.addEventListener('scroll',onScroll,{passive:true})
  return()=>{document.body.classList.remove('nr-landing-body');window.removeEventListener('scroll',onScroll)}
 },[])
 useEffect(()=>{
  const controller=new AbortController();setPricingLoading(true);setPricingError('')
  void api<{teamPlans:TeamPlan[]}>('/api/public/billing/plans',{signal:controller.signal}).then(result=>{
   if(controller.signal.aborted)return
   if(result.ok&&validTeamPlans(result.data.teamPlans))setPlans(orderedTeamPlans(result.data.teamPlans))
   else setPricingError('Não foi possível atualizar os planos. Tente novamente para confirmar os valores.')
   setPricingLoading(false)
  })
  return()=>controller.abort()
 },[retry])
 useEffect(()=>{
  const host=root.current;if(!host||!('IntersectionObserver' in window))return
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const reveal=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){if(!reduced)(entry.target as HTMLElement).animate([{opacity:.2,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});reveal.unobserve(entry.target)}},{threshold:.12})
  host.querySelectorAll('[data-lp-reveal]').forEach(el=>reveal.observe(el))
  const story=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)setStep(Number((entry.target as HTMLElement).dataset.lpStep))},{rootMargin:'-32% 0px -32% 0px',threshold:.15})
  host.querySelectorAll('[data-lp-step]').forEach(el=>story.observe(el))
  return()=>{reveal.disconnect();story.disconnect()}
 },[])
 useEffect(()=>{
  if(!menuOpen)return
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenuOpen(false);menuButton.current?.focus()}}
  const outside=(event:PointerEvent)=>{if(!root.current?.querySelector('.lp-header')?.contains(event.target as Node))setMenuOpen(false)}
  document.addEventListener('keydown',escape);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside)}
 },[menuOpen])
 function buy(code:TeamPlan['code']){track('pricing-'+code.toLowerCase());setCheckoutPlan(code);setCheckoutOpen(true)}
 const toPlans=()=>{track('hero-plans');document.getElementById('preco')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
 return <div ref={root} className="nr-lp">
  <a className="lp-skip" href="#conteudo">Pular para o conteúdo</a>
  {params.get('checkout')==='return'&&returnWorkspace?<aside className="lp-return" role="status">Consulte o status da sua assinatura no seu espaço.<a href={workspaceLoginUrl(returnWorkspace)}>Acessar minha barbearia <ArrowRight size={16}/></a></aside>:null}
   <header className={`lp-header ${scrolled?'is-scrolled':''}`}>
    <a href="#inicio" className="lp-brand" aria-label="NaRégua — início"><img src="/brand/logo-wordmark-approved-web.png" alt="NaRégua" width="158" height="36"/></a>
    <nav className={menuOpen?'is-open':''} aria-label="Navegação principal"><a href="#como-funciona" onClick={()=>setMenuOpen(false)}>Como funciona</a><a href="#produto" onClick={()=>setMenuOpen(false)}>O produto</a><a href="#preco" onClick={()=>setMenuOpen(false)}>Planos</a><a href="#duvidas" onClick={()=>setMenuOpen(false)}>Dúvidas</a></nav>
    <div className="lp-nav-actions"><a className="lp-login" href="/acessar">Entrar</a><a className="lp-button lp-button-small" href="#preco" onClick={()=>track('header-plans')}>Conhecer planos <ArrowRight size={16}/></a><button ref={menuButton} className="lp-menu" type="button" onClick={()=>setMenuOpen(v=>!v)} aria-label={menuOpen?'Fechar menu':'Abrir menu'} aria-expanded={menuOpen}>{menuOpen?<X size={22}/>:<Menu size={22}/>}</button></div>
   </header>
   <main id="conteudo">
   <div className="lp-opening" id="inicio">
    <section className="lp-hero" aria-labelledby="lp-title">
     <div className="lp-hero-copy">
      <h1 id="lp-title">Sua <ProductSelect value={area} onChange={setArea} ariaLabel="Escolher área da demonstração" className="lp-topic-trigger" menuClassName="lp-topic-menu" options={areas.map(a=>({value:a.id,label:a.label}))}/> na régua.<br/><span>Seu foco, no próximo corte.</span></h1>
      <p>Agendamento online, equipe, WhatsApp e financeiro no mesmo lugar.<br className="lp-desktop-break"/> A organização que acompanha o ritmo da sua barbearia.</p>
      <button className="lp-button lp-button-hero" type="button" onClick={toPlans}>Quero minha barbearia na régua <ArrowRight size={20}/></button>
      <div className="lp-hero-facts"><span><Check size={16}/> Cliente sem aplicativo</span><span><Check size={16}/> Mensalidade por equipe</span></div>
     </div>
     <div className="lp-preview-wrap">
      <div className="lp-preview-controls" role="group" aria-label="Demonstração do produto">{areas.map(a=><button type="button" key={a.id} aria-pressed={area===a.id} onClick={()=>setArea(a.id)}>{a.id==='calendar'?<Calendar size={17}/>:a.id==='team'?<Users size={17}/>:<Wallet size={17}/>}<span>{a.label}</span></button>)}</div>
      <div className="lp-screen-shell"><div className="lp-screen-top"><div><i/><i/><i/></div><span>Seu espaço. Sua rotina.</span><ShieldCheck size={15}/></div><div className="lp-screen-images">{areas.map((a,index)=><img key={a.id} src={a.image} alt={a.alt} aria-hidden={area!==a.id} className={area===a.id?'is-active':''} width="1172" height="850" fetchPriority={index===0?'high':'auto'} loading={index===0?'eager':'lazy'}/>)}</div></div>
      <p className="lp-demo-caption">Interface do NaRégua com dados de demonstração.</p>
     </div>
    </section>
  </div>
  <div className="lp-capabilities" aria-label="Recursos NaRégua"><span><Calendar/>Agenda online</span><span><Users/>Equipe</span><span><MessageSquare/>WhatsApp</span><span><Wallet/>Financeiro</span><span><Sparkles/>Mestre AI</span></div>
  <section className="lp-intro lp-container" id="porque" data-lp-reveal>
   <div className="lp-intro-photo"><img src="/naregua/craft.webp" alt="Barbeiro fazendo o acabamento de um corte" width="800" height="650" loading="lazy"/></div>
   <div className="lp-intro-copy"><Scissors size={32}/><h2>O talento é seu.<br/>A organização fica<br/>com o NaRégua.</h2><p>Entre um atendimento e outro, tem horário para responder, cliente para confirmar e caixa para acompanhar.</p><p>Dê um lugar para cada parte dessa rotina. Sem tirar o foco de quem está na sua cadeira.</p><a className="lp-text-link" href="#como-funciona">Veja como tudo se conecta <ArrowRight size={18}/></a></div>
  </section>
  <section className="lp-story" id="como-funciona">
   <div className="lp-container"><div className="lp-section-heading" data-lp-reveal><h2>Do primeiro clique<br/>ao horário confirmado.</h2><p>Seu cliente ganha autonomia.<br/>Você mantém o controle da agenda.</p></div>
    <div className="lp-story-layout">
     <div className="lp-story-stage" style={{'--lp-step':step} as CSSProperties}>
      <div className="lp-phone"><div className="lp-phone-camera"/><img src="/landing/renewal/booking.webp" alt="Escolha de horário pelo navegador no agendamento NaRégua, com dados de demonstração" width="390" height="820" loading="lazy"/></div>
      <div className={`lp-message-demo ${step>=1?'is-active':''}`}>
       <div className="lp-message-label"><MessageSquare size={17}/><span>Exemplo de confirmação</span></div>
       <p>Oi, João! Seu corte com Rafael é amanhã às 10h30. Responda <b>1</b> para confirmar ou <b>2</b> se não puder ir.</p>
       <button type="button" onClick={()=>{setConfirmed(v=>!v);setStep(confirmed?1:2)}} aria-pressed={confirmed}>{confirmed?<><Check size={17}/> Exemplo confirmado</>:<>Confirmar exemplo <ArrowRight size={16}/></>}</button>
      </div>
      <div className={`lp-confirmation-demo ${step===2?'is-active':''}`} aria-hidden={step!==2}><span><Check size={18}/></span><div><strong>Horário confirmado</strong><p>João · Corte clássico · 10h30</p></div></div>
      <small className="lp-story-caption">Demonstração ilustrativa. Nenhuma mensagem é enviada.</small>
     </div>
     <div className="lp-story-steps">{steps.map((s,index)=><article key={s.title} data-lp-step={index} className={step===index?'is-active':''}><button type="button" onClick={()=>setStep(index)} aria-pressed={step===index}><span>{index+1}</span><h3>{s.title}</h3><ChevronDown size={19}/></button><p>{s.text}</p></article>)}</div>
    </div>
   </div>
  </section>
  <section className="lp-workspace lp-container" id="produto" data-lp-reveal>
   <div className="lp-workspace-copy"><h2>Abra o painel.<br/>Entenda a barbearia.</h2><p>O que está agendado, quem atende, quais clientes voltam e o que foi registrado no financeiro. Cada informação no seu lugar.</p><ul><li><Check size={18}/> Disponibilidade e serviços por profissional</li><li><Check size={18}/> Histórico e contexto dos clientes</li><li><Check size={18}/> Receitas, despesas e metas do espaço</li></ul><a className="lp-text-link" href="#preco">Encontrar o plano da minha equipe <ArrowRight size={18}/></a></div>
   <figure className="lp-workspace-image"><img src="/landing/renewal/finance.webp" alt="Financeiro do NaRégua com valores ilustrativos de receitas e despesas" width="1172" height="850" loading="lazy"/><figcaption>Interface do produto. Valores de demonstração.</figcaption></figure>
  </section>
  <section className="lp-ai lp-container" id="mestre" data-lp-reveal><div className="lp-ai-symbol"><img src="/brand/logo-symbol-approved-web.png" alt="" width="88" height="88" loading="lazy"/></div><div><h2>Uma pergunta.<br/>Um próximo passo.</h2><p>O Mestre AI ajuda você a explorar os dados da barbearia, da agenda ao financeiro. Pergunte com as suas palavras e leve contexto para suas decisões.</p></div><div className="lp-ai-prompts"><span>Como está minha agenda esta semana?</span><span>O que entrou e saiu neste mês?</span><span>Me ajude a responder este cliente.</span><small>Assistente opcional, com disponibilidade e uso informados no painel.</small></div></section>
  <section className="lp-pricing-wrap" id="preco">
   <div className="lp-pricing lp-container"><div className="lp-section-heading" data-lp-reveal><h2>Do seu tamanho.<br/>No seu ritmo.</h2><p>Uma assinatura para a barbearia.<br/>Escolha a faixa da sua equipe.</p></div>
    <div className="lp-price-layout"><div className="lp-team-calculator"><label htmlFor="lp-professionals">Quantos profissionais atendem aí?</label><div className="lp-people-count"><strong aria-live="polite">{people}</strong><span>{people===1?'profissional':'profissionais'}</span><Users size={36}/></div><input id="lp-professionals" type="range" min="1" max="15" value={people} onChange={e=>setPeople(Number(e.target.value))}/><div className="lp-range-labels"><span>1 profissional</span><span>15 profissionais</span></div><div className="lp-tier-options" role="group" aria-label="Faixa da equipe">{plans.map(p=><button type="button" key={p.code} aria-pressed={plan.code===p.code} onClick={()=>setPeople(p.minProfessionals)}>{p.label}</button>)}</div><p>Os mesmos recursos em todas as faixas.<br/>O que muda é o tamanho da equipe.</p></div>
     <div className="lp-plan-result" aria-label="Plano para sua equipe"><span className="lp-plan-label">{plan.label}</span><div className="lp-price-line"><RollingPrice cents={plan.amountCents}/><span>/mês</span></div><p>Até {plan.seats} profissionais agendáveis.</p><ul><li><Check size={17}/> Agenda e link de agendamento</li><li><Check size={17}/> Gestão da equipe e dos clientes</li><li><Check size={17}/> WhatsApp e financeiro</li><li><Check size={17}/> Mestre AI disponível no painel</li></ul><button type="button" className="lp-button" onClick={()=>buy(plan.code)} disabled={pricingLoading||Boolean(pricingError)}>{pricingLoading?'Atualizando planos…':'Ver este plano'}<ArrowRight size={18}/></button><small>Consulte as condições e a disponibilidade no checkout.</small></div>
    </div>
    {pricingError?<div className="lp-pricing-error" role="alert"><p>{pricingError}</p><button type="button" onClick={()=>setRetry(v=>v+1)}>Atualizar planos</button></div>:null}
    <div className="lp-all-plans" aria-label="Todos os planos">{plans.map(p=><article key={p.code}><span>{p.label}</span><strong>{money(p.amountCents)}<small>/mês</small></strong><button type="button" disabled={pricingLoading||Boolean(pricingError)} onClick={()=>buy(p.code)}>Ver detalhes <ArrowRight size={15}/></button></article>)}</div>
   </div>
  </section>
  <section className="lp-faq lp-container" id="duvidas" data-lp-reveal><div><h2>Vamos tirar<br/>essas dúvidas?</h2><p>O essencial para entender como o NaRégua entra na sua rotina.</p>{supportUrl?<a className="lp-text-link" href={supportUrl} target="_blank" rel="noopener noreferrer">Falar com a gente <ArrowRight size={18}/></a>:null}</div><div className="lp-faq-list">{faqs.map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
  <section className="lp-close"><div className="lp-container"><h2>O próximo horário<br/>pode começar aqui.</h2><p>Leve a organização da sua barbearia para o NaRégua.</p><a href="#preco" className="lp-button" onClick={()=>track('closing-plans')}>Encontrar meu plano <ArrowRight size={19}/></a></div><img src="/naregua/hero.webp" alt="Barbeiro atendendo um cliente na barbearia" width="1774" height="887" loading="lazy"/></section>
  </main>
  <footer className="lp-footer lp-container"><div className="lp-footer-top"><a href="#inicio" className="lp-brand"><img src="/brand/logo-wordmark-approved-web.png" alt="NaRégua" width="158" height="36"/></a><p>Da agenda ao caixa.<br/>Feito para a sua barbearia.</p><nav aria-label="Rodapé"><a href="/acessar">Acessar minha barbearia</a><a href="#preco">Planos</a><a href={terms}>Termos de uso</a><a href={privacy}>Privacidade</a>{supportUrl?<a href={supportUrl} target="_blank" rel="noopener noreferrer">Suporte</a>:null}</nav></div><div className="lp-footer-bottom"><span>© {new Date().getFullYear()} NaRégua.</span><span>Assinaturas processadas pela AbacatePay.</span></div></footer>
  <LandingCheckout open={checkoutOpen} onClose={()=>setCheckoutOpen(false)} initialTeamPlan={checkoutPlan} referralToken={referral}/>
 </div>
}
