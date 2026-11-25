import { Minus, Plus } from "@/components/ui/icons";

type Props = {
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
  plusDisabled?: boolean;
  label: string;
};

export function QtyStepper({ qty, onMinus, onPlus, plusDisabled, label }: Props) {
  const btn =
    "grid size-8 place-items-center rounded-full bg-white text-primary-strong transition-colors hover:bg-primary-container disabled:opacity-40 disabled:hover:bg-white";
  return (
    <div
      role="group"
      aria-label={`Jumlah ${label}`}
      className="inline-flex items-center gap-2 rounded-full bg-primary-container p-1"
    >
      <button type="button" onClick={onMinus} aria-label={`Kurangi ${label}`} className={btn}>
        <Minus className="size-4" />
      </button>
      <span className="min-w-6 text-center font-label text-sm font-medium tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={onPlus}
        disabled={plusDisabled}
        aria-label={`Tambah ${label}`}
        className={btn}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}