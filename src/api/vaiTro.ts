import { api } from './client';
import type { VaiTro } from '../types/entities';

const BASE = '/api/vaitro';

type VaiTroRaw = Partial<VaiTro> & {
  iD_VaiTro?: number;
  maVaiTro?: string;
  tenVaiTro?: string;
  moTa?: string | null;
};

const toVaiTro = (raw: VaiTroRaw): VaiTro => ({
  ID_VaiTro: Number(raw.ID_VaiTro ?? raw.iD_VaiTro ?? 0),
  MaVaiTro: raw.MaVaiTro ?? raw.maVaiTro ?? '',
  TenVaiTro: raw.TenVaiTro ?? raw.tenVaiTro ?? '',
  MoTa: raw.MoTa ?? raw.moTa ?? null,
});

export const vaiTroApi = {
  getAll: async () => (await api.get<VaiTroRaw[]>(`${BASE}/get-all-vaitro`)).map(toVaiTro),
};
