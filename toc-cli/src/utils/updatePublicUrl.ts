import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getRoot } from "./getRoot";
import { logColorMessage } from "./logColorMessage";

function resolveBackendUrl(
  environmentFile: Record<string, string>,
  ipAddress: string,
) {
  const backendUrl = environmentFile.BACKEND_API_URL;
  const isLocalBackend =
    backendUrl.includes("localhost") || backendUrl.includes("127.0.0.1");
  if (!isLocalBackend) {
    return backendUrl;
  }

  return `https://${ipAddress}:8080`;
}

export function updatePublicUrl(
  ipAddress: string,
  environmentFile: Record<string, string>,
) {
  const root = getRoot();

  // Replace the PUBLIC_URL in .env
  execSync(`sed -i.bak "s|^PUBLIC_URL=.*|PUBLIC_URL=${ipAddress}|" .env`, {
    cwd: root,
  });

  const backendUrl = resolveBackendUrl(environmentFile, ipAddress);
  execSync(
    `sed -i.bak "s|^BACKEND_API_URL=.*|BACKEND_API_URL=${backendUrl}|" .env`,
    {
      cwd: root,
    },
  );

  execSync("rm .env.bak", {
    cwd: root,
  });
}

export function updatePublicUrlJs(ipAddress: string) {
  // Check if packages/frontend/publicUrl.js exists, if not create it
  const root = getRoot();
  const publicUrlPath = join(root, "packages/frontend/publicUrl.js");
  if (!existsSync(publicUrlPath)) {
    writeFileSync(publicUrlPath, `export const PUBLIC_URL = "";\n`);
    logColorMessage("Created packages/frontend/publicUrl.js", "yellow");
  }

  // Replace the PUBLIC_URL in packages/frontend/publicUrl.js
  execSync(
    `sed -i.bak 's|^export const PUBLIC_URL =.*|export const PUBLIC_URL = "${ipAddress}";|' publicUrl.js && rm publicUrl.js.bak`,
    { cwd: `${getRoot()}/packages/frontend` },
  );
  logColorMessage(`Updated PUBLIC_URL in .env file to ${ipAddress}`, "yellow");
}
