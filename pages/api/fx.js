export default async function handler(req,res){
  try {
    const xmlUrl = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'
    const r = await fetch(xmlUrl)
    const txt = await r.text()
    const match = txt.match(/currency='GBP'\s+rate='([0-9.]+)'/)
    if(!match) return res.status(500).json({error:'GBP rate not found'})
    const rate = parseFloat(match[1]) // 1 EUR = rate GBP  → EUR per GBP = 1/rate
    const eurPerGbp = 1 / rate
    res.json({ eurPerGbp, source: 'ECB eurofxref-daily' })
  } catch(e){ res.status(500).json({error:e.message}) }
}
