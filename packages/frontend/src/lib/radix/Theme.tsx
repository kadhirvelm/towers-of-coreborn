import {
  Theme as RadixTheme,
  type ThemeProps as RadixThemeProps,
} from "@radix-ui/themes";

export type ThemeProps = RadixThemeProps;

/**
 * App-wide Radix Theme wrapper with shared defaults (accent color, no background).
 * Use this instead of importing Theme from @radix-ui/themes so theme changes
 * (e.g. accentColor) are updated in one place across all layouts and nested themes.
 *
 * @param props - Radix Theme props; accentColor and hasBackground have app defaults
 * @param props.accentColor - Defaults to "gray"; override to change accent
 * @param props.hasBackground - Defaults to false; set true for a themed background
 */
export const Theme = ({
  accentColor = "gray",
  hasBackground = false,
  ...props
}: ThemeProps) => {
  return (
    <RadixTheme
      accentColor={accentColor}
      hasBackground={hasBackground}
      {...props}
    />
  );
};
