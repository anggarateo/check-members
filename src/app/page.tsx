import { cookies } from "next/headers";
import { checkToken } from "@/lib/access";
import { ACCESS_COOKIE } from "@/lib/token";
import CheckForm from "./check-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const store = await cookies();
  const active = await checkToken(store.get(ACCESS_COOKIE)?.value);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900">Cek Data Anggota</h1>
        {active ? (
          <>
            <p className="mt-1 text-sm text-slate-500">Masukkan nama lengkap untuk memeriksa status keanggotaan.</p>
            <CheckForm />
          </>
        ) : (
          <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
            Link tidak valid atau sudah kedaluwarsa. Minta link terbaru kepada pengurus.
          </p>
        )}
      </div>
    </main>
  );
}
