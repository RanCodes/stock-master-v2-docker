# StockMaster Pro

Aplicación de recepción de stock con:
- Carga de productos con SKU, nombre, cantidad y notas.
- Captura de fotos (frente/reverso) usando cámara en celular.
- Exportación de datos a CSV y descarga de la base SQLite.
- Configuración de **Google Drive Backup** (link externo) para tu flujo de respaldo.

## Requisitos
- Docker + Docker Compose

## Ejecutar con Docker

1. Construir y levantar:
   ```bash
   docker compose up --build -d
   ```
2. Abrir en navegador:
   - `http://localhost:3000`

La app guarda datos persistentes en:
- `./data` (base SQLite `stock.db`)
- `./uploads` (fotos)

## Cámara en celular

Para que funcione correctamente en móviles:
- Usa HTTPS en producción (o red local segura).
- En iPhone/Safari, el navegador solo habilita cámara en contexto seguro (HTTPS) o localhost.

La app incluye un fallback: si no se puede abrir cámara en vivo, abre selector de imagen con `capture="environment"`.

## Funcionalidades de respaldo

- **CSV**: botón en encabezado para descargar reporte.
- **BD**: botón en encabezado para descargar `stock.db`.
- **Google Drive Backup**: en Ajustes puedes guardar el link de tu carpeta de Drive para mantener tu flujo externo de respaldo de imágenes.

## Desarrollo local

```bash
npm install
npm run dev
```
