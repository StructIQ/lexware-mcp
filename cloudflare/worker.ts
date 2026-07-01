/**
 * Cloudflare Containers wrapper for the Lexware Office MCP server.
 *
 * Runs the repo's Docker image (Skybridge HTTP server on :8080) as a Cloudflare
 * Container, fronted by this Worker. All requests are routed to a single shared
 * container instance (single-tenant; the server's ~2 req/s rate limiter is
 * per-process, so we run exactly one).
 *
 * Config lives in the repo-root wrangler.jsonc. Secrets/vars set on the Worker
 * are forwarded into the container's process env via `envVars` below.
 */
import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  LEXWARE_CONTAINER: DurableObjectNamespace;
  // Forwarded into the container (set as Worker secrets/vars):
  LEXWARE_API_KEY?: string;
  MCP_AUTH_TOKEN?: string;
  MCP_ALLOW_UNAUTHENTICATED?: string;
  LEXWARE_READ_ONLY?: string;
  LEXWARE_ENABLE_DRAFTS?: string;
  LEXWARE_ENABLE_FINALIZE?: string;
  OAUTH_ISSUER?: string;
  OAUTH_RESOURCE?: string;
  SERVER_URL?: string;
}

export class LexwareContainer extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = "30m";

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Everything the Skybridge server reads from process.env.
    // Safety defaults: drafts on, FINALIZE (legally binding) OFF.
    this.envVars = {
      PORT: "8080",
      LEXWARE_API_KEY: env.LEXWARE_API_KEY ?? "",
      MCP_AUTH_TOKEN: env.MCP_AUTH_TOKEN ?? "",
      MCP_ALLOW_UNAUTHENTICATED: env.MCP_ALLOW_UNAUTHENTICATED ?? "false",
      LEXWARE_READ_ONLY: env.LEXWARE_READ_ONLY ?? "false",
      LEXWARE_ENABLE_DRAFTS: env.LEXWARE_ENABLE_DRAFTS ?? "true",
      LEXWARE_ENABLE_FINALIZE: env.LEXWARE_ENABLE_FINALIZE ?? "false",
      ...(env.OAUTH_ISSUER ? { OAUTH_ISSUER: env.OAUTH_ISSUER } : {}),
      ...(env.OAUTH_RESOURCE ? { OAUTH_RESOURCE: env.OAUTH_RESOURCE } : {}),
      ...(env.SERVER_URL ? { SERVER_URL: env.SERVER_URL } : {}),
    };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // One shared instance for the whole server (single-tenant, single rate limiter).
    return getContainer(env.LEXWARE_CONTAINER, "singleton").fetch(request);
  },
};
