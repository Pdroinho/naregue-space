import { useEffect, useState } from 'react'
import { api } from '../api'
import { ProductSelect } from './ProductSelect'

export function TeamScopeSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [people,setPeople] = useState<Array<{id:string;name:string}>>([])
  useEffect(()=>{ let active=true; void api<{professionals:Array<{id:string;name:string}>}>('/api/admin/professionals').then(result=>{
    if(active && result.ok) setPeople(result.data.professionals)
  });return()=>{active=false} },[])
  return <ProductSelect ariaLabel="Profissional em foco" value={value} onChange={onChange}
    options={[{value:'',label:'Toda a equipe'},...people.map(person=>({value:person.id,label:person.name}))]} />
}
