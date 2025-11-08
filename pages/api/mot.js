export default async function handler(req, res){
  const { plate } = req.query;
  if(!plate) return res.status(400).json({error: 'plate required'});
  const key = process.env.DVSA_API_KEY;
  if(!key) return res.status(500).json({error: 'DVSA_API_KEY missing'});
  try {
    const url = 'https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration='+encodeURIComponent(plate);
    const r = await fetch(url, {
      headers: {
        'x-api-key': key,
        'Accept': 'application/json'
      }
    });
    const data = await r.json();
    if(!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch(e){
    res.status(500).json({error: e.message});
  }
}
