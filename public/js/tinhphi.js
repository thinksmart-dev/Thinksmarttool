/**
 * THINKSMART TOOL — TÍNH PHÍ BẢO HIỂM (Quote Calculator)
 * Đưa về từ bản chủ tool đã làm trên forum.thinksmartinsurance.com (10/08/2026).
 *
 * ☠️ ĐÂY LÀ BẢNG TRA, KHÔNG PHẢI CÔNG THỨC. Không có tổ hợp thì trả về KHÔNG CÓ —
 * tuyệt đối không nội suy, không lấy mức gần nhất, không làm tròn. Sai một con số
 * là sale báo sai bậc phí cho khách hàng thật.
 *
 * Dữ liệu: public/data/bang-phi-termlife.json — SINH RA từ
 * `scripts/bang-phi-termlife-nlg.txt` bằng `node scripts/doi-bang-phi.js`.
 * Nguồn gốc là Google Sheet do SẾP của chủ tool làm và kiểm tra.
 * Đã kiểm: 161/161 dòng khớp tổng kiểm tra · 8/8 ca khớp bản forum đang chạy.
 *
 * ☠️ MỖI HẠNG SỨC KHOẺ MỘT BỘ MỆNH GIÁ VÀ MỘT KHOẢNG TUỔI KHÁC NHAU:
 *   SNTBC  11 mệnh giá, tuổi 20–54   ·   STBC/ENTBC1  3 mệnh giá, tuổi 30–70 / 30–54
 *   FEMALE + STBC: KHÔNG CÓ (sếp chủ tool cố ý — đã xác nhận, đừng coi là thiếu sót)
 * Chủ tool chốt: tổ hợp không có số thì ẨN/LÀM MỜ nút, không cho bấm rồi mới báo lỗi.
 *
 * ☠️ IUL KHÁC TERM LIFE VỀ CƠ CẤU — đừng gộp code:
 *   Term Life: không chọn kỳ hạn, trả về BỐN số (10/15/20/30 năm).
 *   IUL      : CHỌN kỳ hạn 15 hoặc 20 năm, trả về MỘT số.
 *   Và mỗi (kỳ hạn × giới tính × sức khoẻ) có bộ mệnh giá + khoảng tuổi RIÊNG:
 *     20 năm NTBC 31–33 mệnh giá tuổi 1–65 · EX1 10–11 mệnh giá · TBC tuổi 18–60
 *     15 năm CHỈ CÓ NTBC (nam & nữ), tuổi 45–60, 5 mệnh giá — chọn 15 năm thì
 *     TBC/EX1 phải bị KHOÁ (đã đo trên forum: đúng như vậy, là CỐ Ý của hãng).
 *
 * ☠️ 6 ô trong bảng IUL 20 năm NTBC phá vỡ quy luật tỉ lệ (nghi gõ nhầm trong file
 * gốc, và forum cũng đang trả về đúng những số đó). Chủ tool chốt 10/08/2026:
 * "số Drive là chuẩn" → GIỮ NGUYÊN. Danh sách 6 ô ghi ở đầu
 * `scripts/bang-phi-iul-nlg-20nam-ntbc.txt`. ĐỪNG tự sửa ở đây.
 */

let tpBang = null;          // bảng phí TERM LIFE
let tpDangNap = null;       // promise đang nạp (tránh gọi mạng nhiều lần)
let tpIul = null;           // bảng phí IUL
let tpIulDangNap = null;

const TP_GIOI = [
  { ma: 'MALE', ten: 'Nam' },
  { ma: 'FEMALE', ten: 'Nữ' }
];
// ☠️ HAI CHƯƠNG TRÌNH DÙNG HAI BỘ NHÃN KHÁC NHAU — giữ đúng nhãn bản forum để đội
// sale không phải học lại. Term Life: SNTBC/STBC/ENTBC1 · IUL: NTBC/TBC/EX1.
// Dùng nhầm bộ là tra không ra dòng nào.
const TP_SUCKHOE = [
  { ma: 'SNTBC', ten: 'SNTBC', mo: 'Standard Non-Tobacco' },
  { ma: 'STBC', ten: 'STBC', mo: 'Standard Tobacco' },
  { ma: 'ENTBC1', ten: 'ENTBC1', mo: 'Express Non-Tobacco 1' }
];
const TP_SUCKHOE_IUL = [
  { ma: 'NTBC', ten: 'NTBC', mo: 'Standard Non-Tobacco' },
  { ma: 'TBC', ten: 'TBC', mo: 'Standard Tobacco' },
  { ma: 'EX1', ten: 'EX1', mo: 'Express Non-Tobacco 1' }
];
const TP_KYHAN_IUL = [{ ma: '15', ten: '15 năm' }, { ma: '20', ten: '20 năm' }];

