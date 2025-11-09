// Fallback: extract MOT history from public page
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

    const tests = []
    $('.moj-mot-history__record, .mot-test, .view-record').each((i, el) => {
      const date = $(el).find('.moj-mot-history__record-date, .mot-test-date').text().trim()
      let result = $(el).find('.moj-mot-history__record-outcome, .mot-test-result').text().trim()
      const mileageRaw = $(el).find('.moj-mot-history__record-mileage, .mot-test-mileage').text().replace(/[^0-9]/g,'').trim()
      const mileage = mileageRaw ? Number(mileageRaw) : null
      const advisories = []
      $(el).find('.moj-mot-history__record-defect, .advisory, .rfr').each((j, a) => {
        const t = $(a).text().trim()
        if (t) advisories.push(t)
      })
      if (!result && $(el).text().toLowerCase().includes('pass')) result = 'PASS'
      if (!result && $(el).text().toLowerCase().includes('fail')) result = 'FAIL'
      if (date || result || mileage) tests.push({ date, result, mileage, advisories })
    })

    res.json({ source: 'scrape_mot_public', tests })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
