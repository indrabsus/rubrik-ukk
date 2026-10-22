'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Guru, Siswa, KomponenRubrik } from '@/types';
import {
  School,
  LogOut,
  Save,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Sliders,
  Award,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

// Helper kecocokan penguji dengan nama / username akun login
function isSiswaUjianPenguji(siswaPenguji: string | undefined, user: Guru | null): boolean {
  if (!user) return true;
  if (!siswaPenguji || siswaPenguji.trim() === '-' || siswaPenguji.trim() === '') return false;

  const cleanSiswa = siswaPenguji.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanUserName = user.nama.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanUserLogin = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (cleanSiswa === cleanUserLogin || cleanSiswa.includes(cleanUserLogin) || cleanUserLogin.includes(cleanSiswa)) {
    return true;
  }
  if (cleanSiswa.includes(cleanUserName) || cleanUserName.includes(cleanSiswa)) {
    return true;
  }

  // Kata kunci nama (minimal 3 huruf, bukan gelar)
  const userWords = user.nama.toLowerCase()
    .replace(/[.,]/g, '')
    .split(/\s+/)
    .filter(w => !['spd', 'skom', 'st', 'gr', 'nip', 'guru', 'ketua'].includes(w) && w.length >= 3);

  for (const word of userWords) {
    if (cleanSiswa.includes(word)) {
      return true;
    }
  }

  return false;
}

export default function DashboardPage() {
  const router = useRouter();

  // Auth State
  const [currentUser, setCurrentUser] = useState<Guru | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data States
  const [rubrik, setRubrik] = useState<KomponenRubrik[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form & Selection States
  const [filterMode, setFilterMode] = useState<'hanya_saya' | 'semua'>('hanya_saya');
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNis, setSelectedNis] = useState<string>('');

  const [projectTitle, setProjectTitle] = useState<string>('Peminjaman Alat');
  const [scores, setScores] = useState<Record<number, number>>({});
  const [catatan, setCatatan] = useState<string>('-');
  const [pengujiName, setPengujiName] = useState<string>('-');

  // Actions States
  const [saving, setSaving] = useState(false);
  const [merging, setMerging] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string; docUrl?: string } | null>(null);
  const [showRubrikModal, setShowRubrikModal] = useState(false);

  // 1. Cek Autentikasi Penguji
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.authenticated || !data.user) {
          router.push('/login');
          return;
        }
        setCurrentUser(data.user);
        setPengujiName(data.user.nama || '-');
      } catch (err) {
        router.push('/login');
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // 1b. Bersihkan cache lama di localStorage agar Google Sheet selalu menjadi satu-satunya sumber data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('ukk_scores_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {}
    }
  }, []);

  // 2. Fetch Data Rubrik & Siswa
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [resRubrik, resSiswa] = await Promise.all([
        fetch('/api/rubrik?t=' + Date.now(), { cache: 'no-store' }),
        fetch('/api/siswa?t=' + Date.now(), { cache: 'no-store' })
      ]);

      const dataRubrik = await resRubrik.json();
      const dataSiswa = await resSiswa.json();

      if (dataRubrik.rubrik) {
        setRubrik(dataRubrik.rubrik);
      }
      if (dataSiswa.siswa) {
        setSiswaList(dataSiswa.siswa);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // 3. Filter Daftar Siswa Berdasarkan Penguji Pra UKK
  const myAssignedSiswa = useMemo(() => {
    if (!currentUser) return siswaList;
    return siswaList.filter((s) => isSiswaUjianPenguji(s.penguji, currentUser));
  }, [siswaList, currentUser]);

  const availableClasses = useMemo(() => {
    const classes = Array.from(new Set(siswaList.map(s => s.kelas).filter(Boolean)));
    return ['Semua', ...classes];
  }, [siswaList]);

  const filteredSiswa = useMemo(() => {
    let source = siswaList;
    if (filterMode === 'hanya_saya' && currentUser) {
      if (myAssignedSiswa.length > 0) {
        source = myAssignedSiswa;
      }
    }

    return source.filter((s) => {
      const matchKelas = selectedKelas === 'Semua' || s.kelas === selectedKelas;
      const matchQuery =
        !searchQuery ||
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKelas && matchQuery;
    });
  }, [siswaList, myAssignedSiswa, filterMode, currentUser, selectedKelas, searchQuery]);

  // 4. Siswa Terpilih
  const activeStudent = useMemo(() => {
    return siswaList.find((s) => s.nis === selectedNis);
  }, [siswaList, selectedNis]);

  // Set default student saat list terload
  useEffect(() => {
    if (!selectedNis && filteredSiswa.length > 0) {
      setSelectedNis(filteredSiswa[0].nis);
    }
  }, [filteredSiswa, selectedNis]);

  // Reset form saat siswa berganti
  useEffect(() => {
    if (activeStudent) {
      setProjectTitle(activeStudent.project || 'Peminjaman Alat');
      setCatatan(activeStudent.catatan || '-');
      setPengujiName(currentUser?.nama || activeStudent.penguji || '-');

      // Inisialisasi skor murni dari Google Spreadsheet (jika di sheet dihapus, maka disini juga kosong 0)
      const loadedScores: Record<number, number> = {};

      rubrik.forEach((r) => {
        let val = 0;
        if (activeStudent.scores && activeStudent.scores[r.no] !== undefined) {
          val = Number(activeStudent.scores[r.no]) || 0;
        } else if ((activeStudent as any)['skor' + r.no] !== undefined && (activeStudent as any)['skor' + r.no] !== '') {
          val = Number((activeStudent as any)['skor' + r.no]) || 0;
        }
        loadedScores[r.no] = val;
      });

      setScores(loadedScores);
    }
  }, [activeStudent, currentUser, rubrik]);

  // 5. Perhitungan Total Skor & Predikat Realtime
  const totalScore = useMemo(() => {
    return Object.values(scores).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  }, [scores]);

  const maxPossibleScore = useMemo(() => {
    return rubrik.reduce((acc, curr) => acc + (Number(curr.maksScore) || 0), 0) || 100;
  }, [rubrik]);

  const nilaiAkhir = useMemo(() => {
    if (maxPossibleScore === 0) return 0;
    return Math.round((totalScore / maxPossibleScore) * 100);
  }, [totalScore, maxPossibleScore]);

  const predikat = useMemo(() => {
    if (nilaiAkhir > 90) return { label: 'Sangat Kompeten', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' };
    if (nilaiAkhir >= 80) return { label: 'Kompeten', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' };
    return { label: 'Belum Kompeten', color: 'text-rose-400 bg-rose-500/20 border-rose-500/30' };
  }, [nilaiAkhir]);

  // Handle Score Change
  const handleScoreChange = (no: number, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(val, max));
    setScores((prev) => ({
      ...prev,
      [no]: clamped
    }));
  };

  // 6. Action: Simpan Nilai ke Spreadsheet
  const handleSaveToSheet = async () => {
    if (!activeStudent) return;
    setSaving(true);
    setStatusMsg(null);

    const payload = {
      nis: activeStudent.nis,
      nama: activeStudent.nama,
      kelas: activeStudent.kelas,
      project: projectTitle,
      scores: scores,
      total: totalScore,
      catatan: catatan || '-',
      penguji: pengujiName || currentUser?.nama || '-'
    };

    try {
      const res = await fetch('/api/simpan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setStatusMsg({ type: 'ok', text: data.message || 'Nilai berhasil disimpan ke Spreadsheet!' });
// Nilai tersimpan langsung ke Google Spreadsheet

        // Update local siswa list
        setSiswaList((prev) =>
          prev.map((s) =>
            s.nis === activeStudent.nis
              ? {
                  ...s,
                  project: projectTitle,
                  total: totalScore,
                  catatan: catatan || '-',
                  penguji: pengujiName || currentUser?.nama || '-',
                  scores: scores
                }
              : s
          )
        );
      } else {
        setStatusMsg({ type: 'err', text: data.message || 'Gagal menyimpan ke Spreadsheet' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err.message || 'Terjadi kesalahan jaringan' });
    } finally {
      setSaving(false);
    }
  };

  // 7. Action: Mail Merge ke Google Docs
  const handleMailMerge = async () => {
    if (!activeStudent) return;
    setMerging(true);
    setStatusMsg(null);

    const payload = {
      nis: activeStudent.nis,
      nama: activeStudent.nama,
      kelas: activeStudent.kelas,
      project: projectTitle,
      scores: scores,
      total: totalScore,
      catatan: catatan || '-',
      penguji: pengujiName || currentUser?.nama || '-'
    };

    try {
      const res = await fetch('/api/mail-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success && data.docUrl) {
        setStatusMsg({
          type: 'ok',
          text: 'Dokumen PDF resmi berhasil digenerate!',
          docUrl: data.docUrl
        });
        // Update local student docUrl
        setSiswaList((prev) =>
          prev.map((s) => (s.nis === activeStudent.nis ? { ...s, docUrl: data.docUrl } : s))
        );
      } else {
        setStatusMsg({ type: 'err', text: data.message || 'Gagal generate dokumen' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err.message || 'Terjadi kesalahan jaringan' });
    } finally {
      setMerging(false);
    }
  };

  // 8. Action: Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Memverifikasi sesi penguji...</p>
        </div>
      </div>
    );
  }

  const topikOptions = ['Peminjaman Alat', 'Parkir', 'Pengaduan Sarana', 'Peminjaman Buku'];

  // Stats
  const totalSiswaCount = siswaList.length;
  const sudahDinilaiCount = siswaList.filter((s) => (s.total || 0) > 0).length;
  const belumDinilaiCount = totalSiswaCount - sudahDinilaiCount;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & School */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-600/20">
              <School className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight">UKK RPL 2026/2027</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  SMK Sangkuriang 1
                </span>
              </div>
              <p className="text-xs text-slate-400">Portal Rubrik Penilaian Terintegrasi Spreadsheet</p>
            </div>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-3">
            {/* Rubrik Info Button */}
            <button
              onClick={() => setShowRubrikModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition"
            >
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Sheet Penilaian</span>
            </button>

            {/* Refresh Button dengan pembersihan cache */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  try {
                    Object.keys(localStorage).forEach((key) => {
                      if (key.startsWith('ukk_scores_')) localStorage.removeItem(key);
                    });
                  } catch (e) {}
                }
                fetchData();
              }}
              disabled={loadingData}
              title="Sinkronkan ulang data langsung dari Spreadsheet"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Sinkronkan Sheet</span>
            </button>

            {/* Penguji Badge */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-800/50">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-inner">
                {currentUser?.nama?.charAt(0) || 'P'}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">{currentUser?.nama}</div>
                <div className="text-[10px] text-indigo-300">{currentUser?.jabatan}</div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 space-y-6">
        {/* Status Notification Toast */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xl ${
              statusMsg.type === 'ok'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{statusMsg.text}</span>
            </div>
            {statusMsg.docUrl && (
              <a
                href={statusMsg.docUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg transition"
              >
                <span>Buka File PDF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Top Summary Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Siswa Aktif</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">{totalSiswaCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Sudah Dinilai</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-0.5">{sudahDinilaiCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Belum Dinilai</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-0.5">{belumDinilaiCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Main Grid: Left Selector & Right Rubric Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Pemilihan Siswa (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Pilih Siswa & Kelas</span>
              </h2>

              {/* Tab Mode: Siswa Ujian Saya vs Semua Siswa */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">Tampilkan Siswa</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800/90 rounded-2xl border border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => { setFilterMode('hanya_saya'); setSelectedKelas('Semua'); }}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition cursor-pointer text-center ${
                      filterMode === 'hanya_saya'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ujian Saya ({myAssignedSiswa.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('semua')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition cursor-pointer text-center ${
                      filterMode === 'semua'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua ({siswaList.length})
                  </button>
                </div>
                {filterMode === 'hanya_saya' && myAssignedSiswa.length === 0 && !loadingData && (
                  <p className="text-[11px] text-amber-400/90 italic bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1.5 mt-1">
                    Catatan: Belum ada siswa yang ditandai penguji "{currentUser?.nama}" di sheet Penguji Pra UKK. Menampilkan seluruh siswa.
                  </p>
                )}
              </div>

              {/* Filter Kelas */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Filter Kelas</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableClasses.map((kls) => (
                    <button
                      key={kls}
                      onClick={() => setSelectedKelas(kls)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                        selectedKelas === kls
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                      }`}
                    >
                      {kls}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pencarian Siswa */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cari Siswa</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik nama siswa..."
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* List Siswa Dropdown / Scroll */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Daftar Siswa ({filteredSiswa.length})
                  </label>
                  {activeStudent?.total ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Skor: {activeStudent.total}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      Belum Dinilai
                    </span>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredSiswa.map((siswa) => {
                    const isSelected = siswa.nis === selectedNis;
                    const hasScore = (siswa.total || 0) > 0;
                    return (
                      <button
                        key={siswa.nis}
                        onClick={() => setSelectedNis(siswa.nis)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between border cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-500/60 text-white shadow-inner font-semibold'
                            : 'bg-slate-800/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className="text-slate-400 text-[10px] mr-1.5">#{siswa.no}</span>
                          <span className="capitalize">{siswa.nama.toLowerCase()}</span>
                        </div>
                        {hasScore ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Student Card */}
              {activeStudent && (
                <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-300">SISWA TERPILIH</span>
                    <span className="text-[11px] font-semibold text-indigo-400">{activeStudent.kelas}</span>
                  </div>
                  <div className="text-sm font-bold text-white capitalize">{activeStudent.nama.toLowerCase()}</div>
                  <div className="text-xs text-slate-300 flex items-center justify-between">
                    <span className="text-indigo-300 font-medium truncate">{projectTitle}</span>
                    <span className="text-slate-400 text-[11px]">Penguji: <strong className="text-indigo-200">{activeStudent.penguji && activeStudent.penguji !== '-' ? activeStudent.penguji : currentUser?.nama || '-'}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Judul Project Topik */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Judul Project / Aplikasi UKK
              </label>
              <div className="space-y-1.5">
                {topikOptions.map((topik) => (
                  <button
                    key={topik}
                    onClick={() => setProjectTitle(topik)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition border flex items-center justify-between cursor-pointer ${
                      projectTitle === topik
                        ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-semibold'
                        : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{topik}</span>
                    {projectTitle === topik && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Rubrik Penilaian Dinamis (8 Cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Header Score Overview Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-900/40 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    Nilai Akhir Uji Kompetensi Keahlian
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {activeStudent ? activeStudent.nama : 'Pilih Siswa'}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeStudent?.kelas} • Skor Total: <span className="text-white font-bold">{totalScore}</span> / {maxPossibleScore}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center px-5 py-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 shadow-inner">
                  <div className="text-3xl font-extrabold text-white tracking-tight">{nilaiAkhir}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Skala 100</div>
                </div>

                <div className={`px-4 py-3 rounded-2xl border text-center shadow-lg ${predikat.color}`}>
                  <div className="text-sm font-bold">{predikat.label}</div>
                  <div className="text-[10px] uppercase font-semibold opacity-80">Predikat</div>
                </div>
              </div>
            </div>

            {/* Rubrik Items Container */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Komponen & Indikator Penilaian</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Diambil secara dinamis dari sheet <code className="text-indigo-300 font-mono">Penilaian</code>
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {rubrik.length} Komponen
                </span>
              </div>

              {/* Rubrik Cards */}
              <div className="space-y-4">
                {rubrik.map((item) => {
                  const currentScore = scores[item.no] ?? 0;
                  const isFull = currentScore === item.maksScore;

                  return (
                    <div
                      key={item.no}
                      className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {item.no}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white">{item.komponen}</h4>
                            <p className="text-xs text-slate-400 mt-1 whitespace-pre-line leading-relaxed">
                              {item.indikator}
                            </p>
                          </div>
                        </div>

                        {/* Nilai Input & Max Badge */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max={item.maksScore}
                              value={currentScore}
                              onChange={(e) =>
                                handleScoreChange(item.no, Number(e.target.value) || 0, item.maksScore)
                              }
                              className="w-16 bg-slate-900 border border-indigo-500/50 rounded-xl px-2.5 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-inner"
                            />
                            <span className="text-xs font-semibold text-slate-400">/ {item.maksScore}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Score Stepper */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <span className="text-[11px] text-slate-500 font-medium">Beri skor cepat:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleScoreChange(item.no, 0, item.maksScore)}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 cursor-pointer"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleScoreChange(item.no, Math.round(item.maksScore / 2), item.maksScore)
                            }
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 cursor-pointer"
                          >
                            50% ({Math.round(item.maksScore / 2)})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleScoreChange(item.no, Math.round(item.maksScore * 0.8), item.maksScore)
                            }
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 cursor-pointer"
                          >
                            80% ({Math.round(item.maksScore * 0.8)})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleScoreChange(item.no, item.maksScore, item.maksScore)}
                            className="px-2.5 py-0.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-[11px] font-bold text-indigo-300 border border-indigo-500/40 cursor-pointer"
                          >
                            Maks ({item.maksScore})
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Catatan & Nama Penguji */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Catatan Penguji / Komentar (Default: -)
                  </label>
                  <textarea
                    rows={3}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Masukkan catatan penilaian..."
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Guru Penguji UKK (Otomatis dari Akun Login)
                  </label>
                  <div className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-indigo-300 font-semibold flex items-center justify-between shadow-inner">
                    <span>{currentUser?.nama || '-'}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Otomatis
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nama penguji otomatis diambil dari akun Anda dan dicetak <strong>BOLD & CENTER</strong> pada dokumen Docs.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveToSheet}
                  disabled={saving || !activeStudent}
                  className="w-full sm:flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan ke Spreadsheet</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleMailMerge}
                  disabled={merging || !activeStudent}
                  className="w-full sm:flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {merging ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Generate Dokumen (Mail Merge PDF)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Rekap Kelas Siswa */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Rekapitulasi Nilai Siswa {selectedKelas !== "Semua" ? selectedKelas : (filterMode === "hanya_saya" ? "(Siswa Ujian Saya)" : "(Semua Kelas)")}</h3>
              <p className="text-xs text-slate-400">Daftar siswa dan status penilaian aktif</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
              {filteredSiswa.length} Siswa Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4 text-center">Nilai</th>
                  <th className="py-3 px-4 text-center">Keterangan</th>
                  <th className="py-3 px-4">Penguji</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSiswa.map((siswa, idx) => {
                  const isCurrent = siswa.nis === selectedNis;
                  const hasScore = (siswa.total || 0) > 0;
                  const scoreVal = siswa.total || 0;

                  return (
                    <tr
                      key={siswa.nis}
                      className={`hover:bg-slate-800/50 transition cursor-pointer ${
                        isCurrent ? 'bg-indigo-950/40' : ''
                      }`}
                      onClick={() => setSelectedNis(siswa.nis)}
                    >
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-white capitalize">
                        {siswa.nama.toLowerCase()}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{siswa.kelas}</td>
                      <td className="py-3 px-4 text-center">
                        {hasScore ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {scoreVal}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-slate-500 bg-slate-800/80">
                            -
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasScore ? (
                          scoreVal > 90 ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Sangat Kompeten
                            </span>
                          ) : scoreVal >= 80 ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Kompeten
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Belum Kompeten
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 truncate max-w-[140px]">
                        {siswa.penguji || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNis(siswa.nis);
                          }}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition shadow"
                        >
                          Nilai
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal: Informasi Sheet Penilaian */}
      {showRubrikModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Panduan Sheet: Penilaian</h3>
              </div>
              <button
                onClick={() => setShowRubrikModal(false)}
                className="text-slate-400 hover:text-white text-sm font-semibold"
              >
                ✕ Tutup
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Anda dapat menambah atau mengubah komponen dan indikator penilaian langsung di Google
              Spreadsheet pada tab sheet bernama <code className="text-indigo-300 font-bold">Penilaian</code>.
            </p>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-indigo-300 uppercase">Struktur Kolom Sheet Penilaian:</h4>
              <ul className="text-xs text-slate-300 space-y-1 list-disc pl-5">
                <li><strong>Kolom A (No)</strong>: Nomor urut (1, 2, 3, dst.)</li>
                <li><strong>Kolom B (Komponen Penilaian)</strong>: Judul aspek penilaian (contoh: <em>Fitur CRUD</em>)</li>
                <li><strong>Kolom C (Indikator Penilaian)</strong>: Uraian kriteria pencapaian siswa</li>
                <li><strong>Kolom D (Maks Score)</strong>: Skor maksimal (contoh: 15, 10, 5)</li>
              </ul>
            </div>

            <p className="text-xs text-slate-400">
              Setelah menambahkan baris baru di sheet Penilaian, cukup klik tombol{' '}
              <strong>Refresh</strong> di pojok kanan atas aplikasi untuk memuat komponen terbaru secara
              instan!
            </p>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowRubrikModal(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
