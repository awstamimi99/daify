"use client";

import { useId, type InputHTMLAttributes } from "react";
import styles from "./text-field.module.css";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: string;
  readonly hint?: string;
}

export function TextField({ label, hint, id, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} aria-describedby={hintId} {...props} />
      {hint ? <small id={hintId}>{hint}</small> : null}
    </div>
  );
}
