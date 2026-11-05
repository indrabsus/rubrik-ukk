'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { DAFTAR_GURU_RPL, DEFAULT_PASSWORD } from '@/lib/auth-data';
import { Lock, UserCheck, ShieldCheck, ArrowRight, School } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [selectedUsername, setSelectedUsername] = useState<string>('indrabatara');
  const [password, setPassword] = useState<string>(DEFAULT_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedGuru = DAFTAR_GURU_RPL.find(g => g.username === selectedUsername);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUsername,
          password: password
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login gagal');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl text-slate-800">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shadow-sm">
              <Image
                src="/logo.png"
                alt="Logo SMK Sangkuriang 1 Cimahi"
                width={72}
                height={72}
                className="w-16 h-16 object-contain"
                priority
              />
            </div>
          </div>

          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-3">
              UKK RPL & PPLG 2026/2027
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Portal Penguji UKK</h1>
            <p className="text-slate-500 text-sm mt-1">SMK Sangkuriang 1 Cimahi</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Pilih Akun Guru */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Pilih Akun Guru Penguji
              </label>
              <div className="relative">
                <select
                  value={selectedUsername}
                  onChange={(e) => setSelectedUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition appearance-none cursor-pointer text-sm shadow-2xs"
                >
                  {DAFTAR_GURU_RPL.map((guru) => (
                    <option key={guru.id} value={guru.username} className="bg-white text-slate-900">
                      {guru.nama}
                    </option>
                  ))}
                </select>
                <UserCheck className="w-5 h-5 text-indigo-600 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm shadow-2xs"
                />
                <Lock className="w-5 h-5 text-indigo-600 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Rubrik Penilaian</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Info Box */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              Sistem Sinkronisasi Spreadsheet & Mail Merge Otomatis
            </p>
            <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-slate-600 font-medium">
              <span>Jurusan Rekayasa Perangkat Lunak (RPL)</span>
              <span>•</span>
              <span>SMK Sangkuriang 1 Cimahi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
