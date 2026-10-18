"use client";

import { useState } from "react";
import { copyText } from "@/lib/copyText";
import styles from "./Assets.module.scss";

interface CopyableErrorProps {
  message: string;
}

/**
 * Renders an error the user can select or copy.
 * @param message - Error text to show
 * @returns Selectable message with a copy button
 */
export function CopyableError({ message }: CopyableErrorProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className={styles.copyableError}>
      <pre className={styles.copyableErrorText}>{message}</pre>
      <button
        className={styles.copyableErrorCopy}
        onClick={() => {
          void copyText(message).then((didCopy) => {
            if (didCopy) {
              setCopied(true);
            }
          });
        }}
        type="button"
      >
        {copied ? "Copied" : "Copy error"}
      </button>
    </div>
  );
}
