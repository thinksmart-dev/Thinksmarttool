/**
 * THINKSMART TOOL — PROPOSAL / BÁO GIÁ
 * Mọi logic riêng của công cụ Báo giá nằm ở file này:
 *  - Section "Proposal / Báo giá" trên cây điều hướng trái
 *  - Panel "Sửa chữ bản vẽ" với 3 nhóm: Khách hàng / Kế hoạch & Quyền lợi / Đại lý
 *  - Preset thông tin đại lý (lưu localStorage)
 * Phần dùng chung (load/save/clone, canvas, export...) nằm ở js/core.js.
 */

// Dropdown data for client info fields
const GENDERS = ['Male', 'Female'];

// XẾP HẠNG SỨC KHOẺ (underwriting class) — MỖI HÃNG MỘT DANH SÁCH RIÊNG.
// Dùng chung cho cả IUL lẫn Term Life của cùng hãng.
// ⚠️ Chữ ở đây in THẲNG lên báo giá gửi khách → phải đúng chính tả của hãng.
//    Muốn thêm/sửa hạng cho hãng nào thì sửa đúng mảng của hãng đó ở dưới.
const RATE_CLASSES_BY_CARRIER = {
  AIG: [
    'Preferred Plus',
    'Preferred Non-Tobacco',
    'Standard Plus',
    'Standard Non-Tobacco',
    'Preferred Tobacco',
    'Standard Tobacco'
  ],
  NLG: [
    'Elite Non-Tobacco',
    'Preferred Non-Tobacco',
    'Select Non-Tobacco',
    'Standard Non-Tobacco',
    'Express Standard Non-Tobacco 1',
    'Express Standard Non-Tobacco 2',
    'Preferred Tobacco',
    'Standard Tobacco',
    'Express Standard Tobacco'
  ],
  // LƯU Ý CHÍNH TẢ: Allianz viết "Nontobacco" LIỀN (không gạch nối), khác với
  // "Non-Tobacco" của AIG/NLG. Giữ đúng như hãng dùng — đừng "sửa cho đồng bộ".
  Allianz: [
    'Preferred Plus Nontobacco',
    'Preferred Nontobacco',
    'Standard Nontobacco',
    'Preferred Tobacco',
    'Standard Tobacco'
  ]
};

// Dùng khi không nhận ra hãng của file đang mở
const RATE_CLASSES_DEFAULT = RATE_CLASSES_BY_CARRIER.AIG;

// Gộp hạng của TẤT CẢ hãng (đã loại trùng) — dùng để TỰ NHẬN DIỆN ô xếp hạng
// trong bản vẽ chưa gắn id. Việc nhận diện xảy ra trước khi biết hãng nên phải
// khớp mọi hạng, không được dùng riêng danh sách một hãng.
const ALL_RATE_CLASSES = Object.keys(RATE_CLASSES_BY_CARRIER)
  .reduce((acc, k) => acc.concat(RATE_CLASSES_BY_CARRIER[k]), [])
  .filter((v, i, a) => a.indexOf(v) === i);

// carrierOf() trả 'Bản nháp' cho file đã tạo cho khách → mất dấu hãng gốc.
// Hàm này soi tên + đường dẫn file nên bản nháp (vd "Vu Nguyen - AIG IUL.svg")
// vẫn ra đúng danh sách của AIG.
function rateCarrierOf(file) {
  if (!file) return null;
  const s = ((file.folder || '') + ' ' + (file.path || '') + ' ' + (file.name || '')).toLowerCase();
  if (s.includes('aig')) return 'AIG';
  if (s.includes('nlg')) return 'NLG';
  if (s.includes('allianz')) return 'Allianz';
  return null;
}

