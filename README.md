# carculator (UK→ES)

- Next.js + Tailwind
- APIs DVLA/DVSA (si hay claves) + **fallback scrapers**
- Valor venal BOE (auto-actualización con GitHub Action)
- IVTM Martorell, aduanas 33%, milles→km, historial, exportar PDF/CSV.

## Variables de entorno (opcional)
- `DVLA_API_KEY`
- `DVSA_API_KEY`

Sin claves, el frontend usa los scrapers automáticamente.
