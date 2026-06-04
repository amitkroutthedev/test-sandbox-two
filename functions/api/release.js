export async function onRequestGet(context) {
  const { env } = context;
  const releaseVersion = env.SHIPBRAIN_RELEASE_TAG ?? env.RELEASE_VERSION ?? "release-pending";
  return new Response(JSON.stringify({
    releaseVersion,
    repo: "JeevantheDev/shipbrain_sandbox",
    mode: "mock-cart-checkout"
  }, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
