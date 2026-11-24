// Builds all 81 self-hosted hero .glb accent models into public/data/models/ using indexed geometries
// and normalized Uint8 vertex colors via Three.js GLTFExporter.
//
// Usage: node scripts/build-hero-glb.mjs
import fs from 'node:fs';
import path from 'node:path';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildGateWatchtowerHero } from './heroes/primitives.mjs';
import * as IMP from './heroes/imperial.mjs';
import * as TS from './heroes/tombs-sacred.mjs';
import * as CIV from './heroes/civic-bridges.mjs';

// Node polyfill for GLTFExporter binary (.glb) export (uses FileReader in browser)
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = `data:${blob.type};base64,${Buffer.from(buf).toString('base64')}`;
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
  };
}

const OUT_DIR = path.resolve(new URL('../public/data/models', import.meta.url).pathname);
fs.mkdirSync(OUT_DIR, { recursive: true });

const JOBS = [
  ['ngomon-hero.glb', IMP.buildNgoMonHero],
  ['thaihoa-hero.glb', IMP.buildThaiHoaHero],
  ['thienmu-hero.glb', TS.buildThienMuHero],
  ['khaidinh-hero.glb', TS.buildKhaiDinhHero],
  ['tuduc-hero.glb', TS.buildTuDucHero],
  ['minhmang-hero.glb', TS.buildMinhMangHero],
  ['hienlam-hero.glb', IMP.buildHienLamHero],
  ['themieu-hero.glb', IMP.buildTheMieuHero],
  ['phuvanlau-hero.glb', IMP.buildPhuVanLauHero],
  ['nghenhluong-hero.glb', IMP.buildNghenhLuongHero],
  ['andinh-hero.glb', IMP.buildAnDinhHero],
  ['canchanh-hero.glb', IMP.buildCanChanhHero],
  ['dientho-hero.glb', IMP.buildDienThoHero],
  ['thaimieu-hero.glb', IMP.buildThaiMieuHero],
  ['duyetthi-hero.glb', IMP.buildDuyetThiHero],
  ['trieumieu-hero.glb', IMP.buildTrieuMieuHero],
  ['truongsanh-hero.glb', IMP.buildTruongSanhHero],
  ['tangthulau-hero.glb', IMP.buildTangThuLauHero],
  ['hungmieu-hero.glb', IMP.buildHungMieuHero],
  ['baotangcovat-hero.glb', IMP.buildBaoTangCoVatHero],
  ['quoctugiam-hero.glb', IMP.buildQuocTuGiamHero],
  ['tuphuong-hero.glb', IMP.buildTuPhuongHero],
  ['biaquochoc-hero.glb', CIV.buildBiaQuocHocHero],
  ['thuongbac-hero.glb', IMP.buildThuongBacHero],
  ['tudam-hero.glb', TS.buildTuDamHero],
  ['quochoc-hero.glb', CIV.buildQuocHocHero],
  ['dongkhanh-hero.glb', TS.buildDongKhanhHero],
  ['thieutri-hero.glb', TS.buildThieuTriHero],
  ['kydai-hero.glb', IMP.buildKyDaiHero],
  ['hoquyen-hero.glb', IMP.buildHoQuyenHero],
  ['namgiao-hero.glb', IMP.buildNamGiaoHero],
  ['xatac-hero.glb', IMP.buildXaTacHero],
  ['hiennhon-hero.glb', IMP.buildHienNhonHero],
  ['chuongduc-hero.glb', IMP.buildChuongDucHero],
  ['dieude-hero.glb', TS.buildDieuDeHero],
  ['baoquoc-hero.glb', TS.buildBaoQuocHero],
  ['phucam-hero.glb', TS.buildPhuCamHero],
  ['dcct-hero.glb', TS.buildDcctHero],
  ['thienan-hero.glb', TS.buildThienAnHero],
  ['truongtien-hero.glb', CIV.buildTruongTienHero],
  ['dongba-hero.glb', CIV.buildDongBaHero],
  ['tinhtam-hero.glb', CIV.buildTinhTamHero],
  ['quantuong-hero.glb', CIV.buildQuanTuongHero],
  ['thuytien-hero.glb', CIV.buildThuyTienHero],
  ['baotanghcm-hero.glb', CIV.buildBaoTangHcmHero],
  ['diemphungthi-hero.glb', CIV.buildDiemPhungThiHero],
  ['gate-quangduc-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_quangduc_hero', upper: { w: 4.6, d: 4.0, over: 0.3, y0: 15.60, ry: 17.10 } })],
  ['gate-thuongtu-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_thuongtu_hero', upper: { w: 4.9, d: 4.6, over: 0.15, y0: 16.07, ry: 16.82 } })],
  ['gate-cuahau-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_cuahau_hero', upper: { w: 4.0, d: 3.0, over: 0.45, y0: 16.35, ry: 17.15 }, lower: { w: 8.6, d: 6.2, over: 0.45, y0: 12.65 } })],
  ['gate-anhoa-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_anhoa_hero', upper: { w: 5.0, d: 3.8, over: 0.6, y0: 19.90, ry: 21.40 }, lower: { w: 11.0, d: 7.0, over: 0.8, y0: 15.30 } })],
  ['gate-chanhtay-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_chanhtay_hero', upper: { w: 2.7, d: 2.2, over: 0.28, y0: 12.86, ry: 13.66 }, lower: { w: 6.3, d: 4.8, over: 0.30, y0: 10.66 } })],
  ['gate-cuahuu-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_cuahuu_hero', upper: { w: 3.6, d: 2.8, over: 0.55, y0: 13.34, ry: 14.09 } })],
  ['gate-nhado-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_nhado_hero', upper: { w: 4.9, d: 3.9, over: 0.30, y0: 15.95, ry: 16.70 }, lower: { w: 10.2, d: 7.6, over: 0.30, y0: 12.45 } })],
  ['gate-cuangan-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_cuangan_hero', upper: { w: 4.0, d: 3.6, over: 0.50, y0: 14.80, ry: 15.95 }, lower: { w: 8.5, d: 7.0, over: 0.60, y0: 11.80 } })],
  ['gate-dongba-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_dongba_hero', upper: { w: 4.2, d: 3.4, over: 0.28, y0: 14.25, ry: 14.75 }, lower: { w: 9.6, d: 6.2, over: 0.32, y0: 11.65 } })],
  ['gate-ketrai-hero.glb', () => buildGateWatchtowerHero({ name: 'gate_ketrai_hero', upper: { w: 6.12, d: 4.34, over: 0.68, y0: 14.226, ry: 16.436 }, lower: { w: 9.0, d: 7.0, over: 0.80, y0: 11.15 } })],
  ['photay-hero.glb', CIV.buildPhoTayHero],
  ['kinhthanh-hero.glb', IMP.buildKinhThanhHero],
  ['thuyxuan-hero.glb', CIV.buildThuyXuanHero],
  ['phuongduc-hero.glb', CIV.buildPhuongDucHero],
  ['sinh-hero.glb', CIV.buildSinhHero],
  ['nguyenhoang-hero.glb', CIV.buildNguyenHoangHero],
  ['bachho-hero.glb', CIV.buildBachHoHero],
  ['davien-hero.glb', CIV.buildDaVienHero],
  ['phuxuan-hero.glb', CIV.buildPhuXuanHero],
  ['giahoi-hero.glb', CIV.buildGiaHoiHero],
  ['golim-hero.glb', CIV.buildGoLimHero],
  ['ndchieu-hero.glb', CIV.buildNdChieuHero],
  ['conhen-hero.glb', CIV.buildConHenHero],
  ['ngubinh-hero.glb', TS.buildNguBinhHero],
  ['vongcanh-hero.glb', TS.buildVongCanhHero],
  ['ancuu-hero.glb', CIV.buildAnCuuHero],
  ['dainoi-hero.glb', IMP.buildDaiNoiHero],
  ['aeon-hero.glb', CIV.buildAeonHero],
  ['vincom-hero.glb', CIV.buildVincomHero],
  ['benngu-hero.glb', CIV.buildBenNguHero],
  ['benxebac-hero.glb', CIV.buildBenXeBacHero],
  ['benxenam-hero.glb', CIV.buildBenXeNamHero],
  ['mangca-hero.glb', IMP.buildMangCaHero],
  ['tayloc-hero.glb', CIV.buildTayLocHero],
  ['thuyquan-hero.glb', IMP.buildThuyQuanHero],
];

const exporter = new GLTFExporter();
let totalBytes = 0;
for (const [name, buildFn] of JOBS) {
  const scene = buildFn();
  const glb = await exporter.parseAsync(scene, { binary: true });
  const outPath = path.join(OUT_DIR, name);
  const buf = Buffer.from(glb);
  fs.writeFileSync(outPath, buf);
  totalBytes += buf.length;
  const g = scene.children[0].geometry;
  const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
  console.log(`wrote ${name} (${(buf.length / 1024).toFixed(1)} KB, ${tris} tris)`);
}
console.log(`total: ${JOBS.length} hero GLBs, ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
