import { useEffect, useMemo, useState } from 'react'
import Section from '@/components/Section'
import Field from '@/components/Field'
import { ResultRow } from '@/components/ResultRow'
import jsPDF from 'jspdf'

function fmtEUR(n){ return (Number(n||0)).toLocaleString('es-ES', { style:'currency', currency:'EUR' }) }
function fmt(n){ return (Number(n||0)).toLocaleString('es-ES') }

export default function Home(){
  const [plate, setPlate] = useState('')
  const [priceGbp, setPriceGbp] = useState('')
  const [gbpToEur, setGbpToEur] = useState(1.15)
  const [fxSource, setFxSource] = useState('')
  const [miles, setMiles] = useState('')
  const km = useMemo(()=> Number(miles||0)*1.60934, [miles])
  const [vehicle, setVehicle] = useState(null)
  const [mot, setMot] = useState(null)
  const [valorEUR, setValorEUR] = useState('')
  const [quote, setQuote] = useState(null)
  const [usedFallback, setUsedFallback] = useState({vehicle:false, mot:false})

  useEffect(()=>{
    fetch('/api/fx').then(r=>r.json()).then(d=>{
      if(d.eurPerGbp) { setGbpToEur(d.eurPerGbp); setFxSource(d.source) }
    }).catch(()=>{})
  },[])

  function saveHistory(entry){
    const now = new Date().toISOString()
    const item = { ...entry, ts: now }
    const key = 'uk2es_history'
    const arr = JSON.parse(localStorage.getItem(key)||'[]')
    arr.unshift(item)
    localStorage.setItem(key, JSON.stringify(arr.slice(0,10)))
  }

  async function safeJson(res){
    try{ return await res.json() } catch{ return null }
  }

  async function lookup(){
    if(!plate) return
    // Try DVLA; if fails or no key, fallback to scrape
    let v=null, fallbackVehicle=false
    try {
      const r = await fetch('/api/vehicle?plate='+encodeURIComponent(plate))
      if (r.ok) v = await r.json()
      else throw new Error('vehicle api error')
    } catch{}
    if (!v || v.error) {
      const r2 = await fetch('/api/vehicle_scrape?plate='+encodeURIComponent(plate))
      v = await safeJson(r2)
      fallbackVehicle = true
    }
    setVehicle(v)
    setUsedFallback(s=>({...s, vehicle: fallbackVehicle}))

    // Try DVSA; if fails, fallback to scrape
    let m=null, fallbackMot=false
    try {
      const r = await fetch('/api/mot?plate='+encodeURIComponent(plate))
      if (r.ok) m = await r.json()
      else throw new Error('mot api error')
    } catch{}
    if (!m || m.error) {
      const r2 = await fetch('/api/mot_scrape?plate='+encodeURIComponent(plate))
      m = await safeJson(r2)
      fallbackMot = true
    }
    setMot(m)
    setUsedFallback(s=>({...s, mot: fallbackMot}))

    // intentar venal BOE básico si tenemos make/model/year aproximados
    const make = v?.make; const model = v?.model; const y = v?.yearOfManufacture || v?.year
    if(make && model && y){
      const firstReg = `${y}-01-01`
      fetch(`/api/venal/boe?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&firstReg=${encodeURIComponent(firstReg)}`)
        .then(r=>r.json()).then(d=>{ if(d.venal) setValorEUR(String(d.venal)) }).catch(()=>{})
    }
  }

  async function calculate(){
    const cc = vehicle?.engineCapacity || 0
    const resp = await fetch('/api/quote', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ valorEUR: Number(valorEUR||0), cc, tasasFijas: {}, aduanasCoef: 0.33 })
    }).then(r=>r.json())
    setQuote(resp)
    saveHistory({ plate, priceGbp: Number(priceGbp||0), valorEUR: Number(valorEUR||0), total: resp?.total||0 })
  }

  function exportCSV(){
    const rows = [
      ['Matrícula','Precio GBP','Tipo cambio','Precio EUR','Valor venal (EUR)','Aduanas (33%)','IVTM Martorell','Total EUR','Fallback DVLA','Fallback MOT'],
      [ plate, priceGbp, gbpToEur, Number(priceGbp||0)*gbpToEur, valorEUR, quote?.aduanas||'', quote?.ivtm||'', quote?.total||'', usedFallback.vehicle, usedFallback.mot ]
    ]
    const csv = rows.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `uk2es_${plate||'calc'}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF(){
    const doc = new jsPDF()
    doc.setFontSize(14); doc.text('Calculadora UK → ES (estimación)', 14, 16)
    doc.setFontSize(11)
    let y = 28
    const lines = [
      `Matrícula: ${plate}`,
      `Precio compra: GBP ${priceGbp}  |  Cambio: ${gbpToEur.toFixed(4)} EUR/GBP (Fuente: ${fxSource})`,
      `Precio compra en EUR: ${fmtEUR(Number(priceGbp||0)*gbpToEur)}`,
      `Valor venal (EUR): ${fmtEUR(valorEUR)}`,
      `Aduanas 33%: ${fmtEUR(quote?.aduanas||0)}`,
      `IVTM Martorell: ${fmtEUR(quote?.ivtm||0)}`,
      `TOTAL ESTIMADO: ${fmtEUR(quote?.total||0)}`,
      ``,
      `Notas:`,
      `- Cálculos estimativos; conviene reservar algo de margen.`,
      `- No incluye homologación; válido para vehículos UK pre-Brexit.`,
      `- IVTM estimado con tarifas del Ayuntamiento de Martorell.`,
      `- Modo fallback scrapers: DVLA=${usedFallback.vehicle?'sí':'no'}, MOT=${usedFallback.mot?'sí':'no'}`
    ]
    lines.forEach(line=>{ doc.text(line, 14, y); y += 8 })
    doc.save(`uk2es_${plate||'calc'}.pdf`)
  }

  const priceEur = useMemo(()=> Number(priceGbp||0)*gbpToEur, [priceGbp, gbpToEur])

  const motStats = useMemo(()=>{
    if(!mot) return null
    const arr = Array.isArray(mot) ? mot : (mot.tests || [])
    const tests = Array.isArray(arr) ? arr : []
    const total = tests.length
    const pass = tests.filter(t=> (t.result||t.testResult||'').toUpperCase().includes('PASS')).length
    const advisories = tests.reduce((acc,t)=> acc + (Array.isArray(t.advisories)? t.advisories.length : (Array.isArray(t.rfrAndComments)? t.rfrAndComments.filter(x=>x.type==='ADVISORY').length : 0)), 0)
    return { total, passPct: total? Math.round(pass*100/total):0, advisories }
  },[mot])

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">UK → ES · Calculadora de importación</h1>
      <p className="text-sm text-gray-600">Valor venal BOE · IVTM Martorell · DVLA/DVSA o <b>scrapers</b> si no hay keys. <span className="font-medium">Cálculos estimativos; conviene reservar algo de margen.</span></p>

      <Section title="Datos de entrada">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Matrícula UK">
            <input value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} className="border rounded-xl px-3 py-2" placeholder="AB12 CDE" />
          </Field>
          <Field label="Precio compra (GBP)">
            <input type="number" value={priceGbp} onChange={e=>setPriceGbp(e.target.value)} className="border rounded-xl px-3 py-2" placeholder="2100" />
          </Field>
          <Field label="Millas (lectura del vehículo)">
            <input type="number" value={miles} onChange={e=>setMiles(e.target.value)} className="border rounded-xl px-3 py-2" placeholder="72000" />
          </Field>
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
          <span>Tipo cambio (EUR/GBP): <b>{gbpToEur.toFixed(4)}</b></span>
          <button onClick={()=>{ fetch('/api/fx').then(r=>r.json()).then(d=>{ if(d.eurPerGbp){ setGbpToEur(d.eurPerGbp); setFxSource(d.source)} }) }} className="text-blue-600 hover:underline">Actualizar</button>
        </div>
        <div className="mt-3">
          <button onClick={lookup} className="px-4 py-2 rounded-xl bg-black text-white">Buscar DVLA/DVSA (con fallback)</button>
        </div>
      </Section>

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="DVLA / Datos del vehículo">
          {!vehicle ? <p className="text-gray-500">—</p> :
            <div className="space-y-1">
              <ResultRow label="Marca" value={vehicle.make||'—'} />
              <ResultRow label="Modelo" value={vehicle.model||'—'} />
              <ResultRow label="Año fabricación" value={vehicle.yearOfManufacture||vehicle.year||'—'} />
              <ResultRow label="Cilindrada (cc)" value={fmt(vehicle.engineCapacity)} />
              <ResultRow label="Combustible" value={vehicle.fuelType||'—'} />
              <ResultRow label="Km (desde millas)" value={`${fmt(km)} km`} />
            </div>
          }
        </Section>

        <Section title="DVSA / Historial MOT">
          {!motStats ? <p className="text-gray-500">—</p> :
            <div className="space-y-1">
              <ResultRow label="Nº tests" value={motStats.total} />
              <ResultRow label="% aprobados" value={`${motStats.passPct}%`} />
              <ResultRow label="Advisories (total)" value={motStats.advisories} />
            </div>
          }
        </Section>
      </div>

      <Section title="Valor venal (BOE)">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Valor venal estimado (EUR)">
            <input type="number" value={valorEUR} onChange={e=>setValorEUR(e.target.value)} className="border rounded-xl px-3 py-2" placeholder="Ej. 6400" />
          </Field>
          <div className="flex items-end">
            <button onClick={calculate} className="px-4 py-2 rounded-xl bg-black text-white">Calcular</button>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">Cálculo BOE interno (si disponible); también puedes introducir el valor manualmente.</p>
      </Section>

      <Section title="Resumen de costes (EUR)">
        {!quote ? <p className="text-gray-500">—</p> :
          <div className="space-y-1">
            <ResultRow label="Precio compra en EUR" value={fmtEUR(priceEur)} />
            <ResultRow label="Aduanas (33%)" value={fmtEUR(quote.aduanas)} />
            <ResultRow label="Impuesto circulación (Martorell)" value={fmtEUR(quote.ivtm)} />
            <hr className="my-2" />
            <ResultRow label="TOTAL ESTIMADO" value={fmtEUR(quote.total)} bold />
            <p className="text-xs text-gray-600 mt-2">
              No se incluye homologación (válido solo para vehículos UK registrados antes del Brexit). Cálculos estimativos; conviene reservar algo de margen.
              IVTM estimado con las tarifas del Ayuntamiento de Martorell.
            </p>
          </div>
        }
        <div className="flex gap-3 mt-4">
          <button onClick={exportCSV} className="px-4 py-2 rounded-xl border">Exportar CSV</button>
          <button onClick={exportPDF} className="px-4 py-2 rounded-xl bg-black text-white">Exportar PDF</button>
        </div>
      </Section>
    </main>
  )
}