// ---- PDF MINH HOẠ CỦA HÃNG — MỘT FILE CHO MỘT TỔ HỢP -----------------------
// Bảng tra nằm ở `public/data/pdf-minh-hoa.json` (đọc phần `_kiemChung` trong đó).
//
// ☠️☠️ LẦN ĐẦU TÔI GẮN NHẦM, VÀ ĐÂY LÀ CÁCH TÔI NHẦM — ĐỪNG LẶP LẠI:
// Drive có thư mục "File Thành phẩm" chứa đúng 4 file `NLG IUL.pdf` ·
// `NLG Termlife.pdf` · `AIG IUL.pdf` · `AIG Termlife.pdf`. Tên khớp hoàn hảo với
// hai chương trình của màn này. Tôi kiểm QUYỀN chia sẻ, kiểm TÊN, kiểm DUNG LƯỢNG
// rồi gắn — **chưa một lần mở file ra xem**. Chủ tool bấm thử: nó ra một BẢN BÁO
// GIÁ ĐÃ ĐIỀN TÊN KHÁCH THẬT. "Thành phẩm" nghĩa đúng là thành phẩm.
// → Khớp tên KHÔNG phải là kiểm. Thứ sẽ tới tay 77 sale thì phải MỞ RA ĐỌC.
// → Bộ hiện tại đã kiểm hai lớp: (1) mở file đọc — "FlexLife … For SAMPLE QUOTE",
//   bản minh hoạ chính thức của hãng; (2) phí ghi trong TÊN FILE khớp **8/8** với
//   `bang-phi-iul.json`, kể cả file 15 năm.
let tpPdf = null;
let tpPdfDangNap = null;
function tpNapPdf() {
  if (tpPdf) return tpPdfDangNap;
  if (tpPdfDangNap) return tpPdfDangNap;
  tpPdfDangNap = fetch('/data/pdf-minh-hoa.json')
    .then(r => r.ok ? r.json() : null)
    .then(j => { tpPdf = j; return j; })
    .catch(() => null);
  return tpPdfDangNap;
}

// ---- BẢNG TRA FILE THEO TỪNG TỔ HỢP (11/08/2026) --------------------------
// 5.181 tổ hợp IUL, mỗi tổ hợp một CẶP pdf+csv → bấm là tải đúng file, không phải
// mở thư mục rồi tự dò. Nguồn: danh sách file trên Drive của sếp.
// ☠️ File 505 KB nên nạp RIÊNG và chỉ khi mở màn Tính phí — đừng gộp vào
// `pdf-minh-hoa.json` (file đó nhỏ, nạp cùng lúc, giữ vai trò khác: thư mục + 8
// file lẻ + toàn bộ ghi chú cấm).
// ☠️ Mỗi dòng trong đó đã qua 4 cửa: đọc được kỳ hạn · tổ hợp có thật trong bảng
// phí · **phí ghi trong TÊN FILE khớp bảng phí** · hai link hợp lệ và khác nhau.
// Cửa thứ ba là cửa quan trọng nhất — nó chính là thứ bắt được bản v1 gán sai
// (trộn file 15 năm vào 20 năm). Nạp bộ mới thì PHẢI kiểm lại đúng 4 cửa đó.
let tpFile = null;
let tpFileDangNap = null;
function tpNapFile() {
  if (tpFile) return tpFileDangNap;
  if (tpFileDangNap) return tpFileDangNap;
  tpFileDangNap = fetch('/data/pdf-file-iul.json')
    .then(r => r.ok ? r.json() : null)
    .then(j => { tpFile = j; return j; })
    .catch(() => null);
  return tpFileDangNap;
}

// Tổ hợp đang chọn có file map sẵn (tải thẳng) không?
// ☠️ Tuyệt đối không trả về "file gần đúng": bản minh hoạ ghi rõ tuổi + mệnh giá +
// phí trên từng trang, đưa nhầm một bản là sale gửi khách con số của người khác.
// Trả về { pdf: id, csv: id|null, ten } hoặc null.
function tpFilePdf() {
  // (1) Bảng tra 5.181 tổ hợp — CẶP pdf+csv, dạng nén "pdfId,csvId".
  if (tpFile && tpFile.file && tpChon.chuongTrinh === 'IUL') {
    const c = tpFile.file[`${tpChon.kyHan}|${tpChon.gioi}|${tpChon.sucKhoe}|${tpChon.tuoi}|${tpChon.menhGia}`];
    if (c) {
      const [pdf, csv] = c.split(',');
      return { pdf, csv: csv || null, ten: tpTenFileDrive() };
    }
  }

  // (2) 8 file lẻ sếp chia sẻ trực tiếp — chỉ có PDF, nhưng có ca 15 năm mà
  //     bảng trên chưa phủ, nên vẫn giữ làm lớp dự phòng.
  if (!tpPdf) return null;
  const kyHan = tpChon.chuongTrinh === 'IUL' ? tpChon.kyHan : '-';
  const f = tpPdf.file && tpPdf.file[`${tpChon.chuongTrinh}|${kyHan}|${tpChon.gioi}|${tpChon.sucKhoe}|${tpChon.tuoi}|${tpChon.menhGia}`];
  return f ? { pdf: f.id, csv: null, ten: f.ten } : null;
}

