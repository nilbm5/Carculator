export default async function handler(req, res){
  const { plate } = req.query;
  if(!plate) return res.status(400).json({error: 'plate required'});
  const key = process.env.DVLA_API_KEY;
  if(!key) return res.status(500).json({error: 'DVLA_API_KEY missing'});
  try {
    const r = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ registrationNumber: plate })
    });
    const data = await r.json();
    if(!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch(e){
    res.status(500).json({error: e.message});
  }
}