// Danh sách xếp hạng áp dụng cho file đang mở
function rateClassesFor(file) {
  const carrier = rateCarrierOf(file);
  return (carrier && RATE_CLASSES_BY_CARRIER[carrier]) || RATE_CLASSES_DEFAULT;
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

// --- NAV SECTION: "Proposal / Báo giá" (gọi từ renderFileTree trong js/main.js) ---
// ---- KHỐI "MỤC ĐANG KHOÁ" — dùng chung cho cả 4 mục (31/07/2026) -------------
// Super Admin bật/tắt ở tab "Khoá mục". Cố ý VẪN hiện tiêu đề mục kèm lời giải thích:
// ẩn sạch thì sale tưởng tool hỏng hoặc mình bị mất quyền, lại nhắn hỏi admin.
// Lời nhắn lấy từ bảng `khoa_muc` nếu Super Admin có gõ; không gõ thì dùng câu mặc định.
function makeKhoiKhoa(tenMuc, icon, maMuc) {
  const sec = makeCollapsibleFolder(
    nhanMuc(tenMuc) + ' <span class="nav-badge-lock">Đang cập nhật</span>',
    { extraClass: 'nav-section is-locked', iconHTML: icon || '' }
  );
  const rieng = (appState.loiNhanKhoa && appState.loiNhanKhoa[maMuc] || '').trim();
  const hop = document.createElement('div');
  hop.className = 'nav-locked-note';
  hop.innerHTML =
    '<b>Đang chỉnh sửa nội dung</b>' +
    '<span>' + (rieng
      ? escapeHtml(rieng)
      : 'Mục này tạm khoá để cập nhật. Anh chị dùng các mục còn lại — sẽ mở lại ngay khi xong.') +
    '</span>';
  sec.content.appendChild(hop);
  return sec.folder;
}

// ---- THÔNG BÁO "ĐÃ CẬP NHẬT MẪU" (chủ tool 31/07/2026) ---------------------
// Sale vừa bị khoá mục Báo giá cả buổi sáng; mở lại mà im lặng thì họ không biết
// mẫu đã đổi nội dung, vẫn tưởng là bản cũ. Báo đúng MỘT lần, đúng chỗ (đầu mục
// Báo giá), bấm "Đã hiểu" là thôi — không phải hộp thoại chặn ngang màn hình.
// ⚠️ Lần cập nhật mẫu SAU: đổi MA_THONG_BAO thành mốc mới thì thông báo hiện lại
// cho tất cả mọi người. Giữ nguyên mã = ai đã tắt thì không thấy nữa.
const MA_THONG_BAO = 'mau-2026-07-31';
const KHOA_TB = 'tst-tb-capnhat';

function daTatThongBao() {
  try { return localStorage.getItem(KHOA_TB) === MA_THONG_BAO; } catch (e) { return false; }
}

function makeBangTinCapNhat() {
  const hop = document.createElement('div');
  hop.className = 'nav-update-note';
  hop.innerHTML =
    '<div class="nun-top">' +
      '<b>Mẫu báo giá đã cập nhật</b>' +
      '<button type="button" class="nun-close" aria-label="Đã hiểu, ẩn thông báo">✕</button>' +
    '</div>' +
    '<span>4 mẫu AIG và NLG nay dùng nội dung mới nhất (31/07). ' +
    'Anh chị tạo bản cho khách như bình thường.</span>';
  hop.querySelector('.nun-close').addEventListener('click', function () {
    try { localStorage.setItem(KHOA_TB, MA_THONG_BAO); } catch (e) {}
    hop.remove();
  });
  return hop;
}

function renderProposalNavSection(container, proposals, q) {
  // ĐANG KHOÁ (nhân viên): KHÔNG dựng danh sách mẫu nào cả — không có mục để bấm thì
  // không có đường mở nhầm. Cố ý vẫn hiện tiêu đề "Proposal / Báo giá" kèm lời giải
  // thích: ẩn sạch thì sale tưởng tool hỏng hoặc mình bị mất quyền, lại nhắn hỏi.
  if (appState.khoaMuc.proposal) {
    container.appendChild(makeKhoiKhoa('Proposal / Báo giá', NAV_ICONS.proposal, 'proposal'));
    return 0;
  }

  const propGroups = {};
  proposals.forEach(f => {
    const c = carrierOf(f);
    (propGroups[c] = propGroups[c] || []).push(f);
  });
  // Khi không tìm kiếm: luôn hiện đủ các hãng chính (kể cả hãng chưa có mẫu, vd Allianz)
  if (!q) MASTER_CARRIERS.forEach(c => { propGroups[c] = propGroups[c] || []; });
  const propSection = makeCollapsibleFolder(nhanMuc('Proposal / Báo giá'), { extraClass: 'nav-section', iconHTML: NAV_ICONS.proposal });
  // Thông báo cập nhật — chỉ khi KHÔNG đang tìm kiếm (đang tìm thì màn hình là kết quả,
  // chen thông báo vào là nhiễu) và người dùng chưa bấm tắt.
  if (!q && !daTatThongBao()) propSection.content.appendChild(makeBangTinCapNhat());
  let propCount = 0;
  Object.keys(propGroups).sort(carrierSort).forEach(carrier => {
    const items = propGroups[carrier];
    if ((!items || !items.length) && !MASTER_CARRIERS.includes(carrier)) return;
    const grp = makeCollapsibleFolder(`${escapeHtml(carrier)} <span class="nav-count">${items.length}</span>`, { extraClass: 'nav-carrier', iconHTML: NAV_ICONS.carrier });
    if (items.length) {
      items.sort((a, b) => a.name.localeCompare(b.name)).forEach(f => grp.content.appendChild(makeProposalItem(f)));
    } else {
      grp.content.appendChild(makeEmptyHint('Chưa có mẫu.'));
    }
    propSection.content.appendChild(grp.folder);
    propCount += items.length;
  });
  if (propCount === 0 && q) propSection.content.appendChild(makeEmptyHint('Không có kết quả.'));
  container.appendChild(propSection.folder);
  return propCount;
}

// --- ĐỊNH VỊ LẠI CÁC Ô CHỮ ĐỨNG CẠNH NHAU ------------------------------------
// Trong bản vẽ, "$50,968" và "/năm" là HAI thẻ <text> riêng, mỗi thẻ một transform
// translate() CỨNG. Con số dài ra (hàng trăm nghìn / hàng triệu) thì tràn sang và đè
// lên chữ "/năm" — lỗi chủ tool báo 21/07. Không có cách nào để SVG tự giãn: phải đo
// bề rộng thật rồi đặt lại toạ độ cho cả hai.
const KHE_TIEN_HAUTO = 6;   // khoảng hở tối thiểu giữa con số và hậu tố, đơn vị toạ độ SVG

function docTranslate(textEl) {
  const t = textEl && textEl.getAttribute('transform');
  const m = t && t.match(/translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null;
}

function datTranslateX(textEl, x) {
  const p = docTranslate(textEl);
  if (!p) return;
  textEl.setAttribute('transform',
    textEl.getAttribute('transform').replace(/translate\([^)]*\)/, `translate(${x.toFixed(2)} ${p.y})`));
}

function oChuTrongDoc(editorId) {
  const el = appState.activeSvgDoc && appState.activeSvgDoc.querySelector(`[data-editor-id="${editorId}"]`);
  return el && el.closest('text');
}

// neo = { idTien, idHauTo, tam } — tam là TÂM của cụm [số + hậu tố], đo MỘT LẦN theo
// đúng bản vẽ gốc rồi giữ nguyên. Luôn xếp cụm quanh tâm đó nên số dài/ngắn thế nào
// khối chữ vẫn cân giữa thẻ nền, và tâm không bị trôi qua các lần sửa.
function xepLaiHauTo(neo) {
  if (!neo) return;
  const svg = dom.canvasWrapper.querySelector('svg');
  if (!svg) return;
  const tienC = svg.querySelector(`[data-editor-id="${neo.idTien}"]`);
  const hauToC = svg.querySelector(`[data-editor-id="${neo.idHauTo}"]`);
  const oTienC = tienC && tienC.closest('text');
  const oHauToC = hauToC && hauToC.closest('text');
  const oTienD = oChuTrongDoc(neo.idTien);
  const oHauToD = oChuTrongDoc(neo.idHauTo);
  if (!oTienC || !oHauToC || !oTienD || !oHauToD) return;

  let wTien, wHauTo;
  try { wTien = oTienC.getBBox().width; wHauTo = oHauToC.getBBox().width; }
  catch (err) { return; }              // canvas chưa dựng xong thì bỏ qua, lần gõ sau đo lại
  if (!wTien || !wHauTo) return;

  if (neo.tam === null) {
    const a = docTranslate(oTienD), b = docTranslate(oHauToD);
    if (!a || !b) return;
    neo.tam = (a.x + b.x + wHauTo) / 2;
    // ☠️ Ô NEO TRÁI thì giữ MÉP TRÁI, không canh giữa cả cụm (chủ tool chốt 18/08 cho
    // mẫu Allianz: "$0 /năm" phải thẳng hàng với nhãn "THU NHẬP HƯU TRÍ"). Không có
    // dòng này thì cụm bị kéo về giữa ngay lần gõ đầu, mọi chỉnh trong file .svg vô ích.
    // Quyết định bằng chính HÌNH HỌC của bản vẽ — đúng cách laCanGiuaTheoBanVe() dùng cho
    // mọi ô khác — nên muốn đổi kiểu neo thì sửa vị trí chữ trong .svg, KHÔNG sửa ở đây.
    // Hàm đó trả TRUE khi không đo được, nên đo hỏng là giữ nguyên nếp cũ (canh giữa).
    neo.neoTrai = !laCanGiuaTheoBanVe(neo.idTien);
    neo.trai = a.x;
  }
  const xTien = neo.neoTrai
    ? neo.trai
    : neo.tam - (wTien + KHE_TIEN_HAUTO + wHauTo) / 2;
  const xHauTo = xTien + wTien + KHE_TIEN_HAUTO;
  [oTienD, oTienC].forEach(o => datTranslateX(o, xTien));
  [oHauToD, oHauToC].forEach(o => datTranslateX(o, xHauTo));
}

// --- CĂN GIỮA GIÁ TRỊ TRONG Ô CỦA BẢN VẼ ------------------------------------
// Bản vẽ gốc được designer căn giữa BẰNG TAY: họ đặt sẵn translate(x) sao cho đúng
// chuỗi chữ đó nằm giữa ô. Ta thay chữ khác độ dài là lệch ngay — gõ "-" thì dính
// mép trái, gõ "$1,000,000" thì tràn ra phải (chủ tool báo 21/07).
// Chữa tận gốc: đổi sang text-anchor="middle" neo đúng CÁI TÂM designer đã căn.
// Từ đó trình duyệt tự căn giữa cho MỌI giá trị về sau, không cần đo lại.
// Tính chất quan trọng: lúc mở file KHÔNG có gì xê dịch — tâm mới tính ra đúng
// bằng tâm cũ, nên bản vẽ chưa sửa trông y hệt trước.
const LE_TRONG_O = 12;      // chừa hai bên trong ô, đơn vị toạ độ SVG
const CO_CHU_TOI_THIEU = 0.55;  // không thu nhỏ quá 55% cỡ gốc, dưới nữa là không đọc nổi

function elCanvas(editorId) {
  const svg = dom.canvasWrapper.querySelector('svg');
  const el = svg && svg.querySelector(`[data-editor-id="${editorId}"]`);
  return el && el.closest('text');
}

// Bề rộng ô chứa (px màn hình) = thẻ <rect> HẸP NHẤT bao quanh tâm chữ.
function rongOChua(editorId) {
  const n = theNenBaoChu(editorId);
  return n ? n.rong : null;
}

// Thẻ nền HẸP NHẤT bao quanh chữ, kèm hộp bao của chính chữ đó.
// Dùng để biết bản vẽ neo chữ này TRÁI hay CĂN GIỮA — xem laCanGiuaTheoBanVe().
function theNenBaoChu(editorId) {
  const svg = dom.canvasWrapper.querySelector('svg');
  const o = elCanvas(editorId);
  if (!svg || !o) return null;
  const r = o.getBoundingClientRect();
  const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
  let hep = null, hopNen = null;
  svg.querySelectorAll('rect').forEach(function (n) {
    const b = n.getBoundingClientRect();
    if (b.width < 20 || b.height < 12) return;
    if (cx < b.left || cx > b.right || cy < b.top || cy > b.bottom) return;
    if (hep === null || b.width < hep) { hep = b.width; hopNen = b; }
  });
  return hopNen ? { rong: hep, nen: hopNen, chu: r } : null;
}

// ☠️ BẢN VẼ NÀY VỐN CĂN GIỮA HAY NEO TRÁI? — thêm 11/08/2026.
//
// Chủ tool báo: gõ "$200" vào ô "Mức đóng mỗi tháng" thì chữ hở một khoảng bên trái,
// mà gõ "$200,00" (ra "$20,000") thì KHÔNG hở. Đo ra đúng cơ chế:
//
//   canhGiuaTheoBanVe() đổi ô sang text-anchor="middle", neo vào TÂM CỦA CHỮ GỐC
//   "$152.70". Ô này bản vẽ neo TRÁI, nên chữ càng NGẮN càng bị hút vào giữa:
//
//     $152.70 (gốc)  thụt vào  1,0 px   <- thẳng hàng với nhãn "Monthly Premium"
//     $20,000        thụt vào -2,5 px   <- 7 ký tự, bằng chữ gốc → nhìn vẫn thẳng
//     $200           thụt vào 17,1 px   <- HỞ, đúng lỗi chủ tool báo
//     $99            thụt vào 25,1 px   <- càng ngắn càng hở
//
// Căn giữa ĐÚNG cho các ô designer vốn căn giữa (cột biểu đồ, ô trong bảng), nhưng
// SAI cho ô neo trái. Luật cũ đã ghi ở LE_PHAI_O_KHACH: "mấy ô này neo TRÁI theo đúng
// bản vẽ, KHÔNG được đổi sang căn giữa" — chỉ là chưa áp cho phần Kế hoạch.
//
// Cách phân biệt: so LỀ TRÁI và LỀ PHẢI của chữ GỐC trong thẻ nền của nó.
// Căn giữa thì hai lề xấp xỉ nhau; neo trái thì lề phải rộng hơn hẳn.
// Đo thật ô phí: thẻ nền 263,4px · lề trái 36,9px · lề phải 128,0px → lệch 35% → neo TRÁI.
// KHÔNG tìm được thẻ nền → giữ nguyên nếp cũ (căn giữa), để không đổi hành vi các ô đã chạy đúng.
// ☠️ PHẢI QUA ĐỦ BA CỬA MỚI ĐƯỢC COI LÀ NEO TRÁI. Mỗi cửa bịt một kiểu bắt nhầm mà
// tôi đã ĐO RA khi thử từng cửa riêng lẻ (11/08/2026):
//   - Chỉ dùng lề trái/phải  → bắt nhầm 37 ô, vì khi ô không có thẻ nền riêng thì
//     hàm vớ nhầm NỀN CẢ TRANG (620px), làm mọi thứ lệch tâm trông như neo trái.
//   - Chỉ dùng "thẳng mép nhãn" → bắt nhầm ô "20 năm", "$36,648": trong một ô hẹp,
//     nhãn và giá trị cùng căn giữa thì mép trái TRÙNG NHAU một cách tình cờ.
// Ghép cả ba: 7 ô đổi / 59 ô giữ nguyên trên cả 5 mẫu — và trong 7 ô đó chỉ có
// "$152.70" (Mức đóng mỗi tháng) là thuộc phần Kế hoạch; 5 ô "43" là ô Tuổi vốn
// đã đi đường riêng (vuaKhungOKhach), không qua hàm này.
const SAI_SO_MEP_TRAI = 2.5;         // px — thẳng hàng trong khoảng này thì coi là cùng mép
const XA_TOI_DA_THEO_DONG = 3.0;     // lần chiều cao dòng — xa hơn thì không cùng khối
const NGUONG_LECH_CAN_GIUA = 0.15;   // lệch quá 15% bề rộng thẻ nền thì KHÔNG phải căn giữa

// CỬA 1 — có chữ khác thẳng MÉP TRÁI và nằm cùng khối (ngay trên/dưới, chồng nhau ngang).
// Designer chỉ xếp thẳng mép trái khi họ CỐ Ý neo trái; hai chữ dài ngắn khác nhau mà
// cùng căn giữa thì không bao giờ thẳng mép trái được.
function coNhanThangMepTrai(svgEl, o) {
  const a = o.getBoundingClientRect();
  if (!a.width || !a.height) return false;
  const ds = svgEl.querySelectorAll('text');
  for (let i = 0; i < ds.length; i++) {
    const k = ds[i];
    if (k === o) continue;
    const b = k.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    if (Math.abs(b.left - a.left) > SAI_SO_MEP_TRAI) continue;
    const doc = b.top > a.bottom ? b.top - a.bottom : (a.top > b.bottom ? a.top - b.bottom : 0);
    if (doc > XA_TOI_DA_THEO_DONG * a.height) continue;
    if (b.right < a.left || b.left > a.right) continue;
    return true;
  }
  return false;
}

// CỬA 3 — thẻ nền phải chỉ ôm ĐÚNG MỘT ô giá trị. Nền ôm nhiều giá trị nghĩa là nó là
// một HÀNG nhiều cột (hoặc nền cả trang), lúc đó đo lề trái/phải là vô nghĩa.
function nenChiOmMotGiaTri(svgEl, hopNen) {
  let dem = 0;
  const ds = svgEl.querySelectorAll('text');
  for (let i = 0; i < ds.length; i++) {
    const t = ds[i].textContent.replace(/\s+/g, ' ').trim();
    if (!/\$|^\d/.test(t) || t.length > 24) continue;
    const b = ds[i].getBoundingClientRect();
    if (!b.width) continue;
    const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
    if (cx >= hopNen.left && cx <= hopNen.right && cy >= hopNen.top && cy <= hopNen.bottom) dem++;
    if (dem > 1) return false;
  }
  return true;
}

// ☠️ ĐÁNH DẤU THẲNG TRONG BẢN VẼ: `data-neo="trai"` trên thẻ <text> thì BẮT BUỘC neo trái,
// không cần đo. Thêm 18/08/2026 cho dải xanh mẫu Allianz ("Thu nhập hưu trí" và
// "Tổng dòng tiền dự kiến"): hai ô đó dùng CHUNG một thẻ nền nên cửa 3 chặn lại
// (nền ôm 2 giá trị → đo lề trái/phải vô nghĩa), mà chủ tool thì muốn chúng neo trái.
//
// ĐÃ THỬ VÀ BỎ: nới cửa 3 thành "chia nền thành cột theo từng giá trị rồi đo trong cột".
// Đo trước/sau trên cả 5 mẫu: **65/404 ô đổi phân loại** — lọt cả tiêu đề mục, đoạn văn,
// tên đại lý. Quá rộng, không dùng. Cách đánh dấu này đổi ĐÚNG những ô được đánh dấu.
function coDanhDauNeoTrai(o) {
  const t = o && (o.tagName.toLowerCase() === 'text' ? o : o.closest('text'));
  return !!t && t.getAttribute('data-neo') === 'trai';
}

function laCanGiuaTheoBanVe(editorId) {
  const svgEl = dom.canvasWrapper.querySelector('svg');
  const o = elCanvas(editorId);
  if (!svgEl || !o) return true;                              // không đo được → giữ nếp cũ
  if (coDanhDauNeoTrai(o)) return false;                      // bản vẽ đã chốt: neo trái
  if (!coNhanThangMepTrai(svgEl, o)) return true;             // cửa 1
  const n = theNenBaoChu(editorId);
  if (!n || !n.rong) return true;                             // cửa 2
  if (!nenChiOmMotGiaTri(svgEl, n.nen)) return true;          // cửa 3
  const leTrai = n.chu.left - n.nen.left;
  const lePhai = n.nen.right - n.chu.right;
  return Math.abs(lePhai - leTrai) <= NGUONG_LECH_CAN_GIUA * n.rong;
}

// --- Ô THÔNG TIN KHÁCH HÀNG: chữ dài thì thu nhỏ cho vừa khung -----------------
// Khác phần Kế hoạch: mấy ô này neo TRÁI theo đúng bản vẽ (tên khách bắt đầu sát mép
// thẻ), KHÔNG được đổi sang căn giữa. Chỉ cần chặn tràn.
// Chủ tool báo 21/07: "Express Standard Non-Tobacco 2" (30 ký tự) và
// "Preferred Plus Nontobacco" (25 ký tự) chạy lố ra khỏi thẻ nền / bị cắt cụt.
// Tên khách dài và bang tên dài ("North Carolina", "Massachusetts") cũng dính.
const LE_PHAI_O_KHACH = 8;   // chừa ra so với mép phải khung, đơn vị SVG

// Mép phải mà chữ KHÔNG được vượt qua. Lấy chặt nhất trong hai nguồn:
//   (1) chữ khác nằm CÙNG HÀNG bên phải (vd ô "Tiểu bang" đứng cạnh ô "Sức khoẻ")
//   (2) thẻ <rect> nền hẹp nhất bao quanh chữ
// Dùng toạ độ màn hình rồi quy đổi về đơn vị SVG — chắc ăn hơn dò transform lồng nhau.
function mepPhaiChoPhep(editorId, dsCungPhan) {
  const svg = dom.canvasWrapper.querySelector('svg');
  const o = elCanvas(editorId);
  if (!svg || !o) return null;
  const vb = svg.viewBox && svg.viewBox.baseVal;
  const khungSvg = svg.getBoundingClientRect();
  const tyLe = (vb && vb.width) ? khungSvg.width / vb.width : 0;
  if (!tyLe) return null;

  const r = o.getBoundingClientRect();
  const giuaY = (r.top + r.bottom) / 2;
  const doi = px => (px - khungSvg.left) / tyLe;
  let phai = Infinity;

  (dsCungPhan || []).forEach(function (idKhac) {
    if (idKhac === editorId) return;
    const k = elCanvas(idKhac);
    if (!k) return;
    const b = k.getBoundingClientRect();
    if (b.left <= r.left) return;                       // phải đứng BÊN PHẢI
    if (giuaY < b.top - 2 || giuaY > b.bottom + 2) return; // và CÙNG HÀNG
    phai = Math.min(phai, doi(b.left));
  });

  svg.querySelectorAll('rect').forEach(function (n) {
    const b = n.getBoundingClientRect();
    if (b.width < 40 * tyLe || b.height < 10 * tyLe) return;   // bỏ qua icon/gạch nhỏ
    // Khung phải THỰC SỰ BAO chỗ chữ bắt đầu: vừa mở ra bên trái, vừa kéo dài qua nó.
    // Thiếu vế thứ hai là dính lỗi đã gặp 21/07: ô "Tiểu bang" lấy nhầm khung của ô
    // "Sức khoẻ" nằm bên trái nó (khung đó kết thúc TRƯỚC cả chỗ chữ bắt đầu) → mép
    // phải tính ra nhỏ hơn cả mép trái, thu nhỏ chữ vô tội vạ.
    if (b.left > r.left || b.right <= r.left) return;
    if (giuaY < b.top || giuaY > b.bottom) return;
    phai = Math.min(phai, doi(b.right));
  });

  return phai === Infinity ? null : phai;
}

// Chuẩn bị + thu nhỏ cho một ô neo trái. Gọi lúc mở file và sau mỗi lần sửa.
function vuaKhungOKhach(neo, dsCungPhan) {
  if (!neo) return;
  const oC = elCanvas(neo.id);
  if (!oC) return;
  if (!neo.coChuGoc) neo.coChuGoc = parseFloat(getComputedStyle(oC).fontSize) || null;
  if (!neo.coChuGoc) return;

  oC.style.fontSize = '';                    // trả cỡ gốc rồi mới đo mép và bề rộng
  const phai = mepPhaiChoPhep(neo.id, dsCungPhan);
  if (phai === null) return;

  const vb = dom.canvasWrapper.querySelector('svg').viewBox.baseVal;
  const khungSvg = dom.canvasWrapper.querySelector('svg').getBoundingClientRect();
  const tyLe = khungSvg.width / vb.width;
  const r = oC.getBoundingClientRect();
  const trai = (r.left - khungSvg.left) / tyLe;
  const rongThat = r.width / tyLe;
  const rongChoPhep = phai - trai - LE_PHAI_O_KHACH;
  if (rongChoPhep <= 0 || !rongThat) return;

  const ty = Math.max(Math.min(1, rongChoPhep / rongThat), CO_CHU_TOI_THIEU);
  const co = ty >= 0.999 ? '' : (neo.coChuGoc * ty).toFixed(2) + 'px';
  oC.style.fontSize = co;
  const oD = oChuTrongDoc(neo.id);
  if (oD) oD.style.fontSize = co;
}

// ⚠️ text-anchor CHỈ gom được cả dòng thành một khối nếu các mảnh phía sau KHÔNG
// mang toạ độ tuyệt đối. Theo chuẩn SVG, tspan có x HOẶC y là mở một "text chunk"
// MỚI, và mỗi chunk tự neo giữa riêng nó → chữ vỡ ra từng mảnh lệch nhau.
// (Đo được ở ô "30 năm" mẫu NLG Term Life: mảnh "3" và mảnh "0 năm" mỗi mảnh một
// chunk vì cả hai đều có y="0".)
// Trả false nếu thẻ <text> có NHIỀU DÒNG — khi đó không đụng vào, vì gỡ y sẽ làm
// các dòng chồng lên nhau.
function gomMotKhoiChu(oText) {
  const manh = Array.from(oText.querySelectorAll('tspan'));
  if (!manh.length) return true;                       // chữ nằm thẳng trong <text>
  const y0 = manh[0].getAttribute('y');
  if (manh.some(sp => sp.getAttribute('y') !== y0)) return false;
  manh.forEach(function (sp, i) {
    if (i === 0) { sp.setAttribute('x', '0'); return; }
    sp.removeAttribute('x');
    sp.removeAttribute('y');
  });
  return true;
}

// Đổi một ô giá trị sang neo-giữa. Gọi MỘT LẦN lúc mở file, sau khi font đã tải.
function canhGiuaTheoBanVe(neo) {
  const oC = elCanvas(neo.id);
  const oD = oChuTrongDoc(neo.id);
  if (!oC || !oD) return;
  if (oC.getAttribute('text-anchor') === 'middle') { neo.xong = true; return; }

  // ĐO TRƯỚC KHI GỘP. Gộp khối làm các mảnh kern liền nhau nên chữ rộng thêm vài px;
  // đo sau khi gộp là lấy nhầm tâm của bản đã rộng ra → cả cụm lệch sang phải
  // (đo được 5px ở câu "Tổng dòng tiền dự kiến…" mẫu Allianz).
  let hop;
  try { hop = oC.getBBox(); } catch (e) { return; }
  if (!hop || !hop.width) return;

  const goc = docTranslate(oD);
  if (!goc) return;
  const tam = goc.x + hop.x + hop.width / 2;     // đúng tâm designer đã căn

  if (!gomMotKhoiChu(oC) || !gomMotKhoiChu(oD)) return;   // nhiều dòng → không đụng vào

  // Bề rộng tối đa cho phép: ưu tiên khoảng cách tới ô cùng hàng bên cạnh (chính xác
  // cho bảng nhiều cột), không có thì lấy theo thẻ nền bao quanh.
  let rong = null;
  if (neo.buocCot) rong = neo.buocCot - LE_TRONG_O;
  else {
    const px = rongOChua(neo.id);
    const svg = dom.canvasWrapper.querySelector('svg');
    const vb = svg && svg.viewBox && svg.viewBox.baseVal;
    const tyLe = (vb && vb.width) ? svg.getBoundingClientRect().width / vb.width : 0;
    if (px && tyLe) rong = px / tyLe - LE_TRONG_O;
  }
  neo.rong = rong;
  neo.coChuGoc = parseFloat(getComputedStyle(oC).fontSize) || null;

  // ☠️ Ô neo TRÁI thì KHÔNG được đổi sang căn giữa — xem chú thích dài ở
  // laCanGiuaTheoBanVe(). Vẫn giữ phần thu nhỏ cho vừa ô: chữ dài vẫn không được tràn.
  if (laCanGiuaTheoBanVe(neo.id)) {
    [oD, oC].forEach(function (o) {
      o.setAttribute('text-anchor', 'middle');
      datTranslateX(o, tam);
    });
  }
  neo.xong = true;
  thuNhoChoVua(neo);
}

// Giá trị quá dài so với ô thì thu nhỏ cỡ chữ cho vừa, thay vì để tràn ra ngoài.
function thuNhoChoVua(neo) {
  if (!neo || !neo.xong || !neo.rong || !neo.coChuGoc) return;
  const oC = elCanvas(neo.id);
  const oD = oChuTrongDoc(neo.id);
  if (!oC || !oD) return;

  oC.style.fontSize = '';                      // trả cỡ gốc rồi mới đo, nếu không
  let rongThat;                                 // sẽ đo trúng cỡ đã thu nhỏ lần trước
  try { rongThat = oC.getBBox().width; } catch (e) { return; }
  if (!rongThat) return;

  const tyLe = Math.max(Math.min(1, neo.rong / rongThat), CO_CHU_TOI_THIEU);
  const co = tyLe >= 0.999 ? '' : (neo.coChuGoc * tyLe).toFixed(2) + 'px';
  oC.style.fontSize = co;
  oD.style.fontSize = co;
}

// Chuẩn hoá thứ chủ tool gõ thành cụm chữ đứng sau "nhận".
// Gõ SỐ hay gõ CHỮ đều phải ra câu đọc được — đây là yêu cầu chốt 21/07:
//   "21"          → "trong 21 năm"      (câu: …dự kiến nhận trong 21 năm)
//   "21 năm"      → "trong 21 năm"
//   "trong 25 năm"→ "trong 25 năm"      (đã có "trong" thì để nguyên)
//   "trọn đời"    → "trọn đời"          (câu: …dự kiến nhận trọn đời)
function cumThoiGianNhan(giaTri) {
  const s = String(giaTri == null ? '' : giaTri).trim().replace(/\s+/g, ' ');
  if (!s) return '';
  if (/^\d+$/.test(s)) return `trong ${s} năm`;                 // chỉ gõ con số
  if (/^\d+ năm$/i.test(s)) return `trong ${s}`;                // "21 năm"
  return s;                                                      // chữ tự do
}

// Ghi cụm chữ sau chữ "nhận" của câu "Tổng dòng tiền dự kiến nhận …".
// ⚠️ CÓ HAI CÂY DOM: bản dữ liệu (appState.activeSvgDoc — thứ đem đi lưu/xuất file) và
// bản CLONE đang hiển thị trên canvas. applyTextValue vẫn ghi cả hai; hàm này không dùng
// applyTextValue được nên phải TỰ ghi cả hai. Quên bản clone = gõ mà canvas đứng im,
// đúng lỗi chủ tool báo 21/07.
function ghiCumDongTien(x, cumMoi) {
  const ghi = (cacManh, iChinh) => {
    cacManh[iChinh].textContent = 'nhận ' + cumMoi;
    cacManh.slice(iChinh + 1).forEach(sp => { sp.textContent = ''; });
    boQuenKerning(cacManh[iChinh]);   // mảnh này mang kerning riêng của chữ gốc, xem core.js
  };

  const oDoc = oChuTrongDoc(x.editorId);
  if (oDoc) {
    const manhDoc = Array.from(oDoc.querySelectorAll('tspan'));
    if (manhDoc.length === x.tongSoManh) ghi(manhDoc, x.viTriManhChinh);
  }

  const svg = dom.canvasWrapper.querySelector('svg');
  const neo = svg && svg.querySelector(`[data-editor-id="${x.editorId}"]`);
  const oCanvas = neo && neo.closest('text');
  if (!oCanvas) return;
  const manhCanvas = Array.from(oCanvas.querySelectorAll('tspan'));
  if (manhCanvas.length === x.tongSoManh) ghi(manhCanvas, x.viTriManhChinh);
}

// --- TEXTS EDITOR: 3 nhóm ô của proposal (gọi từ populateTextsEditor trong js/core.js) ---
function populateProposalTextsEditor(svgEl, textElements) {
  // Create group containers
  const clientGroup = document.createElement('div');
  clientGroup.className = 'text-group';
  clientGroup.innerHTML = `
    <div class="text-group-title">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span>1. Thông tin khách hàng</span>
      <span class="group-arrow" style="margin-left: auto; transition: transform 0.2s ease; display: inline-flex; align-items: center;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </span>
    </div>
    <div class="text-group-items" id="group-client"></div>
  `;

  const planGroup = document.createElement('div');
  planGroup.className = 'text-group';
  planGroup.innerHTML = `
    <div class="text-group-title">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      <span>2. Kế hoạch & Quyền lợi</span>
      <span class="group-arrow" style="margin-left: auto; transition: transform 0.2s ease; display: inline-flex; align-items: center;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </span>
    </div>
    <div class="text-group-items" id="group-plan"></div>
  `;

  const agentGroup = document.createElement('div');
  agentGroup.className = 'text-group';
  agentGroup.innerHTML = `
    <div class="text-group-title">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span>3. Thông tin đại lý & Khác</span>
      <span class="group-arrow" style="margin-left: auto; transition: transform 0.2s ease; display: inline-flex; align-items: center;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </span>
    </div>
    <div class="text-group-items" id="group-agent"></div>
  `;

  dom.textsList.appendChild(clientGroup);
  dom.textsList.appendChild(planGroup);
  dom.textsList.appendChild(agentGroup);

  const clientContainer = clientGroup.querySelector('#group-client');
  const planContainer = planGroup.querySelector('#group-plan');
  const agentContainer = agentGroup.querySelector('#group-agent');

  // Add collapse listeners
  [clientGroup, planGroup, agentGroup].forEach(group => {
    const title = group.querySelector('.text-group-title');
    const items = group.querySelector('.text-group-items');
    const arrow = group.querySelector('.group-arrow');
    title.style.cursor = 'pointer';
    title.addEventListener('click', () => {
      const isCollapsed = items.style.display === 'none';
      if (isCollapsed) {
        items.style.display = 'flex';
        arrow.style.transform = '';
      } else {
        items.style.display = 'none';
        arrow.style.transform = 'rotate(-90deg)';
      }
    });
  });

  // MOBILE: chỉ mở sẵn nhóm 1, gấp nhóm 2 và 3.
  // Đo 22/07: mở cả ba thì danh sách dài 1846px, mà bàn phím bật lên chỉ chừa
  // ~125px để nhìn — cuộn tìm ô giữa khe đó rất khổ. Gấp lại thì ba tiêu đề nhóm
  // nằm gọn một màn, bấm nhóm nào mở nhóm đó.
  // CỐ Ý dùng lại đúng cơ chế gấp/mở SẴN CÓ thay vì thêm hàng chip điều hướng —
  // ít cơ chế hơn thì ít chỗ để quên đồng bộ hơn. Bấm chữ trên bản vẽ vẫn tự bung
  // đúng nhóm (xem initEventListeners trong main.js), nên không kẹt ai ở đâu cả.
  if (window.matchMedia('(max-width: 900px)').matches) {
    [planGroup, agentGroup].forEach(group => {
      const items = group.querySelector('.text-group-items');
      const arrow = group.querySelector('.group-arrow');
      items.style.display = 'none';
      arrow.style.transform = 'rotate(-90deg)';
    });
  }

  // Helper to tag dynamic client info elements so they persist after edits
  function tagClientInfoElements(svgEl, textElementsList) {
    // Files saved by older versions carry client-* ids on the <text> wrapper, but the editor
    // loop only iterates [data-editor-id] elements (line-first tspans). Move such an id down
    // to the tspan that holds the fresh data-editor-id so the field still renders.
    const reclaimTag = (idName) => {
      const el = svgEl.querySelector('#' + idName);
      if (!el) return null;
      if (el.getAttribute('data-editor-id')) return el;
      el.removeAttribute('id');
      const inner = el.querySelector('[data-editor-id]');
      if (inner) { inner.setAttribute('id', idName); return inner; }
      return null; // unmappable stale tag — fall through to re-detection below
    };
    let nameEl = reclaimTag('client-name');
    let ageEl = reclaimTag('client-age');
    let genderEl = reclaimTag('client-gender');
    let rateEl = reclaimTag('client-rate');
    let stateEl = reclaimTag('client-state');

    // data-editor-id sits on the FIRST tspan of each line, so a value split across several tspans
    // (e.g. "Standard Non-Tobacco", "Vu Nguyen") won't equal that tspan's own textContent.
    // Compare against the whole line instead so multi-tspan values are matched reliably.
    const line = el => getLineTextContent(el).trim();
    const isValue = t => t === '43' || /^\d+$/.test(t) || t === 'Male' || t === 'Female'
      || ALL_RATE_CLASSES.includes(t) || US_STATES.includes(t);

    if (!ageEl) {
      ageEl = textElementsList.find(el => line(el) === '43');
      if (ageEl) ageEl.setAttribute('id', 'client-age');
    }
    if (!genderEl) {
      genderEl = textElementsList.find(el => { const t = line(el); return t === 'Male' || t === 'Female'; });
      if (genderEl) genderEl.setAttribute('id', 'client-gender');
    }
    if (!rateEl) {
      rateEl = textElementsList.find(el => ALL_RATE_CLASSES.includes(line(el)));
      if (rateEl) rateEl.setAttribute('id', 'client-rate');
    }
    if (!stateEl) {
      stateEl = textElementsList.find(el => US_STATES.includes(line(el)));
      if (stateEl) stateEl.setAttribute('id', 'client-state');
    }
    if (!nameEl) {
      // The client name isn't a fixed string (differs per template). Detect it as a capitalized
      // multi-word line in the client card (Y < 450) that isn't a recognized value or a label word.
      const looksLikeName = t => /^[A-Z][A-Za-z'.]+( [A-Z][A-Za-z'.]+){1,3}$/.test(t)
        && !/(Client|Kh[aá]ch|Agent|Licensed|Assistant|CEO|Making|Promises|Keeping|Program|Universal|Index|Term|Life|Plan|Benefits|Summary|Value|Growth|Rate|Class|State|Gender|Male|Female|Tobacco|Preferred|Standard)/i.test(t);
      nameEl = textElementsList.find(el => getAbsoluteY(el) < 450 && !isValue(line(el)) && looksLikeName(line(el)));
      if (nameEl) nameEl.setAttribute('id', 'client-name');
    }
  }

  tagClientInfoElements(svgEl, textElements);

  // Helper to calculate absolute Y position
  function getAbsoluteY(el) {
    let y = 0;
    if (el.tagName.toLowerCase() === 'tspan') {
      const tspanY = el.getAttribute('y');
      if (tspanY) y += parseFloat(tspanY);
    }
    let current = el;
    while (current && current.tagName.toLowerCase() !== 'svg') {
      const transform = current.getAttribute('transform');
      if (transform && transform.includes('translate')) {
        const match = transform.match(/translate\(([^,)\s]+)[,\s]+([^,)\s]+)\)/);
        if (match && match[2]) {
          y += parseFloat(match[2]);
          break;
        }
      }
      if (current.tagName.toLowerCase() === 'text') {
        const textY = current.getAttribute('y');
        if (textY) {
          y += parseFloat(textY);
          break;
        }
      }
      current = current.parentElement;
    }
    return y;
  }

  // Helper to calculate absolute X position
  function getAbsoluteX(el) {
    let x = 0;
    if (el.tagName.toLowerCase() === 'tspan') {
      const tspanX = el.getAttribute('x');
      if (tspanX) x += parseFloat(tspanX);
    }
    let current = el;
    while (current && current.tagName.toLowerCase() !== 'svg') {
      const transform = current.getAttribute('transform');
      if (transform && transform.includes('translate')) {
        const match = transform.match(/translate\(([^,)\s]+)[,\s]+([^,)\s]+)\)/);
        if (match && match[1]) {
          x += parseFloat(match[1]);
          break;
        }
      }
      if (current.tagName.toLowerCase() === 'text') {
        const textX = current.getAttribute('x');
        if (textX) {
          x += parseFloat(textX);
          break;
        }
      }
      current = current.parentElement;
    }
    return x;
  }

  const clientBlocks = {};
  const clientPos = {};     // id -> {y, x} vị trí trên bản vẽ, để sắp ô theo đúng bố cục mẫu
  const idOKhach = [];      // editorId của các ô Thông tin khách hàng, theo thứ tự gặp
  const neoVuaKhach = {};   // editorId -> mốc để thu nhỏ chữ cho vừa khung (xem vuaKhungOKhach)
  const allLines = [];   // MỌI dòng chữ + toạ độ — dùng làm NEO để dò nhãn (mẫu Allianz)
  const planItems = [];
  const planExtras = []; // non-$ editable labels: "20 năm", "120 tuổi", "Tuổi 63", "Cash Value at 63"

  // ☠️ NEO KHỐI ĐẠI LÝ THEO NHÃN "PRESENTED BY", KHÔNG dùng ngưỡng Y cứng (sửa 31/07/2026).
  // Ngưỡng cũ `Y >= 1100` vỡ ngay khi chủ tool xuất lại mẫu với bố cục dịch xuống: tiêu đề
  // mục "II" / "PHÍ CHẤM DỨT HỢP ĐỒNG SỚM" / "EARLY SURRENDER CHARGE" rơi vào vùng đó và
  // hiện thành 3 ô "Tên Agent Assistant" sửa được — trong khi chúng là TIÊU ĐỀ, không phải
  // trường (chủ tool: "2 cái này đâu có được chỉnh sửa đâu em").
  // Đo 31/07 trên cả 4 mẫu mới: "PRESENTED BY" LUÔN CÓ (Y = 1349 / 1259 / 1347 / 1255), và
  // mọi trường đại lý thật nằm DƯỚI nó, mọi thứ lọt nhầm nằm TRÊN nó. Neo bằng chính nhãn
  // của khối thì bố cục dịch bao nhiêu cũng đúng.
  let yPresentedBy = 0;
  textElements.forEach((e) => {
    if (/^PRESENTED BY$/i.test(getLineTextContent(e).trim())) {
      const y = getAbsoluteY(e);
      if (y > yPresentedBy) yPresentedBy = y;
    }
  });

  textElements.forEach((el) => {
    // data-editor-id sits on the first tspan of a line → read the FULL line, not just that tspan
    const textContent = getLineTextContent(el).trim();
    if (!textContent) return; // Skip empty elements

    const editorId = el.getAttribute('data-editor-id');
    const id = el.getAttribute('id') || editorId;

    const absoluteY = getAbsoluteY(el);
    const absoluteX = getAbsoluteX(el);
    const fontSize = el.getAttribute('font-size') || el.style.fontSize || 'mặc định';

    // Ghi lại MỌI dòng (kể cả nhãn không sửa được) để nhánh Allianz dò nhãn theo neo
    allLines.push({ el, editorId, textContent, absoluteX, absoluteY });

    // --- SECTION 1: Client Info (Y < 450) ---
    if (absoluteY < 450) {
      const isClientField = ['client-name', 'client-age', 'client-rate', 'client-gender', 'client-state'].includes(id);
      if (!isClientField) return; // Skip all other text nodes in the top section

      let displayName = id;
      if (id === 'client-name') displayName = 'Khách hàng';
      else if (id === 'client-age') displayName = 'Tuổi';
      else if (id === 'client-rate') displayName = 'Sức khoẻ';
      else if (id === 'client-gender') displayName = 'Giới tính';
      else if (id === 'client-state') displayName = 'Tiểu bang';

      // Gender / Rate Class / State use dropdowns to prevent typos on client-facing proposals
      const dropdownOptions = id === 'client-gender' ? GENDERS
        : id === 'client-rate' ? rateClassesFor(appState.activeFile)   // theo hãng của file đang mở
        : id === 'client-state' ? US_STATES
        : null;

      const itemBlock = document.createElement('div');
      itemBlock.className = 'text-edit-block';
      idOKhach.push(editorId);   // để biết ô nào đứng cạnh ô nào khi chặn tràn

      if (dropdownOptions) {
        const opts = dropdownOptions.includes(textContent)
          ? dropdownOptions
          : [textContent, ...dropdownOptions];
        itemBlock.innerHTML = `
          <div class="text-meta">
            <span class="text-id">${displayName}</span>
          </div>
          <select class="text-input-field select-field" data-editor-id="${editorId}" aria-label="${escapeHtml(displayName)}">
            ${opts.map(o => `<option value="${o}"${o === textContent ? ' selected' : ''}>${o}</option>`).join('')}
          </select>
        `;
        const select = itemBlock.querySelector('select');
        // Thay danh sach xo cua he dieu hanh bang panel dung style cua app (js/dropdown.js).
        // The <select> that VAN O LAI trong DOM — core.js/main.js dang truy van no.
        if (window.napDropdown) window.napDropdown(itemBlock);
        select.addEventListener('change', (e) => {
          applyTextValue(el, editorId, e.target.value);
          vuaKhungOKhach(neoVuaKhach[editorId], idOKhach);
        });
      } else {
        itemBlock.innerHTML = `
          <div class="text-meta">
            <span class="text-id">${displayName}</span>
          </div>
          <input type="text" class="text-input-field" data-editor-id="${editorId}" value="${escapeHtml(textContent)}" aria-label="${escapeHtml(displayName)}">
        `;
        const inputEl = itemBlock.querySelector('.text-input-field');
        inputEl.addEventListener('input', (e) => {
          applyTextValue(el, editorId, e.target.value);
          vuaKhungOKhach(neoVuaKhach[editorId], idOKhach);
        });
      }

      if (id === 'client-name') itemBlock.classList.add('tb-full');   // tên khách để CẢ HÀNG
      neoVuaKhach[editorId] = { id: editorId, coChuGoc: null };
      clientPos[id] = { y: absoluteY, x: absoluteX };
      clientBlocks[id] = itemBlock;
    }

    // --- SECTION 2: Plan & Benefits (Y >= 450 && Y < 1100) ---
    else if (absoluteY >= 450 && absoluteY < 1100) {
      // Dollar values (except single "$")
      if (textContent.startsWith('$') && textContent !== '$') {
        planItems.push({ el, editorId, textContent, fontSize, absoluteX, absoluteY });
        return;
      }

      // Nhãn trong bảng quyền lợi: thời gian đóng phí / tuổi bảo vệ / tuổi cột biểu đồ.
      // Gom ở đây cho MỌI mẫu; nhánh sắp xếp bên dưới quyết định đưa cái nào ra editor.
      // 'period' dùng ở CẢ HAI: IUL có 1 ô ("20 năm" = thời gian đóng phí),
      // Term Life có 3 ô (10/20/30 năm = tiêu đề cột, ghép với phí mỗi tháng).
      const base = { el, editorId, textContent, absoluteX, absoluteY, noCurrency: true };
      if (/^\d+\s*năm$/i.test(textContent)) planExtras.push({ ...base, kind: 'period' });        // "20 năm"
      else if (/^\d+\s*tuổi$/i.test(textContent)) planExtras.push({ ...base, kind: 'coverage' }); // "120 tuổi"
      else if (/^Tuổi\s*\d+$/i.test(textContent)) planExtras.push({ ...base, kind: 'age' });      // "Tuổi 63"
      else if (/^Cash\s*Value at\s*\d+$/i.test(textContent)) planExtras.push({ ...base, kind: 'cashAt' });

      // Câu "Tổng dòng tiền dự kiến nhận trong N năm" (mẫu Allianz).
      // Cho sửa CẢ CỤM sau chữ "nhận" — chủ tool cần gõ được "trọn đời" chứ
      // không chỉ đổi con số (21/07).
      // KHÔNG dùng applyTextValue: applyTextValue ghi vào mảnh MANG data-editor-id
      // (mảnh ĐẦU dòng = chữ "Tổng"), như vậy là ghi đè luôn phần "Tổng dòng tiền dự
      // kiến". Ở đây chỉ được thay phần SAU chữ "nhận", nên phải tự ghi vào đúng mảnh.
      // Đổi lại thì mất phần đồng bộ canvas mà applyTextValue vẫn làm hộ → xem ghiCumDongTien.
      const mNhan = textContent.match(/nhận\s+(.+)$/i);
      if (mNhan && /dòng tiền/i.test(textContent)) {
        const cacManh = el.parentElement ? Array.from(el.parentElement.querySelectorAll('tspan')) : [];
        const iBatDau = cacManh.findIndex(sp => /nhận/i.test(sp.textContent));
        if (iBatDau !== -1) {
          planExtras.push({
            ...base, kind: 'cumDongTien',
            cum: mNhan[1].trim(),                       // vd "trong 21 năm"
            viTriManhChinh: iBatDau,                    // vị trí mảnh sẽ ghi chữ mới
            tongSoManh: cacManh.length                  // dùng để đối chiếu với bản canvas
          });
        }
      }
    }

    // --- SECTION 3: Agent Info (Y >= 1100) ---
    // Only show: Agent Assistant name/phone + Licensed Agent name/phone
    // Agent Asst: X ≈ 36 | Licensed Agent: X ≈ 237 | CEO (excluded): X ≈ 420
    // IUL names Y ≈ 1272, phones Y ≈ 1286 | TERMLIFE names Y ≈ 1173, phones Y ≈ 1187
    // Bottom bars: TERMLIFE Y ≈ 1224, IUL Y ≈ 1322 → both excluded by content pattern
    else {
      // Dưới nhãn "PRESENTED BY" mới là khối đại lý. Không tìm thấy nhãn (mẫu lạ) thì
      // lùi về ngưỡng cũ để không mất trắng trường — thà thừa còn hơn trống trơn.
      const isAgentZone = yPresentedBy ? (absoluteY > yPresentedBy) : (absoluteY >= 1100);
      const isAgentColumn = absoluteX < 400; // Excludes CEO column (X≈420)

      // Exclude bottom bar items by content (address, website, CEO phone in footer)
      const isBottomBar = textContent.includes('thinksmartinsurance') ||
                          textContent.includes('Brown Rd') ||
                          textContent.includes('Lawrenceville') ||
                          textContent === '(678) 825-3737';

      // Skip label rows
      // Nhãn tĩnh + SỐ LA MÃ đánh mục (I, II, III…) — không bao giờ là tên người.
      const isLabel = /^(Agent Assistant|Licensed Agent|CEO|PRESENTED BY)$/.test(textContent) ||
                      /^[IVX]{1,4}$/.test(textContent);

      // Only allow name/phone rows (short text, not static label)
      // US format "(346) 858-4277" or an all-digits number like "0938169130"
      const isPhone = /^\(\d{3}\)/.test(textContent) || /^[+\d][\d\s().-]{6,}$/.test(textContent);
      const isName = !isPhone && textContent.length > 1 && textContent.length < 40;

      // Skip wrapped-paragraph lines (e.g. the surrender-charge disclaimer whose short last line
      // "khi không còn áp dụng." lands in the Agent Assistant column). Real agent fields are
      // single-line <text> elements; a <text> holding 2+ editable lines is body text, not a field.
      const parentText = el.tagName.toLowerCase() === 'text' ? el : el.closest('text');
      const isParagraphLine = !!parentText && parentText.querySelectorAll('[data-editor-id]').length > 1;

      if (!isAgentZone || !isAgentColumn || isBottomBar || isLabel || isParagraphLine || (!isPhone && !isName)) return;

      // Determine display label based on X column
      const isLeft = absoluteX < 200; // Agent Asst column (X≈36)

      let displayName;
      if (isLeft && !isPhone) displayName = 'Tên Agent Assistant';
      else if (isLeft && isPhone) displayName = 'SĐT Agent Assistant';
      else if (!isLeft && !isPhone) displayName = 'Tên Licensed Agent';
      else displayName = 'SĐT Licensed Agent';

      const itemBlock = document.createElement('div');
      itemBlock.className = 'text-edit-block';
      itemBlock.innerHTML = `
        <div class="text-meta">
          <span class="text-id">${displayName}</span>
        </div>
        <input type="text" class="text-input-field" data-editor-id="${editorId}" value="${escapeHtml(textContent)}" aria-label="${escapeHtml(displayName)}">
      `;

      const inputEl = itemBlock.querySelector('.text-input-field');
      inputEl.addEventListener('input', (e) => {
        let newValue = e.target.value;
        // Phone fields: auto-format 10 US digits as "(123) 456-7890" the moment they're complete
        if (isPhone) {
          const formatted = formatPhoneValue(newValue);
          if (formatted && formatted !== newValue) {
            newValue = formatted;
            e.target.value = formatted;
          }
        }
        // applyTextValue clears sibling tspans on the same line — agent names/phones are split
        // into pieces ("T" + "ONY PHU"); writing textContent alone leaves the old tail visible
        applyTextValue(el, editorId, newValue);
      });

      agentContainer.appendChild(itemBlock);
    }
  });

  // Sort and append Section 1: sắp theo VỊ TRÍ trên bản vẽ (Y↓ rồi X→) để khớp bố cục mẫu gốc.
  // → tên khách (trên cùng), rồi hàng [Tuổi | Giới tính], hàng [Sức khoẻ | Tiểu bang].
  const BAND_KHACH = 20;   // gộp ô cùng hàng (lệch Y nhỏ) rồi sắp trái→phải
  ['client-name', 'client-age', 'client-rate', 'client-gender', 'client-state']
    .filter(k => clientBlocks[k])
    .sort((a, b) => (Math.round(clientPos[a].y / BAND_KHACH) - Math.round(clientPos[b].y / BAND_KHACH))
                    || (clientPos[a].x - clientPos[b].x))
    .forEach(k => clientContainer.appendChild(clientBlocks[k]));

  // Sort, label and append Section 2:
  const tenFile = (appState.activeFile && appState.activeFile.name || '').toLowerCase();
  const isTerm = tenFile.includes('term');
  const isAllianz = tenFile.includes('allianz');
  const orderedPlanItems = [];

  if (isTerm) {
    const mainBenefit = planItems.find(item => item.absoluteY < 600);
    const premiums = planItems.filter(item => item.absoluteY >= 600)
                              .sort((a, b) => a.absoluteX - b.absoluteX);

    // Term Life có BA ô "N năm" (hàng tiêu đề cột 10/20/30) — khác IUL chỉ có một ô
    // "20 năm" là thời gian đóng phí. Trước đây 3 ô này KHÔNG sửa được và nhãn phí
    // bị hardcode "Phí đóng 10/20/30 năm"; đổi số năm trên bản vẽ là nhãn sai ngay.
    const periods = planExtras.filter(x => x.kind === 'period')
                              .sort((a, b) => a.absoluteX - b.absoluteX);

    if (mainBenefit) mainBenefit.displayName = 'Mức bảo vệ';
    if (mainBenefit) orderedPlanItems.push(mainBenefit);

    // Mỗi cột = MỘT hàng gộp [số năm | số tiền] (yêu cầu chủ tool 2026-07-21).
    // Ghép theo TOẠ ĐỘ X gần nhau nhất — cùng cột thì cùng X — chứ không ghép theo
    // thứ tự mảng: thiếu một ô là toàn bộ cặp sau lệch đi một (bài học lỗi
    // "Tổng số tiền đóng" bị dán nhầm nhãn hôm 15/07).
    const dungRoi = new Set();
    const ghepGanNhat = (moc) => {
      let best = null, bestD = Infinity;
      premiums.forEach((m, j) => {
        if (dungRoi.has(j)) return;
        const d = Math.abs(m.absoluteX - moc.absoluteX);
        if (d < bestD) { bestD = d; best = j; }
      });
      if (best === null) return null;
      dungRoi.add(best);
      return premiums[best];
    };

    if (periods.length) {
      periods.forEach((p, i) => {
        orderedPlanItems.push({ isTermCombo: true, index: i, period: p, money: ghepGanNhat(p) });
      });
      // Ô tiền nào không có cột năm tương ứng thì vẫn cho sửa riêng, đừng bỏ rơi
      premiums.forEach((m, j) => {
        if (dungRoi.has(j)) return;
        m.displayName = 'Phí đóng (cột ' + (j + 1) + ')';
        orderedPlanItems.push(m);
      });
    } else {
      // Không đọc được hàng tiêu đề → giữ nguyên cách cũ để không mất field
      if (premiums[0]) premiums[0].displayName = 'Phí đóng 10 năm';
      if (premiums[1]) premiums[1].displayName = 'Phí đóng 20 năm';
      if (premiums[2]) premiums[2].displayName = 'Phí đóng 30 năm';
      premiums.forEach(p => orderedPlanItems.push(p));
    }
  } else if (isAllianz) {
    // ------------------------------------------------------------------------
    // ALLIANZ (Max-Funded IUL) — bố cục KHÁC HẲN IUL/Term: có "Mức đóng mỗi năm",
    // "Thu nhập hưu trí", "Tổng dòng tiền dự kiến" và một hàng 4 ô ở dưới.
    // Lọc theo ngưỡng toạ độ như nhánh IUL sẽ dán nhãn lung tung (chủ tool báo
    // 21/07: "Giá trị tích luỹ — Cột 2" thực ra là Tổng dòng tiền dự kiến).
    // Nên ghép theo NEO CHỮ: mỗi nhãn tiếng Việt đứng NGAY TRÊN giá trị của nó.
    // Thêm/bớt ô trong bản vẽ chỉ cần thêm dòng vào bảng NHAN dưới đây.
    // ------------------------------------------------------------------------
    const NHAN = [
      { khop: /^MỨC ĐÓNG MỖI NĂM$/i,          ten: 'Mức đóng mỗi năm' },
      { khop: /^THU NHẬP HƯU TRÍ$/i,          ten: 'Thu nhập hưu trí' },
      { khop: /^Tổng dòng tiền dự kiến/i,     ten: 'Tổng dòng tiền' },
      { khop: /^Thời gian đóng phí$/i,        ten: 'Thời gian đóng phí' },
      { khop: /^Bảo vệ đến khi nào$/i,        ten: 'Bảo vệ đến khi nào' },
      { khop: /^Tổng số tiền đóng$/i,         ten: 'Tổng tiền đóng' },
      { khop: /^Mức bảo vệ ban đầu$/i,        ten: 'Mức bảo vệ ban đầu' },
    ];

    // Giá trị có thể là tiền (planItems) hoặc chữ-số như "5 Năm" / "120 tuổi" (planExtras)
    const ungVien = planItems.concat(planExtras.filter(x => x.kind !== 'cumDongTien'));
    const daDung = new Set();

    NHAN.forEach(function (n) {
      const nhan = allLines.find(l => n.khop.test(l.textContent));
      if (!nhan) return;
      // Giá trị nằm DƯỚI nhãn, cùng cột (lệch ngang nhỏ). Ngưỡng nới rộng cho bản
      // FINAL 2026-07-23: nhãn "THU NHẬP HƯU TRÍ" và "TỔNG DÒNG TIỀN DỰ KIẾN" có
      // thêm DÒNG PHỤ ĐỀ tiếng Anh chen giữa nhãn và số → giá trị tụt xuống ~104px
      // và lệch ngang tới ~121px (đo trên bản vẽ), vượt ngưỡng cũ 70/80 nên rớt
      // thành "Giá trị khác". Dùng "ứng viên gần nhất bên dưới" (chấm điểm dy+dx*.5)
      // nên nới ngưỡng vẫn ghép đúng; ứng viên SAI gần nhất cách dx=153.9 → 140 an toàn.
      let tot = null, diem = Infinity;
      ungVien.forEach(function (v) {
        if (daDung.has(v.editorId)) return;
        const dy = v.absoluteY - nhan.absoluteY;
        const dx = Math.abs(v.absoluteX - nhan.absoluteX);
        if (dy <= 0 || dy > 120 || dx > 140) return;
        const d = dy + dx * 0.5;          // ưu tiên ô ngay bên dưới, rồi mới tới lệch ngang
        if (d < diem) { diem = d; tot = v; }
      });
      if (!tot) return;
      daDung.add(tot.editorId);
      tot.displayName = n.ten;
      // Sắp theo vị trí NHÃN (thẻ), KHÔNG theo vị trí SỐ (số nằm dưới, có dòng phụ chen giữa)
      tot.sortY = nhan.absoluteY; tot.sortX = nhan.absoluteX;

      // "Thu nhập hưu trí mỗi năm" có chữ "/năm" nằm NGAY BÊN PHẢI, là một thẻ <text>
      // riêng với toạ độ cứng → số dài ra là đè lên nó. Ghi nhớ để xếp lại chỗ sau mỗi
      // lần gõ (xem xepLaiHauTo ở đầu file).
      if (n.ten === 'Thu nhập hưu trí') {
        const viTriTien = docTranslate(tot.el.closest('text'));
        let hauTo = null, gan = Infinity;
        if (viTriTien) {
          allLines.forEach(function (l) {
            if (l.editorId === tot.editorId) return;
            const p = docTranslate(l.el.closest('text'));
            if (!p || Math.abs(p.y - viTriTien.y) > 1 || p.x <= viTriTien.x) return;
            if (p.x - viTriTien.x < gan) { gan = p.x - viTriTien.x; hauTo = l; }
          });
        }
        if (hauTo) tot.neoHauTo = { idTien: tot.editorId, idHauTo: hauTo.editorId, tam: null };
      }

      orderedPlanItems.push(tot);
    });

    // Hai dòng chữ trong thẻ "TỔNG DÒNG TIỀN DỰ KIẾN" cho sửa SỐ (chủ tool 23/07):
    //   "NHẬN TỪ TUỔI 65-85"       → sửa khoảng tuổi "65-85"
    //   "Nhận đều đặn trong 21 năm" → sửa số năm "21"
    // Đặt NGAY SAU ô "Tổng dòng tiền dự kiến" cho gom nhóm. Ghi bằng applyTextValue: dòng tuổi
    // là 1 tspan (sạch), dòng năm nhiều tspan vẫn gộp đúng như ô tên agent.
    const themDongSo = [];
    const dongTuoi = allLines.find(l => /^NHẬN TỪ TUỔI/i.test(l.textContent));
    if (dongTuoi) themDongSo.push({
      isAllianzTuoiNhan: true, el: dongTuoi.el, editorId: dongTuoi.editorId,
      absoluteY: dongTuoi.absoluteY, absoluteX: dongTuoi.absoluteX,   // để sắp theo vị trí
      khoang: dongTuoi.textContent.replace(/^NHẬN TỪ TUỔI\s*/i, '').trim()
    });
    // Khớp cả "Nhận đều đặn trong N năm" LẪN "Nhận đều đặn trọn đời" (đừng đòi phải có "năm")
    const dongSoNam = allLines.find(l => /^Nhận đều đặn/i.test(l.textContent));
    if (dongSoNam) {
      const rawSN = dongSoNam.textContent.replace(/^Nhận đều đặn\s*/i, '').trim();
      const mSN = rawSN.match(/^trong\s+(\d+)\s*năm$/i);   // ô nhập: "trong 21 năm"→"21"; "trọn đời"→"trọn đời"
      themDongSo.push({
        isAllianzSoNamNhan: true, el: dongSoNam.el, editorId: dongSoNam.editorId,
        absoluteY: dongSoNam.absoluteY, absoluteX: dongSoNam.absoluteX,   // để sắp theo vị trí
        so: mSN ? mSN[1] : rawSN
      });
    }
    if (themDongSo.length) {
      const iTong = orderedPlanItems.findIndex(it => it.displayName === 'Tổng dòng tiền');
      if (iTong !== -1) orderedPlanItems.splice(iTong + 1, 0, ...themDongSo);
      else orderedPlanItems.push(...themDongSo);
    }

    // Ô nào không khớp nhãn nào thì vẫn cho sửa, đặt tên trung tính để không mất field
    ungVien.forEach(function (v) {
      if (daDung.has(v.editorId)) return;
      v.displayName = v.displayName || 'Giá trị khác';
      orderedPlanItems.push(v);
    });

    planExtras.filter(x => x.kind === 'cumDongTien')
              .forEach(x => orderedPlanItems.push({ isSoNam: true, ref: x }));
  } else {
    // IUL: 6 money fields + benefit-plan labels (period / coverage age / chart ages)
    const mainBenefit = planItems.find(item => item.absoluteX < 100 && item.absoluteY < 550);
    const monthlyPremium = planItems.find(item => item.absoluteX < 100 && item.absoluteY >= 550 && item.absoluteY < 650);

    const period = planExtras.find(x => x.kind === 'period');
    const coverage = planExtras.find(x => x.kind === 'coverage');

    // "Tổng số tiền đóng" là Ô THỨ 3 cùng hàng với "20 năm"/"120 tuổi" — X của nó ≥ 100 (≈212),
    // nên phải tách ra TRƯỚC khi gom nhóm giá trị biểu đồ. Nếu không, nó bị nhận nhầm là cột
    // biểu đồ đầu tiên và toàn bộ nhãn "Giá trị tích luỹ Tuổi N" lệch đi 1 ô (bug người dùng báo).
    let totalPremium = planItems.find(item => item.absoluteX < 100 && item.absoluteY >= 650);
    const chartCandidates = planItems.filter(item => item.absoluteX >= 100);
    const boxRowY = period ? period.absoluteY : (coverage ? coverage.absoluteY : null);
    if (!totalPremium && boxRowY !== null) {
      const idx = chartCandidates.findIndex(item => Math.abs(item.absoluteY - boxRowY) < 25);
      if (idx !== -1) totalPremium = chartCandidates.splice(idx, 1)[0];
    }
    const chartProjections = chartCandidates.sort((a, b) => b.absoluteY - a.absoluteY); // Descending Y -> chronological order

    // Chart age labels left→right = column 1..3; pair each with its "Cash Value at N" line
    // (same number) so editing "Tuổi 63" → "Tuổi 65" also rewrites the English subtitle.
    const ageLabels = planExtras.filter(x => x.kind === 'age').sort((a, b) => a.absoluteX - b.absoluteX);
    const cashAts = planExtras.filter(x => x.kind === 'cashAt');
    const numOf = t => (String(t).match(/\d+/) || [null])[0];
    ageLabels.forEach((it, i) => {
      it.displayName = `Tuổi cột ${i + 1} (biểu đồ)`;
      it.paired = cashAts.find(c => numOf(c.textContent) === numOf(it.textContent)) || null;
    });

    if (mainBenefit) mainBenefit.displayName = 'Mức bảo vệ';
    if (monthlyPremium) monthlyPremium.displayName = 'Phí đóng mỗi tháng';
    if (totalPremium) totalPremium.displayName = 'Tổng tiền đóng';

    if (mainBenefit) orderedPlanItems.push(mainBenefit);
    if (monthlyPremium) orderedPlanItems.push(monthlyPremium);
    if (totalPremium) orderedPlanItems.push(totalPremium);
    // "Thời gian đóng phí" đặt NGAY TRÊN các cột biểu đồ (chủ tool 23/07), không để cuối bảng.
    if (period) { period.displayName = 'Thời gian đóng phí'; orderedPlanItems.push(period); }

    // Mỗi cột biểu đồ = MỘT hàng chỉnh sửa gộp [tiền | tuổi] cho gọn (yêu cầu chủ tool 2026-07-15)
    const columnCount = Math.max(chartProjections.length, ageLabels.length);
    for (let i = 0; i < columnCount; i++) {
      orderedPlanItems.push({ isChartCombo: true, index: i, money: chartProjections[i] || null, age: ageLabels[i] || null });
    }

    // Chỉ có ở mẫu Allianz; mẫu khác không khớp mẫu câu nên mảng rỗng, vô hại.
    planExtras.filter(x => x.kind === 'cumDongTien')
              .forEach(x => orderedPlanItems.push({ isSoNam: true, ref: x }));
    // "Bảo vệ đến khi nào / 120 tuổi" bị KHOÁ theo yêu cầu chủ tool (2026-07-15): giá trị cố định
    // của sản phẩm, không đưa vào bảng chỉnh sửa (coverage vẫn được thu thập làm mốc hàng ô ở trên).
  }

  // Sắp Section 2 theo VỊ TRÍ trên bản vẽ (Y↓ rồi X→) → bảng sửa đọc y như tờ báo giá (chủ tool 23/07).
  // Combo lấy vị trí ô chính (tiền/period); ô tiền + đặc biệt đều có absoluteY/absoluteX sẵn.
  // Combo: sắp theo nhãn TUỔI / SỐ NĂM (nằm CÙNG HÀNG, X = thứ tự cột) — KHÔNG theo số tiền
  // (cột biểu đồ cao thấp khác nhau → số tiền ở Y khác nhau → sắp theo tiền sẽ đảo cột).
  const viTriItem = (it) => it.isChartCombo ? (it.age || it.money)
    : it.isTermCombo ? (it.period || it.money)
    : it.isSoNam ? it.ref
    : it;
  const DAI_HANG = 20;   // gộp các ô lệch Y dưới ~20px vào CÙNG HÀNG rồi sắp theo X (trái→phải)
  const khoaSort = (it) => {
    const p = viTriItem(it) || {};
    const y = (it.sortY != null) ? it.sortY : (p.absoluteY || 0);   // ưu tiên vị trí NHÃN nếu có
    const x = (it.sortX != null) ? it.sortX : (p.absoluteX || 0);
    return { hang: Math.round(y / DAI_HANG), x: x };
  };
  orderedPlanItems.sort((a, b) => {
    const ka = khoaSort(a), kb = khoaSort(b);
    return (ka.hang - kb.hang) || (ka.x - kb.x);
  });

  // --- Chuẩn bị neo-giữa cho MỌI ô giá trị của phần Kế hoạch (xem canhGiuaTheoBanVe) ---
  const oCanGiua = [];
  orderedPlanItems.forEach(function (it) {
    if (it.isChartCombo) { [it.money, it.age].forEach(v => { if (v) oCanGiua.push(v); }); return; }
    if (it.isTermCombo)  { [it.period, it.money].forEach(v => { if (v) oCanGiua.push(v); }); return; }
    if (it.isSoNam)      { oCanGiua.push(it.ref); return; }
    if (it.isAllianzTuoiNhan || it.isAllianzSoNamNhan) return;  // dòng chữ neo-TRÁI, không canh giữa
    if (it.neoHauTo)     return;   // cụm [số | /năm] có cách canh riêng, xem xepLaiHauTo
    oCanGiua.push(it);
  });
  oCanGiua.forEach(function (v) {
    // Ô cùng hàng gần nhất cho biết BƯỚC CỘT → suy ra bề rộng tối đa của một ô.
    // Chính xác hơn dò thẻ nền, vì thẻ nền của bảng thường trải hết cả 3 cột.
    let buoc = null;
    oCanGiua.forEach(function (k) {
      if (k === v || Math.abs(k.absoluteY - v.absoluteY) > 6) return;
      const d = Math.abs(k.absoluteX - v.absoluteX);
      if (d > 1 && (buoc === null || d < buoc)) buoc = d;
    });
    v.neoGiua = { id: v.editorId, buocCot: buoc, rong: null, coChuGoc: null, xong: false };
  });
  // Phải đợi font tải xong mới đo được bề rộng chữ cho đúng
  const canhTatCa = () => {
    oCanGiua.forEach(v => canhGiuaTheoBanVe(v.neoGiua));
    // Ô khách hàng: chỉ thu nhỏ nếu tràn, KHÔNG đổi sang căn giữa (bản vẽ neo trái)
    idOKhach.forEach(idx => vuaKhungOKhach(neoVuaKhach[idx], idOKhach));
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(canhTatCa);
  else canhTatCa();

  // Cụm [số | ĐƠN VỊ KHOÁ] dùng trong ô gộp 2 cột (không kèm nhãn). viTri:
  // 'suffix' → "21" + "năm" | 'prefix' → "Tuổi" + "63". Trả về {row, input} để gắn sự kiện.
  function unitInputGroup(soBanDau, donVi, viTri, editorId, ariaLabel) {
    const row = document.createElement('div');
    row.className = 'unit-input-row';
    const chip = `<span class="unit-suffix${viTri === 'prefix' ? ' unit-prefix' : ''}" aria-hidden="true">${escapeHtml(donVi)}</span>`;
    const inp = `<input type="text" inputmode="numeric" class="text-input-field unit-number" data-editor-id="${editorId}" value="${escapeHtml(soBanDau)}" aria-label="${escapeHtml(ariaLabel || '')}">`;
    row.innerHTML = viTri === 'prefix' ? (chip + inp) : (inp + chip);
    return { row, input: row.querySelector('.unit-number') };
  }

  // Ô TIỀN — khoá dấu "$", chỉ gõ được SỐ (chủ tool chốt 11/08/2026).
  // Cùng khuôn với unitInputGroup ở trên, chỉ khác: đơn vị đứng trước và là "$".
  // Vì sao phải khoá: xem khối chú thích dài ở locSoTien() trong core.js.
  function moneyInputGroup(chuoiGoc, editorId, ariaLabel) {
    const row = document.createElement('div');
    row.className = 'unit-input-row o-tien';
    const so = soThoTuChuoiTien(chuoiGoc);
    row.innerHTML =
      `<span class="unit-suffix unit-prefix" aria-hidden="true">$</span>` +
      `<input type="text" inputmode="decimal" class="text-input-field unit-number" ` +
      `data-editor-id="${editorId}" value="${escapeHtml(hienSoTien(so))}" ` +
      `aria-label="${escapeHtml(ariaLabel || 'Số tiền')}">`;
    return { row, input: row.querySelector('.unit-number') };
  }

  // Gắn sự kiện cho một ô tiền. `sauKhiGhi` chạy sau mỗi lần ghi (thu nhỏ chữ, xếp hậu tố…).
  // ⚠️ Ghi vào bản vẽ luôn là chuỗi ĐÃ CHUẨN HOÁ, không bao giờ là chữ thô người dùng gõ.
  // Đây chính là chỗ sửa lỗi khoảng trắng: trước đây `input` ghi thẳng e.target.value.
  function ganOTien(input, el, editorId, sauKhiGhi) {
    const ghi = (soTho) => {
      input.value = hienSoTien(soTho);
      applyTextValue(el, editorId, chuoiTienChoBanVe(soTho));
      if (sauKhiGhi) sauKhiGhi();
    };
    input.addEventListener('input', () => {
      // Chèn thêm dấu phân nghìn làm chuỗi dài ra → phải dời con trỏ theo, không thì
      // gõ tới hàng nghìn là con trỏ nhảy về sai chỗ.
      const truoc = input.value;
      const viTri = input.selectionStart == null ? truoc.length : input.selectionStart;
      const soTho = locSoTien(truoc);
      const sau = hienSoTien(soTho);
      ghi(soTho);
      const moi = Math.max(0, Math.min(sau.length, viTri + (sau.length - truoc.length)));
      try { input.setSelectionRange(moi, moi); } catch (e) {}
    });
    // Bù tròn phần lẻ khi rời ô: "200.5" → "200.50". KHÔNG làm lúc đang gõ.
    input.addEventListener('blur', () => ghi(chotSoTienKhiRoiO(input.value)));
  }

  // Hàng gộp cho 1 cột biểu đồ: ô TIỀN bên trái + ô TUỔI bên phải
  function buildChartComboBlock(combo) {
    const idx = combo.index + 1;
    const block = document.createElement('div');
    block.className = 'text-edit-block tb-full';   // combo 2 ô → cả hàng
    block.innerHTML = `
      <div class="text-meta">
        <span class="text-id">Giá trị tích luỹ — Cột ${idx}</span>
      </div>
      <div class="dual-input-row"></div>
    `;
    const row = block.querySelector('.dual-input-row');

    if (combo.money) {
      const g = moneyInputGroup(combo.money.textContent, combo.money.editorId, 'Số tiền cột ' + idx);
      row.appendChild(g.row);
      ganOTien(g.input, combo.money.el, combo.money.editorId,
        () => thuNhoChoVua(combo.money.neoGiua));
    }
    if (combo.age) {
      // "Tuổi 63": ĐƠN VỊ ĐỨNG TRƯỚC. Khoá chữ "Tuổi", chỉ gõ số.
      const m = String(combo.age.textContent).trim().match(/^(\D*?)\s*(\d+)\s*$/);
      const tienTo = (m && m[1].trim()) ? m[1].trim() : 'Tuổi';
      const so = m ? m[2] : String(combo.age.textContent).replace(/\D/g, '');
      const g = unitInputGroup(so, tienTo, 'prefix', combo.age.editorId, 'Tuổi cột ' + idx);
      g.row.classList.add('dual-age');
      row.appendChild(g.row);
      g.input.addEventListener('input', () => {
        const n = g.input.value.replace(/\D/g, '');
        if (g.input.value !== n) g.input.value = n;
        applyTextValue(combo.age.el, combo.age.editorId, n ? (tienTo + ' ' + n) : tienTo);
        thuNhoChoVua(combo.age.neoGiua);
        // Giữ dòng phụ tiếng Anh "Cash Value at N" khớp với tuổi mới
        if (combo.age.paired && n) applyTextValue(combo.age.paired.el, combo.age.paired.editorId, 'Cash Value at ' + n);
      });
    }
    return block;
  }

  // Term Life — hàng gộp [số năm | số tiền] cho một cột.
  // Số năm để TRƯỚC và hẹp hơn: nó là nhãn cột, tiền mới là giá trị chính.
  function buildTermComboBlock(combo) {
    const idx = combo.index + 1;
    const block = document.createElement('div');
    block.className = 'text-edit-block tb-full';   // combo 2 ô → cả hàng
    block.innerHTML = `
      <div class="text-meta">
        <span class="text-id">Gói ${idx} — thời gian &amp; phí mỗi tháng</span>
      </div>
      <div class="dual-input-row"></div>
    `;
    const row = block.querySelector('.dual-input-row');

    if (combo.period) {
      // "10 năm": khoá đơn vị "năm", chỉ gõ số. Ở cột TRÁI (nhãn cột).
      const m = String(combo.period.textContent).trim().match(/^(\d+)\s*(.*)$/);
      const so = m ? m[1] : String(combo.period.textContent).replace(/\D/g, '');
      const donVi = (m && m[2].trim()) ? m[2].trim() : 'năm';
      const g = unitInputGroup(so, donVi, 'suffix', combo.period.editorId, 'Thời gian tham gia gói ' + idx);
      g.row.classList.add('dual-age');
      row.appendChild(g.row);
      // KHÔNG format tiền tệ cho ô này — "10 năm" qua formatCurrencyValue thành "$10".
      g.input.addEventListener('input', () => {
        const n = g.input.value.replace(/\D/g, '');
        if (g.input.value !== n) g.input.value = n;
        // Cột trống → "-" (đồng nhất với ô tiền, khớp bản mẫu cột chưa dùng)
        applyTextValue(combo.period.el, combo.period.editorId, n ? (n + ' ' + donVi) : '-');
        thuNhoChoVua(combo.period.neoGiua);
      });
    }
    if (combo.money) {
      // Ô trống → chuoiTienChoBanVe() tự trả "-", khớp bản mẫu cột chưa dùng.
      const g = moneyInputGroup(combo.money.textContent, combo.money.editorId, 'Phí mỗi tháng gói ' + idx);
      row.appendChild(g.row);
      ganOTien(g.input, combo.money.el, combo.money.editorId,
        () => thuNhoChoVua(combo.money.neoGiua));
    }
    return block;
  }

  // Ô "số + ĐƠN VỊ" (Thời gian đóng phí = "N Năm"/"N năm", Bảo vệ đến khi nào = "N tuổi"):
  // KHOÁ đơn vị, người dùng chỉ gõ SỐ, đơn vị tự fill — giống ô tiền tự thêm "$" (chủ tool 23/07).
  // Tách số + đơn vị từ giá trị hiện có → GIỮ ĐÚNG đơn vị + chữ hoa/thường của từng mẫu
  // ("Năm"/"năm"/"tuổi"), không hardcode.
  function buildUnitLockBlock(item) {
    const m = String(item.textContent).trim().match(/^(\d+)\s*(.*)$/);
    const soBanDau = m ? m[1] : String(item.textContent).replace(/\D/g, '');
    const donVi = (m && m[2].trim()) ? m[2].trim() : '';
    const nhan = item.displayName || 'Giá trị';
    const block = document.createElement('div');
    block.className = 'text-edit-block';
    block.innerHTML = `
      <div class="text-meta"><span class="text-id">${escapeHtml(nhan)}</span></div>
      <div class="unit-input-row">
        <input type="text" inputmode="numeric" class="text-input-field unit-number"
               data-editor-id="${item.editorId}" value="${escapeHtml(soBanDau)}"
               aria-label="${escapeHtml(nhan + ' (số ' + donVi + ')')}">
        <span class="unit-suffix" aria-hidden="true">${escapeHtml(donVi)}</span>
      </div>
    `;
    const inp = block.querySelector('.unit-number');
    inp.addEventListener('input', () => {
      const so = inp.value.replace(/\D/g, '');       // KHOÁ: chỉ giữ chữ số
      if (inp.value !== so) inp.value = so;
      applyTextValue(item.el, item.editorId, so ? (so + ' ' + donVi) : '');
      thuNhoChoVua(item.neoGiua);
    });
    return block;
  }

  // "NHẬN TỪ TUỔI 65-85" — sửa KHOẢNG TUỔI, giữ "NHẬN TỪ TUỔI" cố định. Dòng 1 tspan → applyTextValue sạch.
  function buildTuoiNhanBlock(item) {
    const block = document.createElement('div');
    block.className = 'text-edit-block tb-full';   // có dòng xem trước → cả hàng
    block.innerHTML = `
      <div class="text-meta"><span class="text-id">Nhận từ tuổi (khoảng)</span></div>
      <input type="text" class="text-input-field" data-editor-id="${item.editorId}" value="${escapeHtml(item.khoang)}"
             inputmode="numeric" placeholder="vd 65-85" aria-label="Khoảng tuổi nhận thu nhập">
      <div class="text-preview" aria-live="polite"></div>
    `;
    const inp = block.querySelector('input');
    const xem = block.querySelector('.text-preview');
    inp.addEventListener('input', () => {
      const kh = inp.value.replace(/[^\d\-–\s]/g, '').replace(/\s+/g, ' ').trim();  // chỉ số, gạch nối, khoảng trắng
      if (inp.value !== kh) inp.value = kh;
      applyTextValue(item.el, item.editorId, 'NHẬN TỪ TUỔI ' + kh);
      xem.textContent = kh ? `Trên bản vẽ: “NHẬN TỪ TUỔI ${kh}”` : '';
    });
    xem.textContent = `Trên bản vẽ: “NHẬN TỪ TUỔI ${item.khoang}”`;
    return block;
  }

  // "Nhận đều đặn trong N năm" HOẶC "Nhận đều đặn trọn đời" (chủ tool 23/07): gõ SỐ → "trong N năm";
  // gõ CHỮ (vd "trọn đời") → giữ nguyên. Ô gõ tự do + dòng xem trước cho thấy câu hoàn chỉnh.
  function cauNhanDeuDan(v) {
    const s = String(v == null ? '' : v).trim().replace(/\s+/g, ' ');
    if (!s) return 'Nhận đều đặn';
    if (/^\d+$/.test(s)) return 'Nhận đều đặn trong ' + s + ' năm';                       // "21" → trong 21 năm
    if (/^\d+\s*năm$/i.test(s)) return 'Nhận đều đặn trong ' + s.replace(/\s*năm$/i, '') + ' năm';
    return 'Nhận đều đặn ' + s;                                                            // "trọn đời" → Nhận đều đặn trọn đời
  }
  function buildSoNamNhanBlock(item) {
    const block = document.createElement('div');
    block.className = 'text-edit-block tb-full';   // có dòng xem trước → cả hàng
    block.innerHTML = `
      <div class="text-meta"><span class="text-id">Nhận đều đặn</span></div>
      <input type="text" class="text-input-field" data-editor-id="${item.editorId}"
             value="${escapeHtml(item.so)}" placeholder="gõ 21  hoặc  trọn đời"
             aria-label="Nhận đều đặn trong (số năm hoặc trọn đời)">
      <div class="text-preview" aria-live="polite"></div>
    `;
    const inp = block.querySelector('input');
    const xem = block.querySelector('.text-preview');
    inp.addEventListener('input', () => {
      const cau = cauNhanDeuDan(inp.value);
      applyTextValue(item.el, item.editorId, cau);
      xem.textContent = 'Trên bản vẽ: “' + cau + '”';
    });
    xem.textContent = 'Trên bản vẽ: “' + cauNhanDeuDan(item.so) + '”';
    return block;
  }

  // Create and append Section 2 elements
  orderedPlanItems.forEach(item => {
    // Hàng gộp [tiền | tuổi] của cột biểu đồ có builder riêng
    if (item.isChartCombo) {
      planContainer.appendChild(buildChartComboBlock(item));
      return;
    }
    if (item.isTermCombo) {
      planContainer.appendChild(buildTermComboBlock(item));
      return;
    }
    // Ô "số + đơn vị" khoá đơn vị: Thời gian đóng phí ("N năm") + Bảo vệ đến khi nào ("N tuổi")
    if (item.kind === 'period' || item.kind === 'coverage') {
      planContainer.appendChild(buildUnitLockBlock(item));
      return;
    }
    // Allianz: sửa khoảng tuổi "NHẬN TỪ TUỔI 65-85"
    if (item.isAllianzTuoiNhan) {
      planContainer.appendChild(buildTuoiNhanBlock(item));
      return;
    }
    // Allianz: sửa số năm "Nhận đều đặn trong 21 năm"
    if (item.isAllianzSoNamNhan) {
      planContainer.appendChild(buildSoNamNhanBlock(item));
      return;
    }
    // Chỉ sửa CON SỐ trong câu, ghi thẳng vào đúng mảnh tspan chứa nó nên các
    // mảnh in đậm khác của câu không bị đụng tới.
    if (item.isSoNam) {
      const x = item.ref;
      const b = document.createElement('div');
      b.className = 'text-edit-block tb-full';   // có dòng xem trước → cả hàng
      // Ô này nhận CẢ SỐ LẪN CHỮ (chủ tool chốt 21/07): gõ "21" ra "nhận trong 21 năm",
      // gõ "trọn đời" ra "nhận trọn đời". Có dòng xem trước ngay dưới ô để thấy câu
      // hoàn chỉnh trước khi nhìn lên bản vẽ.
      b.innerHTML = `
        <div class="text-meta"><span class="text-id">Thời gian nhận dòng tiền</span></div>
        <input type="text" class="text-input-field" value="${escapeHtml(x.cum)}"
               placeholder="gõ 21  hoặc  trọn đời"
               aria-label="Thời gian nhận dòng tiền">
        <div class="text-preview" aria-live="polite"></div>
      `;
      const oNhap = b.querySelector('input');
      const xemTruoc = b.querySelector('.text-preview');
      const veLai = () => {
        const cum = cumThoiGianNhan(oNhap.value);
        xemTruoc.textContent = cum ? `Trên bản vẽ: “…dự kiến nhận ${cum}”` : '';
        if (!cum) return;
        ghiCumDongTien(x, cum);
        thuNhoChoVua(x.neoGiua);
        markDirty();
      };
      oNhap.addEventListener('input', veLai);
      xemTruoc.textContent = `Trên bản vẽ: “…dự kiến nhận ${cumThoiGianNhan(oNhap.value)}”`;
      planContainer.appendChild(b);
      return;
    }

    const itemBlock = document.createElement('div');
    itemBlock.className = 'text-edit-block';
    itemBlock.innerHTML = `
      <div class="text-meta">
        <span class="text-id">${item.displayName || 'Giá trị'}</span>
      </div>
    `;

    // Ô TIỀN (Mức bảo vệ · Phí đóng mỗi tháng · Tổng tiền đóng…): KHOÁ dấu "$",
    // chỉ gõ được số. `noCurrency` là ô nhãn kiểu "20 năm" — giữ ô gõ tự do như cũ.
    if (!item.noCurrency) {
      const g = moneyInputGroup(item.textContent, item.editorId, item.displayName || 'Số tiền');
      itemBlock.appendChild(g.row);
      ganOTien(g.input, item.el, item.editorId, () => {
        thuNhoChoVua(item.neoGiua);
        xepLaiHauTo(item.neoHauTo);   // đẩy chữ "/năm" ra sau con số vừa gõ
      });
    } else {
      itemBlock.insertAdjacentHTML('beforeend',
        `<input type="text" class="text-input-field" data-editor-id="${item.editorId}" value="${escapeHtml(item.textContent)}" aria-label="${escapeHtml(item.displayName || 'Giá trị')}">`);
      const inputEl = itemBlock.querySelector('.text-input-field');
      inputEl.addEventListener('input', (e) => {
        applyTextValue(item.el, item.editorId, e.target.value);
        // Chart age label: keep the English "Cash Value at N" subtitle in sync
        if (item.paired) {
          const num = (e.target.value.match(/\d+/) || [null])[0];
          if (num) applyTextValue(item.paired.el, item.paired.editorId, 'Cash Value at ' + num);
        }
        thuNhoChoVua(item.neoGiua);
        xepLaiHauTo(item.neoHauTo);
      });
    }

    // Lần đầu: canh lại cụm [số | /năm] cho khớp bản vẽ, và ghi nhớ tâm cụm.
    // Phải đợi font tải xong mới đo được bề rộng chữ cho đúng.
    if (item.neoHauTo) {
      const canh = () => xepLaiHauTo(item.neoHauTo);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(canh);
      else canh();
    }

    planContainer.appendChild(itemBlock);
  });

  // Show no-data inside containers if empty
  if (clientContainer.children.length === 0) {
    clientContainer.innerHTML = '<div class="no-data">Không có chữ ở phần này.</div>';
  }
  if (planContainer.children.length === 0) {
    planContainer.innerHTML = '<div class="no-data">Không có chữ ở phần này.</div>';
  }
  if (agentContainer.children.length === 0) {
    agentContainer.innerHTML = '<div class="no-data">Không có chữ ở phần này.</div>';
  }
}