// Thư mục Drive SÂU NHẤT còn biết được cho tổ hợp này, dò từ sâu ra nông:
//   mệnh giá → nhóm (giới+hạng) → chương trình.
// Lùi một tầng chỉ tốn thêm một cú bấm cho sale; đoán bừa thì đưa nhầm tài liệu.
// ☠️ KHÔNG có nhánh "lấy mệnh giá gần nhất". Bản minh hoạ in rõ mệnh giá trên
// từng trang — đưa nhầm là sale gửi khách con số của hợp đồng khác.
function tpThuMucPdf() {
  if (!tpPdf || !tpPdf.thuMuc || tpChon.chuongTrinh !== 'IUL') return null;
  const t = tpPdf.thuMuc;
  const goc = `IUL|${tpChon.kyHan}`;
  return t[`${goc}|${tpChon.gioi}|${tpChon.sucKhoe}|${tpChon.menhGia}`]
      || t[`${goc}|${tpChon.gioi}|${tpChon.sucKhoe}`]
      || t[goc] || null;
}

// ☠️ TÊN FILE TRÊN DRIVE SUY ĐƯỢC TỪ CHÍNH DỮ LIỆU TOOL — đã đối chiếu và khớp
// (Male NTBC 1T/2T/3T $100k, 35T $600k, và 8 file Female). Hiện tên ra màn hình để
// sale mở Drive là biết đúng file nào cần lấy, khỏi dò trong hàng trăm file.
// ⚠️ Đây CHỈ để người đọc, KHÔNG dùng để khớp tự động: định dạng phí trong tên file
// không nhất quán ($612.60 nhưng cũng có $180) — xem `_camKhongDuocLam` trong JSON.
function tpTenFileDrive() {
  if (tpChon.chuongTrinh !== 'IUL') return '';
  const gioi = tpChon.gioi === 'MALE' ? 'Male' : 'Female';
  // ☠️ DỪNG Ở MỆNH GIÁ, KHÔNG ghép phí vào. Phí là phần duy nhất trong tên file có
  // định dạng không nhất quán ($612.60 nhưng cũng có $180) — ghép vào là sale dán
  // đi tìm rồi Drive báo không thấy, dù file vẫn nằm ngay đó.
  // Ba phần này đã đủ định danh: trong một thư mục chỉ có đúng một tuổi × mệnh giá.
  return `${gioi} - ${tpChon.sucKhoe} - ${tpChon.tuoi}T - $${tpChon.menhGia.toLocaleString('en-US')}`;
}

const TP_ICON_TAI = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

// Hai nút tải theo chương trình đang chọn: PDF minh hoạ (Drive) + CSV bảng phí.
// PDF dùng link `export=download` để bấm là tải thẳng, không phải qua trang xem
// của Drive rồi bấm thêm lần nữa.
// ☠️ KHÔNG CÓ PDF thì LÀM MỜ NÚT, KHÔNG ẨN — đúng luật đã áp cho nút hạng sức khoẻ
// ở màn này (chủ tool chốt 10/08/2026: ẩn đi thì sale tưởng tool thiếu, làm mờ thì
// hiểu là hãng không có). Tôi ẩn hẳn ở bản đầu và chủ tool báo ngay: "không có nút
// tải file pdf nè em" — đúng cái hiểu nhầm mà luật này sinh ra để chặn.
// Nút mờ còn nói thêm được LÝ DO, thứ mà chỗ trống không nói được.
// Ba mức, xuống dần theo thứ tự CHẮC CHẮN — không có mức nào là đoán:
//   1. Có ID file       → tải thẳng, một cú bấm.
//   2. Biết thư mục     → mở đúng thư mục trên Drive + CHỈ RÕ TÊN FILE cần lấy.
//   3. Không biết gì    → nút mờ, nói thẳng là chưa có.
// ☠️ ĐÚNG HAI NÚT, VÀ CHỈ Ở MÀN IUL — chủ tool chốt 11/08/2026:
//   "nhiều nút download quá, chỉ cần 2 nút PDF và CSV là được, còn lại không cần"
//   "ở Term Life xoá giúp anh 2 nút download, chỉ cần phần 10-15-20-30 năm"
// Đã GỠ theo yêu cầu đó:
//   · nút "Tải CSV bảng phí" (CSV tự sinh từ bảng phí) — cùng hàm `tpXuatCsv`
//   · mọi nút ở màn Term Life, kể cả nút mờ báo "Term Life không có PDF"
// → Term Life giờ chỉ có bảng 4 kỳ hạn, không nút nào. Hãng không phát hành bản
//   minh hoạ cho Term Life nên chẳng có gì để tải; một nút mờ ở đó là chữ thừa.
// ⚠️ Đừng thêm nút thứ ba vào đây mà chưa hỏi — chủ tool đã cắt một lần.
function tpNutTai() {
  if (tpChon.chuongTrinh !== 'IUL') return '';   // Term Life: không nút nào

  const p = tpFilePdf();
  const tm = p ? null : tpThuMucPdf();

  const taiThang = (id, chu, ten) =>
    `<a class="tp-nut-tai" href="https://drive.google.com/uc?export=download&id=${id}"
       target="_blank" rel="noopener" download title="${escapeHtml(ten)}">${TP_ICON_TAI} ${chu}</a>`;

  // Có đủ cặp file → hai nút tải thẳng. PDF là bản minh hoạ gửi khách, CSV là
  // bảng dòng tiền theo từng năm — hai tài liệu khác nhau, không gộp được.
  if (p) {
    return `<div class="tp-tai">
      ${taiThang(p.pdf, 'Tải PDF', p.ten + '.pdf')}
      ${p.csv ? taiThang(p.csv, 'Tải CSV', p.ten + '.csv') : ''}
    </div>`;
  }

  // Chưa có link file cho tổ hợp này → mở đúng thư mục sâu nhất còn biết, kèm tên
  // file cần tìm. Vẫn là đường tới đúng hai tài liệu đó, chỉ thêm một cú bấm.
  if (tm) {
    return `<div class="tp-tai">
      <a class="tp-nut-tai" href="https://drive.google.com/drive/folders/${tm.id}"
         target="_blank" rel="noopener"
         title="Mở ${escapeHtml(tm.ten)} trên Drive">${TP_ICON_TAI} Mở PDF + CSV của hãng</a>
    </div>
    <p class="tp-ten-file">Tìm file: <b>${escapeHtml(tpTenFileDrive())}</b></p>`;
  }

  return '';   // IUL mà không biết cả thư mục → im lặng, đừng bày nút bấm không được
}

