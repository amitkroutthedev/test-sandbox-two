export default function handler(request, response) {
  response.status(200).json({
    releaseVersion: process.env.SHIPBRAIN_RELEASE_TAG ?? process.env.RELEASE_VERSION ?? "release-pending",
    repo: "JeevantheDev/shipbrain_sandbox",
    mode: "mock-cart-checkout"
  });
}
