import type { InputHTMLAttributes, ReactNode } from "react";

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  /** Ikon di kiri kolom */
  icon?: ReactNode;
  /** Elemen di kanan kolom (mis. tombol mata) */
  trailing?: ReactNode;
  /** Elemen di kanan label (mis. tautan) */
  labelRight?: ReactNode;
};

export function Field({
  label,
  id,
  icon,
  trailing,
  labelRight,
  className = "",
  ...props
}: FieldProps) {
  const inputId = id ?? props.name;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-on-surface-muted"
        >
          {label}
        </label>
        {labelRight}
      </div>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-2xl bg-surface-variant/60 py-3 text-sm text-on-surface placeholder:text-outline ${
            icon ? "pl-11" : "pl-4"
          } ${trailing ? "pr-12" : "pr-4"} ${className}`}
          {...props}
        />
        {trailing && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            {trailing}
          </span>
        )}
      </div>
    </div>
  );
}