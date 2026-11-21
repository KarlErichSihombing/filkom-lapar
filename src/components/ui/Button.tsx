import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "inverted" | "outlined" | "danger";

const variants: Record<Variant, string> = {
    primary: "bg-primary-strong text-on-primary hover:brightness-110",
    secondary: "bg-primary-container text-primary-strong hover:brightness-95",
    inverted: "bg-inverted text-on-primary hover:brightness-125",
    outlined: "border border-outline text-on-surface hover:bg-surface-variant",
    danger: "bg-error text-on-primary hover:brightness-110",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 
font-label text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 
${variants[variant]} ${className}`}
            {...props}
        />
    );
}