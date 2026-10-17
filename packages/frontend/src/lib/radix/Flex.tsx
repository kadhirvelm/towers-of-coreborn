import {
  Flex as RadixComponent,
  FlexProps as RadixComponentProps,
} from "@radix-ui/themes";
import React from "react";

export type FlexProps = {
  flex?: string;
  ref?: React.Ref<HTMLDivElement>;
} & RadixComponentProps;

export const Flex = ({ flex, ...props }: FlexProps) => {
  return (
    <RadixComponent
      ref={props.ref}
      {...props}
      style={{ ...props.style, flex }}
    />
  );
};
