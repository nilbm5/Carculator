import data from '@/data/boe_latest.json';

function monthsSince(dateStr){
  const d = new Date(dateStr);
  const now = new Date();
  let months = (now.getFullYear()-d.getFullYear())*12 + (now.getMonth()-d.getMonth());
  return Math.max(0, months);
}

export default function handler(req,res){
  const { make, model, firstReg } = req.query;
  if(!make || !model || !firstReg) return res.status(400).json({error:'make, model, firstReg (YYYY-MM-DD) required'});
  const year = new Date(firstReg).getFullYear().toString();
  const makes = data.makes || {};
  const pmv = makes?.[make]?.[model]?.[year]?.pmv;
  if(!pmv) return res.status(404).json({error:'PMV not found in current BOE data'});
  const months = monthsSince(firstReg);
  const factor = (data.coefficients||[]).find(c=> months>=c.min_months && months<=c.max_months)?.factor ?? 0.1;
  const venal = pmv * factor;
  res.json({ year: data.year, pmv, factor, venal, source: data.source });
}
