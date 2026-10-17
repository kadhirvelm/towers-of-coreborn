import { describe, expect, test } from "bun:test";
import type { ServiceError } from "@towers-of-coreborn/api";
import {
  applyGenerationResult,
  completeAssetGenerationJob,
  createAssetGenerationJobState,
  dismissAssetGenerationJob,
  failAssetGenerationJob,
  jobsForAssetClass,
  refreshKeyForAssetClass,
  startAssetGenerationJob,
} from "../assetGenerationJobs";

const serviceError: ServiceError = {
  code: 500,
  message: "model down",
  path: "/card-characters/generate",
  type: "error",
};

describe("asset generation jobs", () => {
  test("keeps each class's jobs and refresh keys separate", () => {
    const started = [startOther("other-1"), startCard("card-1")].reduce(
      (state, update) => update(state),
      createAssetGenerationJobState(),
    );
    const finished = completeAssetGenerationJob(started, "other-1");

    expect(jobsForAssetClass(finished, "other-class")).toEqual([]);
    expect(jobsForAssetClass(finished, "card-characters")).toEqual([
      {
        assetClassId: "card-characters",
        error: null,
        id: "card-1",
        prompt: "a knight",
      },
    ]);
    expect(refreshKeyForAssetClass(finished, "other-class")).toBe(1);
    expect(refreshKeyForAssetClass(finished, "card-characters")).toBe(0);
  });

  test("treats a resolved service error as a failed job", () => {
    const started = startOther("other-1")(createAssetGenerationJobState());
    const failed = applyGenerationResult(started, {
      errorMessage: (error) => (error as ServiceError).message,
      jobId: "other-1",
      result: serviceError,
    });

    expect(jobsForAssetClass(failed, "other-class")[0]?.error).toBe(
      "model down",
    );
    expect(refreshKeyForAssetClass(failed, "other-class")).toBe(0);
  });

  test("refetches after a successful result and drops the job", () => {
    const started = startOther("other-1")(createAssetGenerationJobState());
    const finished = applyGenerationResult(started, {
      errorMessage: () => "unused",
      jobId: "other-1",
      result: { fileName: "a.png" },
    });

    expect(jobsForAssetClass(finished, "other-class")).toEqual([]);
    expect(refreshKeyForAssetClass(finished, "other-class")).toBe(1);
  });

  test("does not refetch a job that was already dismissed", () => {
    const started = startOther("other-1")(createAssetGenerationJobState());
    const dismissed = dismissAssetGenerationJob(started, "other-1");
    const finished = completeAssetGenerationJob(dismissed, "other-1");
    const failed = failAssetGenerationJob(dismissed, "other-1", "too late");

    expect(finished).toBe(dismissed);
    expect(failed).toBe(dismissed);
    expect(refreshKeyForAssetClass(finished, "other-class")).toBe(0);
  });
});

/**
 * @param id - Job id
 * @returns A state update that starts a job for a second asset class
 */
function startOther(id: string) {
  return (state: ReturnType<typeof createAssetGenerationJobState>) =>
    startAssetGenerationJob(state, {
      assetClassId: "other-class",
      id,
      prompt: "a knight",
    });
}

/**
 * @param id - Job id
 * @returns A state update that starts a card-character job
 */
function startCard(id: string) {
  return (state: ReturnType<typeof createAssetGenerationJobState>) =>
    startAssetGenerationJob(state, {
      assetClassId: "card-characters",
      id,
      prompt: "a knight",
    });
}
