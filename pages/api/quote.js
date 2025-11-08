import { estimateCVFfromCC, ivtmMartorellAmount, calcQuote } from '@/lib/calc'

export default function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  const { valorEUR, cc, tasasFijas, aduanasCoef } = req.body || {};
  const cvf = estimateCVFfromCC(cc);
  const ivtm = ivtmMartorellAmount(cvf);
  const tf = {
    fichaReducida: 60,
    itv: 120,
    dgt: 99.77,
    impMatriculacion: 93,
    ...tasasFijas,
    impuestoCirculacion: ivtm
  };
  const { aduanas, total } = calcQuote({valorEUR, tasasFijas: tf, aduanasCoef: (typeof aduanasCoef==='number'? aduanasCoef: 0.33), cvf});
  res.json({ cvf, ivtm, aduanas, total, tasasFijas: tf });
}