// --- AGENT INFO AUTO-PRESET (localStorage, no buttons — fully automatic) ---
// storeAgentPreset() runs on every successful Lưu Nháp / Xuất (core.js);
// applyAgentPresetQuiet() runs right after "Tạo bản cho khách" (core.js createNewProposal).
function collectAgentFields() {
  const result = {};
  document.querySelectorAll('#group-agent .text-edit-block').forEach(block => {
    const labelEl = block.querySelector('.text-id');
    const input = block.querySelector('.text-input-field');
    if (labelEl && input) result[labelEl.textContent] = input;
  });
  return result;
}

// Silently remember the agent info currently on screen
function storeAgentPreset() {
  const fields = collectAgentFields();
  const preset = {};
  Object.keys(fields).forEach(key => {
    if (fields[key].value && fields[key].value.trim()) preset[key] = fields[key].value;
  });
  if (Object.keys(preset).length === 0) return;
  localStorage.setItem('agentPreset', JSON.stringify(preset));
}

// Silently fill the remembered agent info into the freshly created client copy
function applyAgentPresetQuiet() {
  const saved = localStorage.getItem('agentPreset');
  if (!saved) return;
  try {
    const preset = JSON.parse(saved);
    const fields = collectAgentFields();
    let applied = 0;
    Object.keys(preset).forEach(key => {
      if (fields[key] && preset[key]) {
        fields[key].value = preset[key];
        fields[key].dispatchEvent(new Event('input', { bubbles: false }));
        applied++;
      }
    });
    if (applied > 0) updateStatus('Đã tự điền thông tin đại lý của bạn (lưu từ lần trước).');
  } catch (e) { /* preset hỏng → bỏ qua */ }
}
