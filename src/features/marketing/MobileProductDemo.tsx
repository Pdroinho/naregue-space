import {Check,ChevronRight,Users,Wallet} from '../../components/Icons'

/** Readable, illustrative mobile plates; no customer data or live actions. */
export function MobileProductDemo({area}:{area:string}){
 return <div className="lp-mobile-preview" aria-label="Demonstração ilustrativa com dados fictícios">
  <div className="lp-mobile-preview-heading"><strong>{area==='team'?'Sua equipe':area==='dashboard'?'Seu financeiro':'Sua agenda'}</strong><span>Demonstração</span></div>
  {area==='calendar'?<><div className="lp-mobile-day"><span>Hoje</span><strong>Quarta-feira</strong><span>3 horários</span></div><div className="lp-mobile-appointments">{[['09:00','Corte clássico','João · Rafael'],['10:30','Corte e barba','Mateus · Pedro'],['11:00','Barba','Caio · Rafael']].map(([time,service,person])=><div key={time}><time>{time}</time><span><strong>{service}</strong><small>{person}</small></span><Check size={16}/></div>)}</div></>:area==='team'?<div className="lp-mobile-crew">{[['R','Rafael','Corte e barba'],['P','Pedro','Cortes e acabamento']].map(([initial,name,services])=><div key={name}><span>{initial}</span><div><strong>{name}</strong><small>{services}</small></div><ChevronRight size={16}/></div>)}<p><Users size={15}/>Cada profissional, sua própria agenda.</p></div>:<div className="lp-mobile-ledger"><div><Wallet size={22}/><span>Saldo no exemplo<strong>R$ 540,00</strong></span></div><dl><div><dt>Entradas</dt><dd>R$ 720,00</dd></div><div><dt>Saídas</dt><dd>R$ 180,00</dd></div></dl><div className="lp-mobile-ledger-entry"><span>Corte e barba<small>Atendimento confirmado</small></span><strong>R$ 70,00</strong></div></div>}
 </div>
}
