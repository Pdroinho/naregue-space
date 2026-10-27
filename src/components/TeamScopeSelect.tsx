import { useEffect, useState } from 'react'
import { api } from '../api'
import { ProductSelect } from './ProductSelect'

export function TeamScopeSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [people,setPeople] = useState<Array<{id:string;name:string}>>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState(false)
  const [revision,setRevision] = useState(0)
  useEffect(()=>{ let active=true; void api<{professionals:Array<{id:string;name:string}>}>('/api/admin/professionals').then(result=>{
    if(!active)return
    setLoading(false);setError(!result.ok)
    if(result.ok) setPeople(result.data.professionals)
  });return()=>{active=false} },[revision])
  if(error)return <div className="nr-team-scope-error" role="alert"><span>Não foi possível carregar o filtro de equipe.</span><button type="button" className="btn" onClick={()=>{setLoading(true);setError(false);setRevision(value=>value+1)}}>Tentar novamente</button></div>
  return <ProductSelect ariaLabel="Profissional em foco" value={value} onChange={onChange}
    disabled={loading}
    options={[{value:'',label:loading?'Carregando equipe…':'Toda a equipe'},...people.map(person=>({value:person.id,label:person.name}))]} />
}
