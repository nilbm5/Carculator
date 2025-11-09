// Fallback: extract basic vehicle info from public MOT page
import cheerio from 'cheerio'

export default async function handler(req, res) {
  const plate = (req.query.plate||'').trim()
  if (!plate) return res.status(400).json({ error: 'plate required' })
  try {
    const url = 'https://www.check-mot.service.gov.uk/vehicle/' + encodeURIComponent(plate)
    const r = await fetch(url, { headers: { 'User-Agent': 'carculator/1.0 (+contact)' } })
    if (!r.ok) return res.status(502).json({ error: 'Failed to fetch MOT public page', status: r.status })
    const html = await r.text()
    const $ = cheerio.load(html)

    let make=null, model=null, year=null, engineCapacity=null, fuelType=null

    $('.govuk-summary-list__row').each((i, row)=>{
      const label = $(row).find('.govuk-summary-list__key').text().trim().toLowerCase()
      const val = $(row).find('.govuk-summary-list__value').text().trim()
      if (!label || !val) return
      if (label.includes('make'))       make = make || val.split('/')[0].trim()
      else if (label.includes('model')) model = model || val.trim()
      else if (label.includes('first registered') || label.includes('year')) {
        const m = val.match(/(20\d{2}|19\d{2})/); if (m) year = year || m[0]
      } else if (label.includes('engine size') || label.includes('cc') || label.includes('engine capacity')) {
        const m = val.match(/(\d{3,4})\s*cc/); if (m) engineCapacity = engineCapacity || Number(m[1])
      } else if (label.includes('fuel')) fuelType = fuelType || val
    })

    // rough fallback
    if (!make || !model) {
      const body = $('body').text()
      const mm = body.match(/Make[\s:]+([A-Za-z0-9 \-]{2,40})/i)
      if (mm) make = make || mm[1].trim()
      const mo = body.match(/Model[\s:]+([A-Za-z0-9 \-]{2,40})/i)
      if (mo) model = model || mo[1].trim()
      const yy = body.match(/(20\d{2}|19\d{2})/)
      if (yy) year = year || yy[0]
    }

    res.json({ source: 'scrape_mot_public', make, model, year, engineCapacity, fuelType })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
