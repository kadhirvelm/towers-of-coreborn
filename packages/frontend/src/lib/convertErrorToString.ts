function getOwnProperties(object: object): string {
  const outputObject: { [key: string]: unknown } = {};

  for (const key in object) {
    if (!Object.hasOwn(object, key)) {
      continue;
    }

    // biome-ignore lint/suspicious/noExplicitAny: this is a utility function for any types
    outputObject[key] = (object as any)[key];
  }

  return JSON.stringify(outputObject);
}

// biome-ignore lint/suspicious/noExplicitAny: this is a utility function for any types
export function convertErrorToString(error: any): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error instanceof Object) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") {
      return message;
    }
    return getOwnProperties(error);
  }

  return `Unknown error type: ${error}`;
}
