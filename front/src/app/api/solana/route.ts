import { NextRequest, NextResponse } from "next/server";

const backendOrigin = process.env.BACKEND_URL ?? "http://127.0.0.1:3002";

type ResourceConfig = {
  method: "GET" | "POST";
  path: string;
  requiresActionKey?: boolean;
};

const resourceMap = {
  databaseHealth: { path: "/health/db", method: "GET" },
  health: { path: "/health", method: "GET" },
  mint: { path: "/agents/solana/mint", method: "GET" },
  onchain: { path: "/agents/solana/onchain", method: "GET" },
  price: { path: "/agents/solana/price", method: "GET" },
  profile: { path: "/agents/solana", method: "GET" },
  signTransfer: {
    path: "/agents/solana/actions/transfer/sign",
    method: "POST",
    requiresActionKey: true,
  },
  status: { path: "/agents/solana/status", method: "GET" },
  tokens: { path: "/agents/solana/tokens", method: "GET" },
  prepareTransfer: {
    path: "/agents/solana/actions/transfer/prepare",
    method: "POST",
    requiresActionKey: true,
  },
  wallet: { path: "/agents/solana/wallet", method: "GET" },
} as const satisfies Record<string, ResourceConfig>;

type SolanaResource = keyof typeof resourceMap;

export async function GET(request: NextRequest) {
  return proxyToBackend(request, "GET");
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, "POST");
}

async function proxyToBackend(request: NextRequest, method: "GET" | "POST") {
  const resource = request.nextUrl.searchParams.get(
    "resource",
  ) as SolanaResource | null;

  if (!resource || !(resource in resourceMap)) {
    return NextResponse.json(
      { message: "resource no soportado en el proxy de Solana" },
      { status: 400 },
    );
  }

  const config = resourceMap[resource];

  if (config.method !== method) {
    return NextResponse.json(
      { message: `El recurso ${resource} requiere ${config.method}` },
      { status: 405 },
    );
  }

  const backendUrl = new URL(config.path, backendOrigin);

  if (method === "GET") {
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key !== "resource") {
        backendUrl.searchParams.append(key, value);
      }
    });
  }

  const init: RequestInit = {
    method,
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  };

  if (method === "POST") {
    const body = await request.json().catch(() => null);
    init.body = JSON.stringify(body ?? {});
    init.headers = {
      ...init.headers,
      "content-type": "application/json",
    };
  }

  if ("requiresActionKey" in config && config.requiresActionKey) {
    const actionKey =
      request.headers.get("x-agent-actions-key")?.trim() ||
      process.env.BACKEND_AGENT_ACTIONS_KEY?.trim();

    if (actionKey) {
      init.headers = {
        ...init.headers,
        "x-agent-actions-key": actionKey,
      };
    }
  }

  try {
    const backendResponse = await fetch(backendUrl, init);
    const text = await backendResponse.text();
    const payload = tryParseJson(text);

    if (payload !== null) {
      return NextResponse.json(payload, { status: backendResponse.status });
    }

    return NextResponse.json(
      {
        message:
          text || "El backend respondio sin un cuerpo JSON interpretable.",
      },
      { status: backendResponse.status },
    );
  } catch {
    return NextResponse.json(
      {
        message: `No fue posible conectar con el backend en ${backendOrigin}.`,
      },
      { status: 502 },
    );
  }
}

function tryParseJson(raw: string) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