// ☠️ HÀM  ĐÃ GỠ 11/08/2026 cùng nút "Tải CSV bảng phí".
// Chủ tool: *"nhiều nút download quá, chỉ cần 2 nút PDF và CSV"*. CSV của HÃNG
// (bảng dòng tiền theo từng năm) mới là thứ sale cần gửi khách; CSV tự sinh từ
// bảng phí chỉ là danh sách giá, không dùng để gửi đi đâu.
// Muốn lấy lại: xem commit trước 11/08/2026 trong git.

async function tpNapBang() {
  if (tpBang) return tpBang;
  if (tpDangNap) return tpDangNap;
  tpDangNap = fetch('/data/bang-phi-termlife.json')
    .then(r => r.ok ? r.json() : null)
    .then(j => { tpBang = j; return j; })
    .catch(() => null);
  return tpDangNap;
}

// Bảng IUL nạp RIÊNG và chỉ khi người dùng bấm sang IUL — nó 96 KB, không bắt
// người chỉ tra Term Life phải tải theo.
async function tpNapIul() {
  if (tpIul) return tpIul;
  if (tpIulDangNap) return tpIulDangNap;
  tpIulDangNap = fetch('/data/bang-phi-iul.json')
    .then(r => r.ok ? r.json() : null)
    .then(j => { tpIul = j; return j; })
    .catch(() => null);
  return tpIulDangNap;
}

// --- TRA CỨU IUL: (kỳ hạn, giới, sức khoẻ, tuổi, mệnh giá) → MỘT con số ---
function traPhiIul(kyHan, gioi, sucKhoe, tuoi, menhGia) {
  if (!tpIul || !tpIul.bang) return { co: false, vi: 'chưa nạp được bảng phí IUL' };
  const o = tpIul.bang[kyHan + '|' + gioi + '|' + sucKhoe];
  if (!o) return { co: false, vi: `kỳ hạn ${kyHan} năm không bán hạng ${sucKhoe} cho ${gioi === 'MALE' ? 'nam' : 'nữ'}` };
  if (!o.menhGiaCoSo.includes(Number(menhGia))) return { co: false, vi: 'tổ hợp này không có mệnh giá đó' };
  const hang = o.tuoi[Number(tuoi)];
  if (!hang) return { co: false, vi: `tổ hợp này chỉ có bảng phí cho tuổi ${o.tuoiTu}–${o.tuoiDen}` };
  const v = hang[Number(menhGia)];
  if (v === null || v === undefined) return { co: false, vi: `tuổi ${tuoi} không bán mệnh giá này` };
  return { co: true, phi: v };
}

// Lựa chọn còn dùng được cho IUL — dùng để ẩn/mờ nút
function tpIulSucKhoeCoDuoc(kyHan, gioi) {
  if (!tpIul) return [];
  return TP_SUCKHOE_IUL.filter(s => !!tpIul.bang[kyHan + '|' + gioi + '|' + s.ma]).map(s => s.ma);
}
function tpIulMenhGia(kyHan, gioi, sucKhoe) {
  const o = tpIul && tpIul.bang[kyHan + '|' + gioi + '|' + sucKhoe];
  return o ? o.menhGiaCoSo : [];
}
function tpIulKhoangTuoi(kyHan, gioi, sucKhoe) {
  const o = tpIul && tpIul.bang[kyHan + '|' + gioi + '|' + sucKhoe];
  return o ? { tu: o.tuoiTu, den: o.tuoiDen } : null;
}

