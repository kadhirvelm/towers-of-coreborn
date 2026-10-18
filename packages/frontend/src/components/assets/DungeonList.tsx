"use client";

import type {
  BattleBackgroundAsset,
  CardCharacterSetAsset,
  DungeonCharacter,
  DungeonGeneration,
  PlayableCardAsset,
  PlayableCardKind,
} from "@towers-of-coreborn/api";
import clsx from "clsx";
import { Flex } from "@/lib/radix";
import styles from "./Assets.module.scss";
import { type PendingJob, PendingJobCard } from "./PendingJobCard";

interface DungeonListProps {
  onDismissJob: (id: string) => void;
  onStopJob: (id: string) => void;
  pendingJobs: PendingJob[];
  results: readonly unknown[];
}

const KIND_LABELS: Record<PlayableCardKind, string> = {
  aether: "Aether",
  attack: "Attack",
  combo: "Combo",
  defend: "Defend",
  draw: "Draw",
};

/**
 * Dungeon workshop view: the running setup, then each finished setup from
 * this session. Rooms, characters, and cards are also stored in their own tabs.
 * @param pendingJobs - Dungeon generations still running or failed
 * @param results - Successful setups kept for this browser session
 * @param onDismissJob - Removes a failed job card
 * @param onStopJob - Stops a running generation
 */
export function DungeonList({
  onDismissJob,
  onStopJob,
  pendingJobs,
  results,
}: DungeonListProps) {
  const dungeons = results.flatMap((result) => {
    const dungeon = readDungeonGeneration(result);
    return dungeon === undefined ? [] : [dungeon];
  });
  const hasContent = pendingJobs.length > 0 || dungeons.length > 0;

  return (
    <Flex direction="column" gap="3" width="100%">
      <Flex className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Dungeons</span>
        {dungeons.length > 0 && (
          <span className={styles.assetCount}>{dungeons.length}</span>
        )}
      </Flex>

      {!hasContent && (
        <Flex className={styles.emptyState}>
          <span>No dungeons yet</span>
          <span className={styles.emptyStateHint}>
            describe a place to create its rooms, characters, and cards
          </span>
        </Flex>
      )}

      {hasContent && (
        <div className={styles.dungeonList}>
          {pendingJobs.map((job) => (
            <PendingJobCard
              job={job}
              key={job.id}
              onDismiss={() => onDismissJob(job.id)}
              onStop={() => onStopJob(job.id)}
            />
          ))}
          {dungeons.map((dungeon, index) => (
            <DungeonSetup dungeon={dungeon} key={dungeonKey(dungeon, index)} />
          ))}
        </div>
      )}
    </Flex>
  );
}

interface DungeonSetupProps {
  dungeon: DungeonGeneration;
}

/**
 * One finished dungeon: its rooms, then each character with that character's cards.
 * @param dungeon - Generated setup returned by the coordinator
 */
function DungeonSetup({ dungeon }: DungeonSetupProps) {
  return (
    <section className={styles.dungeonSetup}>
      <p className={styles.dungeonSummary}>{dungeon.summary}</p>
      <span className={styles.dungeonGroupLabel}>Rooms</span>
      <div className={styles.backgroundGrid}>
        {dungeon.backgrounds.map((background) => (
          <BackgroundPreview background={background} key={background.id} />
        ))}
      </div>
      {dungeon.characters.map((entry) => (
        <CharacterSetup entry={entry} key={entry.character.setId} />
      ))}
    </section>
  );
}

interface BackgroundPreviewProps {
  background: BattleBackgroundAsset;
}

/**
 * One generated battle room.
 * @param background - Stored background included in the dungeon
 */
function BackgroundPreview({ background }: BackgroundPreviewProps) {
  return (
    <article className={clsx(styles.backgroundCard, styles.dungeonStatic)}>
      {/* biome-ignore lint/performance/noImgElement: generated backend asset */}
      <img
        alt={background.title}
        className={styles.backgroundImage}
        src={background.imageUrl}
      />
      <span className={styles.backgroundTitle}>{background.title}</span>
      <span className={styles.backgroundDescription}>
        {background.description}
      </span>
    </article>
  );
}

