export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const releaseVersion = process.env.SHIPBRAIN_RELEASE_TAG ?? process.env.RELEASE_VERSION ?? "release-pending";
  const payload = request.body ?? {};

  if (payload.shouldTriggerIncident === false) {
    response.status(200).json({
      outcome: "checkout_succeeded",
      releaseVersion: payload.releaseVersion ?? releaseVersion,
      message: "ShipBrain incident was not triggered because the network is healthy."
    });
    return;
  }

  const dedupKey = `shipbrain-sandbox-${payload.service ?? "checkout-api"}-${payload.environment ?? "sandbox"}-${releaseVersion}`;

  const shipBrainApiUrl = process.env.SHIPBRAIN_API_URL;
  const shipBrainApiKey = process.env.SHIPBRAIN_API_KEY;
  const shipBrainWebhookUrl =
    process.env.SHIPBRAIN_INCIDENT_WEBHOOK_URL ??
    (shipBrainApiUrl ? `${shipBrainApiUrl.replace(/\/$/, "")}/api/webhooks/incidents` : null);

  if (!shipBrainWebhookUrl) {
    response.status(500).json({
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

  response.status(shipBrainResponse.ok ? 202 : (shipBrainResponse.status || 500)).json({
    dedupKey,
    shipBrainStatus: shipBrainResponse.status,
    shipBrainBody,
    providerAccepted: shipBrainResponse.ok,
    body: shipBrainBody
  });
}
