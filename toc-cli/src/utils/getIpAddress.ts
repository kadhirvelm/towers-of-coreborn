import { execSync } from "node:child_process";

export function getIpAddress() {
  // Run ifconfig and parse the output to find the first non-loopback IPv4 address
  const ifconfigOutput = execSync("ifconfig", { encoding: "utf-8" });
  // Match all IPv4 addresses (excluding 127.0.0.1)
  const matches = Array.from(
    ifconfigOutput.matchAll(/inet (?:addr:)?((?:\d{1,3}\.){3}\d{1,3})/g),
  )
    .map((m) => m[1])
    .filter((ip) => ip !== "127.0.0.1");
  if (matches.length === 0) {
    throw new Error("No non-loopback IPv4 address found");
  }

  const ipAddress = matches[0];
  return ipAddress.trim();
}
