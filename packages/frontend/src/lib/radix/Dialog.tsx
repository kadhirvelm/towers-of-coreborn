import { Dialog as RadixDialog, VisuallyHidden } from "@radix-ui/themes";
import clsx from "clsx";
import { XIcon } from "lucide-react";
import { Button } from "./Button";
import styles from "./Dialog.module.scss";
import { DisplayText } from "./DisplayText";
import { Flex } from "./Flex";
import { ensureBodyIsClickable } from "./utils/ensureBodyIsClickable";

export interface DialogProps {
  /**
   * When clicked, the dialog will be opened.
   */
  trigger?: React.ReactNode;
  /**
   * The class name of the dialog.
   */
  className?: string;
  /**
   * The content of the dialog.
   */
  content: React.ReactNode;
  /**
   * Whether the dialog is disabled.
   * @default false
   */
  disabled?: boolean;
  /**
   * The description of the dialog.
   */
  description?: React.ReactNode;
  /**
   * The title of the dialog.
   */
  title: string;
  /**
   * The function that's called when the dialog's open state is toggled.
   */
  onToggleOpen: (newOpenState: boolean) => void;
  /**
   * The current open state of the dialog.
   */
  isOpen: boolean;
  /**
   * The style of the dialog.
   */
  style?: React.CSSProperties;
  /**
   * Whether the dialog can be closed by clicking outside of it.
   * @default false
   */
  preventOverlayClose?: boolean;
  /**
   * The width of the dialog.
   */
  width?: string;
  /**
   * Whether to hide the X close button in the top-right corner.
   * @default false
   */
  hideCloseButton?: boolean;
}

export const Dialog = ({
  trigger,
  content,
  title,
  description,
  className,
  onToggleOpen,
  isOpen,
  style,
  preventOverlayClose = false,
  disabled,
  width,
  hideCloseButton = false,
}: DialogProps) => {
  const onLocalToggleOpen = (newState: boolean) => {
    onToggleOpen(newState);
    ensureBodyIsClickable(newState);
  };

  return (
    <RadixDialog.Root
      onOpenChange={onLocalToggleOpen}
      open={isOpen && !disabled}
    >
      {trigger !== undefined && (
        <RadixDialog.Trigger>{trigger}</RadixDialog.Trigger>
      )}
      <RadixDialog.Content
        className={clsx(styles.dialog, className)}
        maxWidth={width}
        onInteractOutside={(e) => {
          if (preventOverlayClose) {
            e.preventDefault();
          }
        }}
        style={style}
        width={width}
      >
        <Flex direction="column">
          <Flex align="center" justify="between">
            <DisplayText size="4" weight="bold">
              {title}
            </DisplayText>
            <VisuallyHidden>
              <RadixDialog.Title>{title}</RadixDialog.Title>
            </VisuallyHidden>
            {!hideCloseButton && (
              <Flex mb="1">
                <Button
                  className={styles.closeButton}
                  onClick={() => onLocalToggleOpen(false)}
                  type="button"
                  variant="ghost"
                >
                  <XIcon size={22} />
                </Button>
              </Flex>
            )}
          </Flex>
          {description && (
            <RadixDialog.Description>
              <DisplayText color="gray" size="2">
                {description}
              </DisplayText>
            </RadixDialog.Description>
          )}
        </Flex>
        {content}
      </RadixDialog.Content>
    </RadixDialog.Root>
  );
};
