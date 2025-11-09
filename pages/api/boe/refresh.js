export const config = { runtime: 'edge' }
export default async function handler(){
  try{
    const searchUrl = 'https://www.boe.es/buscar/boe.php?campo%5B0%5D=SUMARIO&q=precios%20medios%20de%20venta%20veh%C3%ADculos&sort=fecha_des&pg=1'
    const r = await fetch(searchUrl, {headers: {'User-Agent':'carculator/1.0'}})
    const html = await r.text()
    const m = html.match(/href=\"(\/diario_boe\/.*?\.php.*?)\"/)
    const source = m ? new URL(m[1], 'https://www.boe.es').toString() : 'unknown'
    return new Response(JSON.stringify({ok:true, source}), {status:200, headers:{'content-type':'application/json','cache-control':'public, max-age=604800'}})
  }catch(e){
    return new Response(JSON.stringify({ok:false, error:e.message}), {status:200, headers:{'content-type':'application/json'}})
  }
}
