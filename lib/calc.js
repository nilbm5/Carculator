import ivtm from '@/data/martorell_ivtm.json'

export function milesToKm(mi){ return Number(mi||0) * 1.60934 }

export function estimateCVFfromCC(cc){
  const n = Number(cc||0)
  if (!n) return 8
  if (n <= 1200) return 8
  if (n <= 1600) return 11.5
  if (n <= 2000) return 15.5
  if (n <= 2400) return 18.5
  return 22
}

export function ivtmMartorellAmount(cvf){
  const v = Number(cvf||0)
  for (const b of ivtm.brackets){
    if (v <= b.max_cvf) return b.amount
  }
  return ivtm.brackets[ivtm.brackets.length-1].amount
}

export function calcQuote({valorEUR, tasasFijas, aduanasCoef=0.33}){
  const aduanas = Number(valorEUR||0) * aduanasCoef
  const total = aduanas + Object.values(tasasFijas).reduce((a,b)=>a+Number(b||0),0)
  return { aduanas, total }
}
