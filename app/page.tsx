'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Info,
  Filter,
  Check
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

  const parts = cleanUserName.split(/\s+/).filter(p => p.length >= 3 && !['spd', 'kom', 'st', 'gr', 'nip'].includes(p));
  for (const part of parts) {
    if (cleanSiswa.includes(part)) return true;
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

  // Navigation Tabs (Khusus Kajur bisa beralih tab)
  const [activeTab, setActiveTab] = useState<'penilaian' | 'semua_nilai'>('penilaian');

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
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string; docUrl?: string } | null>(null);
  const [showRubrikModal, setShowRubrikModal] = useState(false);

  // Modal Data Tersimpan State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedDataInfo, setSavedDataInfo] = useState<{
    nama: string;
    kelas: string;
    project: string;
    total: number;
    nilaiAkhir: number;
    predikat: string;
    penguji: string;
  } | null>(null);

  // Kajur Bulk PDF States
  const [showBulkPdfModal, setShowBulkPdfModal] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkScope, setBulkScope] = useState<'scored' | 'all'>('scored');
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    activeName: string;
    completed: boolean;
    successCount: number;
    failCount: number;
  }>({ current: 0, total: 0, activeName: '', completed: false, successCount: 0, failCount: 0 });
  const [singleGeneratingNis, setSingleGeneratingNis] = useState<string | null>(null);
  const abortBulkRef = useRef(false);

  // Cek apakah akun aktif adalah Kajur (Indra Batara)
  const isKajur = useMemo(() => {
    return currentUser?.role === 'kajur' || currentUser?.username?.toLowerCase() === 'indrabatara';
  }, [currentUser]);

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

  // 3. Filter Daftar Siswa
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

      const loadedScores: Record<number, number> = {};
      rubrik.forEach((r) => {
        let val = 0;
        if (activeStudent.scores && activeStudent.scores[r.no] !== undefined) {
          val = Number(activeStudent.scores[r.no]) || 0;
        } else if ((activeStudent as any)['skor' + r.no] !== undefined) {
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
    if (nilaiAkhir > 90) return { label: 'Sangat Kompeten', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (nilaiAkhir >= 80) return { label: 'Kompeten', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    return { label: 'Belum Kompeten', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
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
        // Tampilkan Modal Data Tersimpan dengan format Nilai Akhir / 100
        setSavedDataInfo({
          nama: activeStudent.nama,
          kelas: activeStudent.kelas,
          project: projectTitle,
          total: totalScore,
          nilaiAkhir: Number(nilaiAkhir) || 0,
          predikat: predikat.label,
          penguji: pengujiName || currentUser?.nama || '-'
        });
        setShowSaveModal(true);

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

  // 6b. Action: Generate Single PDF untuk Siswa (Kajur Akses)
  const handleGenerateSinglePdf = async (siswa: Siswa) => {
    setSingleGeneratingNis(siswa.nis);
    setStatusMsg(null);

    const payload = {
      nis: siswa.nis,
      nama: siswa.nama,
      kelas: siswa.kelas,
      project: siswa.project || 'Peminjaman Alat',
      scores: siswa.scores || {},
      total: siswa.total || 0,
      catatan: siswa.catatan || '-',
      penguji: siswa.penguji || currentUser?.nama || '-'
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
          text: `PDF untuk ${siswa.nama} berhasil digenerate!`,
          docUrl: data.docUrl
        });
        setSiswaList((prev) =>
          prev.map((s) =>
            s.nis === siswa.nis
              ? { ...s, docUrl: data.docUrl }
              : s
          )
        );
      } else {
        setStatusMsg({ type: 'err', text: data.message || `Gagal generate PDF untuk ${siswa.nama}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: 'Error generate PDF: ' + err.message });
    } finally {
      setSingleGeneratingNis(null);
    }
  };

  // 6c. Action: Bulk Generate PDF Semua Siswa (Kajur Akses)
  const handleStartBulkPdf = async () => {
    const targets = bulkScope === 'scored'
      ? siswaList.filter(s => (s.total || 0) > 0)
      : siswaList;

    if (targets.length === 0) {
      alert("Tidak ada siswa yang memenuhi kriteria untuk di-generate PDF.");
      return;
    }

    setBulkGenerating(true);
    abortBulkRef.current = false;
    setBulkProgress({
      current: 0,
      total: targets.length,
      activeName: targets[0].nama,
      completed: false,
      successCount: 0,
      failCount: 0
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
      if (abortBulkRef.current) break;

      const s = targets[i];
      setBulkProgress(prev => ({
        ...prev,
        current: i + 1,
        activeName: s.nama
      }));

      try {
        const payload = {
          nis: s.nis,
          nama: s.nama,
          kelas: s.kelas,
          project: s.project || 'Peminjaman Alat',
          scores: s.scores || {},
          total: s.total || 0,
          catatan: s.catatan || '-',
          penguji: s.penguji || '-'
        };

        const res = await fetch('/api/mail-merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success && data.docUrl) {
          successCount++;
          setSiswaList(prev => prev.map(item => item.nis === s.nis ? { ...item, docUrl: data.docUrl } : item));
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }

      setBulkProgress(prev => ({
        ...prev,
        successCount,
        failCount
      }));
    }

    setBulkGenerating(false);
    setBulkProgress(prev => ({
      ...prev,
      completed: true
    }));
  };

  // 7. Action: Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header Bar - Clean & Elegant */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & School Branding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <School className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm sm:text-base tracking-tight">UKK RPL 2026/2027</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  SMK Sangkuriang 1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Rubrik Penilaian Terintegrasi Google Spreadsheet</p>
            </div>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Rubrik Info Button */}
            <button
              onClick={() => setShowRubrikModal(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 transition cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rubrik Sheet</span>
            </button>

            {/* Refresh Button */}
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
              title="Sinkronkan data dari Spreadsheet"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Sinkronkan</span>
            </button>

            {/* Penguji Info Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-xs">
                {currentUser?.nama?.charAt(0) || 'P'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white leading-tight truncate max-w-[150px]">{currentUser?.nama}</div>
                <div className="text-[10px] text-slate-400">{currentUser?.jabatan}</div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 space-y-5">
        {/* Toast Notifikasi */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-md transition ${
              statusMsg.type === 'ok'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{statusMsg.text}</span>
            </div>
            {statusMsg.docUrl && (
              <a
                href={statusMsg.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1 transition"
              >
                <span>Buka PDF</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Header Bar untuk Tab Kajur & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Navigasi Tab - Khusus Akun Kajur (Indra Batara) */}
          {isKajur ? (
            <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl self-start">
              <button
                type="button"
                onClick={() => setActiveTab('penilaian')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'penilaian'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Form Penilaian</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('semua_nilai')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'semua_nilai'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Rekap Nilai Semua Siswa</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-bold">
                  {totalSiswaCount} Siswa
                </span>
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-base font-bold text-white">Form Penilaian Uji Kompetensi Keahlian</h2>
              <p className="text-xs text-slate-400">Pilih siswa dan berikan penilaian komponen rubrik</p>
            </div>
          )}

          {/* Quick Summary Badges */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Total: <strong className="text-white">{totalSiswaCount}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dinilai: <strong className="text-white">{sudahDinilaiCount}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Belum: <strong className="text-white">{belumDinilaiCount}</strong></span>
            </div>
          </div>
        </div>

        {/* TAB 1: FORM PENILAIAN SISWA */}
        {activeTab === 'penilaian' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Kolom Kiri: Pemilihan Siswa & Soal UKK (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Card Pilih Siswa */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Pilih Siswa</span>
                  <span className="text-[11px] text-slate-400">{filteredSiswa.length} ditampilkan</span>
                </div>

                {/* Filter Mode Ujian Saya vs Semua */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setFilterMode('hanya_saya'); setSelectedKelas('Semua'); }}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      filterMode === 'hanya_saya'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ujian Saya ({myAssignedSiswa.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('semua')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      filterMode === 'semua'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua ({siswaList.length})
                  </button>
                </div>

                {/* Filter Kelas */}
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <select
                    value={selectedKelas}
                    onChange={(e) => setSelectedKelas(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {availableClasses.map((kls) => (
                      <option key={kls} value={kls}>
                        {kls === 'Semua' ? 'Semua Kelas' : `Kelas ${kls}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama atau NIS siswa..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Dropdown Pemilihan Siswa Langsung */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">Daftar Siswa:</label>
                  <select
                    value={selectedNis}
                    onChange={(e) => setSelectedNis(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {filteredSiswa.map((s) => (
                      <option key={s.nis} value={s.nis}>
                        {s.nama} ({s.kelas}) {s.total ? `• Skor: ${s.total}` : '• Belum Dinilai'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Student Info Card */}
                {activeStudent && (
                  <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-900/40 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-indigo-300">SISWA TERPILIH</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-900/40 text-indigo-300 font-semibold">{activeStudent.kelas}</span>
                    </div>
                    <div className="text-sm font-bold text-white capitalize">{activeStudent.nama.toLowerCase()}</div>
                    <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-indigo-900/40">
                      <span>Penguji: <strong className="text-slate-200">{activeStudent.penguji || currentUser?.nama || '-'}</strong></span>
                      {activeStudent.docUrl && (
                        <a
                          href={activeStudent.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>PDF Tersedia</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Pilihan Soal UKK (Cell R) */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Soal UKK (Cell R)</span>
                  <span className="text-[10px] text-indigo-400 font-mono">Disimpan di Kolom R</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  {topikOptions.map((topik) => (
                    <button
                      key={topik}
                      type="button"
                      onClick={() => setProjectTitle(topik)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition border flex items-center justify-between cursor-pointer ${
                        projectTitle === topik
                          ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                          : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span>{topik}</span>
                      {projectTitle === topik && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Rubrik Penilaian Dinamis (8 Cols) */}
            <div className="lg:col-span-8 space-y-5">
              {/* STICKY SCORE OVERVIEW CARD - TIDAK IKUT TERSCROLL */}
              <div className="sticky top-[60px] sm:top-[68px] z-30 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 justify-center sm:justify-start">
                    <Award className="w-4 h-4" />
                    <span>Nilai Akhir Siswa</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate max-w-[280px]">
                    {activeStudent ? activeStudent.nama : 'Pilih Siswa'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeStudent?.kelas} • Soal: <span className="text-indigo-300 font-medium">{projectTitle}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Skala 100 */}
                  <div className="text-center px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {nilaiAkhir} <span className="text-xs sm:text-sm font-normal text-slate-500">/ 100</span>
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Skala 100</div>
                  </div>

                  {/* Predikat Badge */}
                  <div className={`px-3.5 py-2 rounded-2xl border text-center shadow ${predikat.color}`}>
                    <div className="text-xs sm:text-sm font-bold">{predikat.label}</div>
                    <div className="text-[10px] uppercase font-semibold opacity-75">Predikat</div>
                  </div>
                </div>
              </div>

              {/* Rubrik Items Container */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>Komponen & Indikator Rubrik</span>
                    </h3>
                    <p className="text-xs text-slate-400">Nilai dimulai dari Cell H sampai P (9 Komponen)</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {rubrik.length} Komponen
                  </span>
                </div>

                {/* Daftar Komponen Rubrik */}
                <div className="space-y-3.5">
                  {rubrik.map((item) => {
                    const currentScore = scores[item.no] ?? 0;

                    return (
                      <div
                        key={item.no}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              {item.no}
                            </span>
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-white">{item.komponen}</h4>
                              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                {item.indikator}
                              </p>
                            </div>
                          </div>

                          {/* Score Input */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <input
                              type="number"
                              min="0"
                              max={item.maksScore}
                              value={currentScore}
                              onChange={(e) =>
                                handleScoreChange(item.no, Number(e.target.value) || 0, item.maksScore)
                              }
                              className="w-14 sm:w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                            />
                            <span className="text-xs font-semibold text-slate-500">/ {item.maksScore}</span>
                          </div>
                        </div>

                        {/* Quick Score Stepper */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                          <span className="text-[11px] text-slate-500 font-medium">Beri skor cepat:</span>
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleScoreChange(item.no, 0, item.maksScore)}
                              className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-400 border border-slate-800 cursor-pointer"
                            >
                              0
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleScoreChange(item.no, Math.round(item.maksScore / 2), item.maksScore)
                              }
                              className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-400 border border-slate-800 cursor-pointer"
                            >
                              50% ({Math.round(item.maksScore / 2)})
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleScoreChange(item.no, Math.round(item.maksScore * 0.8), item.maksScore)
                              }
                              className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-400 border border-slate-800 cursor-pointer"
                            >
                              80% ({Math.round(item.maksScore * 0.8)})
                            </button>
                            <button
                              type="button"
                              onClick={() => handleScoreChange(item.no, item.maksScore, item.maksScore)}
                              className="px-2 py-0.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-[11px] font-bold text-indigo-300 border border-indigo-500/30 cursor-pointer"
                            >
                              Maks ({item.maksScore})
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Catatan & Guru Penguji */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Catatan Penguji / Komentar (Cell S)
                    </label>
                    <textarea
                      rows={3}
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Masukkan catatan penilaian..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Guru Penguji (Otomatis)
                    </label>
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-indigo-300 font-semibold flex items-center justify-between">
                      <span className="truncate">{currentUser?.nama || '-'}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Login
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Nama penguji tercatat otomatis di spreadsheet dan dokumen PDF resmi.
                    </p>
                  </div>
                </div>

                {/* Tombol Simpan Nilai ke Spreadsheet (Satu Tombol Fokus Utama) */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleSaveToSheet}
                    disabled={saving || !activeStudent}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer text-sm"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Nilai ke Spreadsheet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REKAP NILAI SEMUA SISWA (KHUSUS KAJUR INDRA BATARA) */}
        {(activeTab === 'semua_nilai' || !isKajur) && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>Rekapitulasi Nilai Seluruh Siswa UKK RPL</span>
                </h3>
                <p className="text-xs text-slate-400">Data nilai dari seluruh guru penguji terintegrasi langsung dengan sheet Penguji Pra UKK</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isKajur && (
                  <button
                    type="button"
                    onClick={() => setShowBulkPdfModal(true)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Generate PDF Semua Siswa</span>
                  </button>
                )}
                <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-950 text-slate-300 border border-slate-800">
                  {filteredSiswa.length} Siswa Terdaftar
                </span>
              </div>
            </div>

            {/* Quick Search & Kelas Filter Bar di Tabel */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-72 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau NIS siswa..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-medium">Filter Kelas:</span>
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {availableClasses.map((kls) => (
                    <option key={kls} value={kls}>
                      {kls === 'Semua' ? 'Semua Kelas' : kls}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabel Data Rekap Nilai Lengkap */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">No</th>
                    <th className="py-3 px-3.5">Nama Siswa</th>
                    <th className="py-3 px-3.5">Kelas</th>
                    <th className="py-3 px-3.5">Soal UKK (Cell R)</th>
                    <th className="py-3 px-3.5 text-center">Skor</th>
                    <th className="py-3 px-3.5 text-center">Skala 100</th>
                    <th className="py-3 px-3.5 text-center">Predikat</th>
                    <th className="py-3 px-3.5">Penguji</th>
                    <th className="py-3 px-3.5 text-center">Dokumen PDF</th>
                    <th className="py-3 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {filteredSiswa.map((siswa, idx) => {
                    const hasScore = (siswa.total || 0) > 0;
                    const scoreVal = siswa.total || 0;
                    const calculatedSkala100 = Math.round((scoreVal / maxPossibleScore) * 100);

                    return (
                      <tr
                        key={siswa.nis}
                        className="hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-3.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3.5 font-semibold text-white capitalize">
                          {siswa.nama.toLowerCase()}
                        </td>
                        <td className="py-3 px-3.5 text-slate-300">{siswa.kelas}</td>
                        <td className="py-3 px-3.5 text-indigo-300 font-medium">
                          {siswa.project || 'Peminjaman Alat'}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {hasScore ? (
                            <span className="font-bold text-white">{scoreVal}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {hasScore ? (
                            <span className="font-bold text-emerald-400">{calculatedSkala100}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {hasScore ? (
                            calculatedSkala100 > 90 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Sangkat Kompeten
                              </span>
                            ) : calculatedSkala100 >= 80 ? (
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
                        <td className="py-3 px-3.5 text-slate-400 truncate max-w-[130px]">
                          {siswa.penguji || '-'}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {siswa.docUrl ? (
                            <a
                              href={siswa.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-[11px] font-semibold transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>PDF</span>
                            </a>
                          ) : isKajur ? (
                            <button
                              type="button"
                              disabled={singleGeneratingNis === siswa.nis}
                              onClick={() => handleGenerateSinglePdf(siswa)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 border border-slate-700 hover:border-indigo-500/40 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                            >
                              {singleGeneratingNis === siswa.nis ? (
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <FileText className="w-3 h-3" />
                              )}
                              <span>Buat PDF</span>
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNis(siswa.nis);
                              setActiveTab('penilaian');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-[11px] transition cursor-pointer"
                          >
                            Beri Nilai
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: DATA TERSIMPAN (FORMAT NILAI AKHIR / 100) */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Data Tersimpan!</h3>
              <p className="text-xs text-slate-300">
                Nilai dan Soal UKK siswa telah berhasil disinkronkan ke Google Spreadsheet.
              </p>
            </div>

            {savedDataInfo && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Nama Siswa:</span>
                  <span className="font-bold text-white text-right capitalize">{savedDataInfo.nama.toLowerCase()}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Kelas:</span>
                  <span className="font-semibold text-slate-200">{savedDataInfo.kelas}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Soal UKK (Cell R):</span>
                  <span className="font-semibold text-indigo-400">{savedDataInfo.project}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Total Skor / Skala 100:</span>
                  <span className="font-bold text-emerald-400 text-sm">{savedDataInfo.nilaiAkhir} / 100</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Predikat:</span>
                  <span className="font-bold text-white">{savedDataInfo.predikat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Guru Penguji:</span>
                  <span className="font-medium text-slate-300 truncate max-w-[180px]">{savedDataInfo.penguji}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSaveModal(false)}
              className="w-full py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              OK, Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: KAJUR GENERATE PDF SEMUA SISWA */}
      {showBulkPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Generate Dokumen PDF (Kajur)</h3>
                  <p className="text-[11px] text-slate-400">Buat PDF penilaian resmi untuk siswa dari seluruh penguji</p>
                </div>
              </div>
              {!bulkGenerating && (
                <button
                  type="button"
                  onClick={() => setShowBulkPdfModal(false)}
                  className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {!bulkGenerating && !bulkProgress.completed && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Pilih Sasaran Siswa:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkScope('scored')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        bulkScope === 'scored'
                          ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <div className="font-bold text-xs text-indigo-300">Siswa Sudah Dinilai</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {siswaList.filter(s => (s.total || 0) > 0).length} siswa
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBulkScope('all')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        bulkScope === 'all'
                          ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <div className="font-bold text-xs text-indigo-300">Semua Siswa</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {siswaList.length} siswa total
                      </div>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 space-y-1 text-[11px]">
                  <p className="font-semibold text-slate-300">Keterangan:</p>
                  <p>• PDF disimpan langsung di folder Google Drive Kajur.</p>
                  <p>• Tautan dokumen dicatat ke Kolom T (Link Dokumen) di spreadsheet.</p>
                </div>

                <button
                  type="button"
                  onClick={handleStartBulkPdf}
                  className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Mulai Generate {bulkScope === 'scored' ? siswaList.filter(s => (s.total || 0) > 0).length : siswaList.length} File PDF</span>
                </button>
              </div>
            )}

            {bulkGenerating && (
              <div className="space-y-3.5 py-2 text-center">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span>Memproses: {bulkProgress.activeName}</span>
                    <span>{bulkProgress.current} / {bulkProgress.total}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.round((bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100)}%`
                      }}
                    />
                  </div>
                  <div className="text-right text-[11px] text-indigo-300 font-bold">
                    {Math.round((bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100)}% Selesai
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 text-xs">
                  <span className="text-emerald-400 font-semibold">✓ Berhasil: {bulkProgress.successCount}</span>
                  {bulkProgress.failCount > 0 && (
                    <span className="text-rose-400 font-semibold">✗ Gagal: {bulkProgress.failCount}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { abortBulkRef.current = true; }}
                  className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Hentikan Proses
                </button>
              </div>
            )}

            {bulkProgress.completed && (
              <div className="space-y-3 py-2 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-base font-bold text-white">Generate PDF Selesai!</h4>
                  <p className="text-xs text-slate-300">
                    Berhasil membuat {bulkProgress.successCount} file PDF resmi di Google Drive.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkPdfModal(false);
                    setBulkProgress(prev => ({ ...prev, completed: false }));
                  }}
                  className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: PANDUAN SHEET RUBRIK */}
      {showRubrikModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">Panduan Rubrik Penilaian UKK</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRubrikModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 text-xs text-slate-300">
              {rubrik.map((r) => (
                <div key={r.no} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex justify-between items-center font-semibold text-white">
                    <span>{r.no}. {r.komponen}</span>
                    <span className="text-indigo-400 font-bold">Maks: {r.maksScore}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{r.indikator}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowRubrikModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
