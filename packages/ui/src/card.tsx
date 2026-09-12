import type { HTMLAttributes, ReactNode } from "react";
import styles from "./card.module.css";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  readonly children: ReactNode;
  readonly as?: "article" | "section" | "div";
}

export function Card({ children, className, as: Element = "article", ...props }: CardProps) {
  return <Element className={[styles.card, className].filter(Boolean).join(" ")} {...props}>{children}</Element>;
}
