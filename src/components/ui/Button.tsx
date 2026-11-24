import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "inverted" | "outlined" | "danger";
type Size = "md" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-primary-strong text-on-primary hover:brightness-110",
  secondary: "bg-primary-container text-primary-strong hover:brightness-95",
  inverted: "bg-inverted text-on-primary hover:brightness-125",
  outlined: "border border-outline text-on-surface hover:bg-surface-variant",
  danger: "bg-error text-on-primary hover:brightness-110",
};

const sizes: Record<Size, string> = {
  md: "px-6 py-3",
  sm: "px-4 py-2",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-label text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}