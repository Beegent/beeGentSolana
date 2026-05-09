import { SolanaAgentConsole } from "@/app/_components/solana-agent-console";

const signalCards = [
  {
    kicker: "Pulso de red",
    title: "Lee el estado del nodo y el blockhash sin salir de la interfaz.",
    body: "El panel arranca consultando perfil, tokens, status RPC y wallet para comprobar que el agente responde antes de cualquier acción manual.",
  },
  {
    kicker: "Señal de mercado",
    title: "Cruza precio y lectura on-chain en el mismo flujo operativo.",
    body: "La consola puede disparar consultas de precio, supply, mint y wallet sin depender todavía del front definitivo del producto.",
  },
  {
    kicker: "Wallet operativa",
    title: "Prepara y revisa acciones firmables desde el backend del agente.",
    body: "La interfaz deja a la vista el estado de la wallet y permite ensayar transferencias SOL para validar el pipeline inicial.",
  },
  {
    kicker: "Trazabilidad",
    title:
      "Cada request queda visible para revisar el primer circuito de llamadas.",
    body: "No es solo una landing: es un tablero para mirar payloads, errores y respuestas mientras cerramos la integración entre capas.",
  },
];

const operationalPoints = [
  "Bootstrap automático de perfil, red, tokens y wallet al abrir la pantalla.",
  "Consultas manuales de precio, on-chain y metadata real del mint.",
  "Proxy interno en Next para hablar con Nest sin exponer CORS en esta fase.",
  "Bitácora visual de peticiones para revisar el comportamiento inicial del sistema.",
];

export default function Home() {
  return (
    <main className="beegent-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">BeeGent // Solana Swarm Console</span>
          <h1 className="hero-title">
            Un panel de enjambre para leer Solana, revisar el backend y abrir
            las primeras rutas operativas.
          </h1>
          <p className="hero-body">
            Este primer front no intenta cerrar el producto final. Su trabajo es
            convertir el agente de Solana en una superficie visible: estado de
            red, tokens, metadata del mint, wallet y acciones iniciales desde un
            lenguaje visual inspirado en BeeGent.
          </p>
          <div className="hero-actions">
            <a className="cta-primary" href="#console">
              Abrir consola
            </a>
            <a className="cta-secondary" href="#signals">
              Ver arquitectura
            </a>
          </div>
          <div className="metric-row">
            <article className="metric-card">
              <strong>4</strong>
              <span>Peticiones bootstrap al cargar</span>
            </article>
            <article className="metric-card">
              <strong>6</strong>
              <span>Tokens seguidos por el agente</span>
            </article>
            <article className="metric-card">
              <strong>RPC</strong>
              <span>Proxy interno listo para Nest</span>
            </article>
          </div>
        </div>
        <div className="swarm-visual" aria-hidden="true">
          <div className="swarm-badge swarm-badge-top">
            <span>Price signal</span>
            <strong>Live query</strong>
          </div>
          <div className="swarm-badge swarm-badge-bottom">
            <span>Mint intelligence</span>
            <strong>On-chain read</strong>
          </div>
          <div className="swarm-core">
            <span className="swarm-core-kicker">Solana Agent</span>
            <strong>Backend-linked</strong>
            <p>Tokens, RPC, wallet y requests visibles desde una sola capa.</p>
          </div>
        </div>
      </section>

      <section className="section-block" id="signals">
        <div className="section-header">
          <span className="eyebrow">Arquitectura operativa</span>
          <h2 className="section-title">
            La interfaz piensa como un panel de coordinación, no como una página
            estática.
          </h2>
          <p className="section-copy">
            El estilo toma la dirección de BeeGent, pero el contenido se centra
            en el estado real del proyecto: comprobar que el agente de Solana ya
            responde y que el front puede inspeccionar sus primeras rutas.
          </p>
        </div>
        <div className="signal-grid">
          {signalCards.map((card) => (
            <article className="signal-card" key={card.kicker}>
              <span className="signal-kicker">{card.kicker}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block section-block-offset">
        <div className="section-header compact">
          <span className="eyebrow">Checklist de esta fase</span>
          <h2 className="section-title">
            Lo que queda cubierto antes de tocar el flujo final del producto.
          </h2>
        </div>
        <div className="operations-board">
          {operationalPoints.map((point, index) => (
            <article className="operation-step" key={point}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{point}</p>
            </article>
          ))}
        </div>
      </section>

      <SolanaAgentConsole />
    </main>
  );
}