interface CharacterSetupProps {
  entry: DungeonCharacter;
}

/**
 * One character and the cards created for them.
 * @param entry - Character portraits grouped with their cards
 */
function CharacterSetup({ entry }: CharacterSetupProps) {
  return (
    <article className={styles.dungeonCharacter}>
      <CharacterPreview character={entry.character} />
      <div className={styles.playableCardGrid}>
        {entry.cards.map((card) => (
          <CardPreview card={card} key={card.cardId} />
        ))}
      </div>
    </article>
  );
}

interface CharacterPreviewProps {
  character: CardCharacterSetAsset;
}

/**
 * Four portraits for one dungeon character.
 * @param character - Stored character set
 */
function CharacterPreview({ character }: CharacterPreviewProps) {
  return (
    <div className={clsx(styles.cardSet, styles.dungeonStatic)}>
      <span className={styles.cardSetPrompt}>{character.prompt}</span>
      <span className={styles.cardSetTheme}>{character.theme}</span>
      <div className={styles.cardLevelRow}>
        {character.levels.map((level) => (
          <div className={styles.cardLevel} key={level.level}>
            <div className={styles.cardPortraitFrame}>
              {/* biome-ignore lint/performance/noImgElement: generated backend asset */}
              <img
                alt={`${level.title}, level ${level.level}`}
                className={styles.cardPortrait}
                src={level.url}
              />
            </div>
            <span className={styles.cardLevelIndex}>Level {level.level}</span>
            <span className={styles.cardLevelTitle}>{level.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CardPreviewProps {
  card: PlayableCardAsset;
}

/**
 * One playable card created for a dungeon character.
 * @param card - Stored card
 */
function CardPreview({ card }: CardPreviewProps) {
  return (
    <article className={clsx(styles.playableCard, styles.dungeonStatic)}>
      {/* biome-ignore lint/performance/noImgElement: generated backend asset */}
      <img
        alt={card.name}
        className={styles.playableCardArt}
        src={card.imageUrl}
      />
      <span className={styles.playableCardBody}>
        <span className={styles.playableCardHeader}>
          <span className={styles.playableCardName}>{card.name}</span>
          <span className={styles.playableCardCost}>{formatCost(card)}</span>
        </span>
        <span className={styles.playableCardKind}>
          {KIND_LABELS[card.kind]}
        </span>
        {card.effects.map((effect) => (
          <span className={styles.playableCardEffect} key={effect.kind}>
            {effect.text}
          </span>
        ))}
        <span className={styles.playableCardDescription}>
          {card.description}
        </span>
      </span>
    </article>
  );
}

/**
 * @param value - Value retained from a generate call
 * @returns The dungeon setup when the payload has the expected shape
 */
function readDungeonGeneration(value: unknown): DungeonGeneration | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  if (
    !("backgrounds" in value) ||
    !("characters" in value) ||
    !("summary" in value)
  ) {
    return undefined;
  }

  const candidate = value as DungeonGeneration;
  if (
    !Array.isArray(candidate.backgrounds) ||
    !Array.isArray(candidate.characters) ||
    typeof candidate.summary !== "string"
  ) {
    return undefined;
  }
  return candidate;
}

/**
 * @param dungeon - Generated setup
 * @param index - Position among this session's results
 * @returns A stable key when the setup contains a stored asset id
 */
function dungeonKey(dungeon: DungeonGeneration, index: number): string {
  const backgroundId = dungeon.backgrounds[0]?.id;
  const characterId = dungeon.characters[0]?.character.setId;
  return backgroundId ?? characterId ?? `dungeon-${index}`;
}

/**
 * @param card - Card whose Aether cost is shown
 * @returns Cost label, singular when the card costs 1
 */
function formatCost(card: PlayableCardAsset): string {
  if (card.aetherCost === 1) {
    return "1 Aether";
  }
  return `${card.aetherCost} Aether`;
}
