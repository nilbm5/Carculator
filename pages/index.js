import { useEffect, useMemo, useState } from 'react'
import Section from '@/components/Section'
import Field from '@/components/Field'
import { ResultRow } from '@/components/ResultRow'
import jsPDF from 'jspdf'

function eur(n){ return (Number(n||0)).toLocaleString('ca-ES', { style:'currency', currency:'EUR' }) }
function fmt(n){ return (Number(n||0)).toLocaleString('ca-ES') }

export default function Home(){
  const [lang, setLang] = useState('ca')
  const t = (key)=> {
    const ca = {
      title: 'carculator',
      subtitle: 'Valor venal BOE · IVTM Martorell · DVLA/DVSA o scrapers si no hi ha claus. Càlculs estimats; convé reservar marge.',
      inputs: 'Dades d’entrada',
      plate: 'Matrícula UK',
      price: 'Preu compra (GBP)',
      miles: 'Milles (lectura del vehicle)',
      rate: 'Tipus de canvi (EUR/GBP)',
      refresh: 'Actualitzar',
      search: 'Cercar DVLA/DVSA (amb fallback)',
      dvla: 'DVLA / Dades del vehicle',
      make: 'Marca',
      model: 'Model',
      year: 'Any de fabricació',
      cc: 'Cilindrada (cc)',
      fuel: 'Combustible',
      kmFromMiles: 'Km (des de milles)',
      mot: 'DVSA / Historial MOT',
      tests: 'Núm. tests',
      passpct: '% aprovats',
      advisories: 'Advisories (total)',
      venal: 'Valor venal (BOE)',
      venalInput: 'Valor venal estimat (EUR)',
      calc: 'Calcular',
      venalNote: 'Càlcul BOE intern (si disponible); també pots introduir el valor manualment.',
      summary: 'Resum de costos (EUR)',
      priceEur: 'Preu compra en EUR',
      customs: 'Duana (33%)',
      ivtm: 'Impost circulació (Martorell)',
      total: 'TOTAL ESTIMAT',
      notes: 'No s’inclou homologació (només vehicles UK matriculats abans del Brexit). Càlculs estimats; convé reservar marge. IVTM estimat amb tarifes de l’Ajuntament de Martorell.',
      exportCsv: 'Exportar CSV',
      exportPdf: 'Exportar PDF',
      manual: 'Dades tècniques manuals (si cal)',
      manualHint: 'Si no es recuperen dades automàticament, pots omplir-les manualment.',
      usingFallback: (v,m)=> `Mode fallback scrapers: DVLA=${v?'sí':'no'}, MOT=${m?'sí':'no'}`,
      error: 'No s’han pogut obtenir dades externes. Revisa la matrícula o utilitza els camps manuals.',
      loading: 'Carregant…'
    }
    const es = { ...ca,
      subtitle: 'Valor venal BOE · IVTM Martorell · DVLA/DVSA o scrapers si no hay claves. Cálculos estimativos; conviene reservar margen.',
      inputs: 'Datos de entrada',
      price: 'Precio compra (GBP)',
      miles: 'Millas (lectura del vehículo)',
      rate: 'Tipo cambio (EUR/GBP)',
      refresh: 'Actualizar',
      search: 'Buscar DVLA/DVSA (con fallback)',
      dvla: 'DVLA / Datos del vehículo',
      year: 'Año de fabricación',
      kmFromMiles: 'Km (desde millas)',
      mot: 'DVSA / Historial MOT',
      tests: 'Nº tests',
      passpct: '% aprobados',
      venal: 'Valor venal (BOE)',
      venalInput: 'Valor venal estimado (EUR)',
      summary: 'Resumen de costes (EUR)',
      priceEur: 'Precio compra en EUR',
      customs: 'Aduanas (33%)',
      ivtm: 'Impuesto circulación (Martorell)',
      total: 'TOTAL ESTIMADO',
      notes: 'No se incluye homologación (solo vehículos UK registrados antes del Brexit). Cálculos estimativos; conviene reservar margen. IVTM estimado con las tarifas del Ayuntamiento de Martorell.',
      exportCsv: 'Exportar CSV',
      exportPdf: 'Exportar PDF',
      manual: 'Datos técnicos manuales (si hace falta)',
      manualHint: 'Si no se recuperan datos automáticamente, puedes rellenarlos manualmente.',
      loading: 'Cargando…',
      usingFallback: (v,m)=> `Modo fallback scrapers: DVLA=${v?'sí':'no'}, MOT=${m?'sí':'no'}`,
    }
    return (lang==='ca'? ca: es)[key]
  }

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
  const [status, setStatus] = useState('idle')

  useEffect(()=>{
    fetch('/api/fx').then(r=>r.json()).then(d=>{
      if(d.eurPerGbp) { setGbpToEur(d.eurPerGbp); setFxSource(d.source) }
    }).catch(()=>{})
  },[])

  function saveHistory(entry){
    const item = { ...entry, ts: new Date().toISOString() }
    const key = 'carculator_history'
    const arr = JSON.parse(localStorage.getItem(key)||'[]')
    arr.unshift(item)
    localStorage.setItem(key, JSON.stringify(arr.slice(0,10)))
  }

  async function safeJson(res){ try{ return await res.json() } catch{ return null } }

  async function lookup(){
    if(!plate) return
    setStatus('loading')
    let v=null, fallbackVehicle=false
    try { const r = await fetch('/api/vehicle?plate='+encodeURIComponent(plate)); if (r.ok) v = await r.json() } catch{}
    if (!v || v.error) {
      try { const r2 = await fetch('/api/vehicle_scrape?plate='+encodeURIComponent(plate)); v = await safeJson(r2); fallbackVehicle = true } catch {}
    }
    setVehicle(v); setUsedFallback(s=>({...s, vehicle: fallbackVehicle}))

    let m=null, fallbackMot=false
    try { const r = await fetch('/api/mot?plate='+encodeURIComponent(plate)); if (r.ok) m = await r.json() } catch{}
    if (!m || m.error) {
      try { const r2 = await fetch('/api/mot_scrape?plate='+encodeURIComponent(plate)); m = await safeJson(r2); fallbackMot = true } catch {}
    }
    setMot(m); setUsedFallback(s=>({...s, mot: fallbackMot}))

    const make = v?.make; const model = v?.model; const y = v?.yearOfManufacture || v?.year
    if(make && model && y){
      const firstReg = `${y}-01-01`
      fetch(`/api/venal/boe?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&firstReg=${encodeURIComponent(firstReg)}`)
        .then(r=>r.json()).then(d=>{ if(d.venal) setValorEUR(String(d.venal)) }).catch(()=>{})
    }
    setStatus((!v && !m) ? 'error' : 'idle')
  }

  async function calculate(){
    const cc = vehicle?.engineCapacity || 0
    const resp = await fetch('/api/quote', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ valorEUR: Number(valorEUR||0), cc, tasasFijas: {}, aduanasCoef: 0.33 })
    }).then(r=>r.json())
    setQuote(resp)
    saveHistory({ plate, priceGbp: Number(priceGbp||0), valorEUR: Number(valorEUR||0), total: resp?.total||0 })
  }

  function exportCSV(){
    const rows = [
      ['Matricula','Preu GBP','Tipus canvi','Preu EUR','Valor venal (EUR)','Duana (33%)','IVTM Martorell','Total EUR','Fallback DVLA','Fallback MOT'],
      [ plate, priceGbp, gbpToEur, Number(priceGbp||0)*gbpToEur, valorEUR, quote?.aduanas||'', quote?.ivtm||'', quote?.total||'', usedFallback.vehicle, usedFallback.mot ]
    ]
    const csv = rows.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `carculator_${plate||'calc'}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF(){
    const doc = new jsPDF()
    doc.setFontSize(14); doc.text(t('title')+' (estimació)', 14, 16)
    doc.setFontSize(11)
    let y = 28
    const lines = [
      `Matrícula: ${plate}`,
      `Preu compra: GBP ${priceGbp}  |  Canvi: ${gbpToEur.toFixed(4)} EUR/GBP (Font: ${fxSource})`,
      `Preu compra en EUR: ${eur(Number(priceGbp||0)*gbpToEur)}`,
      `Valor venal (EUR): ${eur(valorEUR)}`,
      `Duana 33%: ${eur(quote?.aduanas||0)}`,
      `IVTM Martorell: ${eur(quote?.ivtm||0)}`,
      `TOTAL ESTIMAT: ${eur(quote?.total||0)}`,
      ``,
      `Notes:`,
      `- Càlculs estimats; convé reservar marge.`,
      `- No inclou homologació; vehicles UK pre-Brexit.`,
      `- IVTM amb tarifes de l’Ajuntament de Martorell.`,
      t('usingFallback')(usedFallback.vehicle, usedFallback.mot)
    ]
    lines.forEach(line=>{ doc.text(line, 14, y); y += 8 })
    doc.save(`carculator_${plate||'calc'}.pdf`)
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

  // Manual technical fields
  const [manualMake, setManualMake] = useState('')
  const [manualModel, setManualModel] = useState('')
  const [manualYear, setManualYear] = useState('')
  const [manualCC, setManualCC] = useState('')
  const [manualFuel, setManualFuel] = useState('')

  useEffect(()=>{
    if (!vehicle && (manualMake||manualModel||manualYear||manualCC||manualFuel)){
      setVehicle({ make: manualMake, model: manualModel, yearOfManufacture: manualYear, engineCapacity: Number(manualCC)||0, fuelType: manualFuel })
    }
  }, [manualMake, manualModel, manualYear, manualCC, manualFuel])

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
        <div className="text-sm">
          <button onClick={()=>setLang(lang==='ca'?'es':'ca')} className="underline">{lang==='ca'?'ES':'CAT'}</button>
        </div>
      </div>
      <p className="text-sm text-gray-600">{t('subtitle')}</p>

      <Section title={t('inputs')}>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label={t('plate')}>
            <input value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} className="border rounded-xl px-3 py-2" placeholder="AB12 CDE" />
          </Field>
          <Field label={t('price')}>
            <input type="number" value={priceGbp} onChange={e=>setPriceGbp(e.target.value)} className="border rounded-xl px-3 py-2" placeholder="2100" />
          </Field>
          <Field label={t('miles')}>
            <input type="number" value={miles} onChange={e=>setMiles(e.target.value)} className="border rounded-xl px-3 py-2" placeholder="72000" />
          </Field>
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
          <span>{t('rate')}: <b>{gbpToEur.toFixed(4)}</b></span>
          <button onClick={()=>{ fetch('/api/fx').then(r=>r.json()).then(d=>{ if(d.eurPerGbp){ setGbpToEur(d.eurPerGbp); setFxSource(d.source)} }) }} className="text-blue-600 hover:underline">{t('refresh')}</button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={lookup} className="px-4 py-2 rounded-xl bg-black text-white">{t('search')}</button>
          {status==='loading' && <span className="text-sm text-gray-500">{t('loading')}</span>}
          {status==='error' && <span className="text-sm text-red-600">{t('error')}</span>}
        </div>
      </Section>

      <div className="grid md:grid-cols-2 gap-6">
        <Section title={t('dvla')}>
          {!vehicle ? <p className="text-gray-500">—</p> :
            <div className="space-y-1">
              <ResultRow label={t('make')} value={vehicle.make||'—'} />
              <ResultRow label={t('model')} value={vehicle.model||'—'} />
              <ResultRow label={t('year')} value={vehicle.yearOfManufacture||vehicle.year||'—'} />
              <ResultRow label={t('cc')} value={fmt(vehicle.engineCapacity)} />
              <ResultRow label={t('fuel')} value={vehicle.fuelType||'—'} />
              <ResultRow label={t('kmFromMiles')} value={`${fmt(km)} km`} />
            </div>
          }
        </Section>

        <Section title={t('mot')}>
          {!motStats ? <p className="text-gray-500">—</p> :
            <div className="space-y-1">
              <ResultRow label={t('tests')} value={motStats.total} />
              <ResultRow label={t('passpct')} value={`${motStats.passPct}%`} />
              <ResultRow label={t('advisories')} value={motStats.advisories} />
            </div>
          }
        </Section>
      </div>

      <Section title={t('manual')}>
        <p className="text-xs text-gray-600 mb-3">{t('manualHint')}</p>
        <div className="grid md:grid-cols-5 gap-4">
          <Field label={t('make')}><input onChange={e=>setManualMake(e.target.value)} className="border rounded-xl px-3 py-2" /></Field>
          <Field label={t('model')}><input onChange={e=>setManualModel(e.target.value)} className="border rounded-xl px-3 py-2" /></Field>
          <Field label={t('year')}><input type="number" onChange={e=>setManualYear(e.target.value)} className="border rounded-xl px-3 py-2" /></Field>
          <Field label={t('cc')}><input type="number" onChange={e=>setManualCC(e.target.value)} className="border rounded-xl px-3 py-2" /></Field>
          <Field label={t('fuel')}><input onChange={e=>setManualFuel(e.target.value)} className="border rounded-xl px-3 py-2" /></Field>
        </div>
      </Section>

      <Section title={t('venal')}>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label={t('venalInput')}>
            <input type="number" value={valorEUR} onChange={e=>setValorEUR(e.target.value)} className="border rounded-xl px-3 py-2" placeholder="Ex. 6400" />
          </Field>
          <div className="flex items-end">
            <button onClick={calculate} className="px-4 py-2 rounded-xl bg-black text-white">{t('calc')}</button>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">{t('venalNote')}</p>
      </Section>

      <Section title={t('summary')}>
        {!quote ? <p className="text-gray-500">—</p> :
          <div className="space-y-1">
            <ResultRow label={t('priceEur')} value={eur(priceEur)} />
            <ResultRow label={t('customs')} value={eur(quote.aduanas)} />
            <ResultRow label={t('ivtm')} value={eur(quote.ivtm)} />
            <hr className="my-2" />
            <ResultRow label={t('total')} value={eur(quote.total)} bold />
            <p className="text-xs text-gray-600 mt-2">{t('notes')}</p>
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
