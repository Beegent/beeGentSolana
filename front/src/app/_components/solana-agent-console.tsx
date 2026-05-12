"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";

type RequestLog = {
  id: string;
  label: string;
  method: "GET" | "POST";
  detail: string;
  status: "ok" | "error";
  timestamp: string;
};

type ProfileResponse = {
  capabilities: string[];
  cluster: string;
  name: string;
  rpcEndpoint: string;
  trackedTokens: number;
  walletConfigured: boolean;
};

type TokensResponse = {
  tokens: Array<{
    address: string;
    name: string;
    symbol: string;
  }>;
};

type StatusResponse = {
  health: string;
  latestBlockhash: string;
  source: string;
  slot: number;
};

type HealthDependency = {
  details?: GenericResponse;
  message?: string;
  status: "ok" | "error";
};

type SystemHealthResponse = {
  checkedAt: string;
  services: {
    database: HealthDependency;
    solana: HealthDependency;
  };
  status: string;
};

type DatabaseHealthResponse = {
  checkedAt: string;
  database: string | null;
  driver: string;
  host: string | null;
  port: number | null;
  status: string;
};

type WalletResponse = {
  wallet: {
    balanceSol?: number;
    canSign: boolean;
    configured: boolean;
    publicKey?: string;
  };
};

type GenericResponse = Record<string, unknown>;

function normalizeError(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    Array.isArray(payload.message)
  ) {
    return payload.message.join(". ");
  }

  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    payload.message &&
    typeof payload.message === "object"
  ) {
    return JSON.stringify(payload.message);
  }

  return fallback;
}

