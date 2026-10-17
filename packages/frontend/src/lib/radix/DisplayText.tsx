import {
  Text as RadixComponent,
  type TextProps as RadixComponentProps,
} from "@radix-ui/themes";

export type TextProps = RadixComponentProps;

/**
 * Renders Radix text and adds a title when the content is truncated.
 * @param props - Radix text properties
 * @returns Text with optional truncation affordance
 */
export const DisplayText = ({ truncate, ...props }: TextProps) => {
  if (!truncate) {
    return <RadixComponent {...props} />;
  }

  return (
    <RadixComponent
      {...props}
      title={props.title ?? props.children?.toString()}
      truncate={true}
    />
  );
};
