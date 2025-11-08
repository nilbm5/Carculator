# UK→ES Import Calculator

Gratis, desplegable en Vercel. Frontend Next.js + API routes.  
- DVLA/DVSA (requiere tus API keys gratuitas).
- Valor venal BOE (tablas en `/data/boe_latest.json`, con auto-actualización por GitHub Action).
- IVTM Martorell por tramos.
- Cálculo de aduanas 33% + tasas fijas configurables.
- Conversión millas→km, historial local, exportar PDF/CSV.

## Despliegue rápido (Vercel)
1. Haz fork o sube este repo a GitHub.
2. Pulsa "New Project" en Vercel y selecciona el repo.
3. Variables de entorno (Project Settings → Environment Variables):
   - `DVLA_API_KEY`
   - `DVSA_API_KEY`
4. Deploy.

Opcional: GitHub Action actualizará automáticamente `data/boe_latest.json` cada mes.

## Desarrollo local
```bash
npm install
npm run dev
```

## Endpoints
- `GET /api/vehicle?plate=AB12CDE`
- `GET /api/mot?plate=AB12CDE`
- `GET /api/fx` (tipo GBP→EUR vía ECB)
- `POST /api/quote` (JSON con entradas; devuelve desglose)
- `GET /api/venal/boe?make=Audi&model=A1&year=2015`
- `POST /api/boe/refresh` (opcional, recarga BOE en caliente; no persiste)
