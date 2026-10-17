import { PhaserGameCanvas } from "@/components/phaserGame/PhaserGameCanvas";
import { ProductNowConnection } from "@/components/productNow/ProductNowConnection";

/**
 * App shell for the home route.
 */
export const Entry = () => {
  return (
    <>
      <PhaserGameCanvas />
      <ProductNowConnection />
    </>
  );
};
