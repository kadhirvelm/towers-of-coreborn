import { isServiceError } from "@towers-of-coreborn/api";

/** A generation request that is still running, or that failed and has not been dismissed. */
export interface PendingJob {
  error: string | null;
  id: string;
  prompt: string;
}

/** A pending job tagged with the asset class that owns it. */
interface AssetGenerationJob extends PendingJob {
  assetClassId: string;
}

/** In-flight jobs and how many times each class's gallery should refetch. */
export interface AssetGenerationJobState {
  jobs: AssetGenerationJob[];
  refreshKeys: Record<string, number>;
}

/**
 * @returns Empty job state
 */
export function createAssetGenerationJobState(): AssetGenerationJobState {
  return { jobs: [], refreshKeys: {} };
}

/**
 * Records a generation that has just been sent.
 * @param state - Current jobs
 * @param job - The new request, without an error yet
 * @returns State that includes the running job
 */
export function startAssetGenerationJob(
  state: AssetGenerationJobState,
  job: { assetClassId: string; id: string; prompt: string },
): AssetGenerationJobState {
  return {
    ...state,
    jobs: [
      ...state.jobs,
      {
        assetClassId: job.assetClassId,
        error: null,
        id: job.id,
        prompt: job.prompt,
      },
    ],
  };
}

/**
 * Drops a finished job and asks its class's gallery to refetch.
 * A job that was already removed does not change the refresh key.
 * @param state - Current jobs
 * @param jobId - Job that succeeded
 * @returns State without that job, with its class's refresh key incremented
 */
export function completeAssetGenerationJob(
  state: AssetGenerationJobState,
  jobId: string,
): AssetGenerationJobState {
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (job === undefined) {
    return state;
  }

  return {
    jobs: state.jobs.filter((entry) => entry.id !== jobId),
    refreshKeys: {
      ...state.refreshKeys,
      [job.assetClassId]: (state.refreshKeys[job.assetClassId] ?? 0) + 1,
    },
  };
}

/**
 * Marks a job as failed so the gallery can show the error.
 * @param state - Current jobs
 * @param jobId - Job that failed
 * @param message - Message to show on the job card
 * @returns State with that job's error set, or the same state when the job is gone
 */
export function failAssetGenerationJob(
  state: AssetGenerationJobState,
  jobId: string,
  message: string,
): AssetGenerationJobState {
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (job === undefined) {
    return state;
  }

  return {
    ...state,
    jobs: state.jobs.map((entry) =>
      entry.id === jobId ? { ...entry, error: message } : entry,
    ),
  };
}

/**
 * Removes a job the user dismissed.
 * @param state - Current jobs
 * @param jobId - Job to remove
 * @returns State without that job
 */
export function dismissAssetGenerationJob(
  state: AssetGenerationJobState,
  jobId: string,
): AssetGenerationJobState {
  return {
    ...state,
    jobs: state.jobs.filter((entry) => entry.id !== jobId),
  };
}

/**
 * Applies a resolved `generate` call. Service callers resolve with a service
 * error object instead of rejecting, so a resolved error is still a failure.
 * @param state - Current jobs
 * @param input - The job id, the resolved value, and how to turn an error into text
 * @returns Completed state, or failed state when the result is a service error
 */
export function applyGenerationResult(
  state: AssetGenerationJobState,
  input: {
    errorMessage: (error: unknown) => string;
    jobId: string;
    result: unknown;
  },
): AssetGenerationJobState {
  if (isServiceError(input.result)) {
    return failAssetGenerationJob(
      state,
      input.jobId,
      input.errorMessage(input.result),
    );
  }
  return completeAssetGenerationJob(state, input.jobId);
}

/**
 * @param state - Current jobs
 * @param assetClassId - Asset class to filter by
 * @returns That class's running and failed jobs
 */
export function jobsForAssetClass(
  state: AssetGenerationJobState,
  assetClassId: string,
): PendingJob[] {
  return state.jobs.filter((job) => job.assetClassId === assetClassId);
}

/**
 * @param state - Current jobs
 * @param assetClassId - Asset class to look up
 * @returns How many times that class's gallery should have refetched
 */
export function refreshKeyForAssetClass(
  state: AssetGenerationJobState,
  assetClassId: string,
): number {
  return state.refreshKeys[assetClassId] ?? 0;
}
