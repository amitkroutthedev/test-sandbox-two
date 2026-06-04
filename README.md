# ShipBrain Sandbox

This repo contains a tiny mock shopping cart app used to test ShipBrain workflows. It does not use a real database or process real payments; checkout only sends a realistic production incident payload.

## Production incident drill

Run the sandbox app:

```bash
SHIPBRAIN_API_URL="https://your-shipbrain-host" SHIPBRAIN_API_KEY="repo-api-key" RELEASE_VERSION="cart-local-dev" npm run dev
```

Open:

```text
http://localhost:5174
```

Click **Confirm checkout**.

Flow:

```text
Mock cart checkout -> ShipBrain /api/webhooks/incidents
```

ShipBrain requires this repo to be connected during onboarding before it accepts the production incident. The event includes the current release version so Incident Commander can connect the alert back to the PR, CI approval, deployment audit, and release tag.

## ShipBrain approved deployment

ShipBrain onboarding injects the required GitHub Actions secrets and opens the setup PR. Production deploys should be triggered from ShipBrain after the release gate is approved.

The deployed checkout is still mock-only. It serves the same cart UI plus endpoints for `/api/release` and `/api/trigger-incident`.
