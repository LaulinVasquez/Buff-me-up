"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingLabel = "Saving...", className, disabled = false }: Readonly<{ children: React.ReactNode; pendingLabel?: string; className: string; disabled?: boolean }>) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending || disabled} type="submit">{pending ? pendingLabel : children}</button>;
}
