import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const releaseVersion = process.env.SHIPBRAIN_RELEASE_TAG ?? process.env.RELEASE_VERSION ?? "release-pending";

async function main() {
  await fs.mkdir("dist", { recursive: true });

  // Copy and patch index.html
  let html = await fs.readFile("index.html", "utf8");
  html = html.replace(/let releaseVersion = "[^"]*";/, `let releaseVersion = "${releaseVersion}";`);
  await fs.writeFile("dist/index.html", html, "utf8");
  await fs.writeFile(
    "dist/release.json",
    JSON.stringify({
      releaseVersion,
      repo: "JeevantheDev/shipbrain_sandbox",
      mode: "mock-cart-checkout",
      generatedAt: new Date().toISOString()
    }, null, 2),
    "utf8"
  );

  console.log(`Build completed successfully. Release version: ${releaseVersion}`);
}

main().catch(console.error);
