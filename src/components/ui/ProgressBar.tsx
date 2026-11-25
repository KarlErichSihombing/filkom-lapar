type Color = "primary" | "secondary" | "tertiary";

const fills: Record<Color, string> = {
    primary: "bg-primary-strong",
    secondary: "bg-secondary-soft",
    tertiary: "bg-tertiary-strong",
};

type Props = {
    /* 0 sampai 100 */
    value: number;
    label: string;
    color?: Color; 
};

export function ProgressBar({ value, label, color = "primary"}: Props) {
    const pct = Math.min(100, Math.max(0, value));
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-variant"
        >
            <div
                className={`h-full rounded-full transition-[width] duration-100 ease-linear
${fills[color]}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}