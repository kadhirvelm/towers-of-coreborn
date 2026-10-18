"use client";

import { isServiceError } from "@towers-of-coreborn/api";
import clsx from "clsx";
import { DatabaseZap, Unplug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { copyText } from "@/lib/copyText";
import { Button, Flex } from "@/lib/radix";
import { useClientServiceCallers } from "@/services/clientServiceCallers";
import styles from "./ProductNowConnection.module.scss";

interface ProductNowConnectionProps {
  /** `fixed` floats over the page. `inline` sits in the surrounding layout. */
  placement?: "fixed" | "inline";
}

/**
 * Connect/disconnect control for the browser's ProductNow MCP session.
 * @param placement - Where the control sits. Defaults to a fixed overlay
 * @returns A ProductNow connection button
 */
export const ProductNowConnection = ({
  placement = "fixed",
}: ProductNowConnectionProps) => {
  const { clientServiceCallers } = useClientServiceCallers();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCopied, setErrorCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    clientServiceCallers.productNowMcp.getStatus().then((result) => {
      if (!isMounted) {
        return;
      }
      if (isServiceError(result)) {
        setErrorCopied(false);
        setErrorMessage(result.message);
        setConnected(false);
        return;
      }
      setConnected(result.connected);
    });
    return () => {
      isMounted = false;
    };
  }, [clientServiceCallers]);

  const connect = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_CLIENT_URL ?? "";
    window.location.assign(`${apiUrl}/productnow-mcp/oauth/connect`);
  }, []);

  const disconnect = useCallback(async () => {
    const result = await clientServiceCallers.productNowMcp.disconnect();
    if (isServiceError(result)) {
      setErrorCopied(false);
      setErrorMessage(result.message);
      return;
    }
    setErrorCopied(false);
    setErrorMessage(null);
    setConnected(result.connected);
  }, [clientServiceCallers]);

  let label = "Connect ProductNow";
  if (connected === null) {
    label = "Checking ProductNow";
  }
  if (connected === true) {
    label = "Disconnect ProductNow";
  }

  return (
    <Flex
      className={clsx(
        styles.connection,
        placement === "inline" && styles.inline,
      )}
      direction="column"
      gap="2"
    >
      <Button
        disabled={connected === null}
        onClick={connected ? disconnect : connect}
        size="2"
      >
        {connected ? <Unplug size={16} /> : <DatabaseZap size={16} />}
        {label}
      </Button>
      {errorMessage && (
        <div className={styles.error}>
          <pre className={styles.errorText}>{errorMessage}</pre>
          <button
            className={styles.errorCopy}
            onClick={() => {
              void copyText(errorMessage).then((didCopy) => {
                if (didCopy) {
                  setErrorCopied(true);
                }
              });
            }}
            type="button"
          >
            {errorCopied ? "Copied" : "Copy error"}
          </button>
        </div>
      )}
    </Flex>
  );
};
