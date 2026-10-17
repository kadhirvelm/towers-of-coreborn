"use client";

import { Entry } from "@/components/Entry";
import { ClientGate } from "@/lib/providers/ClientGate";

export default function Application() {
  return (
    <ClientGate>
      <Entry />
    </ClientGate>
  );
}
