import {useEffect,useRef,useState} from 'react'
import {api} from '../../api'
import {PUBLIC_TEAM_PLANS,validTeamPlans,orderedTeamPlans,type TeamPlan} from '../../teamPlans'
import {LandingCheckout} from '../../components/LandingCheckout'
import {ArrowRight,Check,ChevronDown,Menu,X} from '../../components/Icons'
import {landingFaqs} from './landingContent'
import {workspaceLoginUrl} from './landingLinks'
import './mobile-atelier.css'

const money=(amount:number)=>(amount/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const story=[
 ['Seu cliente escolhe.','Compartilhe o link. O cliente escolhe serviço, profissional e horário pelo navegador, sem baixar aplicativo.'],
 ['O WhatsApp acompanha.','Conecte o WhatsApp da barbearia para enviar confirmações e lembretes. As respostas acompanham os agendamentos.'],
 ['Você tem o controle.','Cada profissional acessa a própria agenda. Horários, clientes e histórico ficam organizados no painel.'],
] as const
function track(location:string){window.dispatchEvent(new CustomEvent('naregua:cta',{detail:{location}}));(window as Window&{dataLayer?:Array<Record<string,unknown>>}).dataLayer?.push({event:'landing_cta_click',location})}

export default function MobileLanding(){
 const [plans,setPlans]=useState<readonly TeamPlan[]>(PUBLIC_TEAM_PLANS),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 const [checkout,setCheckout]=useState<TeamPlan['code']|null>(null),[menu,setMenu]=useState(false),[active,setActive]=useState(0),[confirmed,setConfirmed]=useState(false),[dock,setDock]=useState(false)
 const header=useRef<HTMLElement>(null),menuButton=useRef<HTMLButtonElement>(null),hero=useRef<HTMLElement>(null),pricing=useRef<HTMLElement>(null),closing=useRef<HTMLElement>(null)
 const [params]=useState(()=>new URLSearchParams(window.location.search))
 const referral=params.get('ref')?.trim()||undefined,workspace=params.get('workspace')?.trim().toLowerCase()||''
 const support=String(import.meta.env.VITE_SUPPORT_URL??import.meta.env.VITE_SALES_URL??'').trim()
 const terms=String(import.meta.env.VITE_TERMS_URL??'').trim()||'/termos',privacy=String(import.meta.env.VITE_PRIVACY_URL??'').trim()||'/privacidade'
 useEffect(()=>{document.body.classList.add('nr-landing-body');document.title='NaRégua — sua barbearia, organizada do agendamento ao caixa';return()=>document.body.classList.remove('nr-landing-body')},[])
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('')
  void api<{teamPlans:TeamPlan[]}>('/api/public/billing/plans',{signal:controller.signal}).then(result=>{if(controller.signal.aborted)return;if(result.ok&&validTeamPlans(result.data.teamPlans))setPlans(orderedTeamPlans(result.data.teamPlans));else setError('Não foi possível atualizar os planos. Tente novamente para confirmar os valores.');setLoading(false)})
  return()=>controller.abort()
 },[retry])
 useEffect(()=>{
  let frame=0
  const update=()=>{frame=0;const h=hero.current?.getBoundingClientRect(),p=pricing.current?.getBoundingClientRect(),c=closing.current?.getBoundingClientRect();setDock(Boolean(h&&p&&c&&h.bottom<0&&(p.top>innerHeight||p.bottom<0)&&c.top>innerHeight))}
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule)
  return()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);cancelAnimationFrame(frame)}
 },[])
 useEffect(()=>{if(!menu)return;const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenu(false);menuButton.current?.focus()}};const outside=(event:PointerEvent)=>{if(!header.current?.contains(event.target as Node))setMenu(false)};document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside)}},[menu])
 const toPlans=(location:string)=>{track(location);setMenu(false);pricing.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})}
 const buy=(code:TeamPlan['code'])=>{track('mobile-plan-'+code.toLowerCase());setCheckout(code)}
 return <div className="nr-mobile-atelier">
  <a className="ma-skip" href="#mobile-content">Pular para o conteúdo</a>
  {params.get('checkout')==='return'&&workspace?<aside className="ma-return" role="status">Continue no seu espaço para consultar a assinatura.<a href={workspaceLoginUrl(workspace)}>Acessar minha barbearia <ArrowRight size={16}/></a></aside>:null}
  <main id="mobile-content">
   <section className="ma-hero" ref={hero} aria-labelledby="ma-title">
    <header className="ma-header" ref={header}>
     <a href="#mobile-content" aria-label="NaRégua — início"><img src="/brand/logo-wordmark-approved-inverse.png" alt="NaRégua" width="145" height="44"/></a>
     <div><a href="/acessar">Entrar</a><button ref={menuButton} type="button" aria-label={menu?'Fechar menu':'Abrir menu'} aria-expanded={menu} onClick={()=>setMenu(v=>!v)}>{menu?<X size={21}/>:<Menu size={21}/>}</button></div>
     {menu?<nav aria-label="Navegação principal"><a href="#mobile-story" onClick={()=>setMenu(false)}>Como funciona</a><a href="#mobile-finance" onClick={()=>setMenu(false)}>O produto</a><a href="#mobile-plans" onClick={()=>setMenu(false)}>Planos</a><a href="#mobile-faq" onClick={()=>setMenu(false)}>Dúvidas</a></nav>:null}
    </header>
    <div className="ma-hero-copy"><h1 id="ma-title">Sua agenda,<br/><span>na régua.</span></h1><p>Agendamento, WhatsApp e gestão para a rotina da sua barbearia.</p><button className="ma-cta ma-hero-cta" type="button" onClick={()=>toPlans('mobile-hero')}>Conhecer os planos <ArrowRight size={19}/></button><small><Check size={14}/> Seu cliente não precisa baixar app.</small></div>
    <div className="ma-hero-art"><img src="/landing/mobile-art/booking-hand.webp" alt="Ilustração de mãos com uma máquina de corte e celular mostrando um agendamento de exemplo" width="960" height="1216" fetchPriority="high"/></div>
   </section>
   <section className="ma-story ma-section" id="mobile-story" aria-labelledby="ma-story-title">
    <h2 id="ma-story-title">Do seu link<br/>ao próximo corte.</h2><p className="ma-lead">Um caminho simples para quem agenda. Uma rotina organizada para quem atende.</p>
    <div className="ma-story-list">{story.map(([title,text],index)=><article key={title} className={active===index?'is-active':''}><button type="button" aria-expanded={active===index} aria-controls={`ma-story-${index}`} onClick={()=>setActive(index)}><span>{index+1}</span><strong>{title}</strong><ChevronDown size={18}/></button>{active===index?<p id={`ma-story-${index}`}>{text}</p>:null}</article>)}</div>
    <div className="ma-confirmation"><span>Exemplo de confirmação</span><p>Oi, João! Seu corte com Rafael é amanhã às <strong>10h30.</strong> Podemos confirmar?</p><button type="button" aria-pressed={confirmed} onClick={()=>{setConfirmed(v=>!v);track('mobile-confirmation-demo')}}>{confirmed?<><Check size={17}/> Exemplo confirmado</>:<>Confirmar exemplo <ArrowRight size={17}/></>}</button><small>Demonstração ilustrativa. Nenhuma mensagem é enviada.</small></div>
   </section>
   <section className="ma-finance" id="mobile-finance" aria-labelledby="ma-finance-title"><div className="ma-section"><h2 id="ma-finance-title">O corte é seu.<br/>O controle também.</h2><p className="ma-lead">Veja o que entrou, o que saiu e o saldo dos valores registrados. Sua barbearia, além da agenda.</p><ul><li><Check size={16}/>Receitas e despesas no mesmo lugar</li><li><Check size={16}/>Histórico e contexto dos clientes</li><li><Check size={16}/>Serviços e horários por profissional</li></ul></div><img src="/landing/mobile-art/cash-notebook.webp" alt="Ilustração de caderno com entradas, saídas e saldo fictícios" width="800" height="887" loading="lazy"/></section>
   <section className="ma-ai ma-section"><div className="ma-ai-rule"/><h2>Uma pergunta.<br/>Um próximo passo.</h2><p className="ma-lead">Com o Mestre AI, explore os dados da barbearia com suas palavras — da agenda ao financeiro.</p><p className="ma-ai-example">“Como está minha agenda esta semana?”</p><small>Assistente opcional. Disponibilidade e condições de uso informadas no painel.</small></section>
   <section className="ma-pricing" ref={pricing} id="mobile-plans" aria-labelledby="ma-price-title"><div className="ma-section"><h2 id="ma-price-title">Uma assinatura.<br/>A sua equipe.</h2><p className="ma-lead">Os mesmos recursos em todas as faixas. Escolha quantos profissionais atendem aí.</p><div className="ma-plan-list">{plans.map(plan=><button type="button" key={plan.code} disabled={loading||Boolean(error)} onClick={()=>buy(plan.code)} aria-label={`Ver plano ${plan.label} por ${money(plan.amountCents)} por mês`}><span>{plan.label}</span><strong>{money(plan.amountCents)}<small>por mês</small></strong><span className="ma-plan-action">Escolher <ArrowRight size={16}/></span></button>)}</div>{error?<div className="ma-catalog-error" role="alert"><p>{error}</p><button type="button" onClick={()=>setRetry(v=>v+1)}>Atualizar planos</button></div>:null}<p className="ma-plan-note">Agenda, equipe, clientes, WhatsApp e financeiro.<br/>Renovação manual, sem cobrança automática.</p></div></section>
   <section className="ma-faq ma-section" id="mobile-faq"><h2>Antes de<br/>começar.</h2><div>{landingFaqs.map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>{support?<a className="ma-text-link" href={support} target="_blank" rel="noopener noreferrer">Falar com a gente <ArrowRight size={17}/></a>:null}</section>
   <section className="ma-closing" ref={closing}><img src="/landing/mobile-art/team-handoff.webp" alt="Ilustração de mãos passando uma tesoura de barbeiro, em um gesto de equipe" width="800" height="466" loading="lazy"/><div className="ma-section"><h2>Seu ofício.<br/>Seu ritmo.<br/><span>Na régua.</span></h2><button type="button" className="ma-cta" onClick={()=>toPlans('mobile-closing')}>Encontrar meu plano <ArrowRight size={19}/></button></div></section>
  </main>
  <footer className="ma-footer"><a href="#mobile-content" aria-label="Voltar ao início"><img src="/brand/logo-wordmark-approved-inverse.png" alt="NaRégua" width="150" height="45" loading="lazy"/></a><p>Talento na cadeira.<br/>Organização no resto.</p><nav aria-label="Rodapé"><a href="/acessar">Entrar na minha barbearia</a><a href="#mobile-plans">Planos por equipe</a><a href={terms}>Termos de uso</a><a href={privacy}>Privacidade</a></nav><div><small>© {new Date().getFullYear()} NaRégua</small><small>Pagamentos pela AbacatePay.</small></div></footer>
  {dock&&!menu&&!checkout&&!loading&&!error?<div className="ma-dock"><span>A partir de<strong>{money(plans[0].amountCents)}<small>/mês</small></strong></span><button type="button" onClick={()=>toPlans('mobile-dock')}>Ver planos <ArrowRight size={17}/></button></div>:null}
  <LandingCheckout open={Boolean(checkout)} initialTeamPlan={checkout??'TEAM_3'} onClose={()=>setCheckout(null)} referralToken={referral}/>
 </div>
}
