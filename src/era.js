// The model can be shown at three moments. Everything that depends on the period reads it from here.
//   0 — triều Nguyễn, about 1885: the Citadel and its wards, the pagodas and the earlier tombs; no bridge at
//       Trường Tiền, no railway, no European quarter on the south bank
//   1 — thời Pháp thuộc, about 1935: Trường Tiền (1899), the railway and Ga Huế (1908), the Indochine quarter
//       along Lê Lợi, the later tombs
//   2 — today
export const ERAS = [
  { id: 'nguyen', year: 1885 },
  { id: 'french', year: 1935 },
  { id: 'today', year: 2026 },
];
export const era = { value: 2 };
const listeners = [];
export function onEra(fn) { listeners.push(fn); }
export function setEra(e) {
  e = Math.max(0, Math.min(2, e | 0));
  if (e === era.value) return;
  era.value = e;
  for (const fn of listeners) fn(e);
}

// The first era in which each labelled place exists (ids as in data.places; anything not listed: always).
// Dates are those of the structure the model shows, not of the institution.
export const PLACE_SINCE = {
  truongtien: 1, dongba: 1, quochoc: 1, gahue: 1, andinh: 1, bachho: 1, phucam: 2, dcct: 2, vincom: 2, phuxuan: 2,
  nguyenhoang: 2, ndchieu: 2, photay: 2, thuytien: 2, thienan: 2, khaidinh: 1, dongkhanh: 1, kientrung: 1,
  tuphuong: 1, thuongbac: 1, biaquochoc: 1, baotangcovat: 1, baotanghcm: 2, diemphungthi: 2, tayloc: 1, ancuu: 1, benngu: 1,
};
export const existsIn = (id, e = era.value) => (PLACE_SINCE[id] ?? 0) <= e;
