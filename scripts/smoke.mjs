/** Live smoke test: MCP_AUTH_TOKEN=... node scripts/smoke.mjs */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.env.MCP_URL || "https://structiq-lexware-mcp.fly.dev/mcp";
const token = process.env.MCP_AUTH_TOKEN;
const t = new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { Authorization: `Bearer ${token}` } } });
const c = new Client({ name: "lexware-smoke", version: "0.1.0" }, { capabilities: {} });
await c.connect(t);

const { tools } = await c.listTools();
console.log(`tools (${tools.length}): ` + tools.slice(0, 10).map((x) => x.name).join(", ") + (tools.length > 10 ? " …" : ""));

const prof = tools.find((x) => /profile/i.test(x.name));
if (prof) {
  console.log(`\ncalling ${prof.name} (confirms the Lexware API key works)…`);
  const r = await c.callTool({ name: prof.name, arguments: {} });
  console.log((r.content?.[0]?.text ?? JSON.stringify(r)).slice(0, 600));
}
await c.close();
console.log("\nOK ✅");
