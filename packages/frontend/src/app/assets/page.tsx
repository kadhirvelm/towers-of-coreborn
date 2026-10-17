"use client";

import { Assets } from "@/components/assets/Assets";
import { ClientGate } from "@/lib/providers/ClientGate";

export default function Application() {
  return (
    <ClientGate>
      <Assets />
    </ClientGate>
  );
}
