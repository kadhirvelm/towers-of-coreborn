"use client";

import React, { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";

/**
 * Defers route content until hydration and mounts the global toast container.
 * @param children - Route content to render in the browser.
 * @returns The hydrated application shell.
 */
export const ClientGate = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (typeof window === "undefined" || !isClient) {
    return null;
  }

  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
};
