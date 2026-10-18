"use client";

import { isServiceError } from "@towers-of-coreborn/api";
import { useCallback, useState } from "react";
import { convertErrorToString } from "@/lib/convertErrorToString";
import { useClientServiceCallers } from "@/services/clientServiceCallers";
import type { AssetClassDefinition } from "./assetClasses/assetClassDefinition";
import {
  applyGenerationResult,
  createAssetGenerationJobState,
  dismissAssetGenerationJob,
  failAssetGenerationJob,
  jobsForAssetClass,
  markAssetGenerationJobStopping,
  refreshKeyForAssetClass,
  resultsForAssetClass,
  startAssetGenerationJob,
} from "./assetGenerationJobs";
import type { PendingJob } from "./PendingJobCard";

/**
 * Tracks generation requests across every asset class. Several jobs can run
 * at once; each finished job bumps its class's refresh key so the gallery refetches.
 * @returns Job lists, refresh keys, retained results, and actions to start, stop, or dismiss a job
 */
export function useAssetGenerationJobs() {
  const { clientServiceCallers } = useClientServiceCallers();
  const [state, setState] = useState(createAssetGenerationJobState);

  const dismissJob = useCallback((id: string) => {
    setState((previous) => dismissAssetGenerationJob(previous, id));
  }, []);

  const startJob = useCallback(
    (assetClass: AssetClassDefinition, prompt: string) => {
      const id = crypto.randomUUID();
      setState((previous) =>
        startAssetGenerationJob(previous, {
          assetClassId: assetClass.id,
          id,
          prompt,
        }),
      );

      assetClass
        .generate(clientServiceCallers, prompt, id)
        .then((result) => {
          setState((previous) =>
            applyGenerationResult(previous, {
              errorMessage: convertErrorToString,
              jobId: id,
              refreshClassIds: assetClass.refreshClassIds,
              rememberResult: assetClass.remembersResults,
              result,
            }),
          );
        })
        .catch((error: unknown) => {
          setState((previous) => {
            const job = previous.jobs.find((entry) => entry.id === id);
            if (job?.stopping === true) {
              return dismissAssetGenerationJob(previous, id);
            }
            return failAssetGenerationJob(
              previous,
              id,
              convertErrorToString(error),
            );
          });
        });
    },
    [clientServiceCallers],
  );

  const stopJob = useCallback(
    (assetClass: AssetClassDefinition, jobId: string) => {
      setState((previous) => markAssetGenerationJobStopping(previous, jobId));
      assetClass.cancel(clientServiceCallers, jobId).then((result) => {
        if (!isServiceError(result)) {
          return;
        }
        setState((previous) =>
          failAssetGenerationJob(previous, jobId, convertErrorToString(result)),
        );
      });
    },
    [clientServiceCallers],
  );

  /**
   * @param assetClassId - Asset class to filter by
   * @returns That class's running and failed jobs
   */
  const getJobsForClass = (assetClassId: string): PendingJob[] =>
    jobsForAssetClass(state, assetClassId);

  /**
   * @param assetClassId - Asset class to look up
   * @returns How many times that class's gallery should have refetched
   */
  const getRefreshKey = (assetClassId: string): number =>
    refreshKeyForAssetClass(state, assetClassId);

  /**
   * @param assetClassId - Asset class to look up
   * @returns Successful results kept for that class during this session
   */
  const getResultsForClass = (assetClassId: string): readonly unknown[] =>
    resultsForAssetClass(state, assetClassId);

  return {
    dismissJob,
    getJobsForClass,
    getRefreshKey,
    getResultsForClass,
    startJob,
    stopJob,
  };
}
