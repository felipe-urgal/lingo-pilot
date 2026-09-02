import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingLabel?: string;
  variant?: ButtonVariant;
};

function buttonClassName(variant: ButtonVariant, className?: string) {
  return ["lp-button", `lp-button--${variant}`, className]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  children,
  className,
  disabled,
  isLoading = false,
  loadingLabel = "Carregando",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      className={buttonClassName(variant, className)}
      disabled={disabled || isLoading}
      type={type}
    >
      {isLoading ? <span aria-hidden="true" className="lp-spinner" /> : null}
      <span>{isLoading ? loadingLabel : children}</span>
    </button>
  );
}

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  "aria-label": string;
  children: ReactNode;
  variant?: ButtonVariant;
};

export function IconButton({
  "aria-label": ariaLabel,
  children,
  className,
  type = "button",
  variant = "secondary",
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      aria-label={ariaLabel}
      className={["lp-icon-button", `lp-icon-button--${variant}`, className]
        .filter(Boolean)
        .join(" ")}
      type={type}
    >
      {children}
    </button>
  );
}
