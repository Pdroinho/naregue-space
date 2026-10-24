import { PUBLIC_TEAM_PLANS, validTeamPlans, orderedTeamPlans, type TeamPlan } from './teamPlans'
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { api } from './api'
import {
  ArrowRight,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from './components/Icons'
import { LandingCheckout } from './components/LandingCheckout'
import { currencyBRLFromCents } from './commercial'
import './landing.css'

const productViews = [
  {
    id: 'agenda',
    label: 'Agenda',
    title: 'Transforme procura em horário marcado.',
    description: 'A agenda organiza horários, disponibilidade e confirmações em um fluxo que continua funcionando enquanto você atende.',
    image: '/landing/product/real/agenda.webp',
    alt: 'Fluxo real de agendamento dentro do NaRégua',
  },
  {
    id: 'dashboard',
    label: 'Visão geral',
    title: 'Leia a barbearia antes de abrir o WhatsApp.',
    description: 'Agenda, clientes, pendências e movimento financeiro aparecem juntos para você decidir com contexto, não no escuro.',
    image: '/landing/product/real/dashboard.webp',
    alt: 'Dashboard real do NaRégua',
  },
  {
    id: 'assistant',
    label: 'Mestre AI',
    title: 'Pergunte ao negócio. Receba um próximo passo.',
    description: 'O Mestre AI interpreta os dados disponíveis da operação e devolve respostas diretas para orientar sua próxima decisão.',
    image: '/landing/product/real/mestre-ai.webp',
    alt: 'Mestre AI dentro do NaRégua',
  },
] as const

const faqItems = [
  ['Vou precisar abandonar o WhatsApp?', 'Não. O WhatsApp continua sendo seu canal de relacionamento. O NaRégua organiza confirmações, lembretes e conversas junto da rotina do atendimento.'],
  ['Preciso saber mexer com sistemas?', 'Não. Depois da compra, um setup guiado ajuda a organizar marca, horários e serviços. A operação fica clara desde o primeiro acesso.'],
  ['Meus clientes precisam instalar aplicativo?', 'Não. Eles acessam seu link pelo navegador, escolhem serviço, data e horário e seguem pelo celular.'],
  ['O Mestre AI é obrigatório?', 'Não. Ele é um assistente opcional para interpretar indicadores e sugerir próximos passos. Agenda, clientes, caixa e gestão continuam funcionando sem IA.'],
  ['Como funcionam os pagamentos?', 'Você escolhe um plano mensal conforme o tamanho da equipe. O checkout mostra o valor total antes da confirmação e usa os meios disponibilizados pela AbacatePay.'],
] as const

function BrandWordmark({ inverse = false }: { inverse?: boolean }) {
  return <img className="nr-brand-logo" src={inverse ? '/brand/logo-wordmark-approved-inverse.png' : '/brand/logo-wordmark-approved-web.png'} alt="NaRégua" />
}

function Cta({ children, className = '', location, onClick }: { children: ReactNode; className?: string; location: string; onClick: () => void }) {
  function track() {
    window.dispatchEvent(new CustomEvent('naregua:cta', { detail: { location } }))
    const analyticsWindow = window as Window & { dataLayer?: Array<Record<string, unknown>> }
    analyticsWindow.dataLayer?.push({ event: 'landing_cta_click', location })
    onClick()
  }
  return <button type="button" className={className} onClick={track}>{children}</button>
}

function workspaceLoginUrl(slug: string) {
  const configured = String(import.meta.env.VITE_APP_BASE_URL ?? '').trim()
  try {
    const base = configured ? new URL(configured) : new URL(window.location.origin)
    const port = base.port ? `:${base.port}` : ''
    return `${base.protocol}//${slug}.${base.hostname.replace(/^www\./, '')}${port}/login?welcome=1`
  } catch { return '/acessar' }
}

export function LandingPage() {
  const landingRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [headerScrolled, setHeaderScrolled] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutCycle, setCheckoutCycle] = useState<TeamPlan['code']>('TEAM_3')
  const [plans, setPlans] = useState<readonly TeamPlan[]>(PUBLIC_TEAM_PLANS)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState(0)
  const [referralToken] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('ref')?.trim() ?? '')
  const [returnWorkspace] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('workspace')?.trim().toLowerCase() ?? '')
  const [checkoutReturn] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('checkout') === 'return')
  const termsUrl = String(import.meta.env.VITE_TERMS_URL ?? '').trim() || '/termos'
  const privacyUrl = String(import.meta.env.VITE_PRIVACY_URL ?? '').trim() || '/privacidade'
  const supportUrl = String(import.meta.env.VITE_SUPPORT_URL ?? '').trim()

  useEffect(() => {
    document.body.classList.add('landing-body')
    document.title = 'NaRégua — gestão para barbearias que querem crescer'
    api<{ teamPlans: TeamPlan[] }>('/api/public/billing/plans').then((result) => {
      if (!result.ok) { setPricingError(result.error.message); return }
      if (validTeamPlans(result.data.teamPlans)) setPlans(orderedTeamPlans(result.data.teamPlans))
      setPricingError(null)
    })
    const syncHeader = () => setHeaderScrolled(window.scrollY > 12)
    syncHeader()
    window.addEventListener('scroll', syncHeader, { passive: true })
    return () => {
      window.removeEventListener('scroll', syncHeader)
      document.body.classList.remove('landing-body')
    }
  }, [])

  useLayoutEffect(() => {
    const root = landingRef.current
    if (!root) return
    const revealElements = [...root.querySelectorAll<HTMLElement>('.nr-sales-reveal')]
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('is-visible'))
      return
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -7% 0px', threshold: .08 })
    revealElements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const activeProduct = productViews[activeView]

  function buy(cycle: TeamPlan['code'] = 'TEAM_3') {
    setCheckoutCycle(cycle)
    setCheckoutOpen(true)
  }

  return <div ref={landingRef} className="nr-sales-landing">
    <a className="nr-sales-skip" href="#conteudo">Pular para o conteúdo</a>

    {checkoutReturn && returnWorkspace ? <div className="sales-return-banner" role="status">
      <span><ShieldCheck size={16} /> Pagamento recebido. Sua ativação pode levar alguns instantes.</span>
      <a href={workspaceLoginUrl(returnWorkspace)}>Entrar em {returnWorkspace} <ArrowRight size={15} /></a>
    </div> : null}

    <div className="nr-sales-announcement">
      <div className="nr-sales-container">
        <span>Software de gestão para barbearias <i /> {plans[0]?.amountCents !== null ? <>Planos mensais a partir de <strong>{currencyBRLFromCents(plans[0]?.amountCents)}</strong></> : <>Gestão da agenda ao caixa</>}</span>
        <a href="#preco">Ver planos <ArrowRight size={14} /></a>
      </div>
    </div>

    <header className={`nr-sales-header ${headerScrolled ? 'is-scrolled' : ''}`}>
      <div className="nr-sales-container nr-sales-nav">
        <a className="nr-sales-brand" href="#inicio" aria-label="NaRégua — início"><BrandWordmark inverse /></a>
        <nav className={menuOpen ? 'is-open' : ''} aria-label="Navegação principal">
          <a href="#porque" onClick={() => setMenuOpen(false)}>Por que NaRégua</a>
          <a href="#produto" onClick={() => setMenuOpen(false)}>Produto</a>
          <a href="#mestre" onClick={() => setMenuOpen(false)}>Mestre AI</a>
          <a href="#preco" onClick={() => setMenuOpen(false)}>Planos</a>
          <a className="nr-sales-mobile-login" href="/login">Acessar meu espaço</a>
        </nav>
        <div className="nr-sales-nav-actions">
          <a className="nr-sales-login" href="/login">Acessar</a>
          <Cta className="nr-sales-button nr-sales-button-primary nr-sales-button-nav" location="header" onClick={() => buy('TEAM_3')}>Começar agora</Cta>
          <button type="button" className="nr-sales-menu" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </div>
    </header>

    <main id="conteudo">
      <section className="nr-sales-hero" id="inicio">
        <div className="nr-sales-hero-noise" aria-hidden="true" />
        <div className="nr-sales-container nr-sales-hero-copy nr-sales-reveal is-visible">
          <span className="nr-sales-kicker">Da cadeira ao caixa, tudo conversa</span>
          <h1>Mais cadeira ocupada.<br /><em>Menos rotina no improviso.</em></h1>
          <p>Agenda online, clientes, WhatsApp e caixa trabalham no mesmo ritmo — para você atender bem sem carregar a barbearia inteira na cabeça.</p>
          <div className="nr-sales-hero-actions">
            <Cta className="nr-sales-button nr-sales-button-primary nr-sales-button-xl" location="hero" onClick={() => buy('TEAM_3')}>Começar com minha barbearia <ArrowRight size={18} /></Cta>
            <a className="nr-sales-button nr-sales-button-outline nr-sales-button-xl" href="#produto">Ver o produto por dentro</a>
          </div>
          <div className="nr-sales-hero-proof"><span><i aria-hidden="true" /> Sem taxa por agendamento</span><span><i aria-hidden="true" /> Cliente sem app</span><span><i aria-hidden="true" /> Setup guiado</span></div>
        </div>

        <div className="nr-sales-container nr-sales-product-stage nr-sales-reveal is-visible" aria-label="Produto NaRégua em uso">
          <div className="nr-sales-stage-photo"><img src="/naregua/craft.webp" alt="Barbeiro fazendo acabamento de corte" /></div>
          <div className="nr-sales-stage-screen">
            <div className="nr-sales-stage-bar"><span>Visão geral</span><small>captura real do produto</small></div>
            <img src="/landing/product/real/dashboard.webp" alt="Dashboard real do NaRégua" fetchPriority="high" />
          </div>
          <div className="nr-sales-stage-phone nr-sales-stage-phone-left"><img src="/landing/product/real/booking.webp" alt="Agendamento real do NaRégua no celular" /></div>
          <div className="nr-sales-stage-phone nr-sales-stage-phone-right"><img src="/landing/product/real/mobile-dashboard.webp" alt="Painel do NaRégua no celular" /></div>
          <div className="nr-sales-stage-label"><span>PRODUTO REAL</span><strong>Da agenda ao caixa,<br />o contexto continua.</strong></div>
        </div>
      </section>

      <section className="nr-sales-growth" id="porque">
        <div className="nr-sales-container">
          <div className="nr-sales-growth-head nr-sales-reveal">
            <span className="nr-sales-kicker nr-sales-kicker-paper">Feito para a rotina real</span>
            <h2>Agenda cheia não começa no calendário. <em>Começa numa operação que não perde o fio.</em></h2>
            <p>O NaRégua conecta o que acontece antes, durante e depois do horário. A tecnologia organiza a operação para você continuar focado na cadeira.</p>
          </div>
          <div className="nr-sales-pillar-grid">
            <article className="nr-sales-pillar nr-sales-reveal">
              <figure><img src="/naregua/hero.webp" alt="Barbeiro atendendo um cliente" loading="lazy" /></figure>
              <div><span>01 / OPERAÇÃO</span><h3>O cliente agenda. A rotina continua.</h3><p>Serviço, data e horário entram pelo link sem depender de resposta manual.</p></div>
            </article>
            <article className="nr-sales-pillar nr-sales-reveal">
              <figure><img src="/naregua/craft.webp" alt="Detalhe de acabamento em corte" loading="lazy" /></figure>
              <div><span>02 / RELACIONAMENTO</span><h3>Cada horário mantém o contexto.</h3><p>Confirmações, lembretes, histórico e conversa acompanham o atendimento sem virar bagunça.</p></div>
            </article>
            <article className="nr-sales-pillar nr-sales-reveal">
              <figure><img src="/naregua/dashboard.webp" alt="Barbeiro consultando dados em um tablet" loading="lazy" /></figure>
              <div><span>03 / DECISÃO</span><h3>O negócio fica legível antes do problema.</h3><p>Agenda, clientes, caixa e pendências aparecem juntos para você decidir com contexto.</p></div>
            </article>
          </div>
          <div className="nr-sales-brand-statement nr-sales-reveal">
            <img src="/brand/brand-seal-approved-web.png" alt="Selo NaRégua — software para barbearias" loading="lazy" />
            <p>Software para quem vive de <strong>agenda ocupada, operação alinhada e cliente voltando.</strong></p>
          </div>
        </div>
      </section>

      <section className="nr-sales-product" id="produto">
        <div className="nr-sales-container">
          <div className="nr-sales-product-head nr-sales-reveal">
            <span className="nr-sales-kicker">Ferramentas no ritmo da barbearia</span>
            <h2>Uma plataforma para tocar a operação inteira.<br /><em>Sem reconstruir contexto entre ferramentas.</em></h2>
            <p>Veja capturas reais da plataforma. Nada de tela inventada para a landing page.</p>
          </div>
          <div className="nr-sales-product-showcase nr-sales-reveal">
            <aside className="nr-sales-product-tabs" role="tablist" aria-label="Áreas do produto">
              {productViews.map((view, index) => <button key={view.id} type="button" role="tab" aria-selected={activeView === index} className={activeView === index ? 'is-active' : ''} onClick={() => setActiveView(index)}>
                <span>0{index + 1}</span><div><strong>{view.label}</strong><small>{view.title}</small></div><ArrowRight size={17} />
              </button>)}
            </aside>
            <div className="nr-sales-product-panel">
              <div className="nr-sales-product-panel-top"><span>{activeProduct.label}</span><small>NaRégua / captura real</small></div>
              <div className="nr-sales-product-image" key={activeProduct.id}><img src={activeProduct.image} alt={activeProduct.alt} /></div>
              <div className="nr-sales-product-caption"><strong>{activeProduct.title}</strong><p>{activeProduct.description}</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="nr-sales-capabilities">
        <div className="nr-sales-container nr-sales-cap-layout">
          <div className="nr-sales-cap-copy nr-sales-reveal">
            <span className="nr-sales-kicker nr-sales-kicker-paper">Tudo o que a operação precisa</span>
            <h2>O que precisa acontecer entre <em>um corte, o próximo horário e o fechamento do caixa.</em></h2>
            <p>Sem montar uma colcha de retalhos com agenda, conversa, planilha e ferramenta separada.</p>
          </div>
          <div className="nr-sales-cap-list nr-sales-reveal">
            <div><span>Agenda & horários</span><small>Disponibilidade, confirmações e bloqueios</small></div>
            <div><span>Link de agendamento</span><small>Reserva pelo navegador, sem app</small></div>
            <div><span>Clientes & histórico</span><small>Contexto que acompanha o relacionamento</small></div>
            <div><span>WhatsApp Center</span><small>Conversa, confirmação e lembrete</small></div>
            <div><span>Caixa</span><small>Movimento financeiro mais legível</small></div>
            <div><span>Indicadores</span><small>O que merece atenção agora</small></div>
            <div><span>Mestre AI</span><small>Leitura contextual da operação</small></div>
            <div><span>Sua marca</span><small>Ambiente dedicado para a barbearia</small></div>
          </div>
        </div>
      </section>

      <section className="nr-sales-onboarding">
        <div className="nr-sales-onboarding-bg" aria-hidden="true"><img src="/naregua/hero.webp" alt="" /></div>
        <div className="nr-sales-container nr-sales-onboarding-content">
          <div className="nr-sales-onboarding-head nr-sales-reveal">
            <span className="nr-sales-kicker">Da compra à primeira agenda</span>
            <h2>Você não recebe uma tela vazia e um <em>“boa sorte”.</em></h2>
            <p>O setup guiado organiza a base da operação para você começar com marca, horários e serviços no lugar certo.</p>
          </div>
          <div className="nr-sales-onboarding-grid nr-sales-reveal">
            <article><span>01</span><h3>Setup guiado</h3><p>Identidade, endereço, agenda e catálogo seguindo um fluxo único.</p></article>
            <article><span>02</span><h3>Cliente sem app</h3><p>Seu link abre no navegador e o cliente escolhe serviço, data e horário.</p></article>
            <article><span>03</span><h3>Operação separada e segura</h3><p>Cada barbearia trabalha em seu próprio espaço, com acesso dedicado e controles existentes da plataforma.</p></article>
          </div>
        </div>
      </section>

      <section className="nr-sales-ai" id="mestre">
        <div className="nr-sales-container nr-sales-ai-layout">
          <div className="nr-sales-ai-copy nr-sales-reveal">
            <span className="nr-sales-kicker nr-sales-kicker-dark">Conheça o Mestre AI</span>
            <h2>Pergunte sobre a barbearia <em>sem abrir três telas e uma planilha.</em></h2>
            <p>O Mestre AI interpreta os indicadores disponíveis e devolve respostas diretas sobre agenda, clientes, movimento e pontos de atenção.</p>
            <div className="nr-sales-ai-prompts"><span>“Como foi meu mês?”</span><span>“Onde minha agenda está ociosa?”</span><span>“O que merece atenção agora?”</span></div>
            <small>Recurso opcional. A gestão continua funcionando sem IA.</small>
          </div>
          <div className="nr-sales-ai-visual nr-sales-reveal">
            <div className="nr-sales-ai-screen"><img src="/landing/product/real/mestre-ai.webp" alt="Mestre AI dentro da plataforma NaRégua" loading="lazy" /></div>
            <div className="nr-sales-ai-badge"><Sparkles size={17} /><span><strong>Conversa contextual</strong><small>sem trocar de ferramenta</small></span></div>
          </div>
        </div>
      </section>

      <section className="nr-sales-pricing" id="preco">
        <div className="nr-sales-container nr-sales-pricing-layout">
          <div className="nr-sales-pricing-copy nr-sales-reveal">
            <span className="nr-sales-kicker">Planos</span>
            <h2>O NaRégua completo.<br /><em>Você escolhe o fôlego.</em></h2>
            <p>O produto não muda de um ciclo para outro. Você escolhe a frequência da cobrança e quanto quer economizar.</p>
            <div className="nr-sales-pricing-includes"><span><i aria-hidden="true" /> Agenda + link online</span><span><i aria-hidden="true" /> WhatsApp Center</span><span><i aria-hidden="true" /> Caixa</span><span><i aria-hidden="true" /> Mestre AI</span></div>
          </div>
          <div className="nr-sales-plan-grid nr-sales-reveal">
            {pricingError ? <div className="nr-sales-pricing-error" role="alert"><strong>Planos temporariamente indisponíveis.</strong><span>{pricingError}</span><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div> : plans.map((plan) => <article key={plan.code} className={plan.code === 'TEAM_6' ? 'is-featured' : ''}>
              <div className="nr-sales-plan-name"><span>{plan.label}</span></div>
              <div className="nr-sales-plan-price"><strong>{currencyBRLFromCents(plan.amountCents)}</strong><span>/mês</span><small>Até {plan.seats} profissionais na sua barbearia</small></div>
              <Cta className="nr-sales-plan-button" location={`pricing-${plan.code.toLowerCase()}`} onClick={() => buy(plan.code)}>Escolher plano <ArrowRight size={15} /></Cta>
            </article>)}
          </div>
        </div>
        <div className="nr-sales-container nr-sales-payment-note"><ShieldCheck size={17} /><span>Pagamento processado pela AbacatePay. Pix ou cartão conforme disponibilidade do checkout.</span></div>
      </section>

      <section className="nr-sales-faq" id="duvidas">
        <div className="nr-sales-container nr-sales-faq-layout">
          <div className="nr-sales-faq-copy nr-sales-reveal"><span className="nr-sales-kicker nr-sales-kicker-dark">Sem letras miúdas</span><h2>Antes de colocar sua barbearia <em>NaRégua.</em></h2><p>As dúvidas que normalmente aparecem antes de testar.</p></div>
          <div className="nr-sales-faq-list nr-sales-reveal">{faqItems.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div>
        </div>
      </section>

      <section className="nr-sales-final">
        <div className="nr-sales-final-bg" aria-hidden="true"><img src="/naregua/dashboard.webp" alt="" /></div>
        <div className="nr-sales-container nr-sales-final-content nr-sales-reveal">
          <img src="/brand/logo-symbol-approved-web.png" alt="" aria-hidden="true" />
          <span className="nr-sales-kicker">Sua barbearia no controle</span>
          <h2>Pronto para colocar sua operação <em>NaRégua?</em></h2>
          <p>Menos tempo apagando incêndio. Mais tempo atendendo, acompanhando o negócio e fazendo a barbearia crescer.</p>
          <Cta className="nr-sales-button nr-sales-button-primary nr-sales-button-xl" location="final" onClick={() => buy('TEAM_3')}>Começar agora <ArrowRight size={18} /></Cta>
        </div>
      </section>
    </main>

    <footer className="nr-sales-footer">
      <div className="nr-sales-container nr-sales-footer-grid">
        <div className="nr-sales-footer-brand"><BrandWordmark inverse /><p>Gestão para barbearias que querem crescer sem perder o controle da operação.</p></div>
        <div className="nr-sales-footer-links"><div><strong>Produto</strong><a href="#produto">Plataforma</a><a href="#porque">Por que NaRégua</a><a href="#mestre">Mestre AI</a><a href="#preco">Planos</a></div><div><strong>Acesso</strong><a href="/login">Acessar minha barbearia</a>{supportUrl ? <a href={supportUrl}>Suporte</a> : null}</div><div><strong>Legal</strong><a href={termsUrl}>Termos</a><a href={privacyUrl}>Privacidade</a></div></div>
        <div className="nr-sales-footer-bottom"><span>© {new Date().getFullYear()} NaRégua.</span><small>Feito para a rotina real de quem vive de barbearia.</small></div>
      </div>
    </footer>

    <LandingCheckout open={checkoutOpen} onClose={() => setCheckoutOpen(false)} referralToken={referralToken || undefined} initialTeamPlan={checkoutCycle} />
  </div>
}

export function WorkspaceAccessPage() {
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const supportUrl = String(import.meta.env.VITE_SUPPORT_URL ?? import.meta.env.VITE_SALES_URL ?? '').trim()
  const workspaceDomain = (() => {
    const configured = String(import.meta.env.VITE_APP_BASE_URL ?? '').trim()
    try { return new URL(configured || window.location.origin).hostname.replace(/^www\./, '') }
    catch { return 'naregua.app' }
  })()

  useEffect(() => {
    document.body.classList.add('landing-body')
    document.title = 'Acessar meu espaço — NaRégua'
    return () => document.body.classList.remove('landing-body')
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const normalized = slug.trim().toLowerCase().replace(/^https?:\/\//, '').split(/[./]/)[0]
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) {
      setError('Digite somente o endereço curto da sua barbearia, por exemplo: central-barber.')
      return
    }
    window.location.assign(workspaceLoginUrl(normalized))
  }

  return <main className="landing-access-page">
    <div className="landing-access-background" />
    <section className="landing-access-card">
      <aside className="landing-access-aside">
        <a href="/" aria-label="Voltar para NaRégua"><BrandWordmark inverse /></a>
        <div><span>Sua barbearia continua aqui</span><h2>Agenda, clientes e caixa no mesmo lugar.</h2><p>Entre no endereço exclusivo da sua marca para continuar.</p></div>
        <img src="/landing/product/real/dashboard.webp" alt="Visão real do painel NaRégua" />
      </aside>
      <div className="landing-access-content">
        <a href="/" className="landing-access-mobile-brand"><BrandWordmark /></a>
        <span className="landing-kicker">Área da barbearia</span>
        <h1>Entre na sua operação.</h1>
        <p>Informe o endereço curto que você escolheu ao criar sua conta.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="workspace-slug">Seu endereço</label>
          <div className="landing-access-slug"><input id="workspace-slug" value={slug} onChange={(event) => { setSlug(event.target.value); setError('') }} placeholder="central-barber" autoComplete="organization" autoFocus /><span>.{workspaceDomain}</span></div>
          {error ? <div className="landing-access-error">{error}</div> : null}
          <button className="landing-access-submit" type="submit">Acessar meu espaço <ArrowRight size={16} /></button>
        </form>
        <div className="landing-access-help"><ShieldCheck size={18} /><span><strong>Ambiente exclusivo e seguro</strong><small>Cada negócio acessa seus dados em um endereço separado.</small></span></div>
        {supportUrl ? <a className="landing-access-support" href={supportUrl}>Esqueci meu endereço — falar com o suporte</a> : null}
      </div>
    </section>
  </main>
}
