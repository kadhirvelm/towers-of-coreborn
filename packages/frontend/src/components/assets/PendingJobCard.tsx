"use client";

import clsx from "clsx";
import styles from "./Assets.module.scss";
import type { PendingJob } from "./assetGenerationJobs";

export type { PendingJob } from "./assetGenerationJobs";

interface PendingJobCardProps {
  job: PendingJob;
  onDismiss: () => void;
}

/**
 * Renders a pending generation card — pulsing while in progress, red on failure.
 * @param job - The generation job to display
 * @param onDismiss - Called when the user dismisses a failed job
 */
export function PendingJobCard({ job, onDismiss }: PendingJobCardProps) {
  if (job.error !== null) {
    return (
      <div className={clsx(styles.pendingCard, styles.pendingCardFailed)}>
        <span className={styles.pendingStatusLabel}>Failed</span>
        <span className={styles.pendingPrompt}>{job.prompt}</span>
        <span className={styles.pendingErrorMsg}>{job.error}</span>
        <button
          className={styles.pendingDismiss}
          onClick={onDismiss}
          type="button"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pendingCard}>
      <div className={styles.pendingSpinner} />
      <span className={styles.pendingStatusLabel}>Generating…</span>
      <span className={styles.pendingPrompt}>{job.prompt}</span>
    </div>
  );
}
