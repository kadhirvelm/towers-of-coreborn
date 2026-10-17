import { TextArea as RadixComponent } from "@radix-ui/themes";

export type TextAreaProps = {
  ref?: React.Ref<HTMLTextAreaElement>;
} & React.ComponentProps<typeof RadixComponent>;

export const TextArea = ({ ref, style, ...props }: TextAreaProps) => {
  return (
    <RadixComponent ref={ref} style={{ width: "100%", ...style }} {...props} />
  );
};
