'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-white">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shadow-inner">
              <School className="w-8 h-8 text-indigo-300" />
            </div>
          </div>

          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
              UKK RPL & PPLG 2026/2027
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Portal Penguji UKK</h1>
            <p className="text-slate-400 text-sm mt-1">SMK Sangkuriang 1 Cimahi</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Pilih Akun Guru */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Pilih Akun Guru Penguji
              </label>
              <div className="relative">
                <select
                  value={selectedUsername}
                  onChange={(e) => setSelectedUsername(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition appearance-none cursor-pointer text-sm"
                >
                  {DAFTAR_GURU_RPL.map((guru) => (
                    <option key={guru.id} value={guru.username} className="bg-slate-900 text-white">
                      {guru.nama} ({guru.jabatan})
                    </option>
                  ))}
                </select>
                <UserCheck className="w-5 h-5 text-indigo-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
              {selectedGuru && (
                <p className="text-xs text-indigo-300/80 mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Username: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-white">{selectedGuru.username}</code>
                </p>
              )}
            </div>

            {/* Input Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                />
                <Lock className="w-5 h-5 text-indigo-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Default password: <span className="text-indigo-300 font-mono">rpl2026</span>
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold py-3.5 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
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
          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Sistem Sinkronisasi Spreadsheet & Mail Merge Otomatis
            </p>
            <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-indigo-300/80">
              <span>Jurusan PPLG / RPL</span>
              <span>•</span>
              <span>SMK Sangkuriang 1 Cimahi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
