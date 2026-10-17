"use client";

import clsx from "clsx";
import { useState } from "react";
import { Button, Dialog, Flex } from "@/lib/radix";
import styles from "./Assets.module.scss";
import type { AssetClassDefinition } from "./assetClasses/assetClassDefinition";
import { ASSET_CLASSES } from "./assetClasses/assetClassRegistry";
import { GenerateAssetForm } from "./GenerateAssetForm";
import { useAssetGenerationJobs } from "./useAssetGenerationJobs";

/**
 * Blueprint workshop. Each registered asset class gets a tab, its own
 * generate dialog, and its own gallery.
 */
export function Assets() {
  const [activeClassId, setActiveClassId] = useState(ASSET_CLASSES[0]?.id);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { dismissJob, getJobsForClass, getRefreshKey, startJob, stopJob } =
    useAssetGenerationJobs();

  const activeClass =
    ASSET_CLASSES.find((assetClass) => assetClass.id === activeClassId) ??
    ASSET_CLASSES[0];
  if (activeClass === undefined) {
    return null;
  }

  const activeJobs = getJobsForClass(activeClass.id);
  const runningCount = activeJobs.filter((job) => job.error === null).length;
  const { Gallery } = activeClass;

  const handleSelectClass = (assetClassId: string) => {
    setActiveClassId(assetClassId);
    setIsDialogOpen(false);
  };

  const handleGenerate = (prompt: string) => {
    startJob(activeClass, prompt);
    setIsDialogOpen(false);
  };

  return (
    <Flex className={styles.pageWrapper}>
      <Flex className={styles.topBar}>
        <Flex className={styles.titleGroup}>
          <span className={styles.pageTitle}>Blueprint Workshop</span>
          <span className={styles.pageSubtitle}>{activeClass.subtitle}</span>
        </Flex>

        <Flex className={styles.workshopActions}>
          <AssetClassTabs
            activeClassId={activeClass.id}
            onSelect={handleSelectClass}
          />
          <Dialog
            content={
              <GenerateAssetForm
                copy={activeClass.form}
                onSubmit={handleGenerate}
              />
            }
            description={activeClass.dialogDescription}
            isOpen={isDialogOpen}
            onToggleOpen={setIsDialogOpen}
            title={activeClass.dialogTitle}
            trigger={
              <Button size="2">
                {getGenerateButtonLabel(activeClass, runningCount)}
              </Button>
            }
            width="480px"
          />
        </Flex>
      </Flex>

      <Gallery
        key={activeClass.id}
        onDismissJob={dismissJob}
        onStopJob={(jobId) => stopJob(activeClass, jobId)}
        pendingJobs={activeJobs}
        refreshKey={getRefreshKey(activeClass.id)}
      />
    </Flex>
  );
}

interface AssetClassTabsProps {
  activeClassId: string;
  onSelect: (assetClassId: string) => void;
}

/**
 * One tab per registered asset class.
 * @param activeClassId - Highlighted tab
 * @param onSelect - Called with the clicked class id
 */
function AssetClassTabs({ activeClassId, onSelect }: AssetClassTabsProps) {
  return (
    <div className={styles.pathSwitcher}>
      {ASSET_CLASSES.map((assetClass) => (
        <button
          className={clsx(
            styles.pathOption,
            assetClass.id === activeClassId && styles.pathOptionActive,
          )}
          key={assetClass.id}
          onClick={() => onSelect(assetClass.id)}
          type="button"
        >
          {assetClass.tabLabel}
        </button>
      ))}
    </div>
  );
}

/**
 * @param assetClass - Active asset class
 * @param runningCount - Jobs still running for that class
 * @returns Label for the generate button
 */
function getGenerateButtonLabel(
  assetClass: AssetClassDefinition,
  runningCount: number,
): string {
  if (runningCount > 0) {
    return `+ Generate (${runningCount} running)`;
  }
  return assetClass.generateButtonLabel;
}
