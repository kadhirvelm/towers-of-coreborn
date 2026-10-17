/**
 * Boots the battle scene on `parent`. The canvas fills the parent and resizes with it.
 * @param parent - Element Phaser will attach the game to
 * @returns Handle to destroy the game instance
 */
export async function createDynamicGame(
  parent: HTMLElement,
): Promise<{ destroy: () => void }> {
  const Phaser = await import("phaser");
  const { createBattleSceneClass } = await import("./battleScene");

  const game = new Phaser.Game({
    backgroundColor: "#f3efe4",
    parent,
    scale: {
      height: "100%",
      mode: Phaser.Scale.RESIZE,
      parent,
      width: "100%",
    },
    scene: createBattleSceneClass(Phaser),
    type: Phaser.AUTO,
  });

  return {
    destroy: () => {
      game.destroy(true);
    },
  };
}
