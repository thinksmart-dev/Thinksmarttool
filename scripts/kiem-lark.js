#!/usr/bin/env node
/**
 * KIEM PHAN GUI LARK cua nut Request (server.js, 09/10/2026).
 *
 *   node scripts/kiem-lark.js
 *
 * Khong dung link bot that: dung mot may chu Lark GIA o 127.0.0.1, ghi lai dung
 * thu server.js gui toi. Cat 4 ham ra khoi server.js theo ten (cung cach voi
 * scripts/kiem-tinh-tuoi.js) nen kiem dung ma dang chay, khong phai ban chep.
 *
 * Kiem gi:
 *   1. The duoc nhan              -> ok, dang 'the', chu cua sale CHI nam trong plain_text
 *   2. Lark tu choi the           -> tu gui lai dang chu, dau "<" bi doi (khong nhac ca nhom duoc)
 *   3. Lark tu choi ca hai        -> bao hong, khong gia vo thanh cong
 *   4. Lark khong tra loi         -> dung sau ~4 giay, KHONG gui lan hai
 *   5. Chua co link / link la     -> khong gui gi ca
 *   6. Chu ky                     -> khop voi ban tinh bang Python (cai dat doc lap)
 *
 * CHUA kiem duoc o day: Lark THAT co nhan dung dang the nay khong. Viec do chi
 * biet khi co link bot that; neu Lark tu choi the thi nhanh so 2 se cuu.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
function lay(ten) {
  let i = src.indexOf('async function ' + ten + '(');
  if (i < 0) i = src.indexOf('function ' + ten + '(');
  if (i < 0) throw new Error('khong thay ham ' + ten + ' trong server.js');
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
}
const XD = String.fromCharCode(10);
const api = new Function('crypto', 'process',
  ['larkUrlHopLe', 'larkKy', 'larkThan', 'larkGui'].map(lay).join(XD) + XD +
  'return { larkUrlHopLe, larkKy, larkThan, larkGui };')(crypto, process);

// Chu sale go, co y nhet thu doc: the <at> (nhac ca nhom) va link kieu markdown.
const YC = {
  tieu_de: 'Anh SMS IUL cho tho nail <at user_id="all"></at>',
  noi_dung: 'Can 3 tam, xem [bam vao day](http://vi-du.test) <at user_id="all">moi nguoi</at>',
  nhom_khach: 'Tho nail 40-55 tuoi',
  trang: 'tool', nguoi: 'Nguyen Van A', phong: 'Sale'
};
const TRANG = 'https://tool.thinksmartinsurance.com/members';

let kieuTraLoi = 'nhan';      // nhan | tu-choi-the | tu-choi-het | im
let nhanDuoc = [];
const dangTreo = [];
const gia = http.createServer((req, res) => {
  let s = '';
  req.on('data', c => { s += c; });
  req.on('end', () => {
    const b = JSON.parse(s);
    nhanDuoc.push(b);
    if (kieuTraLoi === 'im') { dangTreo.push(res); return; }   // khong tra loi: de server.js tu het gio
    const tuChoi = kieuTraLoi === 'tu-choi-het' || (kieuTraLoi === 'tu-choi-the' && b.msg_type === 'interactive');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(tuChoi ? { code: 19002, msg: 'params error' } : { code: 0, msg: 'success' }));
  });
});

let dat = 0, truot = 0;
function kiem(ten, dieuKien, them) {
  if (dieuKien) dat++; else truot++;
  console.log((dieuKien ? '  DAT   ' : '  TRUOT ') + ten + (them ? '  [' + them + ']' : ''));
}

// Chu cua sale co nam o cho nao KHONG PHAI plain_text trong the khong?
function loChuNgoaiPlainText(nut) {
  let lo = false;
  (function di(o) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(di); return; }
    Object.keys(o).forEach(k => {
      const v = o[k];
      if (typeof v === 'string') {
        if (k === 'content' && o.tag !== 'plain_text' && (v.includes('user_id') || v.includes('vi-du.test'))) lo = true;
      } else di(v);
    });
  })(nut);
  return lo;
}

gia.listen(0, '127.0.0.1', async () => {
  const url = 'http://127.0.0.1:' + gia.address().port + '/open-apis/bot/v2/hook/gia';

  console.log('1. The duoc nhan');
  kieuTraLoi = 'nhan'; nhanDuoc = [];
  let kq = await api.larkGui(url, '', YC, TRANG);
  const the = nhanDuoc[0] || {};
  const theChu = JSON.stringify(the);
  kiem('ok va dang the', kq.ok === true && kq.cach === 'the', JSON.stringify(kq));
  kiem('gui dung 1 lan', nhanDuoc.length === 1, 'so lan: ' + nhanDuoc.length);
  kiem('tieu de the la plain_text va co tieu de cua sale',
    !!the.card && the.card.header.title.tag === 'plain_text' && the.card.header.title.content.includes('Anh SMS IUL'));
  kiem('co nguoi gui + phong', theChu.includes('Nguyen Van A (Sale)'));
  kiem('co nhom khach hang', theChu.includes('Tho nail 40-55 tuoi'));
  kiem('co noi dung', theChu.includes('Can 3 tam'));
  kiem('chu cua sale CHI nam trong plain_text', loChuNgoaiPlainText(the) === false);
  kiem('khong co the lark_md nao', theChu.includes('lark_md') === false);
  kiem('nut mo dung trang Members', theChu.includes(TRANG));
  // Doi chung cho may do "lo chu": mot the co y nhet chu sale vao lark_md PHAI bi bat
  kiem('doi chung: may do bat duoc the lark_md',
    loChuNgoaiPlainText({ tag: 'div', text: { tag: 'lark_md', content: YC.noi_dung } }) === true);

  console.log('2. Lark tu choi the -> gui lai dang chu');
  kieuTraLoi = 'tu-choi-the'; nhanDuoc = [];
  kq = await api.larkGui(url, '', YC, TRANG);
  kiem('ok va dang chu', kq.ok === true && kq.cach === 'chu', JSON.stringify(kq));
  kiem('gui 2 lan: the roi chu',
    nhanDuoc.length === 2 && nhanDuoc[0].msg_type === 'interactive' && nhanDuoc[1].msg_type === 'text');
  const chu = (nhanDuoc[1] && nhanDuoc[1].content && nhanDuoc[1].content.text) || '';
  kiem('tin chu khong con dau "<"', chu.length > 0 && chu.includes('<') === false, chu.length + ' ky tu');
  kiem('tin chu du 4 phan',
    chu.includes('Anh SMS IUL') && chu.includes('Nguyen Van A') && chu.includes('Tho nail 40-55') && chu.includes('Can 3 tam'));

  console.log('3. Lark tu choi ca hai');
  kieuTraLoi = 'tu-choi-het'; nhanDuoc = [];
  kq = await api.larkGui(url, '', YC, TRANG);
  kiem('bao hong, ly do lark_tu_choi', kq.ok === false && kq.ly_do === 'lark_tu_choi', JSON.stringify(kq));

  console.log('4. Lark khong tra loi');
  kieuTraLoi = 'im'; nhanDuoc = [];
  const t0 = Date.now();
  kq = await api.larkGui(url, '', YC, TRANG);
  const ms = Date.now() - t0;
  kiem('bao hong, ly do khong_toi', kq.ok === false && kq.ly_do === 'khong_toi', JSON.stringify(kq));
  kiem('dung trong 3,5 den 5 giay', ms >= 3500 && ms <= 5000, ms + ' ms');
  kiem('khong gui lan hai', nhanDuoc.length === 1, 'so lan: ' + nhanDuoc.length);
  dangTreo.forEach(r => { try { r.destroy(); } catch (e) {} });

  console.log('5. Chua co link / link la');
  kieuTraLoi = 'nhan'; nhanDuoc = [];
  kq = await api.larkGui('', '', YC, TRANG);
  kiem('link rong -> chua_noi', kq.ok === false && kq.ly_do === 'chua_noi');
  kq = await api.larkGui('https://vi-du.test/open-apis/bot/v2/hook/x', '', YC, TRANG);
  kiem('ten mien la -> url_sai', kq.ok === false && kq.ly_do === 'url_sai');
  kq = await api.larkGui('https://open.larksuite.com/duong-khac/x', '', YC, TRANG);
  kiem('dung ten mien, sai duong dan -> url_sai', kq.ok === false && kq.ly_do === 'url_sai');
  kiem('link Lark that dung dang -> hop le', api.larkUrlHopLe('https://open.larksuite.com/open-apis/bot/v2/hook/abc-123') === true);
  kiem('link Feishu dung dang -> hop le', api.larkUrlHopLe('https://open.feishu.cn/open-apis/bot/v2/hook/abc-123') === true);
  process.env.VERCEL = '1';
  kiem('tren Vercel: 127.0.0.1 KHONG hop le', api.larkUrlHopLe(url) === false);
  delete process.env.VERCEL;
  kiem('khong co gi duoc gui trong muc 5', nhanDuoc.length === 0, 'so lan: ' + nhanDuoc.length);

  console.log('6. Chu ky');
  const ky = api.larkKy({ msg_type: 'text' }, 'bi-mat-thu', 1791500000);
  let py = '';
  try {
    py = execFileSync('python', ['-c',
      'import hmac,hashlib,base64,sys;print(base64.b64encode(hmac.new((sys.argv[1]+chr(10)+sys.argv[2]).encode(),digestmod=hashlib.sha256).digest()).decode())',
      '1791500000', 'bi-mat-thu']).toString().trim();
  } catch (e) { py = 'KHONG CHAY DUOC PYTHON: ' + e.message; }
  kiem('co timestamp dang chuoi + sign 44 ky tu',
    ky.timestamp === '1791500000' && typeof ky.sign === 'string' && ky.sign.length === 44);
  kiem('sign khop ban Python', ky.sign === py, 'js ' + ky.sign + ' | py ' + py);
  kiem('khong co secret -> khong them gi', Object.keys(api.larkKy({ msg_type: 'text' }, '', 1)).join() === 'msg_type');
  nhanDuoc = [];
  await api.larkGui(url, 'bi-mat-thu', YC, TRANG);
  kiem('tin gui di co kem chu ky', !!(nhanDuoc[0] && nhanDuoc[0].sign && nhanDuoc[0].timestamp));

  gia.close();
  console.log('');
  console.log('TONG: ' + dat + ' dat, ' + truot + ' truot.');
  process.exit(truot ? 1 : 0);
});
