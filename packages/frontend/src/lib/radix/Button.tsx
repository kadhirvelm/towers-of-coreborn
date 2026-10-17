import {
  Button as RadixComponent,
  ButtonProps as RadixComponentProps,
} from "@radix-ui/themes";
import clsx from "clsx";
import styles from "./Button.module.scss";

export type ButtonProps = RadixComponentProps;

export const Button = ({ ...props }: ButtonProps) => {
  return (
    <RadixComponent
      {...props}
      className={clsx(styles.button, props.className)}
    />
  );
};
