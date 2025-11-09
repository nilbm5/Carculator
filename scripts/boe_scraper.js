// Simplified updater: finds latest BOE order link and bumps metadata.
const fs = require('fs'); const path = require('path'); const cheerio = require('cheerio');

async function fetchHtml(url){
  const res = await fetch(url, { headers: { 'User-Agent': 'carculator/1.0' }});
  if(!res.ok) throw new Error('HTTP '+res.status);
  return await res.text();
}

async function main(){
  const searchUrl = 'https://www.boe.es/buscar/boe.php?campo%5B0%5D=SUMARIO&q=precios%20medios%20de%20venta%20veh%C3%ADculos&sort=fecha_des&pg=1';
  const html = await fetchHtml(searchUrl);
  const $ = cheerio.load(html);
  const href = $('article.resultado-busqueda .resultado-busqueda-enlace a').first().attr('href');
  if(!href) return console.log('No result found');
  const full = new URL(href, 'https://www.boe.es').toString();
  const doc = await fetchHtml(full);
  const $doc = cheerio.load(doc);
  const title = $doc('h1').first().text().trim();
  const m = title.match(/\b(20\d{2})\b/);
  const year = m ? parseInt(m[1],10) : new Date().getFullYear();
  const dataPath = path.join(process.cwd(), 'data', 'boe_latest.json');
  let current = {}; try { current = JSON.parse(fs.readFileSync(dataPath,'utf8')); } catch{}
  const updated = { ...current, year, source: full };
  fs.writeFileSync(dataPath, JSON.stringify(updated, null, 2));
  console.log('Updated', dataPath, '→ year', year);
}
main().catch(e=>{ console.error(e); process.exit(0); });
