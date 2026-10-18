import { isGenerationCancelled, isServiceError } from "@towers-of-coreborn/api";

/** A generation request that is still running, or that failed and has not been dismissed. */
export interface PendingJob {
  error: string | null;
  id: string;
  prompt: string;
  /** True after the user asks this run to stop, until it settles */
  stopping: boolean;
}

/** A pending job tagged with the asset class that owns it. */
interface AssetGenerationJob extends PendingJob {
  assetClassId: string;
}

/** In-flight jobs, gallery refresh counts, and results kept for this session. */
export interface AssetGenerationJobState {
  jobs: AssetGenerationJob[];
  refreshKeys: Record<string, number>;
  /** Successful generate payloads, newest first, for classes that display them directly. */
  results: Record<string, unknown[]>;
}

/**
 * @returns Empty job state
 */
export function createAssetGenerationJobState(): AssetGenerationJobState {
  return { jobs: [], refreshKeys: {}, results: {} };
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
        stopping: false,
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
    results: state.results,
  };
}

/**
 * Marks a running job as waiting for the backend to stop.
 * A missing job, or one that already failed, is left alone.
 * @param state - Current jobs
 * @param jobId - Job the user asked to stop
 * @returns State with that job's stopping flag set
 */
export function markAssetGenerationJobStopping(
  state: AssetGenerationJobState,
  jobId: string,
): AssetGenerationJobState {
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (job === undefined || job.error !== null) {
    return state;
  }

  return {
    ...state,
    jobs: state.jobs.map((entry) =>
      entry.id === jobId ? { ...entry, stopping: true } : entry,
    ),
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
    /** Other galleries that should refetch after this generation succeeds. */
    refreshClassIds?: readonly string[];
    /** Keeps the payload for a gallery that has no stored list of its own. */
    rememberResult?: boolean;
    result: unknown;
  },
): AssetGenerationJobState {
  if (isGenerationCancelled(input.result)) {
    return dismissAssetGenerationJob(state, input.jobId);
  }
  if (isServiceError(input.result)) {
    const job = state.jobs.find((entry) => entry.id === input.jobId);
    if (job?.stopping === true) {
      return dismissAssetGenerationJob(state, input.jobId);
    }
    return failAssetGenerationJob(
      state,
      input.jobId,
      input.errorMessage(input.result),
    );
  }

  const job = state.jobs.find((entry) => entry.id === input.jobId);
  const completed = completeAssetGenerationJob(state, input.jobId);
  if (job === undefined) {
    return completed;
  }

  const remembered = rememberGenerationResult(
    completed,
    job.assetClassId,
    input.result,
    input.rememberResult === true,
  );
  return refreshAssetClasses(remembered, input.refreshClassIds ?? []);
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

/**
 * @param state - Current jobs
 * @param assetClassId - Asset class to look up
 * @returns Successful results kept for that class, newest first
 */
export function resultsForAssetClass(
  state: AssetGenerationJobState,
  assetClassId: string,
): readonly unknown[] {
  return state.results[assetClassId] ?? [];
}

/**
 * Stores one successful payload when the class displays it directly.
 * @param state - Jobs after the running entry was removed
 * @param assetClassId - Class that produced the payload
 * @param result - Successful generate response
 * @param remember - Whether this class keeps its responses
 * @returns State with the result prepended, or the same completed state
 */
function rememberGenerationResult(
  state: AssetGenerationJobState,
  assetClassId: string,
  result: unknown,
  remember: boolean,
): AssetGenerationJobState {
  if (!remember) {
    return state;
  }

  return {
    ...state,
    results: {
      ...state.results,
      [assetClassId]: [result, ...(state.results[assetClassId] ?? [])],
    },
  };
}

/**
 * Asks additional galleries to refetch.
 * @param state - Current jobs
 * @param assetClassIds - Classes whose stored assets may have changed
 * @returns State with those refresh keys incremented
 */
function refreshAssetClasses(
  state: AssetGenerationJobState,
  assetClassIds: readonly string[],
): AssetGenerationJobState {
  if (assetClassIds.length === 0) {
    return state;
  }

  const refreshKeys = { ...state.refreshKeys };
  for (const assetClassId of assetClassIds) {
    refreshKeys[assetClassId] = (refreshKeys[assetClassId] ?? 0) + 1;
  }
  return { ...state, refreshKeys };
}
