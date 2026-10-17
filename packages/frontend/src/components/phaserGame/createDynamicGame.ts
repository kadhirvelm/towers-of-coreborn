/**
 * Boots an empty Phaser game attached to `parent`. The canvas fills the parent
 * and resizes with it. Scene content belongs in a later scene, not here.
 * @param parent - Element Phaser will attach the game to
 * @returns Handle to destroy the game instance
 */
export async function createDynamicGame(
  parent: HTMLElement,
): Promise<{ destroy: () => void }> {
  const Phaser = await import("phaser");

  class MainScene extends Phaser.Scene {
    public constructor() {
      super({ key: "MainScene" });
    }
  }

  const game = new Phaser.Game({
    backgroundColor: "#ffffff",
    parent,
    scale: {
      height: "100%",
      mode: Phaser.Scale.RESIZE,
      parent,
      width: "100%",
    },
    scene: MainScene,
    type: Phaser.AUTO,
  });

  return {
    destroy: () => {
      game.destroy(true);
    },
  };
}