// --- TRA CỨU (tách khỏi DOM để bàn đo gọi thẳng được) ---
// Trả về { co: true, phi: {10:.., 15:.., 20:.., 30:..} } hoặc { co: false, vi: 'lý do' }
function traPhi(gioi, sucKhoe, tuoi, menhGia) {
  if (!tpBang || !tpBang.bang) return { co: false, vi: 'chưa nạp được bảng phí' };
  const o = tpBang.bang[gioi + '|' + sucKhoe];
  if (!o) return { co: false, vi: 'hãng không bán tổ hợp giới tính + sức khoẻ này' };
  if (!o.menhGia.includes(Number(menhGia))) return { co: false, vi: 'hạng này không có mệnh giá đó' };
  const hang = o.tuoi[Number(tuoi)];
  if (!hang) return { co: false, vi: `hạng này chỉ có bảng phí cho tuổi ${o.tuoiTu}–${o.tuoiDen}` };
  const bo = hang[Number(menhGia)];
  if (!bo) return { co: false, vi: 'không có số cho mệnh giá này' };
  const phi = {};
  tpBang.kyHan.forEach((k, i) => { phi[k] = bo[i]; });   // null = hãng không bán kỳ hạn đó
  if (tpBang.kyHan.every((k) => phi[k] === null)) return { co: false, vi: 'không còn kỳ hạn nào ở tuổi này' };
  return { co: true, phi };
}

// Danh sách lựa chọn CÒN DÙNG ĐƯỢC — dùng để ẩn/mờ nút, đúng yêu cầu chủ tool
function tpSucKhoeCoDuoc(gioi) {
  if (!tpBang) return [];
  return TP_SUCKHOE.filter(s => !!tpBang.bang[gioi + '|' + s.ma]).map(s => s.ma);
}
function tpMenhGiaCoDuoc(gioi, sucKhoe) {
  const o = tpBang && tpBang.bang[gioi + '|' + sucKhoe];
  return o ? o.menhGia : [];
}
function tpKhoangTuoi(gioi, sucKhoe) {
  const o = tpBang && tpBang.bang[gioi + '|' + sucKhoe];
  return o ? { tu: o.tuoiTu, den: o.tuoiDen } : null;
}

// --- MỤC TRÊN CÂY: MỘT DÒNG PHẲNG, không menu phụ (giống Compare / SMS / Tính tuổi) ---
function renderTinhPhiNavSection(container, q) {
  if (q && !'tính phí bảo hiểm quote calculator báo giá'.includes(q)) return 0;

  const folder = document.createElement('div');
  folder.className = 'tree-folder nav-section nav-section-flat';

  const el = document.createElement('div');
  el.className = 'tree-folder-header' + (appState.activeLibraryPath === 'tinhphi' ? ' is-open' : '');
  el.setAttribute('title', 'Tra phí Term Life theo tuổi, mệnh giá, giới tính, hạng sức khoẻ');
  el.innerHTML = `
    <span class="tree-folder-icon">${NAV_ICONS.tinhphi}</span>
    <span class="tree-folder-label">${nhanMuc('Quote / Tính phí')}</span>
  `;
  el.addEventListener('click', async () => {
    if (!(await confirmLeaveUnsaved())) return;
    document.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
    openTinhPhi();
    el.classList.add('is-open');
  });
  makeKeyboardActivatable(el);

  folder.appendChild(el);
  container.appendChild(folder);
  return 1;
}

// Trạng thái màn hình (chỉ sống trong lúc màn đang mở).
// `sucKhoe` mang MÃ CỦA CHƯƠNG TRÌNH ĐANG CHỌN — đổi chương trình phải đặt lại.
const tpChon = { chuongTrinh: 'TERM', kyHan: '20', gioi: 'MALE', sucKhoe: 'SNTBC', tuoi: 35, menhGia: 250000 };

async function openTinhPhi() {
  hideLibraryPreview();
  dom.canvasWrapper.innerHTML = '';
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  appState.activeLibraryPath = 'tinhphi';
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = 'Quote / Tính phí';
    dom.activeFileTitle.classList.add('is-active');
  }
  dom.btnSaveTop.disabled = true;
  if (window.TSTAuth && TSTAuth.logUsage) TSTAuth.logUsage('view', 'Quote / Tính phí');

  document.body.classList.add('doc-mode');
  const view = document.getElementById('doc-viewport');
  view.innerHTML = '<div class="tp-wrap"><section class="tp-card"><p class="tp-dangnap">Đang nạp bảng phí…</p></section></div>';
  updateStatus('Tính phí bảo hiểm');

  // Bảng tra PDF nạp CÙNG LÚC với hai bảng phí (nó chỉ ~2 KB) — nạp sau thì lần
  // bấm "Tính phí" đầu tiên chưa biết có PDF hay không, nút sẽ thiếu rồi mới hiện.
  await Promise.all([tpNapBang(), tpNapIul(), tpNapPdf(), tpNapFile()]);
  if (!tpBang) {
    view.innerHTML = `<div class="tp-wrap"><section class="tp-card">
      <h2 class="tp-title">Tính phí bảo hiểm</h2>
      <p class="tp-loi">Chưa nạp được bảng phí. Tải lại trang; nếu vẫn vậy thì báo người dựng tool
      (thiếu <code>public/data/bang-phi-termlife.json</code>).</p></section></div>`;
    return;
  }
  veManTinhPhi();
}

