// Works for both string and numeric enums
export type EnumLike = Record<string, string | number>;

// Enum keys: exclude numeric reverse-mapping keys (e.g. "0", "1")
export type EnumKeys<E extends EnumLike> = Exclude<
  Extract<keyof E, string>,
  `${number}`
>;

// Enum values: values for the real (non-reverse) keys
export type EnumValues<E extends EnumLike> = E[EnumKeys<E>];
