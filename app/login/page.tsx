'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { DAFTAR_GURU_RPL, ACCESS_PIN } from '@/lib/auth-data';
import { KeyRound, UserCheck, ShieldCheck, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState<string>('');
  const [selectedUsername, setSelectedUsername] = useState<string>('indrabatara');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isPinValid = pin.trim() === ACCESS_PIN;
  const selectedUser = DAFTAR_GURU_RPL.find(g => g.username === selectedUsername);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isPinValid) {
      setErrorMsg('PIN Akses salah. Silakan masukkan PIN yang benar.');
      return;
    }

    if (!selectedUsername) {
      setErrorMsg('Silakan pilih nama penguji / admin.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUsername,
          pin: pin.trim()
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
        <div className="bg-white border border-slate-200/90 rounded-3xl p-7 sm:p-8 shadow-xl text-slate-800">
          <div className="flex items-center justify-center mb-5">
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

          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              UKK RPL & PPLG 2026/2027
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Portal Penguji UKK</h1>
            <p className="text-slate-500 text-xs mt-1">SMK Sangkuriang 1 Cimahi</p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* 1. Input PIN Akses */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  PIN Akses UKK
                </label>
                {isPinValid && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>PIN Terverifikasi</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPin(val);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="••••"
                  autoFocus
                  required
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-slate-900 font-mono text-center text-2xl tracking-[0.4em] font-bold placeholder:text-lg placeholder:tracking-normal placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition shadow-2xs ${
                    isPinValid
                      ? 'border-emerald-400 focus:ring-emerald-500 bg-emerald-50/30 text-emerald-800'
                      : pin.length === 4
                      ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30 text-rose-800'
                      : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                />
                <KeyRound className="w-5 h-5 text-indigo-600 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {isPinValid
                  ? 'Akses terbuka. Silakan pilih nama Anda di bawah.'
                  : pin.length === 4
                  ? 'PIN salah. Silakan coba lagi.'
                  : 'Masukkan 4 digit PIN penguji untuk membuka akses.'}
              </p>
            </div>

            {/* 2. Pilih Akun Guru Penguji / Admin (Terbuka setelah PIN valid) */}
            {isPinValid ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Pilih Nama Penguji / Admin
                  </label>
                  <div className="relative">
                    <select
                      value={selectedUsername}
                      onChange={(e) => setSelectedUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition appearance-none cursor-pointer text-sm shadow-2xs"
                    >
                      {DAFTAR_GURU_RPL.map((user) => (
                        <option key={user.id} value={user.username} className="bg-white text-slate-900">
                          {user.nama} {user.role === 'kajur' ? '(Ketua Program)' : user.role === 'admin' ? '(Admin Cetak PDF)' : '(Penguji)'}
                        </option>
                      ))}
                    </select>
                    <UserCheck className="w-5 h-5 text-indigo-600 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Role Info Box */}
                {selectedUser && (
                  <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                    selectedUser.role === 'kajur'
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                      : selectedUser.role === 'admin'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div>
                      <div className="font-bold">{selectedUser.nama}</div>
                      <div className="text-[11px] opacity-75">{selectedUser.jabatan}</div>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white shadow-2xs border border-current">
                      {selectedUser.role === 'kajur' ? 'Kajur RPL' : selectedUser.role === 'admin' ? 'Admin PDF' : 'Penguji'}
                    </span>
                  </div>
                )}

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
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                <Lock className="w-5 h-5 text-slate-400" />
                <span>Masukkan 4 digit PIN di atas untuk memilih nama penguji</span>
              </div>
            )}
          </form>

          {/* Quick Info Box */}
          <div className="mt-8 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Sistem Penilaian UKK & Mail Merge Dokumen PDF Otomatis
            </p>
            <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] text-slate-400 font-medium">
              <span>Program Keahlian Rekayasa Perangkat Lunak</span>
              <span>•</span>
              <span>SMK Sangkuriang 1 Cimahi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
