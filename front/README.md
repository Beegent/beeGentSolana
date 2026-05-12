## Front BeeGent Solana

Este frontend de Next actúa como consola de pruebas para el backend Nest. La UI permite disparar directamente las rutas del back a través de un proxy interno en `/api/solana`, sin depender de CORS en el navegador.

## Arranque local

El front corre en el puerto 3001:

```bash
npm install
npm run dev
```

Abre `http://localhost:3001`.

## Variables de entorno

El proxy del front usa estas variables de entorno opcionales:

```env
BACKEND_URL=http://127.0.0.1:3002
BACKEND_AGENT_ACTIONS_KEY=tu-clave-de-desarrollo
```

Notas:

- `BACKEND_URL` apunta al backend Nest. Si no se define, el proxy usa `http://127.0.0.1:3002`.
- `BACKEND_AGENT_ACTIONS_KEY` permite que el servidor Next reenvíe automáticamente la cabecera `x-agent-actions-key` para las rutas protegidas de prepare y sign.
- Si no quieres usar `BACKEND_AGENT_ACTIONS_KEY`, puedes escribir la clave manualmente en la consola del front antes de probar esas acciones.

## Qué puedes probar desde la UI

- Bootstrap inicial de perfil, tokens, estado RPC y wallet del agente.
- Health global del backend y health específico de PostgreSQL.
- Consultas de precio, metadata de mint y lectura on-chain.
- Acciones protegidas de prepare y sign para transferencias SOL.
- Bitácora visual de requests y payloads devueltos por el backend real.
