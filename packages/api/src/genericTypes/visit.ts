/** Ensures we always handle the case where we didn't gracefully handle a new type */
export interface IMinimalVisitor {
  unknown: never;
}

/**
 * Takes in an object and returns all the possible value types of the object.
 */
export type GenericType<InputVisitor> = InputVisitor[keyof InputVisitor];

/**
 * The VisitorPattern is a visitor pattern that allows us to visit a generic type and return a value.
 */
export type VisitorPattern<InputVisitor> = {
  typeChecks: {
    [Key in keyof InputVisitor]: (
      possibleType: InputVisitor[Key] | GenericType<InputVisitor>,
    ) => possibleType is InputVisitor[Key];
  };
  visit: <ReturnValue>(
    value: GenericType<InputVisitor>,
    visitor: Visit<InputVisitor, ReturnValue>,
  ) => ReturnValue;
};

/**
 * The visit function is a visitor pattern that allows us to visit a generic type and return a value.
 */
export type Visit<PossibleTypes, ReturnValue> = {
  [key in keyof (PossibleTypes & IMinimalVisitor)]: (
    value: (PossibleTypes & IMinimalVisitor)[key],
  ) => ReturnValue;
};
