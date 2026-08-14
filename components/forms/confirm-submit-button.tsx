"use client";

import { useFormStatus } from "react-dom";

export function ConfirmSubmitButton({ message, children, className }: Readonly<{ message: string; children: React.ReactNode; className: string }>) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }} type="submit">{pending ? "Deleting..." : children}</button>;
}
