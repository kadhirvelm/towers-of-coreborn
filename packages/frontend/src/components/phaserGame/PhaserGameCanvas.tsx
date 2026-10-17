"use client";

import clsx from "clsx";
import { useEffect, useRef } from "react";
import { createDynamicGame } from "./createDynamicGame";
import styles from "./phaserGameCanvas.module.scss";

type PhaserGameCanvasProps = {
  className?: string;
};

/**
 * Client-only mount for a Phaser game canvas that fills the viewport.
 * @param className - Optional class name merged onto the game container
 */
export const PhaserGameCanvas = ({ className }: PhaserGameCanvasProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) {
      return;
    }
    let cancelled = false;
    let destroy: (() => void) | undefined;
    void (async () => {
      const { destroy: destroyGame } = await createDynamicGame(el);
      if (cancelled) {
        destroyGame();
        return;
      }
      destroy = destroyGame;
    })();

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, []);

  return (
    <div className={clsx(styles.layout, className)}>
      <div
        aria-label="Game view"
        className={styles.gameMount}
        ref={parentRef}
        role="application"
      />
    </div>
  );
};
