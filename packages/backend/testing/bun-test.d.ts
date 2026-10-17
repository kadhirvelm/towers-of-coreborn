declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export namespace test {
    function only(name: string, fn: () => void | Promise<void>): void;
    function skip(name: string, fn: () => void | Promise<void>): void;
  }
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function expect(value: unknown): {
    toBeLessThan(expected: number): void;
    toHaveLength(expected: number): void;
    toBe(expected: unknown | typeof expect.any): void;
    toEqual(expected: unknown | typeof expect.any): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toThrow(): void;
    toMatchSnapshot(): void;
    toContainEqual(expected: unknown): void;
    toContain(expected: unknown): void;
    toHaveBeenCalledTimes(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeDefined(): void;
    rejects: {
      toThrow(expected: unknown | typeof expect.any): void;
    };
    not: {
      toBe(expected: unknown | typeof expect.any): void;
      toEqual(expected: unknown | typeof expect.any): void;
      toBeTruthy(): void;
      toBeFalsy(): void;
      toBeNull(): void;
      toBeUndefined(): void;
      toThrow(): void;
      toMatchSnapshot(): void;
      toContain(expected: unknown): void;
      toBeDefined(): void;
      toBeLessThan(expected: number): void;
      toHaveLength(expected: number): void;
    };
  };
  export namespace expect {
    function any(value: unknown): void;
  }
}
