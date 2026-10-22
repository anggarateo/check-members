"use client";

import { useState, type FormEvent } from "react";
import { MAX_LETTERS, MIN_LETTERS } from "@/lib/limits";

type Result =
  | { status: "registered"; name: string }
  | { status: "too_many" }
  | { status: "not_found" }
  | { error: string };

export default function CheckForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setResult(await res.json());
    } catch {
      setResult({ error: "Tidak bisa terhubung ke server. Periksa koneksi internet." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="name" className="sr-only">Nama</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Budi Santoso"
          autoComplete="off"
          minLength={MIN_LETTERS}
          maxLength={MAX_LETTERS}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Mencari..." : "Cari"}
        </button>
      </form>

      <div aria-live="polite" className="mt-5">
        {result && <ResultView result={result} />}
      </div>
    </>
  );
}

function ResultView({ result }: { result: Result }) {
  if ("error" in result) {
    return <Box color="bg-red-50 text-red-800 ring-red-200">{result.error}</Box>;
  }
  switch (result.status) {
    case "registered":
      return (
        <Box color="bg-emerald-50 text-emerald-900 ring-emerald-200">
          <p className="text-lg font-semibold">{result.name}</p>
          <p className="mt-1 inline-block rounded bg-emerald-600 px-2 py-0.5 text-sm font-bold tracking-wide text-white">
            TERDAFTAR
          </p>
        </Box>
      );
    case "too_many":
      return (
        <Box color="bg-amber-50 text-amber-900 ring-amber-200">
          Ditemukan lebih dari satu nama. Masukkan nama yang lebih spesifik.
        </Box>
      );
    case "not_found":
      return (
        <Box color="bg-slate-100 text-slate-700 ring-slate-200">
          Nama tidak ditemukan. Periksa kembali ejaan atau gunakan nama lengkap.
        </Box>
      );
  }
}

function Box({ color, children }: { color: string; children: React.ReactNode }) {
  return <div className={`rounded-lg p-4 ring-1 ${color}`}>{children}</div>;
}