function veManTinhPhi() {
  const view = document.getElementById('doc-viewport');
  view.innerHTML = `
    <div class="tp-wrap">
      <section class="tp-card tp-card-nhap">
        <h2 class="tp-title">Tính phí bảo hiểm</h2>
        <div id="tp-form"></div>
      </section>
      <aside class="tp-card tp-card-kq" id="tp-kq"></aside>
    </div>
  `;
  veFormTinhPhi();
  veKetQuaTinhPhi(null);
}

// ☠️ KHÔNG có tham số ghi chú. Chủ tool chốt 10/08/2026: bỏ hết mấy dòng chữ xám
// dưới nhóm nút ("Hạng bị mờ là hãng không bán…", "Tổ hợp này có N mức mệnh giá").
// Nút mờ + không bấm được đã tự nói lên điều đó; đếm số nút thì nhìn là thấy.
// Đừng thêm lại — đó là chữ nói lại điều màn hình đã nói.
function tpNhomNut(nhan, ds, dangChon, thuocTinh) {
  return `
    <div class="tp-nhom">
      <span class="tp-nhan">${escapeHtml(nhan)}</span>
      <div class="tp-nut-hang">
        ${ds.map(x => `
          <button type="button" class="tp-nut${x.ma === dangChon ? ' dang-chon' : ''}${x.tat ? ' tat' : ''}"
                  ${thuocTinh}="${escapeHtml(String(x.ma))}" ${x.tat ? 'disabled' : ''}
                  ${x.mo ? `title="${escapeHtml(x.mo)}"` : ''}>${escapeHtml(x.ten)}</button>`).join('')}
      </div>
    </div>`;
}

function veFormTinhPhi() {
  return tpChon.chuongTrinh === 'IUL' ? veFormIul() : veFormTerm();
}

// ---- IUL: chọn kỳ hạn trước, mọi lựa chọn sau đó phụ thuộc kỳ hạn ----
function veFormIul() {
  const o = document.getElementById('tp-form');
  if (!tpIul) {
    o.innerHTML = tpNhomNut('Chương trình', [{ ma: 'TERM', ten: 'Term Life' }, { ma: 'IUL', ten: 'IUL' }], 'IUL', 'data-ct') +
      '<p class="tp-loi tp-chua-co">Chưa nạp được bảng phí IUL. Tải lại trang.</p>';
    o.onclick = e => { const b = e.target.closest('[data-ct]'); if (b) { tpChon.chuongTrinh = b.dataset.ct; veFormTinhPhi(); veKetQuaTinhPhi(null); } };
    return;
  }
  // Ràng buộc theo bậc thang: kỳ hạn → sức khoẻ → mệnh giá → tuổi.
  // Đổi bậc trên làm bậc dưới không còn hợp lệ thì TỰ nhảy về giá trị hợp lệ đầu tiên,
  // KHÔNG để người dùng đứng ở tổ hợp không có số rồi mới báo lỗi.
  const skCo = tpIulSucKhoeCoDuoc(tpChon.kyHan, tpChon.gioi);
  if (!skCo.includes(tpChon.sucKhoe)) tpChon.sucKhoe = skCo[0];
  const mgCo = tpIulMenhGia(tpChon.kyHan, tpChon.gioi, tpChon.sucKhoe);
  if (!mgCo.includes(tpChon.menhGia)) tpChon.menhGia = mgCo.includes(250000) ? 250000 : mgCo[0];
  const kt = tpIulKhoangTuoi(tpChon.kyHan, tpChon.gioi, tpChon.sucKhoe);
  if (kt) tpChon.tuoi = Math.min(Math.max(tpChon.tuoi, kt.tu), kt.den);

  const dsSK = TP_SUCKHOE_IUL.map(s => ({ ma: s.ma, ten: s.ten, mo: s.mo, tat: !skCo.includes(s.ma) }));

  // ☠️ HÀNG ĐẦU PHẢI GIỐNG HỆT TERM LIFE (chủ tool 10/08/2026): Chương trình ·
  // Giới tính · Hạng sức khoẻ — đúng ba nhóm đó, đúng thứ tự đó. Đổi chương trình
  // là ba nhóm này ĐỨNG YÊN, chỉ nội dung nút đổi; trước đây "Kỳ hạn" chen vào
  // giữa nên Giới tính và Hạng sức khoẻ nhảy chỗ mỗi lần bấm Term Life ↔ IUL.
  // "Kỳ hạn" là thứ CHỈ IUL có → cho nó xuống nằm CẠNH Tuổi khách (chủ tool chốt).
  o.innerHTML = `
    ${tpHangDau('IUL', dsSK)}
    <div class="tp-hang">
      ${tpNhomTuoi(kt)}
      ${tpNhomNut('Kỳ hạn', TP_KYHAN_IUL, tpChon.kyHan, 'data-ky')}
    </div>
    ${tpNhomNut('Mệnh giá', mgCo.map(m => ({ ma: m, ten: m.toLocaleString('en-US') })), tpChon.menhGia, 'data-mg')}
    <button class="btn btn-primary tp-btn-tinh" id="tp-tinh">Tính phí</button>
  `;
  tpGanSuKien(o);
}

