"use client";

import { useState } from "react";
import { Button, Flex, TextArea } from "@/lib/radix";
import styles from "./Assets.module.scss";
import type { AssetClassFormCopy } from "./assetClasses/assetClassDefinition";

interface GenerateAssetFormProps {
  copy: AssetClassFormCopy;
  onSubmit: (prompt: string) => void;
}

/**
 * Prompt form shown in the generate dialog for any asset class. Owns its
 * prompt so the field resets when the dialog remounts.
 * @param copy - Label, placeholder, hint, and button text for the active asset class
 * @param onSubmit - Called with the trimmed prompt
 */
export function GenerateAssetForm({ copy, onSubmit }: GenerateAssetFormProps) {
  const [prompt, setPrompt] = useState("");
  const trimmedPrompt = prompt.trim();

  const handleSubmit = () => {
    if (trimmedPrompt === "") {
      return;
    }
    onSubmit(trimmedPrompt);
    setPrompt("");
  };

  return (
    <Flex className={styles.dialogForm}>
      <span className={styles.dialogLabel}>{copy.promptLabel}</span>
      <TextArea
        onChange={(event) => {
          setPrompt(event.target.value);
        }}
        placeholder={copy.placeholder}
        rows={4}
        value={prompt}
      />
      {copy.hint != null && (
        <span className={styles.dialogHint}>{copy.hint}</span>
      )}
      <Flex className={styles.dialogActions}>
        <Button disabled={trimmedPrompt === ""} onClick={handleSubmit}>
          {copy.submitLabel}
        </Button>
      </Flex>
    </Flex>
  );
}
