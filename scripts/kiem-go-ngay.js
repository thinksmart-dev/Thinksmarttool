#!/usr/bin/env node
/**
 * KIEM KHAU GO / DAN NGAY SINH cua cong cu Tinh tuoi (public/js/tinhtuoi.js).
 *
 *   node scripts/kiem-go-ngay.js
 *
 * VI SAO CO FILE NAY (09/10/2026): cong thuc tinh tuoi da co scripts/kiem-tinh-tuoi.js
 * (102.347 phep tinh, 0 loi), nhung chay 100 ca GO THAT trong trinh duyet thi cho sai
 * lai nam o khau go: "5/22/1990" bi bien thanh "52/21/990", dan "DOB: 05/22/1990" mat
 * chu so cuoi, go thua mot so bi nuot im lang. File nay giu cac ca do lai lam chot chan.
 *
 * Dap an trong bang la VIET TAY theo yeu cau cua chu tool, khong lay tu chinh ham dang
 * kiem. Hai lop:
 *   A. Dan nguyen chuoi          (ttChuanHoaGo goi 1 lan)
 *   B. Go tung phim o CUOI o     (ttChuanHoaGo goi sau moi phim, nhu su kien input)
 * Kem: ly do tu choi (ttLyDoSai) va doi chung "ban cu se truot nhung ca nao".
 *
 * KHONG kiem duoc o day (phai mo trinh duyet): con tro khi sua o giua, boi den khi vao
 * o, cat ket qua cu khi doi ngay, ve lai khi qua dem.
 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'tinhtuoi.js'), 'utf8');
function lay(ten) {
  const i = src.indexOf('function ' + ten + '(');
  if (i < 0) throw new Error('khong thay ham ' + ten);
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
}
const XD = String.fromCharCode(10);
const api = new Function(['ttDungNgay', 'ttDocNgayTheo', 'ttDocNgayMy', 'ttChuanHoaGo', 'ttLyDoSai'].map(lay).join(XD) + XD +
  'return { ttDocNgayMy, ttChuanHoaGo, ttLyDoSai };')();

// Ban CU cua o nhap (truoc 09/10/2026), chep lai de lam DOI CHUNG: bo het ky tu khong
// phai so, cat 8 so, chen "/". O con co maxlength=10 nen chuoi dan bi cat con 10 ky tu.
function banCu(raw) {
  const so = String(raw).slice(0, 10).replace(/\D/g, '').slice(0, 8);
  if (so.length > 4) return so.slice(0, 2) + '/' + so.slice(2, 4) + '/' + so.slice(4);
  if (so.length > 2) return so.slice(0, 2) + '/' + so.slice(2);
  return so;
}

let dat = 0, truot = 0, cuTruot = 0;
function kiem(nhom, ten, ok, them) {
  if (ok) dat++; else truot++;
  if (!ok) console.log('  TRUOT [' + nhom + '] ' + ten + (them ? '  ' + them : ''));
}

// ---------- A. DAN NGUYEN CHUOI: [chuoi dan, o phai hien, co bao go thua] ----------
const DAN = [
  ['05/22/1990', '05/22/1990', false],
  ['5/22/1990', '05/22/1990', false],                // khong co so 0 dau
  ['5/2/1990', '05/02/1990', false],
  ['05/2/1990', '05/02/1990', false],
  ['5-22-1990', '05/22/1990', false],
  ['5.22.1990', '05/22/1990', false],
  ['5 22 1990', '05/22/1990', false],
  [' 05/22/1990', '05/22/1990', false],              // dau cach o dau (chep tu chat)
  ['05/22/1990 ', '05/22/1990', false],
  ['DOB: 05/22/1990', '05/22/1990', false],
  ['5/22/1990 0:00:00', '05/22/1990', false],        // Excel: gio phut sau nam thi bo
  ['1990-05-22', '05/22/1990', false],               // nam dung dau: chi co 1 cach hieu
  ['1990/5/2', '05/02/1990', false],
  ['05221990', '05/22/1990', false],
  ['０５２２１９９０', '05/22/1990', false],            // chu so toan chieu rong
  ['052219905', '05/22/1990', true],                 // go thua 1 so
  ['05/22/19990', '05/22/1999', true],               // ket phim o nam: PHAI bao
  ['5221990', '52/21/990', false],                   // go lien thieu so 0: khong doan, de bao "khong co thang 52"
  ['25/12/1990', '25/12/1990', false],               // ngay truoc thang sau: GIU NGUYEN de tu choi
  ['5/22/90', '05/22/90', false],                    // nam 2 so: khong doan the ky
  ['12/31/1899', '12/31/1899', false],
  ['', '', false],
  ['abc', '', false]
];
DAN.forEach(([vao, ra, thua]) => {
  const k = api.ttChuanHoaGo(vao);
  kiem('dan', JSON.stringify(vao), k.chuoi === ra && k.thua === thua, '-> ' + JSON.stringify(k) + ', mong ' + JSON.stringify(ra) + ' thua=' + thua);
  if (banCu(vao) !== ra) cuTruot++;
});

// ---------- B. GO TUNG PHIM O CUOI O: [day phim, o phai hien]  ("<" = phim xoa lui) ----------
function go(phim) {
  let v = '';
  for (const p of phim) {
    v = (p === '<') ? v.slice(0, -1) : v + p;
    v = api.ttChuanHoaGo(v).chuoi;
  }
  return v;
}
const GO = [
  ['05221990', '05/22/1990'],
  ['12251990', '12/25/1990'],
  ['5/22/1990', '05/22/1990'],
  ['5/2/1990', '05/02/1990'],
  ['05/22/1990', '05/22/1990'],                      // tu go ca dau "/"
  ['5-22-1990', '05/22/1990'],
  ['1/1/2000', '01/01/2000'],
  ['02/29/2000', '02/29/2000'],
  ['052', '05/2'],
  ['0522', '05/22'],
  ['05221', '05/22/1'],
  ['5/', '05/'],
  ['5/2/', '05/02/'],
  // Xoa lui tung phim tu mot ngay day du: moi lan bam PHAI ngan di, khong ket o dau "/"
  ['05221990<', '05/22/199'],
  ['05221990<<<<', '05/22/'],
  ['05221990<<<<<', '05/22'],
  ['05221990<<<<<<', '05/2'],
  ['05221990<<<<<<<', '05/'],
  ['05221990<<<<<<<<', '05'],
  ['05221990<<<<<<<<<<', ''],
  // Go sai roi xoa lui go lai
  ['0522199<<<1985', '05/22/1985'],
  ['5/22/1990<<<<1985', '05/22/1985']
];
GO.forEach(([phim, ra]) => {
  const k = go(phim);
  kiem('go', JSON.stringify(phim), k === ra, '-> ' + JSON.stringify(k) + ', mong ' + JSON.stringify(ra));
});
// Xoa lui tu mot ngay day du ve rong: do dai PHAI giam dan, khong bao gio dung yen
{
  let v = go('05221990'), ket = false;
  for (let i = 0; i < 12 && v; i++) {
    const sau = api.ttChuanHoaGo(v.slice(0, -1)).chuoi;
    if (sau.length >= v.length) ket = true;
    v = sau;
  }
  kiem('go', 'xoa lui khong bi ket', !ket && v === '');
}

// ---------- C. DOC DUOC THANH NGAY NAO sau khi chuan hoa ----------
const DOC = [
  ['5/22/1990', 1990, 5, 22], ['1990-05-22', 1990, 5, 22], ['DOB: 05/22/1990', 1990, 5, 22],
  ['2/29/2000', 2000, 2, 29], ['12/1/1990', 1990, 12, 1]
];
DOC.forEach(([vao, nam, thang, ngay]) => {
  const ns = api.ttDocNgayMy(api.ttChuanHoaGo(vao).chuoi).ns;
  kiem('doc', JSON.stringify(vao), !!ns && ns.nam === nam && ns.thang === thang && ns.ngay === ngay, '-> ' + JSON.stringify(ns && [ns.nam, ns.thang, ns.ngay]));
});
// Nhung chuoi PHAI bi tu choi, kem dung ly do
const TUCHOI = [
  ['25/12/1990', 'viet'], ['52/21/990', 'dang'], ['05/22/90', 'dang'], ['12/31/1899', 'nam'],
  ['01/01/2101', 'nam'], ['02/30/1990', 'khong-co'], ['02/29/1999', 'khong-co'], ['13/13/1990', 'khong-co'],
  ['00/10/1990', 'khong-co'], ['', 'dang']
];
TUCHOI.forEach(([chuoi, lyDo]) => {
  const ns = api.ttDocNgayMy(chuoi).ns;
  const l = api.ttLyDoSai(chuoi);
  kiem('tu choi', JSON.stringify(chuoi), !ns && l === lyDo, '-> ns=' + JSON.stringify(ns) + ' ly do ' + l + ', mong ' + lyDo);
});

const tong = DAN.length + GO.length + 1 + DOC.length + TUCHOI.length;
console.log('Dan nguyen chuoi : ' + DAN.length + ' ca');
console.log('Go tung phim     : ' + (GO.length + 1) + ' ca');
console.log('Doc thanh ngay   : ' + DOC.length + ' ca  |  Tu choi dung ly do: ' + TUCHOI.length + ' ca');
console.log('Doi chung: ban CU (truoc 09/10) ra sai ' + cuTruot + '/' + DAN.length + ' ca dan. Phai > 0, neu = 0 la bang ca khong bat duoc gi.');
console.log('TONG: ' + tong + ' ca, ' + dat + ' dat, ' + truot + ' truot.');
process.exit(truot || cuTruot === 0 ? 1 : 0);
