'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
  Check,
  Table,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckSquare,
  ArrowRight
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
  const [selectedNo, setSelectedNo] = useState<number | null>(null);

  // Rekap Nilai Filter States (Khusus Tab Rekap Semua Siswa - Kajur)
  const [rekapSearchQuery, setRekapSearchQuery] = useState<string>('');
  const [rekapKelas, setRekapKelas] = useState<string>('Semua');
  const [rekapPenguji, setRekapPenguji] = useState<string>('Semua');
  const [rekapStatus, setRekapStatus] = useState<'semua' | 'sudah' | 'belum'>('semua');

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

  // View Mode: 'spreadsheet' (Tabel Baris Penilaian Siswa) atau 'single' (Form 1 Siswa)
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'single'>('spreadsheet');

  // Multi-Student Session States (Untuk Ujian 15 Siswa per Sesi)
  const [sesiPage, setSesiPage] = useState<number>(1);
  const [sesiPageSize, setSesiPageSize] = useState<number>(15); // default 15 siswa per sesi
  const [sessionBatchProject, setSessionBatchProject] = useState<string>('Peminjaman Alat');
  const [savingBatch, setSavingBatch] = useState<boolean>(false);
  const [batchSaveProgress, setBatchSaveProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Map of student session data: keyed by s.no
  const [sessionData, setSessionData] = useState<Record<number, {
    scores: Record<number, number>;
    project: string;
    catatan: string;
    penguji: string;
    isModified: boolean;
  }>>({});

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
  const [singleGeneratingNo, setSingleGeneratingNo] = useState<number | null>(null);
  const abortBulkRef = useRef(false);

  // Standar KKM UKK (Default 78, khusus akun Kajur bisa mengatur nilainya)
  const [kkm, setKkm] = useState<number>(78);

  // Cek apakah akun aktif adalah Kajur (Indra Batara)
  const isKajur = useMemo(() => {
    return currentUser?.role === 'kajur' || currentUser?.username?.toLowerCase() === 'indrabatara';
  }, [currentUser]);

  // Load Pengaturan KKM dari server & localStorage
  useEffect(() => {
    async function loadConfig() {
      try {
        const savedKkm = localStorage.getItem('ukk_kkm_setting');
        if (savedKkm && !isNaN(Number(savedKkm))) {
          setKkm(Number(savedKkm));
        }
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.kkm) {
          setKkm(Number(data.kkm));
          localStorage.setItem('ukk_kkm_setting', String(data.kkm));
        }
      } catch (e) {}
    }
    loadConfig();
  }, []);

  const handleKkmChange = async (val: number) => {
    const cleanVal = Math.max(50, Math.min(val, 100));
    setKkm(cleanVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ukk_kkm_setting', String(cleanVal));
    }
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kkm: cleanVal })
      });
      setStatusMsg({ type: 'ok', text: `Standar KKM berhasil diatur ke ${cleanVal}!` });
    } catch (e) {}
  };

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
        String(s.no).includes(searchQuery) ||
        (s.nis && s.nis.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchKelas && matchQuery;
    });
  }, [siswaList, myAssignedSiswa, filterMode, currentUser, selectedKelas, searchQuery]);

  // Daftar Penguji untuk filter Rekap
  const availablePenguji = useMemo(() => {
    const list = Array.from(new Set(siswaList.map(s => s.penguji).filter(Boolean)));
    return ['Semua', ...list.filter(p => p && p !== '-')];
  }, [siswaList]);

  // Daftar Siswa Rekapitulasi (Seluruh 131 Siswa untuk Kajur, tidak dibatasi oleh filterMode 'hanya_saya')
  const rekapSiswaList = useMemo(() => {
    return siswaList.filter((s) => {
      const matchKelas = rekapKelas === 'Semua' || s.kelas === rekapKelas;
      const matchPenguji = rekapPenguji === 'Semua' || s.penguji === rekapPenguji;
      const matchStatus =
        rekapStatus === 'semua'
          ? true
          : rekapStatus === 'sudah'
          ? (s.total || 0) > 0
          : !(s.total && s.total > 0);
      const matchQuery =
        !rekapSearchQuery ||
        s.nama.toLowerCase().includes(rekapSearchQuery.toLowerCase()) ||
        String(s.no).includes(rekapSearchQuery) ||
        (s.nis && s.nis.toLowerCase().includes(rekapSearchQuery.toLowerCase())) ||
        (s.penguji && s.penguji.toLowerCase().includes(rekapSearchQuery.toLowerCase()));

      return matchKelas && matchPenguji && matchStatus && matchQuery;
    });
  }, [siswaList, rekapKelas, rekapPenguji, rekapStatus, rekapSearchQuery]);

  // 4. Siswa Terpilih (menggunakan s.no yang unik dan stabil)
  const activeStudent = useMemo(() => {
    return siswaList.find((s) => s.no === selectedNo) || null;
  }, [siswaList, selectedNo]);

  // Set default student saat list terload atau saat filter berganti
  useEffect(() => {
    if (filteredSiswa.length > 0 && (!selectedNo || !filteredSiswa.some((s) => s.no === selectedNo))) {
      setSelectedNo(filteredSiswa[0].no);
    }
  }, [filteredSiswa, selectedNo]);

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
    if (nilaiAkhir > 90) return { label: 'Sangat Kompeten', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
    if (nilaiAkhir >= kkm) return { label: 'Kompeten', color: 'text-blue-700 bg-blue-50 border-blue-300' };
    return { label: 'Belum Kompeten', color: 'text-rose-700 bg-rose-50 border-rose-300' };
  }, [nilaiAkhir, kkm]);

  const topikOptions = ['Peminjaman Alat', 'Parkir', 'Pengaduan Sarana', 'Peminjaman Buku'];
  const availableTopikOptions = useMemo(() => {
    const fromSiswa = siswaList.map((s) => s.project).filter(Boolean) as string[];
    return Array.from(new Set([...topikOptions, ...fromSiswa]));
  }, [siswaList]);

  // Reset sesiPage jika filter siswa berubah
  useEffect(() => {
    setSesiPage(1);
  }, [selectedKelas, filterMode, searchQuery]);

  const totalSesiPages = useMemo(() => {
    if (sesiPageSize === 0) return 1;
    return Math.max(1, Math.ceil(filteredSiswa.length / sesiPageSize));
  }, [filteredSiswa.length, sesiPageSize]);

  const currentSessionStudents = useMemo(() => {
    if (sesiPageSize === 0) return filteredSiswa;
    const start = (sesiPage - 1) * sesiPageSize;
    return filteredSiswa.slice(start, start + sesiPageSize);
  }, [filteredSiswa, sesiPage, sesiPageSize]);

  // Sinkronisasi data awal sesi dari siswaList
  useEffect(() => {
    setSessionData((prev) => {
      const next = { ...prev };
      siswaList.forEach((s) => {
        if (!next[s.no] || !next[s.no].isModified) {
          const loadedScores: Record<number, number> = {};
          rubrik.forEach((r) => {
            let val = 0;
            if (s.scores && s.scores[r.no] !== undefined) {
              val = Number(s.scores[r.no]) || 0;
            } else if ((s as any)['skor' + r.no] !== undefined) {
              val = Number((s as any)['skor' + r.no]) || 0;
            }
            loadedScores[r.no] = val;
          });

          next[s.no] = {
            scores: loadedScores,
            project: s.project || 'Peminjaman Alat',
            catatan: s.catatan || '-',
            penguji: s.penguji || currentUser?.nama || '-',
            isModified: false
          };
        }
      });
      return next;
    });
  }, [siswaList, rubrik, currentUser]);

  // Handler Nilai Sesi Multi-Siswa
  const handleSessionScoreChange = (siswaNo: number, rubrikNo: number, val: number, maxScore: number) => {
    const clamped = Math.max(0, Math.min(val, maxScore));
    setSessionData((prev) => {
      const student = prev[siswaNo] || {
        scores: {},
        project: 'Peminjaman Alat',
        catatan: '-',
        penguji: currentUser?.nama || '-',
        isModified: false
      };
      return {
        ...prev,
        [siswaNo]: {
          ...student,
          scores: {
            ...student.scores,
            [rubrikNo]: clamped
          },
          isModified: true
        }
      };
    });

    if (activeStudent && activeStudent.no === siswaNo) {
      setScores((prev) => ({
        ...prev,
        [rubrikNo]: clamped
      }));
    }
  };

  const handleSessionProjectChange = (siswaNo: number, val: string) => {
    setSessionData((prev) => ({
      ...prev,
      [siswaNo]: {
        ...(prev[siswaNo] || { scores: {}, project: '', catatan: '-', penguji: currentUser?.nama || '-', isModified: false }),
        project: val,
        isModified: true
      }
    }));
    if (activeStudent && activeStudent.no === siswaNo) {
      setProjectTitle(val);
    }
  };

  const handleSessionCatatanChange = (siswaNo: number, val: string) => {
    setSessionData((prev) => ({
      ...prev,
      [siswaNo]: {
        ...(prev[siswaNo] || { scores: {}, project: 'Peminjaman Alat', catatan: '', penguji: currentUser?.nama || '-', isModified: false }),
        catatan: val,
        isModified: true
      }
    }));
    if (activeStudent && activeStudent.no === siswaNo) {
      setCatatan(val);
    }
  };

  const getStudentTotal = (siswaNo: number): number => {
    const sData = sessionData[siswaNo];
    if (!sData) return 0;
    return Object.values(sData.scores).reduce((a, b) => a + (Number(b) || 0), 0);
  };

  const getStudentPredikat = (total: number) => {
    if (total > 90) return { label: 'Sangat Kompeten', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
    if (total >= kkm) return { label: 'Kompeten', color: 'text-blue-700 bg-blue-50 border-blue-300' };
    return { label: 'Belum Kompeten', color: 'text-rose-700 bg-rose-50 border-rose-300' };
  };

  // Simpan nilai 1 siswa dari tampilan sesi
  const handleSaveSessionStudent = async (siswa: Siswa) => {
    const sData = sessionData[siswa.no];
    if (!sData) return;

    setSingleGeneratingNo(siswa.no);
    const total = getStudentTotal(siswa.no);

    const payload = {
      rowIdx: siswa.no + 1,
      nis: siswa.nis,
      nama: siswa.nama,
      kelas: siswa.kelas,
      project: sData.project || 'Peminjaman Alat',
      scores: sData.scores,
      total: total,
      catatan: sData.catatan || '-',
      penguji: sData.penguji || currentUser?.nama || '-',
      kkm: kkm
    };

    try {
      const res = await fetch('/api/simpan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSessionData((prev) => ({
          ...prev,
          [siswa.no]: {
            ...prev[siswa.no],
            isModified: false
          }
        }));
        setSiswaList((prev) =>
          prev.map((s) =>
            s.no === siswa.no
              ? {
                  ...s,
                  project: payload.project,
                  total: payload.total,
                  catatan: payload.catatan,
                  penguji: payload.penguji,
                  scores: payload.scores
                }
              : s
          )
        );
        setStatusMsg({ type: 'ok', text: `Nilai ${siswa.nama} berhasil disimpan ke Spreadsheet!` });
      } else {
        setStatusMsg({ type: 'err', text: data.message || `Gagal menyimpan nilai ${siswa.nama}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: `Error menyimpan ${siswa.nama}: ${err.message}` });
    } finally {
      setSingleGeneratingNo(null);
    }
  };

  // Simpan seluruh siswa di sesi aktif
  const handleSaveAllSession = async () => {
    const targets = currentSessionStudents.filter((s) => {
      const sData = sessionData[s.no];
      if (!sData) return false;
      return sData.isModified || getStudentTotal(s.no) > 0;
    });

    if (targets.length === 0) {
      alert("Tidak ada nilai siswa yang diubah atau perlu disimpan pada sesi ini.");
      return;
    }

    setSavingBatch(true);
    setBatchSaveProgress({ current: 0, total: targets.length });
    let successCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const siswa = targets[i];
      const sData = sessionData[siswa.no];
      const total = getStudentTotal(siswa.no);

      const payload = {
        rowIdx: siswa.no + 1,
        nis: siswa.nis,
        nama: siswa.nama,
        kelas: siswa.kelas,
        project: sData?.project || 'Peminjaman Alat',
        scores: sData?.scores || {},
        total: total,
        catatan: sData?.catatan || '-',
        penguji: sData?.penguji || currentUser?.nama || '-',
        kkm: kkm
      };

      try {
        const res = await fetch('/api/simpan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
          setSessionData((prev) => ({
            ...prev,
            [siswa.no]: {
              ...prev[siswa.no],
              isModified: false
            }
          }));
          setSiswaList((prev) =>
            prev.map((s) =>
              s.no === siswa.no
                ? {
                    ...s,
                    project: payload.project,
                    total: payload.total,
                    catatan: payload.catatan,
                    penguji: payload.penguji,
                    scores: payload.scores
                  }
                : s
            )
          );
        }
      } catch (e) {
        console.error(e);
      }
      setBatchSaveProgress({ current: i + 1, total: targets.length });
    }

    setSavingBatch(false);
    setStatusMsg({
      type: 'ok',
      text: `Berhasil menyimpan nilai untuk ${successCount} dari ${targets.length} siswa ke Spreadsheet!`
    });
  };

  const handleApplyBatchProject = () => {
    if (!sessionBatchProject.trim()) return;
    setSessionData((prev) => {
      const next = { ...prev };
      currentSessionStudents.forEach((s) => {
        next[s.no] = {
          ...(next[s.no] || { scores: {}, catatan: '-', penguji: currentUser?.nama || '-', isModified: false }),
          project: sessionBatchProject.trim(),
          isModified: true
        };
      });
      return next;
    });
  };

  // Handle Score Change
  const handleScoreChange = (no: number, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(val, max));
    setScores((prev) => ({
      ...prev,
      [no]: clamped
    }));
    if (activeStudent) {
      setSessionData((prev) => {
        const student = prev[activeStudent.no] || {
          scores: {},
          project: projectTitle,
          catatan: catatan,
          penguji: pengujiName || currentUser?.nama || '-',
          isModified: false
        };
        return {
          ...prev,
          [activeStudent.no]: {
            ...student,
            scores: {
              ...student.scores,
              [no]: clamped
            },
            isModified: true
          }
        };
      });
    }
  };

  // 6. Action: Simpan Nilai ke Spreadsheet
  const handleSaveToSheet = async () => {
    if (!activeStudent) return;
    setSaving(true);
    setStatusMsg(null);

    const payload = {
      rowIdx: activeStudent.no + 1,
      nis: activeStudent.nis,
      nama: activeStudent.nama,
      kelas: activeStudent.kelas,
      project: projectTitle,
      scores: scores,
      total: totalScore,
      catatan: catatan || '-',
      penguji: pengujiName || currentUser?.nama || '-',
      kkm: kkm
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
            s.no === activeStudent.no
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
    setSingleGeneratingNo(siswa.no);
    setStatusMsg(null);

    const payload = {
      rowIdx: siswa.no + 1,
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
            s.no === siswa.no
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
      setSingleGeneratingNo(null);
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
          setSiswaList(prev => prev.map(item => item.no === s.no ? { ...item, docUrl: data.docUrl } : item));
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

  // Stats
  const totalSiswaCount = siswaList.length;
  const sudahDinilaiCount = siswaList.filter((s) => (s.total || 0) > 0).length;
  const belumDinilaiCount = totalSiswaCount - sudahDinilaiCount;

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header Bar - Clean & Elegant */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & School Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shadow-xs">
              <Image
                src="/logo.png"
                alt="Logo SMK Sangkuriang 1 Cimahi"
                width={36}
                height={36}
                className="w-8 h-8 object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">UKK RPL 2026/2027</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  SMK Sangkuriang 1
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Rubrik Penilaian Terintegrasi Google Spreadsheet</p>
            </div>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Rubrik Info Button */}
            <button
              onClick={() => setShowRubrikModal(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 border border-slate-200 transition cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Sinkronkan</span>
            </button>

            {/* Penguji Info Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                {currentUser?.nama?.charAt(0) || 'P'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[150px]">{currentUser?.nama}</div>
                <div className="text-[10px] text-slate-500 font-medium">{currentUser?.jabatan}</div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
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
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
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
                className="px-3 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 font-semibold flex items-center gap-1 transition"
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
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 border border-slate-300/80 rounded-2xl self-start">
              <button
                type="button"
                onClick={() => setActiveTab('penilaian')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'penilaian'
                    ? 'bg-white text-indigo-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
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
                    ? 'bg-white text-indigo-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Rekap Nilai Semua Siswa</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                  {totalSiswaCount} Siswa
                </span>
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-base font-bold text-slate-900">Form Penilaian Uji Kompetensi Keahlian</h2>
              <p className="text-xs text-slate-500">Pilih siswa dan berikan penilaian komponen rubrik</p>
            </div>
          )}

          {/* Quick Summary Badges */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 shadow-2xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Total: <strong className="text-slate-900">{totalSiswaCount}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-2xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dinilai: <strong className="text-emerald-900">{sudahDinilaiCount}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 shadow-2xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Belum: <strong className="text-amber-900">{belumDinilaiCount}</strong></span>
            </div>

            {/* Pengaturan KKM UKK (Khusus Akun Kajur bisa ubah, guru biasa view-only) */}
            {isKajur ? (
              <div
                className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-2xs flex items-center gap-1.5"
                title="Kriteria Ketuntasan Minimal (KKM). Khusus akun Kajur dapat mengubah nilai KKM ini."
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <span className="font-bold text-xs text-indigo-950">KKM:</span>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={kkm}
                  onChange={(e) => handleKkmChange(Number(e.target.value))}
                  className="w-12 py-0.5 px-1 bg-white border border-indigo-300 rounded-lg text-center font-black text-xs text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
                <span className="text-[10px] text-indigo-500 font-semibold hidden sm:inline">(Default 78)</span>
              </div>
            ) : (
              <div
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1.5"
                title={`Kriteria Ketuntasan Minimal (KKM) diatur oleh Kajur: ${kkm}`}
              >
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>KKM: <strong className="text-indigo-700 font-bold">{kkm}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: FORM PENILAIAN SISWA */}
        {activeTab === 'penilaian' && (
          <div className="space-y-5">
            {/* Toolbar Mode Tampilan & Kontrol Sesi */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
              {/* Baris 1: Mode Tampilan & Tombol Simpan Batch */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* View Mode Switcher */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-2xl self-start flex-wrap">
                  <button
                    type="button"
                    onClick={() => setViewMode('spreadsheet')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'spreadsheet'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                    title="Tabel Penilaian Siswa (Spreadsheet)"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Tabel Baris (Spreadsheet)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('single')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'single'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                    title="Form Detail per 1 Siswa"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Form Tunggal (1 Siswa)</span>
                  </button>
                </div>

                {/* Tombol Simpan Semua Siswa di Sesi Aktif */}
                {viewMode !== 'single' && (
                  <div className="flex items-center gap-2 self-start lg:self-auto">
                    <button
                      type="button"
                      disabled={savingBatch}
                      onClick={handleSaveAllSession}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition cursor-pointer disabled:opacity-50"
                    >
                      {savingBatch ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Menyimpan ({batchSaveProgress.current}/{batchSaveProgress.total})...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Semua Nilai Sesi Ini ({currentSessionStudents.length} Siswa)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Baris 2: Filter Kelas, Sesi Paginator & Set Soal Serentak (khusus viewMode matrix & spreadsheet) */}
              {viewMode !== 'single' && (
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  {/* Sesi Navigator */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        disabled={sesiPage <= 1}
                        onClick={() => setSesiPage((p) => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
                        title="Sesi Sebelumnya"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-800">
                        Sesi {sesiPage} dari {totalSesiPages}
                      </span>
                      <button
                        type="button"
                        disabled={sesiPage >= totalSesiPages}
                        onClick={() => setSesiPage((p) => Math.min(totalSesiPages, p + 1))}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
                        title="Sesi Selanjutnya"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Jumlah per Sesi */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Kapasitas:</span>
                      <select
                        value={sesiPageSize}
                        onChange={(e) => {
                          setSesiPageSize(Number(e.target.value));
                          setSesiPage(1);
                        }}
                        className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value={10}>10 Siswa</option>
                        <option value={15}>15 Siswa (Standar Sesi)</option>
                        <option value={20}>20 Siswa</option>
                        <option value={0}>Semua Siswa</option>
                      </select>
                    </div>

                    {/* Filter Penguji */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => { setFilterMode('hanya_saya'); setSelectedKelas('Semua'); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          filterMode === 'hanya_saya' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Ujian Saya ({myAssignedSiswa.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode('semua')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          filterMode === 'semua' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Semua ({siswaList.length})
                      </button>
                    </div>

                    {/* Filter Kelas */}
                    <select
                      value={selectedKelas}
                      onChange={(e) => setSelectedKelas(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      {availableClasses.map((kls) => (
                        <option key={kls} value={kls}>
                          {kls === 'Semua' ? 'Semua Kelas' : `Kelas ${kls}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Set Judul Soal Serentak */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium whitespace-nowrap">Soal Sesi Ini:</span>
                    <select
                      value={sessionBatchProject}
                      onChange={(e) => setSessionBatchProject(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                    >
                      {availableTopikOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleApplyBatchProject}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-300 transition cursor-pointer whitespace-nowrap"
                      title="Terapkan judul soal ini ke seluruh siswa pada sesi aktif"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TAMPILAN 2: SPREADSHEET (15 SISWA PER BARIS) */}
            {viewMode === 'spreadsheet' && (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <Table className="w-4 h-4 text-indigo-600" />
                      <span>Tabel Penilaian Siswa (Spreadsheet)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilih judul soal UKK dari dropdown untuk setiap siswa, input skor rubrik secara langsung. Nilai akhir dan predikat terhitung otomatis.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                      Sesi {sesiPage}: {currentSessionStudents.length} Siswa
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs max-w-full">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse min-w-max">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-800">
                      <tr>
                        <th className="py-3 px-3 text-center w-12 sticky left-0 z-20 bg-slate-100 border-r border-slate-200">No</th>
                        <th className="py-3 px-3.5 sticky left-12 z-20 bg-slate-100 border-r border-slate-200 min-w-[170px]">Nama Siswa</th>
                        <th className="py-3 px-3 border-r border-slate-200 min-w-[140px]">Judul Soal UKK</th>
                        {rubrik.map((r) => (
                          <th key={r.no} className="py-3 px-2 text-center border-r border-slate-200 min-w-[75px]" title={r.komponen}>
                            <div className="text-[11px] font-bold text-slate-900">K{r.no}</div>
                            <span className="text-[9px] text-indigo-600 font-normal">Maks {r.maksScore}</span>
                          </th>
                        ))}
                        <th className="py-3 px-3 text-center border-r border-slate-200 min-w-[80px]">Total (100)</th>
                        <th className="py-3 px-3 text-center border-r border-slate-200 min-w-[110px]">Predikat</th>
                        <th className="py-3 px-3 border-r border-slate-200 min-w-[160px]">Catatan Penguji</th>
                        <th className="py-3 px-3 text-center min-w-[100px]">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentSessionStudents.map((siswa) => {
                        const sData = sessionData[siswa.no];
                        const total = getStudentTotal(siswa.no);
                        const pred = getStudentPredikat(total);
                        const isSaving = singleGeneratingNo === siswa.no;
                        return (
                          <tr key={siswa.no} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400 sticky left-0 z-10 bg-white border-r border-slate-200">
                              {siswa.no}
                            </td>
                            <td className="py-2.5 px-3.5 sticky left-12 z-10 bg-white border-r border-slate-200">
                              <div className="font-bold text-slate-900 truncate max-w-[160px]" title={siswa.nama}>
                                {siswa.nama}
                              </div>
                              <div className="text-[10px] text-slate-500">{siswa.kelas}</div>
                            </td>
                            <td className="py-2.5 px-2.5 border-r border-slate-200 min-w-[160px]">
                              <select
                                value={sData?.project || 'Peminjaman Alat'}
                                onChange={(e) => handleSessionProjectChange(siswa.no, e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                              >
                                {availableTopikOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {rubrik.map((r) => {
                              const score = sData?.scores?.[r.no] ?? 0;
                              return (
                                <td key={r.no} className="py-2 px-1 text-center border-r border-slate-200">
                                  <input
                                    type="number"
                                    min="0"
                                    max={r.maksScore}
                                    value={score}
                                    onChange={(e) => handleSessionScoreChange(siswa.no, r.no, parseInt(e.target.value) || 0, r.maksScore)}
                                    className={`w-12 py-1 text-center font-bold text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                      score === r.maksScore
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : score > 0
                                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                        : 'bg-white text-slate-400 border-slate-200'
                                    }`}
                                  />
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-3 text-center font-extrabold text-sm text-slate-900 border-r border-slate-200 bg-slate-50/50">
                              {total}
                            </td>
                            <td className="py-2.5 px-2.5 text-center border-r border-slate-200">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${pred.color}`}>
                                {pred.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 border-r border-slate-200">
                              <input
                                type="text"
                                value={sData?.catatan || '-'}
                                onChange={(e) => handleSessionCatatanChange(siswa.no, e.target.value)}
                                className="w-full text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveSessionStudent(siswa)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer disabled:opacity-50 ${
                                  sData?.isModified
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs animate-pulse'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                }`}
                              >
                                {isSaving ? (
                                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                                <span>{sData?.isModified ? 'Simpan' : 'Tersimpan'}</span>
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

            {/* TAMPILAN 3: FORM DETAIL 1 SISWA (ORIGINAL) */}
            {viewMode === 'single' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Kolom Kiri: Pemilihan Siswa & Soal UKK (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Card Pilih Siswa */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Pilih Siswa</span>
                  <span className="text-[11px] text-slate-500">{filteredSiswa.length} ditampilkan</span>
                </div>

                {/* Filter Mode Ujian Saya vs Semua */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setFilterMode('hanya_saya'); setSelectedKelas('Semua'); }}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      filterMode === 'hanya_saya'
                        ? 'bg-white text-indigo-700 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    Ujian Saya ({myAssignedSiswa.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('semua')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      filterMode === 'semua'
                        ? 'bg-white text-indigo-700 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer shadow-2xs"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                </div>

                {/* Dropdown Pemilihan Siswa Langsung */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">Daftar Siswa:</label>
                  <select
                    value={selectedNo ?? ''}
                    onChange={(e) => setSelectedNo(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer shadow-2xs"
                  >
                    {filteredSiswa.map((s) => (
                      <option key={s.no} value={s.no}>
                        {s.nama} ({s.kelas}) {s.total ? `• Skor: ${s.total}` : '• Belum Dinilai'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Student Info Card */}
                {activeStudent && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-indigo-700">SISWA TERPILIH</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-semibold">{activeStudent.kelas}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 capitalize">{activeStudent.nama.toLowerCase()}</div>
                    <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-indigo-200/80">
                      <span>Penguji: <strong className="text-slate-800">{activeStudent.penguji || currentUser?.nama || '-'}</strong></span>
                      {activeStudent.docUrl && (
                        <a
                          href={activeStudent.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-600 font-semibold hover:underline flex items-center gap-1"
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
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Soal UKK (Cell R)</span>
                  <span className="text-[10px] text-indigo-600 font-medium">Disimpan di Kolom R</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  {topikOptions.map((topik) => (
                    <button
                      key={topik}
                      type="button"
                      onClick={() => setProjectTitle(topik)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition border flex items-center justify-between cursor-pointer ${
                        projectTitle === topik
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold ring-1 ring-indigo-500'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span>{topik}</span>
                      {projectTitle === topik && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Rubrik Penilaian Dinamis (8 Cols) */}
            <div className="lg:col-span-8 space-y-5">
              {/* STICKY SCORE OVERVIEW CARD - TIDAK IKUT TERSCROLL */}
              <div className="sticky top-[60px] sm:top-[68px] z-30 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5 justify-center sm:justify-start">
                    <Award className="w-4 h-4" />
                    <span>Nilai Akhir Siswa</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 truncate max-w-[280px]">
                    {activeStudent ? activeStudent.nama : 'Pilih Siswa'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeStudent?.kelas} • Soal: <span className="text-indigo-600 font-semibold">{projectTitle}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Skala 100 */}
                  <div className="text-center px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
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
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>Komponen & Indikator Rubrik</span>
                    </h3>
                    <p className="text-xs text-slate-500">Nilai dimulai dari Cell H sampai P (9 Komponen)</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
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
                        className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 transition space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              {item.no}
                            </span>
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.komponen}</h4>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
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
                              className="w-14 sm:w-16 bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                            />
                            <span className="text-xs font-semibold text-slate-500">/ {item.maksScore}</span>
                          </div>
                        </div>

                        {/* Quick Score Stepper */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
                          <span className="text-[11px] text-slate-500 font-medium">Beri skor cepat:</span>
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleScoreChange(item.no, 0, item.maksScore)}
                              className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200 cursor-pointer shadow-2xs"
                            >
                              0
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleScoreChange(item.no, Math.round(item.maksScore / 2), item.maksScore)
                              }
                              className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200 cursor-pointer shadow-2xs"
                            >
                              50% ({Math.round(item.maksScore / 2)})
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleScoreChange(item.no, Math.round(item.maksScore * 0.8), item.maksScore)
                              }
                              className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200 cursor-pointer shadow-2xs"
                            >
                              80% ({Math.round(item.maksScore * 0.8)})
                            </button>
                            <button
                              type="button"
                              onClick={() => handleScoreChange(item.no, item.maksScore, item.maksScore)}
                              className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[11px] font-bold text-indigo-700 border border-indigo-200 cursor-pointer shadow-2xs"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Catatan Penguji / Komentar (Cell S)
                    </label>
                    <textarea
                      rows={3}
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Masukkan catatan penilaian..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Guru Penguji (Otomatis)
                    </label>
                    <div className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-indigo-900 font-semibold flex items-center justify-between shadow-2xs">
                      <span className="truncate">{currentUser?.nama || '-'}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
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
      </div>
    )}

        {/* TAB 2: REKAP NILAI SEMUA SISWA (KHUSUS KAJUR INDRA BATARA) */}
        {(activeTab === 'semua_nilai' || !isKajur) && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>Rekapitulasi Nilai Seluruh Siswa UKK RPL</span>
                </h3>
                <p className="text-xs text-slate-500">Data nilai dari seluruh guru penguji terintegrasi langsung dengan sheet Penguji Pra UKK</p>
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
                <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-indigo-700 border border-slate-200">
                  {rekapSiswaList.length} dari {siswaList.length} Siswa
                </span>
              </div>
            </div>

            {/* Quick Search & Filter Bar di Tabel Rekap */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="w-full lg:w-72 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={rekapSearchQuery}
                  onChange={(e) => setRekapSearchQuery(e.target.value)}
                  placeholder="Cari nama, nomor, atau penguji..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter Kelas */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Kelas:</span>
                  <select
                    value={rekapKelas}
                    onChange={(e) => setRekapKelas(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer shadow-2xs"
                  >
                    {availableClasses.map((kls) => (
                      <option key={kls} value={kls}>
                        {kls === 'Semua' ? 'Semua Kelas' : kls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Penguji */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Penguji:</span>
                  <select
                    value={rekapPenguji}
                    onChange={(e) => setRekapPenguji(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer max-w-[180px] truncate shadow-2xs"
                  >
                    {availablePenguji.map((p) => (
                      <option key={p} value={p}>
                        {p === 'Semua' ? 'Semua Penguji' : p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Status Nilai */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Status:</span>
                  <select
                    value={rekapStatus}
                    onChange={(e) => setRekapStatus(e.target.value as any)}
                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer shadow-2xs"
                  >
                    <option value="semua">Semua Status</option>
                    <option value="sudah">Sudah Dinilai ({sudahDinilaiCount})</option>
                    <option value="belum">Belum Dinilai ({belumDinilaiCount})</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabel Data Rekap Nilai Lengkap */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rekapSiswaList.map((siswa, idx) => {
                    const hasScore = (siswa.total || 0) > 0;
                    const scoreVal = siswa.total || 0;
                    const calculatedSkala100 = Math.round((scoreVal / maxPossibleScore) * 100);

                    return (
                      <tr
                        key={siswa.no}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="py-3 px-3.5 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3.5 font-bold text-slate-900 capitalize">
                          {siswa.nama.toLowerCase()}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 font-medium">{siswa.kelas}</td>
                        <td className="py-3 px-3.5 text-indigo-700 font-semibold">
                          {siswa.project || 'Peminjaman Alat'}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {hasScore ? (
                            <span className="font-bold text-slate-900">{scoreVal}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {hasScore ? (
                            <span className="font-bold text-emerald-700">{calculatedSkala100}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {hasScore ? (
                            calculatedSkala100 > 90 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Sangat Kompeten
                              </span>
                            ) : calculatedSkala100 >= kkm ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Kompeten
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Belum Kompeten
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 truncate max-w-[130px]">
                          {siswa.penguji || '-'}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {siswa.docUrl ? (
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              <a
                                href={siswa.docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-semibold transition"
                                title="Buka PDF Dokumen Resmi"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>PDF</span>
                              </a>
                              {isKajur && (
                                <button
                                  type="button"
                                  disabled={singleGeneratingNo === siswa.no}
                                  onClick={() => handleGenerateSinglePdf(siswa)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-[11px] transition cursor-pointer disabled:opacity-50"
                                  title="Buat Ulang (Regenerate) PDF"
                                >
                                  {singleGeneratingNo === siswa.no ? (
                                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          ) : isKajur ? (
                            <button
                              type="button"
                              disabled={singleGeneratingNo === siswa.no}
                              onClick={() => handleGenerateSinglePdf(siswa)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                            >
                              {singleGeneratingNo === siswa.no ? (
                                <div className="w-3 h-3 border-2 border-indigo-600 border-t-indigo-600 rounded-full animate-spin" />
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
                              setSelectedNo(siswa.no);
                              setFilterMode('semua');
                              setSelectedKelas('Semua');
                              setActiveTab('penilaian');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold text-[11px] transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 text-center text-slate-800">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Data Tersimpan!</h3>
              <p className="text-xs text-slate-500">
                Nilai dan Soal UKK siswa telah berhasil disinkronkan ke Google Spreadsheet.
              </p>
            </div>

            {savedDataInfo && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Nama Siswa:</span>
                  <span className="font-bold text-slate-900 text-right capitalize">{savedDataInfo.nama.toLowerCase()}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Kelas:</span>
                  <span className="font-semibold text-slate-700">{savedDataInfo.kelas}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Soal UKK (Cell R):</span>
                  <span className="font-semibold text-indigo-700">{savedDataInfo.project}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Total Skor / Skala 100:</span>
                  <span className="font-bold text-emerald-700 text-sm">{savedDataInfo.nilaiAkhir} / 100</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Predikat:</span>
                  <span className="font-bold text-slate-900">{savedDataInfo.predikat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Guru Penguji:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[180px]">{savedDataInfo.penguji}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Generate Dokumen PDF (Kajur)</h3>
                  <p className="text-[11px] text-slate-400">Buat PDF penilaian resmi untuk siswa dari seluruh penguji</p>
                </div>
              </div>
              {!bulkGenerating && (
                <button
                  type="button"
                  onClick={() => setShowBulkPdfModal(false)}
                  className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-bold cursor-pointer"
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
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold ring-1 ring-indigo-500'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
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
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold ring-1 ring-indigo-500'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-xs text-indigo-300">Semua Siswa</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {siswaList.length} siswa total
                      </div>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1 text-[11px]">
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
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
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
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Panduan Rubrik Penilaian UKK</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRubrikModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 text-xs text-slate-300">
              {rubrik.map((r) => (
                <div key={r.no} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-center font-bold text-slate-900">
                    <span>{r.no}. {r.komponen}</span>
                    <span className="text-indigo-600 font-bold">Maks: {r.maksScore}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{r.indikator}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowRubrikModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
