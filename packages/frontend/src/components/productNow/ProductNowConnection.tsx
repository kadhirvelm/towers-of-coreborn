"use client";

import { isServiceError } from "@towers-of-coreborn/api";
import { DatabaseZap, Unplug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, Flex } from "@/lib/radix";
import { DisplayText } from "@/lib/radix/DisplayText";
import { useClientServiceCallers } from "@/services/clientServiceCallers";
import styles from "./ProductNowConnection.module.scss";

/**
 * Connect/disconnect control for the browser's ProductNow MCP session.
 * @returns A fixed-position ProductNow connection button
 */
export const ProductNowConnection = () => {
  const { clientServiceCallers } = useClientServiceCallers();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    clientServiceCallers.productNowMcp.getStatus().then((result) => {
      if (!isMounted) {
        return;
      }
      if (isServiceError(result)) {
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
      setErrorMessage(result.message);
      return;
    }
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
    <Flex className={styles.connection} direction="column" gap="2">
      <Button
        disabled={connected === null}
        onClick={connected ? disconnect : connect}
        size="2"
      >
        {connected ? <Unplug size={16} /> : <DatabaseZap size={16} />}
        {label}
      </Button>
      {errorMessage && (
        <DisplayText className={styles.error} size="1">
          {errorMessage}
        </DisplayText>
      )}
    </Flex>
  );
};
