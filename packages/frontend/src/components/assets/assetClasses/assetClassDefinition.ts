import type { ServiceError } from "@towers-of-coreborn/api";
import type { ComponentType } from "react";
import type { AvailableServiceCaller } from "@/services/helpers/types";
import type { PendingJob } from "../PendingJobCard";

/** Text for the generate dialog's prompt form. */
export interface AssetClassFormCopy {
  hint?: string;
  placeholder: string;
  promptLabel: string;
  submitLabel: string;
}

/**
 * Props every asset-class gallery receives from the workshop page.
 * @property pendingJobs - This class's generations still running or failed
 * @property onDismissJob - Removes a failed job card
 * @property onStopJob - Asks the backend to stop a running generation
 * @property refreshKey - Changes after each successful generation; galleries refetch when it changes
 */
export interface AssetGalleryProps {
  onDismissJob: (id: string) => void;
  onStopJob: (id: string) => void;
  pendingJobs: PendingJob[];
  refreshKey: number;
}

/**
 * Everything the workshop page needs to show one asset class: its tab, its
 * generate dialog, how to call its `generate` endpoint, and its gallery.
 */
export interface AssetClassDefinition {
  dialogDescription: string;
  dialogTitle: string;
  form: AssetClassFormCopy;
  /**
   * Asks the backend to stop one in-flight generation.
   * @param callers - Generated service callers
   * @param generationId - Id passed to {@link AssetClassDefinition.generate}
   * @returns Whether the stop was recorded, or a service error
   */
  cancel: (
    callers: AvailableServiceCaller,
    generationId: string,
  ) => Promise<{ stopped: boolean } | ServiceError>;
  /**
   * Calls this class's `generate` endpoint.
   * @param callers - Generated service callers
   * @param prompt - Trimmed user prompt
   * @param generationId - Client id used to stop this run
   * @returns The stored asset, or a service error
   */
  generate: (
    callers: AvailableServiceCaller,
    prompt: string,
    generationId: string,
  ) => Promise<unknown | ServiceError>;
  generateButtonLabel: string;
  /** Lists stored assets for this class and renders them with pending jobs. */
  Gallery: ComponentType<AssetGalleryProps>;
  id: string;
  subtitle: string;
  tabLabel: string;
}