export function SolanaAgentConsole() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [tokens, setTokens] = useState<TokensResponse["tokens"]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(
    null,
  );
  const [databaseHealth, setDatabaseHealth] =
    useState<DatabaseHealthResponse | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [priceToken, setPriceToken] = useState("SOL");
  const [assetToken, setAssetToken] = useState("USDC");
  const [vsCurrency, setVsCurrency] = useState("usd");
  const [recipient, setRecipient] = useState("");
  const [amountSol, setAmountSol] = useState("0.05");
  const [actionKey, setActionKey] = useState("");
  const [pricePayload, setPricePayload] = useState<GenericResponse | null>(
    null,
  );
  const [assetPayload, setAssetPayload] = useState<{
    mint: GenericResponse | null;
    onchain: GenericResponse | null;
  }>({
    mint: null,
    onchain: null,
  });
  const [transferPayload, setTransferPayload] =
    useState<GenericResponse | null>(null);
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([]);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function appendLog(
    label: string,
    method: "GET" | "POST",
    statusValue: "ok" | "error",
    detail: string,
  ) {
    setRequestLogs((current) =>
      [
        {
          id: `${label}-${Date.now()}-${current.length}`,
          label,
          method,
          detail,
          status: statusValue,
          timestamp: new Date().toLocaleTimeString("es-ES"),
        },
        ...current,
      ].slice(0, 12),
    );
  }

  async function callAgentApi<T>(
    resourceQuery: string,
    label: string,
    options?: {
      body?: Record<string, string>;
      headers?: Record<string, string>;
      method?: "GET" | "POST";
    },
  ) {
    const method = options?.method ?? "GET";
    const requestHeaders = {
      ...(options?.headers ?? {}),
      ...(method === "POST" ? { "content-type": "application/json" } : {}),
    };
    const response = await fetch(`/api/solana?resource=${resourceQuery}`, {
      method,
      headers:
        Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
      body: method === "POST" ? JSON.stringify(options?.body ?? {}) : undefined,
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const message = normalizeError(payload, `Fallo la peticion ${label}.`);
      appendLog(label, method, "error", message);
      throw new Error(message);
    }

    appendLog(label, method, "ok", `OK ${response.status}`);
    return payload as T;
  }

  async function bootstrapConsoleInternal() {
    setSurfaceError(null);

    try {
      const [profileResponse, tokensResponse, statusResponse, walletResponse] =
        await Promise.all([
          callAgentApi<ProfileResponse>("profile", "Perfil del agente"),
          callAgentApi<TokensResponse>("tokens", "Tokens soportados"),
          callAgentApi<StatusResponse>("status", "Estado RPC"),
          callAgentApi<WalletResponse>("wallet", "Estado de wallet"),
        ]);

      setProfile(profileResponse);
      setTokens(tokensResponse.tokens ?? []);
      setStatus(statusResponse);
      setWallet(walletResponse);
    } catch (error) {
      setSurfaceError(
        error instanceof Error
          ? error.message
          : "No fue posible inicializar la consola del agente.",
      );
    }
  }

  const bootstrapConsole = useEffectEvent(async () => {
    await bootstrapConsoleInternal();
  });

  useEffect(() => {
    startTransition(() => {
      void bootstrapConsole();
    });
  }, []);

  async function handlePriceLookup() {
    setSurfaceError(null);

    try {
      const payload = await callAgentApi<GenericResponse>(
        `price&token=${encodeURIComponent(priceToken)}&vsCurrency=${encodeURIComponent(vsCurrency)}`,
        `Precio ${priceToken.toUpperCase()}`,
      );

      setPricePayload(payload);
    } catch (error) {
      setSurfaceError(
        error instanceof Error
          ? error.message
          : "No fue posible consultar el precio del token.",
      );
    }
  }

  async function handleAssetLookup() {
    setSurfaceError(null);

    try {
      const [mint, onchain] = await Promise.all([
        callAgentApi<GenericResponse>(
          `mint&token=${encodeURIComponent(assetToken)}`,
          `Mint ${assetToken.toUpperCase()}`,
        ),
        callAgentApi<GenericResponse>(
          `onchain&token=${encodeURIComponent(assetToken)}`,
          `On-chain ${assetToken.toUpperCase()}`,
        ),
      ]);

      setAssetPayload({ mint, onchain });
    } catch (error) {
      setSurfaceError(
        error instanceof Error
          ? error.message
          : "No fue posible consultar la lectura on-chain del token.",
      );
    }
  }

  async function handleBackendHealth(target: "health" | "databaseHealth") {
    setSurfaceError(null);

    try {
      if (target === "health") {
        const payload = await callAgentApi<SystemHealthResponse>(
          "health",
          "Health global",
        );

        setSystemHealth(payload);
        return;
      }

      const payload = await callAgentApi<DatabaseHealthResponse>(
        "databaseHealth",
        "Health PostgreSQL",
      );

      setDatabaseHealth(payload);
    } catch (error) {
      setSurfaceError(
        error instanceof Error
          ? error.message
          : "No fue posible consultar el health del backend.",
      );
    }
  }

  async function handleTransferAction(
    action: "prepareTransfer" | "signTransfer",
  ) {
    setSurfaceError(null);

    try {
      const payload = await callAgentApi<GenericResponse>(
        action,
        action === "prepareTransfer"
          ? "Preparar transferencia SOL"
          : "Firmar transferencia SOL",
        {
          body: {
            amountSol,
            recipient,
          },
          headers: actionKey.trim()
            ? {
                "x-agent-actions-key": actionKey.trim(),
              }
            : undefined,
          method: "POST",
        },
      );

      setTransferPayload(payload);
      const walletResponse = await callAgentApi<WalletResponse>(
        "wallet",
        "Refresco de wallet",
      );
      setWallet(walletResponse);
    } catch (error) {
      setSurfaceError(
        error instanceof Error
          ? error.message
          : "No fue posible ejecutar la accion de wallet.",
      );
    }
  }

  return (
    <section className="console-panel" id="console">
      <div className="console-heading">
        <div>
          <span className="eyebrow">Consola del agente</span>
          <h2 className="console-title">
            El primer panel para revisar respuestas reales del backend.
          </h2>
          <p className="console-copy">
            Las cards inferiores cargan con las primeras llamadas automáticas. A
            partir de ahí puedes disparar consultas puntuales y revisar sus
            respuestas sin salir del front.
          </p>
        </div>
        <div className="console-actions">
          <button
            className="ghost-button"
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                void bootstrapConsoleInternal();
              });
            }}
            type="button"
          >
            Refrescar bootstrap
          </button>
        </div>
      </div>

      <div className="status-grid">
        <article className="status-card">
          <span className="meta-label">Agente</span>
          <strong className="meta-value">{profile?.name ?? "Cargando"}</strong>
          <p className="meta-value-subtle">
            {profile?.cluster ? `Cluster ${profile.cluster}` : "Leyendo perfil"}
          </p>
        </article>
        <article className="status-card">
          <span className="meta-label">RPC</span>
          <div className="meta-value-subtle">
            <span
              className={`status-dot ${status?.health === "ok" ? "" : "offline"}`}
            />
          </div>
          <strong className="meta-value">{status?.health ?? "--"}</strong>
          <p className="meta-value-subtle">
            {status?.slot ? `Slot ${status.slot}` : "Sin slot recibido todavía"}
          </p>
        </article>
        <article className="status-card">
          <span className="meta-label">Tokens</span>
          <strong className="meta-value">{tokens.length || "--"}</strong>
          <p className="meta-value-subtle">
            {profile?.trackedTokens
              ? `${profile.trackedTokens} activos en seguimiento`
              : "Esperando catalogo"}
          </p>
        </article>
        <article className="status-card">
          <span className="meta-label">Wallet</span>
          <strong className="meta-value">
            {wallet?.wallet.configured ? "Lista" : "Pendiente"}
          </strong>
          <p className="meta-value-subtle">
            {wallet?.wallet.configured
              ? `${wallet.wallet.balanceSol ?? 0} SOL disponibles`
              : "Configura SOLANA_WALLET_SECRET_KEY para activar firma"}
          </p>
        </article>
        <article className="status-card">
          <span className="meta-label">Backend</span>
          <strong className="meta-value">{systemHealth?.status ?? "--"}</strong>
          <p className="meta-value-subtle">
            {systemHealth?.checkedAt
              ? `Health global ${formatTimestamp(systemHealth.checkedAt)}`
              : "Consulta manual pendiente"}
          </p>
        </article>
        <article className="status-card">
          <span className="meta-label">PostgreSQL</span>
          <strong className="meta-value">
            {databaseHealth?.status ?? "--"}
          </strong>
          <p className="meta-value-subtle">
            {databaseHealth?.database
              ? databaseHealth.database
              : "Consulta manual pendiente"}
          </p>
        </article>
      </div>

      <div className="console-grid">
        <div className="console-column">
          <article className="console-card">
            <div className="panel-title-row">
              <h3 className="panel-title">Catalogo operativo</h3>
              <span className="inline-note">
                {profile?.rpcEndpoint ?? "Esperando endpoint RPC"}
              </span>
            </div>
            {tokens.length ? (
              <div className="token-cloud">
                {tokens.map((token) => (
                  <article className="token-chip" key={token.address}>
                    <strong>{token.symbol}</strong>
                    <span>{token.name}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Todavia no hay tokens cargados.</p>
            )}
          </article>

          <article className="console-card">
            <div className="panel-title-row">
              <h3 className="panel-title">Diagnostico del backend</h3>
              <span className="inline-note">
                Prueba directa de /health y /health/db
              </span>
            </div>
            <p className="field-note">
              Estas acciones pasan por el proxy interno de Next y golpean las
              rutas raiz del back para validar conexión real con PostgreSQL y
              Solana.
            </p>
            <div className="form-actions">
              <button
                className="ghost-button"
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    void handleBackendHealth("health");
                  });
                }}
                type="button"
              >
                Health global
              </button>
              <button
                className="form-button"
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    void handleBackendHealth("databaseHealth");
                  });
                }}
                type="button"
              >
                Health PostgreSQL
              </button>
            </div>
          </article>

          <article className="console-card">
            <div className="panel-title-row">
              <h3 className="panel-title">Consultas de precio y red</h3>
              <span className="inline-note">
                Primeras peticiones GET al agente
              </span>
            </div>
            <div className="query-grid">
              <form
                className="console-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  startTransition(() => {
                    void handlePriceLookup();
                  });
                }}
              >
                <div className="form-field">
                  <label htmlFor="price-token">Token</label>
                  <input
                    id="price-token"
                    onChange={(event) => setPriceToken(event.target.value)}
                    value={priceToken}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="price-currency">Moneda</label>
                  <input
                    id="price-currency"
                    onChange={(event) => setVsCurrency(event.target.value)}
                    value={vsCurrency}
                  />
                </div>
                <div className="form-actions">
                  <button
                    className="form-button"
                    disabled={isPending}
                    type="submit"
                  >
                    Consultar precio
                  </button>
                </div>
              </form>

              <form
                className="console-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  startTransition(() => {
                    void handleAssetLookup();
                  });
                }}
              >
                <div className="form-field">
                  <label htmlFor="asset-token">Token on-chain</label>
                  <input
                    id="asset-token"
                    onChange={(event) => setAssetToken(event.target.value)}
                    value={assetToken}
                  />
                </div>
                <p className="field-note">
                  Dispara las rutas de mint y on-chain sobre el mismo activo.
                </p>
                <div className="form-actions">
                  <button
                    className="form-button"
                    disabled={isPending}
                    type="submit"
                  >
                    Leer mint y supply
                  </button>
                </div>
              </form>
            </div>
          </article>

          <article className="console-card">
            <div className="panel-title-row">
              <h3 className="panel-title">Acciones de wallet</h3>
              <span className="inline-note">
                Usa prepare o sign para probar el backend actual
              </span>
            </div>
            <form
              className="console-form"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <div className="form-field">
                <label htmlFor="recipient">Recipient</label>
                <input
                  id="recipient"
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="Public key de Solana"
                  value={recipient}
                />
              </div>
              <div className="form-field">
                <label htmlFor="amount-sol">Cantidad SOL</label>
                <input
                  id="amount-sol"
                  onChange={(event) => setAmountSol(event.target.value)}
                  placeholder="0.05"
                  value={amountSol}
                />
              </div>
              <div className="form-field">
                <label htmlFor="action-key">x-agent-actions-key</label>
                <input
                  id="action-key"
                  onChange={(event) => setActionKey(event.target.value)}
                  placeholder="Clave del back para prepare/sign"
                  value={actionKey}
                />
              </div>
              <p className="field-note">
                Si prefieres no escribir la clave en la UI, también puedes
                definir BACKEND_AGENT_ACTIONS_KEY en el servidor de Next.
              </p>
              <div className="form-actions">
                <button
                  className="ghost-button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(() => {
                      void handleTransferAction("prepareTransfer");
                    });
                  }}
                  type="button"
                >
                  Preparar
                </button>
                <button
                  className="form-button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(() => {
                      void handleTransferAction("signTransfer");
                    });
                  }}
                  type="button"
                >
                  Firmar
                </button>
              </div>
            </form>
          </article>
        </div>

        <div className="console-column">
          <article className="console-card">
            <div className="panel-title-row">
              <h3 className="panel-title">Payloads recibidos</h3>
              <span className="inline-note">
                Respuesta viva de precio, mint, on-chain y acciones
              </span>
            </div>
            {surfaceError ? (
              <p className="empty-state">{surfaceError}</p>
            ) : null}
            <div className="preview-grid">
              <div className="code-window">
                <span className="code-label">Health global</span>
                <pre>{formatPayload(systemHealth)}</pre>
              </div>
              <div className="code-window">
                <span className="code-label">Health PostgreSQL</span>
                <pre>{formatPayload(databaseHealth)}</pre>
              </div>
              <div className="code-window">
                <span className="code-label">Precio</span>
                <pre>{formatPayload(pricePayload)}</pre>
              </div>
              <div className="code-window">
                <span className="code-label">Mint</span>
                <pre>{formatPayload(assetPayload.mint)}</pre>
              </div>
              <div className="code-window">
                <span className="code-label">On-chain</span>
                <pre>{formatPayload(assetPayload.onchain)}</pre>
              </div>
              <div className="code-window">
                <span className="code-label">Transfer action</span>
                <pre>{formatPayload(transferPayload)}</pre>
              </div>
            </div>
          </article>

          <article className="console-card">
            <div className="panel-title-row">
              <h3 className="panel-title">Bitacora de peticiones</h3>
              <span className="inline-note">
                Sirve para revisar el arranque y las pruebas manuales
              </span>
            </div>
            {requestLogs.length ? (
              <div className="log-stack">
                {requestLogs.map((entry) => (
                  <article
                    className={`log-entry ${entry.status}`}
                    key={entry.id}
                  >
                    <div className="log-header">
                      <strong className="log-title">{entry.label}</strong>
                      <span className="log-meta">
                        {entry.method} · {entry.timestamp}
                      </span>
                    </div>
                    <p className="log-detail">{entry.detail}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                Todavia no hay peticiones registradas.
              </p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

function formatPayload(payload: unknown) {
  if (!payload) {
    return "Sin datos todavia.";
  }

  return JSON.stringify(payload, null, 2);
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString("es-ES");
}
