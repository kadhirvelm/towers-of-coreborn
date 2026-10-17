/**
 * Because the service definitions extend "string", we need to remove them to get
 * strong type definition.
 */
export type RemoveExtendsString<Service> = {
  [Key in keyof Service as string extends Key ? never : Key]: Service[Key];
};
