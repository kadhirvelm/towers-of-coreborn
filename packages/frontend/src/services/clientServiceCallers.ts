import { useMemo } from "react";
import { getAvailableServiceCallers } from "./helpers/getServices";
import type { AvailableServiceCaller } from "./helpers/types";

/**
 * By having a browser wide cached callers object, we can avoid making multiple network calls to the same service.
 *
 * Though note, this is an app wide singleton for all of our service discovery, so be careful with how we use it.
 * Generally we should let the BE take the load, but if we're making dozens of calls for the same thing, we can intelligently
 * debounce the calls here on the client side.
 */
let browserWideCachedCallers: AvailableServiceCaller | null = null;

export function useClientServiceCallers({
  additionalHeaders,
}: {
  additionalHeaders?: Record<string, string>;
} = {}) {
  const serviceCallers = useMemo(() => {
    if (additionalHeaders != null) {
      return getAvailableServiceCallers(
        process.env.NEXT_PUBLIC_API_CLIENT_URL ?? "",
        additionalHeaders,
      );
    }

    if (browserWideCachedCallers == null) {
      browserWideCachedCallers = getAvailableServiceCallers(
        process.env.NEXT_PUBLIC_API_CLIENT_URL ?? "",
        additionalHeaders,
      );
    }

    return browserWideCachedCallers;
  }, [additionalHeaders]);

  return {
    clientServiceCallers: serviceCallers,
  };
}
