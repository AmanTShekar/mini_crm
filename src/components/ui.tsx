import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("box p-4", className)} {...props} />;
}

export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#3d403d]">{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function PrimaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("btn-primary disabled:opacity-60", className)}
      {...props}
    />
  );
}

export function GhostButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("btn-ghost", className)} {...props} />;
}

export function StatusChip({ status }: { status: string }) {
  const color =
    status === "checked_in"
      ? "bg-[#e7f2ec] text-[#1f6f4a] border-[#cde4d6]"
      : status === "pending"
        ? "bg-[#fdf3e3] text-[#9a6b1a] border-[#f0ddb8]"
        : "bg-[#f1f1ee] text-[#6b6f6b] border-[#e2e2de]";
  const label =
    status === "checked_in" ? "In house" : status === "pending" ? "Pending" : "Checked out";
  return <span className={cn("chip", color)}>{label}</span>;
}
