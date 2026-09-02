import type { HTMLAttributes } from "react";

export type AlertVariant = "info" | "success" | "warning" | "danger";

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

export function Alert({
  children,
  className,
  variant = "info",
  ...props
}: AlertProps) {
  const isUrgent = variant === "danger";

  return (
    <div
      {...props}
      aria-live={isUrgent ? "assertive" : "polite"}
      className={["lp-alert", `lp-alert--${variant}`, className]
        .filter(Boolean)
        .join(" ")}
      role={isUrgent ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export type ProgressProps = {
  label: string;
  max?: number;
  value: number;
};

export function Progress({ label, max = 100, value }: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percentage = Math.round((safeValue / safeMax) * 100);

  return (
    <div className="lp-progress">
      <div className="lp-progress__header">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <progress aria-label={label} max={safeMax} value={safeValue} />
    </div>
  );
}
