import { exec } from "node:child_process";
import { sleep } from "bun";
import { getIpAddress } from "../utils/getIpAddress";

async function checkFrontend(ipAddress: string) {
  return new Promise((resolve) => {
    const child = exec(
      `curl -s "https://${ipAddress}:3000" > /dev/null`,
      (error) => {
        if (resolved) return;
        clearTimeout(timeout);

        if (error) {
          resolve(false);
        } else {
          resolve(true);
        }

        resolved = true;
      },
    );

    let resolved = false;
    const timeout = setTimeout(() => {
      if (resolved) return;
      child.kill?.();
      resolve(false);
      resolved = true;
    }, 500);
  });
}

/**
 * These are exec instead of execSync because we don't want to block the main thread.
 */
export async function open(network?: boolean) {
  const ipAddress = network ? getIpAddress() : "localhost";

  while (!(await checkFrontend(ipAddress))) {
    sleep(500);
  }

  exec(
    `
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "https://${ipAddress}:3000"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open "https://${ipAddress}:3000"
    else
        echo "Unsupported OS for automatic browser opening"
    fi
    `,
  );
}
