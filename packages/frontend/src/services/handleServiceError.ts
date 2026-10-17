import { isServiceError, ServiceError } from "@towers-of-coreborn/api";
import React from "react";
import { toast } from "react-toastify";

const MAX_TOAST_HEIGHT_PX = 500;

async function handlePromise<T>(response: Promise<T> | T) {
  if (response instanceof Promise) {
    const finalResponse = await response;
    return finalResponse;
  }

  return response;
}

/**
 * Wraps error text in a scrollable container so long messages
 * do not blow out the toast height.
 * @param message - The error message to display
 * @returns A React element with overflow-y scroll capped at MAX_TOAST_HEIGHT_PX
 */
function ScrollableToastBody({ message }: { message: string }) {
  return React.createElement(
    "div",
    {
      style: {
        maxHeight: `${MAX_TOAST_HEIGHT_PX}px`,
        overflowY: "auto" as const,
        whiteSpace: "pre-wrap" as const,
        wordBreak: "break-word" as const,
      },
    },
    message,
  );
}

export async function handleServiceError<T>(
  response: Promise<T | ServiceError> | T | ServiceError,
): Promise<T | undefined> {
  const finalResponse = await handlePromise(response);

  if (isServiceError(finalResponse)) {
    // biome-ignore lint/suspicious/noConsole: Need to log the error to the console
    console.error(finalResponse);

    const shouldSuppressToast = finalResponse.code === 401;

    if (!shouldSuppressToast) {
      const text = `Something went wrong: ${finalResponse.message}`;
      toast.error(React.createElement(ScrollableToastBody, { message: text }));
    }

    return undefined;
  }

  return finalResponse;
}
