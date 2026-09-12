import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

type Variant = "primary" | "secondary" | "quiet" | "light";

function classNames(variant: Variant, className?: string): string {
  return [styles.button, styles[variant], className].filter(Boolean).join(" ");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  readonly children: ReactNode;
}

export function Button({ variant = "primary", className, children, type = "button", ...props }: ButtonProps) {
  return <button className={classNames(variant, className)} type={type} {...props}>{children}</button>;
}

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  readonly variant?: Variant;
  readonly children: ReactNode;
}

export function ButtonLink({ variant = "primary", className, children, ...props }: ButtonLinkProps) {
  return <a className={classNames(variant, className)} {...props}>{children}</a>;
}
