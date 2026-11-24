import { ShieldCheck, Store } from "@/components/ui/icons";

type Props = { total: number; active: number; inactive: number };

/** Angka dihitung dari baris tabel toko di database, bukan data contoh. */
export function StatCards({ total, active, inactive }: Props) {
  const items = [
    {
      label: "Total stand kantin",
      value: total,
      unit: "Stand",
      icon: <Store className="size-5" />,
      tone: "bg-primary-container text-primary-strong",
      valueTone: "text-on-surface",
    },
    {
      label: "Akun penjual aktif",
      value: active,
      unit: "Akun",
      icon: <ShieldCheck className="size-5" />,
      tone: "bg-secondary-container text-secondary",
      valueTone: "text-secondary",
    },
    {
      label: "Stand nonaktif",
      value: inactive,
      unit: "Stand",
      icon: <Store className="size-5" />,
      tone: "bg-surface-variant text-on-surface-muted",
      valueTone: "text-on-surface-muted",
    },
  ];

  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {items.map((s) => (
        <li
          key={s.label}
          className="flex items-center justify-between rounded-3xl bg-white p-5"
        >
          <div>
            <p className="font-label text-[11px] uppercase tracking-wider text-on-surface-muted">
              {s.label}
            </p>
            <p className={`mt-1 font-headline text-3xl font-semibold ${s.valueTone}`}>
              {s.value} {s.unit}
            </p>
          </div>
          <span className={`grid size-11 place-items-center rounded-2xl ${s.tone}`}>
            {s.icon}
          </span>
        </li>
      ))}
    </ul>
  );
}