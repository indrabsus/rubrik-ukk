import defaultRubrik from '@/data/rubrik.json';
import defaultSiswa from '@/data/siswa.json';
import { KomponenRubrik, Siswa, PenilaianPayload } from '@/types';

const rawGasUrl = process.env.NEXT_PUBLIC_GAS_API_URL || process.env.GAS_API_URL || '';
const GAS_API_URL = (rawGasUrl.includes('AKfycb...') || !rawGasUrl.startsWith('http')) ? '' : rawGasUrl;

/**
 * Mengambil komponen rubrik dari Sheet 'Penilaian'.
 * Jika sheet belum diisi atau API belum diset, menggunakan default rubrik.
 */
export async function getRubrikData(): Promise<KomponenRubrik[]> {
  if (!GAS_API_URL) {
    return defaultRubrik as KomponenRubrik[];
  }

  try {
    const url = `${GAS_API_URL}?action=getRubrik&t=${Date.now()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && Array.isArray(json.rubrik) && json.rubrik.length > 0) {
      return json.rubrik.map((item: any, idx: number) => ({
        no: Number(item.no || idx + 1),
        komponen: String(item.komponen || `Komponen ${idx + 1}`),
        indikator: String(item.indikator || '-'),
        maksScore: Number(item.maksScore || item.maks || 10),
        bobot: item.bobot ? String(item.bobot) : `${item.maksScore || 10}%`
      }));
    }
  } catch (err) {
    console.warn('[SheetsClient] Gagal fetch rubrik dari GAS, menggunakan fallback:', err);
  }

  return defaultRubrik as KomponenRubrik[];
}

/**
 * Mengambil daftar siswa aktif dari Sheet 'Data Siswa'.
 */
export async function getSiswaData(): Promise<Siswa[]> {
  if (!GAS_API_URL) {
    return defaultSiswa as Siswa[];
  }

  try {
    const url = `${GAS_API_URL}?action=getSiswa&t=${Date.now()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && Array.isArray(json.siswa) && json.siswa.length > 0) {
      return json.siswa.map((item: any) => {
        const scores: Record<number, number> = {};
        for (let k = 1; k <= 9; k++) {
          if (item.scores && item.scores[k] !== undefined) {
            scores[k] = Number(item.scores[k]) || 0;
          } else if (item['skor' + k] !== undefined && item['skor' + k] !== '') {
            scores[k] = Number(item['skor' + k]) || 0;
          } else {
            scores[k] = 0;
          }
        }
        return {
          no: Number(item.no || item.rowIdx || 0),
          kelas: String(item.kelas || 'XII RPL').trim(),
          nama: String(item.nama || '').trim(),
          nis: String(item.nis || '').trim(),
          project: String(item.project || '').trim(),
          scores: scores,
          total: (item.total !== '' && item.total !== null && item.total !== undefined) ? Number(item.total) : 0,
          catatan: String(item.catatan || '-').trim(),
          penguji: String(item.penguji || '-').trim(),
          docUrl: String(item.docUrl || '').trim()
        };
      });
    }
  } catch (err) {
    console.warn('[SheetsClient] Gagal fetch siswa dari GAS, menggunakan fallback:', err);
  }

  return defaultSiswa as Siswa[];
}

/**
 * Menyimpan nilai ke Spreadsheet melalui GAS API.
 */
export async function saveNilaiToSheet(payload: PenilaianPayload): Promise<{ success: boolean; message: string; docUrl?: string }> {
  if (!GAS_API_URL) {
    return {
      success: true,
      message: 'Mode offline: Nilai tersimpan di sesi lokal (atur NEXT_PUBLIC_GAS_API_URL untuk sinkronisasi ke Spreadsheet).'
    };
  }

  try {
    const res = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveNilai',
        ...payload
      })
    });

    const json = await res.json();
    return {
      success: json.success ?? true,
      message: json.message || 'Nilai berhasil disinkronkan ke Spreadsheet!',
      docUrl: json.docUrl
    };
  } catch (err: any) {
    console.error('[SheetsClient] Error saveNilai:', err);
    return {
      success: false,
      message: `Gagal sinkron ke Spreadsheet: ${err.message || 'Network error'}`
    };
  }
}

/**
 * Trigger Mail Merge Dokumen Docs melalui GAS API.
 */
export async function triggerMailMerge(payload: PenilaianPayload): Promise<{ success: boolean; docUrl?: string; message: string }> {
  if (!GAS_API_URL) {
    return {
      success: false,
      message: 'Konfigurasikan NEXT_PUBLIC_GAS_API_URL untuk mengaktifkan Mail Merge Google Docs.'
    };
  }

  try {
    const res = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'mailMerge',
        ...payload
      })
    });

    const json = await res.json();
    return {
      success: json.success ?? true,
      docUrl: json.docUrl,
      message: json.message || 'Dokumen berhasil digenerate!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal Mail Merge: ${err.message}`
    };
  }
}