// Hàng đầu DÙNG CHUNG cho cả hai chương trình — một chỗ duy nhất, khỏi sửa hai nơi
// rồi lệch nhau (đúng cái đã xảy ra: Term Life ba nhóm, IUL bốn nhóm).
function tpHangDau(ct, dsSK) {
  return `
    <div class="tp-hang">
      ${tpNhomNut('Chương trình', [{ ma: 'TERM', ten: 'Term Life' }, { ma: 'IUL', ten: 'IUL' }], ct, 'data-ct')}
      ${tpNhomNut('Giới tính', TP_GIOI.map(g => ({ ma: g.ma, ten: g.ten })), tpChon.gioi, 'data-gioi')}
      ${tpNhomNut('Hạng sức khoẻ', dsSK, tpChon.sucKhoe, 'data-sk')}
    </div>`;
}

// Ô tuổi cũng dùng chung — nó là cùng một thứ ở cả hai chương trình, chỉ khác khoảng.
function tpNhomTuoi(kt) {
  return `
    <div class="tp-nhom">
      <span class="tp-nhan">Tuổi khách${kt ? ` <span class="tp-khoang">(${kt.tu}–${kt.den})</span>` : ''}</span>
      <div class="tp-tuoi-hang">
        <button type="button" class="tp-tuoi-nut" data-tuoi-buoc="-1" aria-label="Giảm tuổi">−</button>
        <input type="number" id="tp-tuoi" class="tp-tuoi-o" value="${tpChon.tuoi}"
               min="${kt ? kt.tu : 0}" max="${kt ? kt.den : 120}" inputmode="numeric">
        <button type="button" class="tp-tuoi-nut" data-tuoi-buoc="1" aria-label="Tăng tuổi">+</button>
        <span class="tp-tuoi-chu">tuổi</span>
      </div>
    </div>`;
}

function veFormTerm() {
  const o = document.getElementById('tp-form');
  const skCo = tpSucKhoeCoDuoc(tpChon.gioi);
  // Đang chọn hạng mà đổi giới tính làm hạng đó biến mất → tự nhảy về hạng đầu tiên còn dùng được
  if (!skCo.includes(tpChon.sucKhoe)) tpChon.sucKhoe = skCo[0];
  const mgCo = tpMenhGiaCoDuoc(tpChon.gioi, tpChon.sucKhoe);
  if (!mgCo.includes(tpChon.menhGia)) tpChon.menhGia = mgCo.includes(250000) ? 250000 : mgCo[0];
  const kt = tpKhoangTuoi(tpChon.gioi, tpChon.sucKhoe);
  if (kt) tpChon.tuoi = Math.min(Math.max(tpChon.tuoi, kt.tu), kt.den);

  // ☠️ Hạng không có bảng phí thì LÀM MỜ, không ẩn hẳn: sale thấy được là "hãng không
  // bán", chứ ẩn đi thì họ tưởng tool thiếu. (Chủ tool chốt 10/08/2026)
  const dsSK = TP_SUCKHOE.map(s => ({ ma: s.ma, ten: s.ten, mo: s.mo, tat: !skCo.includes(s.ma) }));
  const dsMG = mgCo.map(m => ({ ma: m, ten: m.toLocaleString('en-US') }));

  // Hàng đầu dùng CHUNG với IUL (tpHangDau) — xem chú thích ở veFormIul.
  // Term Life không có Kỳ hạn nên ô Tuổi đứng một mình, không bọc trong .tp-hang.
  o.innerHTML = `
    ${tpHangDau(tpChon.chuongTrinh, dsSK)}
    ${tpNhomTuoi(kt)}
    ${tpNhomNut('Mệnh giá', dsMG, tpChon.menhGia, 'data-mg')}
    <button class="btn btn-primary tp-btn-tinh" id="tp-tinh">Tính phí</button>
  `;

  tpGanSuKien(o);
}

