import http from "node:http";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.join(__dirname, ".env"));

const port = Number(process.env.PORT ?? 5174);
const releaseVersion = process.env.SHIPBRAIN_RELEASE_TAG ?? process.env.RELEASE_VERSION ?? "release-pending";

function loadEnvFile(filePath) {
  try {
    const envText = fsSync.readFileSync(filePath, "utf8");
    for (const line of envText.split(/\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional; explicit shell env vars still work.
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body, null, 2));
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    const html = await fs.readFile(path.join(__dirname, "index.html"), "utf8");
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }

  if (request.method === "GET" && request.url === "/api/release") {
    sendJson(response, 200, {
      releaseVersion,
      repo: "JeevantheDev/shipbrain_sandbox",
      mode: "mock-cart-checkout"
    });
    return;
  }

  if (request.method === "POST" && request.url === "/api/trigger-incident") {
    const payload = JSON.parse(await readBody(request));
    if (payload.shouldTriggerIncident === false) {
      sendJson(response, 200, {
        outcome: "checkout_succeeded",
        releaseVersion: payload.releaseVersion ?? releaseVersion,
        message: "ShipBrain incident was not triggered because the network is healthy."
      });
      return;
    }

    const dedupKey = `shipbrain-sandbox-${payload.service ?? "checkout-api"}-${payload.environment ?? "sandbox"}`;

    const shipBrainApiUrl = process.env.SHIPBRAIN_API_URL;
    const shipBrainApiKey = process.env.SHIPBRAIN_API_KEY;
    const shipBrainWebhookUrl =
      process.env.SHIPBRAIN_INCIDENT_WEBHOOK_URL ??
      (shipBrainApiUrl ? `${shipBrainApiUrl.replace(/\/$/, "")}/api/webhooks/incidents` : null);

    if (!shipBrainWebhookUrl) {
      sendJson(response, 500, {
        error: "ShipBrain incident webhook is not configured.",
        detail: "Set SHIPBRAIN_API_URL or SHIPBRAIN_INCIDENT_WEBHOOK_URL during ShipBrain repo onboarding."
      });
      return;
    }

    const headers = { "content-type": "application/json" };
    if (shipBrainApiKey) {
      headers["Authorization"] = `Bearer ${shipBrainApiKey}`;
    }

    const shipBrainResponse = await fetch(shipBrainWebhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source: "cartlane-checkout",
        repo: payload.repo,
        environment: payload.environment,
        service: payload.service,
        severity: payload.severity,
        title: payload.title,
        logs: payload.logs,
        branch: payload.branch,
        commit: payload.commit,
        releaseVersion: payload.releaseVersion ?? releaseVersion,
        incidentId: dedupKey
      })
    }).catch((error) => ({
      ok: false,
      status: 0,
      json: async () => ({ error: error instanceof Error ? error.message : "ShipBrain webhook failed" })
    }));

    const shipBrainBody = await shipBrainResponse.json().catch(() => ({}));
    sendJson(response, shipBrainResponse.ok ? 202 : (shipBrainResponse.status || 500), {
      dedupKey,
      shipBrainStatus: shipBrainResponse.status,
      shipBrainBody,
      providerAccepted: shipBrainResponse.ok,
      body: shipBrainBody
    });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(port, () => {
  console.log(`ShipBrain sandbox app running at http://localhost:${port}`);
});
