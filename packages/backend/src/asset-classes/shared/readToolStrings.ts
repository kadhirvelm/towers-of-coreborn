import { InternalServerErrorException } from "@nestjs/common";

/**
 * String fields pulled out of a tool result. Accessing a requested key is a string
 * because every key was checked before the object is returned.
 */
type RequiredStrings<Key extends string> = {
  [Field in Key]: string;
};

/**
 * Reads non-empty string fields from a Mastra tool result.
 * @param rawResult - Value the tool returned
 * @param fields - Field names that must be non-empty strings
 * @param failureMessage - Error used when the result is missing or a field is unusable
 * @returns The requested fields
 * @throws InternalServerErrorException when the result is not an object or a field is missing
 */
export function readToolStrings<const Field extends string>(
  rawResult: unknown,
  fields: readonly Field[],
  failureMessage: string,
): RequiredStrings<Field> {
  if (typeof rawResult !== "object" || rawResult === null) {
    throw new InternalServerErrorException(failureMessage);
  }

  const source = rawResult as Record<string, unknown>;
  const parsed = {} as RequiredStrings<Field>;

  for (const field of fields) {
    const value = source[field];
    if (typeof value !== "string" || value.trim() === "") {
      throw new InternalServerErrorException(failureMessage);
    }
    parsed[field] = value;
  }

  return parsed;
}
