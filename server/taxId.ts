export function formatTaxId(raw:string) {
  const digits=raw.replace(/\D/g,'').slice(0,14)
  if(digits.length<=11)return digits.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4')
  return digits.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\/\d{4})(\d)/,'$1-$2')
}

export function validTaxId(raw:string) {
  const digits=raw.replace(/\D/g,'')
  if(![11,14].includes(digits.length)||/^(\d)\1+$/.test(digits))return false
  const calculate=(value:string,weights:number[])=>{
    const remainder=[...value].reduce((sum,digit,index)=>sum+Number(digit)*weights[index],0)%11
    return remainder<2?0:11-remainder
  }
  const base=digits.slice(0,-2)
  const weights=digits.length===11?[10,9,8,7,6,5,4,3,2]:[5,4,3,2,9,8,7,6,5,4,3,2]
  const first=calculate(base,weights)
  const second=calculate(base+first,digits.length===11?[11,...weights]:[6,...weights])
  return digits.endsWith(`${first}${second}`)
}
