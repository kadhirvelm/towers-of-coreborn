import { getRoot } from "../utils/getRoot";

export function cdDirectory(directory: string) {
  // Change the current working directory of the Node.js process
  const root = getRoot();
  if (directory === "toc-cli") {
    // biome-ignore lint/suspicious/noConsole: CLI needs to log
    console.log(`${root}/toc-cli`);
    return;
  }

  if (directory === "root") {
    // biome-ignore lint/suspicious/noConsole: CLI needs to log
    console.log(root);
    return;
  }

  // biome-ignore lint/suspicious/noConsole: CLI needs to log
  console.log(`${root}/packages/${directory}`);
}
