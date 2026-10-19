import { Guru } from '@/types';

export const DAFTAR_GURU_RPL: Guru[] = [
  {
    id: '1',
    username: 'indrabatara',
    nama: 'Indra Batara, S.Pd., Gr.',
    nip: 'NIP. -',
    jabatan: 'Ketua Program Keahlian PPLG',
    role: 'kajur'
  },
  {
    id: '2',
    username: 'denisaji',
    nama: 'Denis Aji Muhamad Jabar, S.Kom., Gr.',
    nip: 'NIP. -',
    jabatan: 'Guru Produktif PPLG',
    role: 'guru'
  },
  {
    id: '3',
    username: 'cutadelya',
    nama: 'Cut Adelya Asna Thasya, S.Pd., Gr.',
    nip: 'NIP. -',
    jabatan: 'Sekretaris / Guru Produktif PPLG',
    role: 'guru'
  },
  {
    id: '4',
    username: 'sukanda',
    nama: 'Sukanda Wiguna, S.T., Gr.',
    nip: 'NIP. -',
    jabatan: 'Guru Produktif PPLG',
    role: 'guru'
  },
  {
    id: '5',
    username: 'sucisulastri',
    nama: 'Suci Sulastri, S.Kom., Gr.',
    nip: 'NIP. -',
    jabatan: 'Guru Produktif PPLG',
    role: 'guru'
  },
  {
    id: '6',
    username: 'dianhardiana',
    nama: 'Dian Hardiana, S.Kom., Gr.',
    nip: 'NIP. -',
    jabatan: 'Guru Produktif PPLG',
    role: 'guru'
  },
  {
    id: '7',
    username: 'alannuwary',
    nama: 'Alannuwary Banjarnahor, S.Pd.',
    nip: 'NIP. -',
    jabatan: 'Guru Produktif PPLG',
    role: 'guru'
  },
  {
    id: '8',
    username: 'rizkiabdillah',
    nama: 'Rizki Abdillah, S.Kom.',
    nip: 'NIP. -',
    jabatan: 'Guru Produktif PPLG',
    role: 'guru'
  },
  {
    id: '9',
    username: 'pernikdesi',
    nama: 'Pernik Desi, S.Pd.',
    nip: 'NIP. -',
    jabatan: 'Guru Produktif PPLG',
    role: 'guru'
  },
  {
    id: '10',
    username: 'mutiarazahra',
    nama: 'Mutiara Zahra, S.Pd.',
    nip: 'NIP. -',
    jabatan: 'Guru Produktif PPLG',
    role: 'guru'
  },
  {
    id: '11',
    username: 'darwan',
    nama: 'Darwan, S.Si',
    nip: 'CV Awana Academy',
    jabatan: 'Direktur CV Awana Academy / Penguji Industri',
    role: 'eksternal'
  },
  {
    id: '12',
    username: 'penguji',
    nama: 'Penguji UKK Mandiri',
    nip: 'DUDI / Praktisi',
    jabatan: 'Penguji Eksternal UKK',
    role: 'eksternal'
  }
];

export const DEFAULT_PASSWORD = process.env.DEFAULT_GURU_PASSWORD || 'rpl2026';

export function findGuruByUsername(username: string): Guru | undefined {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return DAFTAR_GURU_RPL.find(
    g => g.username.toLowerCase().replace(/[^a-z0-9]/g, '') === clean
  );
}
