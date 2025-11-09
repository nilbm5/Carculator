# UK→ES Import Calculator (con fallback scrapers)

- Frontend Next.js + Tailwind
- API routes: DVLA/DVSA (con keys) y **fallback scrapers** si no hay keys
- Valor venal BOE (auto-actualización con GitHub Action)
- IVTM Martorell, aduanas 33%, tasas fijas
- Exportar PDF/CSV, historial local, conversión millas→km

## Variables de entorno (Vercel → Project Settings → Environment Variables)
- `DVLA_API_KEY` (opcional si usas scrapers)
- `DVSA_API_KEY` (opcional si usas scrapers)

Si faltan, el frontend intenta automáticamente los endpoints de scraping.

## Endpoints
- `GET /api/vehicle?plate=...` (DVLA)
- `GET /api/mot?plate=...` (DVSA)
- `GET /api/vehicle_scrape?plate=...` (fallback)
- `GET /api/mot_scrape?plate=...` (fallback)
- `GET /api/fx` (ECB)
- `GET /api/venal/boe?make=...&model=...&firstReg=YYYY-MM-DD`
- `POST /api/quote`

## Despliegue
1. Sube a GitHub
2. Importa en Vercel
3. (Opcional) añade API keys
4. Deploy
