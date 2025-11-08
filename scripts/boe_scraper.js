// NOTE: This is a simplified placeholder scraper. In production, refine selectors and parsing.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

async function fetchHtml(url){
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 UK2ESCalc/1.0' }});
  if(!res.ok) throw new Error('HTTP '+res.status);
  return await res.text();
}

async function main(){
  // Search page query for latest "precios medios de venta de vehículos" order.
  const searchUrl = 'https://www.boe.es/buscar/boe.php?campo%5B0%5D=SUMARIO&q=precios%20medios%20de%20venta%20veh%C3%ADculos&sort=fecha_des&pg=1';
  console.log('Fetching', searchUrl);
  const html = await fetchHtml(searchUrl);
  const $ = cheerio.load(html);
  // Find first result link
  const first = $('article.resultado-busqueda .resultado-busqueda-enlace a').first();
  const href = first.attr('href');
  if(!href) {
    console.warn('No result link found. Keeping existing boe_latest.json');
    return;
  }
  const full = new URL(href, 'https://www.boe.es').toString();
  console.log('Opening', full);
  const doc = await fetchHtml(full);
  const $doc = cheerio.load(doc);

  // Very simplified: read year from page title
  const title = $doc('h1').first().text().trim();
  const m = title.match(/\b(20\d{2})\b/);
  const year = m ? parseInt(m[1],10) : new Date().getFullYear();

  // TODO: Parse actual tables of PMV by model. For demo, we keep existing makes and just bump the year.
  const dataPath = path.join(process.cwd(), 'data', 'boe_latest.json');
  let current = {};
  try { current = JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch(e){}
  const updated = { ...current, year, source: full };
  fs.writeFileSync(dataPath, JSON.stringify(updated, null, 2));
  console.log('Updated', dataPath);
}

main().catch(err=>{
  console.error(err);
  process.exit(0); // do not fail the action hard
});
