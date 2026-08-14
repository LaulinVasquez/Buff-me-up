import Image from "next/image";
import { signOut } from "@/app/app/actions";

type UserMenuProps = Readonly<{ avatarUrl: string | null; name: string }>;

export function UserMenu({ avatarUrl, name }: UserMenuProps) {
  return <div className="flex min-w-0 items-center justify-end gap-3">
    {avatarUrl ? (
      <Image alt="" className="size-10 shrink-0 rounded-full border border-slate-700 object-cover" height={40} referrerPolicy="no-referrer" src={avatarUrl} unoptimized width={40} />
    ) : (
      <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-lime-400 font-black text-slate-950">{name.charAt(0).toUpperCase()}</span>
    )}
    <div className="min-w-0 text-right">
      <p className="max-w-36 truncate text-sm font-semibold text-slate-100">{name}</p>
      <form action={signOut}>
        <button className="min-h-8 text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-lime-400" type="submit">Sign out</button>
      </form>
    </div>
  </div>;
}