// Gắn sự kiện DÙNG CHUNG cho cả hai chương trình — một chỗ duy nhất, khỏi sửa hai nơi.
function tpGanSuKien(o) {
  o.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    // Đổi chương trình phải đặt lại hạng sức khoẻ: hai bên dùng hai bộ mã khác nhau
    // (SNTBC/STBC/ENTBC1 vs NTBC/TBC/EX1), giữ nguyên là tra không ra dòng nào.
    if (b.dataset.ct) {
      tpChon.chuongTrinh = b.dataset.ct;
      tpChon.sucKhoe = b.dataset.ct === 'IUL' ? 'NTBC' : 'SNTBC';
      veFormTinhPhi(); veKetQuaTinhPhi(null); return;
    }
    if (b.dataset.ky) { tpChon.kyHan = b.dataset.ky; veFormTinhPhi(); veKetQuaTinhPhi(null); return; }
    if (b.dataset.gioi) { tpChon.gioi = b.dataset.gioi; veFormTinhPhi(); veKetQuaTinhPhi(null); return; }
    if (b.dataset.sk) { tpChon.sucKhoe = b.dataset.sk; veFormTinhPhi(); veKetQuaTinhPhi(null); return; }
    if (b.dataset.mg) { tpChon.menhGia = Number(b.dataset.mg); veFormTinhPhi(); veKetQuaTinhPhi(null); return; }
    if (b.dataset.tuoiBuoc) {
      const oT = document.getElementById('tp-tuoi');
      oT.value = Number(oT.value || 0) + Number(b.dataset.tuoiBuoc);
      oT.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    if (b.id === 'tp-tinh') bamTinhPhi();
  };
  const oT = document.getElementById('tp-tuoi');
  if (oT) {
    oT.onchange = () => {
      const kt2 = tpChon.chuongTrinh === 'IUL'
        ? tpIulKhoangTuoi(tpChon.kyHan, tpChon.gioi, tpChon.sucKhoe)
        : tpKhoangTuoi(tpChon.gioi, tpChon.sucKhoe);
      let v = Math.round(Number(oT.value) || 0);
      if (kt2) v = Math.min(Math.max(v, kt2.tu), kt2.den);   // kẹp trong khoảng CÓ bảng phí
      tpChon.tuoi = v; oT.value = v;
      veKetQuaTinhPhi(null);
    };
    oT.onkeydown = (e) => { if (e.key === 'Enter') { oT.blur(); bamTinhPhi(); } };
  }
}

function bamTinhPhi() {
  const kq = tpChon.chuongTrinh === 'IUL'
    ? traPhiIul(tpChon.kyHan, tpChon.gioi, tpChon.sucKhoe, tpChon.tuoi, tpChon.menhGia)
    : traPhi(tpChon.gioi, tpChon.sucKhoe, tpChon.tuoi, tpChon.menhGia);
  veKetQuaTinhPhi(kq);
  updateStatus(kq.co ? `Phí ${tpChon.sucKhoe} · ${tpChon.tuoi} tuổi · ${tpChon.menhGia.toLocaleString('en-US')}`
                     : 'Không có số cho tổ hợp này');
}

function veKetQuaTinhPhi(kq) {
  const o = document.getElementById('tp-kq');
  if (!o) return;
  // (Khối này không còn bộ nghe nào: hai nút tải đều là thẻ <a> trỏ thẳng
  //  tới Drive. Nếu sau này thêm nút <button>, nhớ gắn bộ nghe lên CHÍNH KHỐI
  //  này chứ đừng gắn lên nút — khối bị vẽ lại mỗi lần bấm Tính phí, bộ nghe
  //  gắn lên nút sẽ đi theo nút cũ và bấm không ăn, không báo lỗi gì.)
  if (!kq) {
    o.innerHTML = `
      <div class="tp-cho">
        <div class="tp-cho-icon">${NAV_ICONS.tinhphi}</div>
        <p class="tp-cho-chu">Chọn thông tin rồi bấm <b>Tính phí</b></p>
      </div>`;
    return;
  }
  if (!kq.co) {
    o.innerHTML = `
      <div class="tp-cho">
        <div class="tp-cho-icon tp-cho-trong">${NAV_ICONS.tinhphi}</div>
        <p class="tp-cho-chu">Bảng phí không có mức này</p>
        <p class="tp-cho-vi">${escapeHtml(kq.vi)}</p>
      </div>`;
    return;
  }
  const tomTat = `${TP_GIOI.find(g => g.ma === tpChon.gioi).ten} · ${escapeHtml(tpChon.sucKhoe)} · ` +
    `${tpChon.tuoi} tuổi · $${tpChon.menhGia.toLocaleString('en-US')}`;

  // ☠️ IUL trả về MỘT con số (kỳ hạn đã chọn từ trước), Term Life trả về BỐN.
  if (tpChon.chuongTrinh === 'IUL') {
    o.innerHTML = `
      <div class="tp-kq-dau">
        <span class="tp-kq-tomtat">${tomTat}</span>
      </div>
      <div class="tp-kq-danh">
        <div class="tp-o-phi tp-o-phi-don">
          <span class="tp-o-ky">${tpChon.kyHan} năm</span>
          <span class="tp-o-tien">$${kq.phi.toFixed(2)}</span>
        </div>
      </div>
      ${tpNutTai()}
    `;
    return;
  }

  const ten = { 10: '10 năm', 15: '15 năm', 20: '20 năm', 30: '30 năm' };
  o.innerHTML = `
    <div class="tp-kq-dau">
      <span class="tp-kq-tomtat">${tomTat}</span>
    </div>
    <div class="tp-kq-danh">
      ${tpBang.kyHan.map(k => {
        const v = kq.phi[k];
        return `
          <div class="tp-o-phi${v === null ? ' khong-ban' : ''}">
            <span class="tp-o-ky">${ten[k]}</span>
            <span class="tp-o-tien">${v === null ? 'Không bán' : '$' + v.toFixed(2)}</span>
          </div>`;
      }).join('')}
    </div>
    ${tpNutTai()}
  `;
}
