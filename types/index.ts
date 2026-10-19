export interface Guru {
  id: string;
  username: string;
  nama: string;
  nip: string;
  jabatan: string;
  role: 'kajur' | 'guru' | 'eksternal';
}

export interface Siswa {
  no: number;
  kelas: string;
  nama: string;
  nis: string;
  project?: string;
  scores?: Record<string, number>;
  total?: number;
  catatan?: string;
  penguji?: string;
  docUrl?: string;
  updatedAt?: string;
}

export interface KomponenRubrik {
  no: number;
  komponen: string;
  indikator: string;
  maksScore: number;
  bobot?: string;
}

export interface PenilaianPayload {
  nis: string;
  nama: string;
  kelas: string;
  project: string;
  scores: Record<string, number>;
  total: number;
  catatan: string;
  penguji: string;
}
