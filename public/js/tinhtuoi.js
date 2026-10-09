/**
 * THINKSMART TOOL — TÍNH TUỔI BẢO HIỂM (Insurance Age Calculator)
 * Đưa về từ bản chủ tool đã làm trên forum.thinksmartinsurance.com (10/08/2026).
 *
 * ☠️ QUY TẮC TUỔI — **AGE NEAREST BIRTHDAY, ĐO BẰNG THÁNG LỊCH**:
 *   qua sinh nhật ĐÚNG 6 tháng hoặc ít hơn → giữ nguyên tuổi thật
 *   qua sinh nhật HƠN 6 tháng              → CỘNG 1
 *
 * ☠️☠️ ĐÃ VIẾT SAI MỘT LẦN, ĐỪNG LẶP LẠI: bản đầu tôi đo bằng SỐ NGÀY (so
 * "ngày đã qua" với "ngày còn lại", tức mốc 182,5 ngày). Nghe rất hợp lý và
 * bộ tự kiểm 9/9 đều đạt — nhưng **sai so với bản forum của chủ tool**.
 * Dò ranh giới trên chính bản forum ngày 10/08/2026 (dùng làm thước đo NGOÀI):
 *     sinh 02/09/1990 → forum 37, bản đo-bằng-ngày ra 36   ← LỆCH 1 TUỔI
 *     sinh 02/10/1990 → forum 36, bản đo-bằng-ngày ra 36
 * Vì 6 tháng lịch (10/02 → 10/08) chỉ có 181 ngày, không phải 182,5. Hai cách
 * lệch nhau vài ngày mỗi năm — và mỗi ngày lệch đó là một khách bị báo sai
 * nguyên một bậc tuổi, tức sai bậc phí.
 * → Bài học: quy tắc nghe "hiển nhiên" vẫn phải đo lại trên bản đang chạy thật.
 *
 * ⚠️ Ca ĐÚNG 6 tháng chẵn: KHÔNG cộng (forum cũng vậy — đã đo).
 *
 * Lịch sử tính lưu Ở MÁY NGƯỜI DÙNG (localStorage), chủ tool chốt: nó chứa NGÀY
 * SINH KHÁCH HÀNG — không đẩy lên máy chủ.
 */

const TT_KHOA_LS = 'tst-tinhtuoi-lichsu';   // localStorage
const TT_TOI_DA = 20;                        // giữ 20 lần gần nhất

// --- TÍNH TOÁN (tách riêng, không đụng DOM — để bàn đo gọi thẳng được) ---

// ---------------------------------------------------------------------------
// ĐỌC NGÀY SINH — chỗ nguy hiểm nhất của cả công cụ (sửa 10/08/2026)
//
// ☠️ Chủ tool gõ `22/05/1979` (kiểu Việt: NGÀY trước) trong khi tool đọc kiểu Mỹ
// (THÁNG trước) → bị chặn. Chặn được là còn may. Nguy hiểm thật nằm ở những ngày
// mà CẢ HAI cách đọc đều hợp lệ (`05/06/1979`): tool sẽ im lặng hiểu sai, ra sai
// tuổi, sai bậc phí, và KHÔNG có dấu hiệu nào cho người dùng biết.
// Gần một nửa số ngày trong năm rơi vào vùng nhập nhằng này.
//
// CHỈ CÒN MỘT KIỂU: MỸ, MM/DD/YYYY (chủ tool chốt 09/10/2026).
// Nguyên văn: "chỉ lấy chuẩn cách nhập Tháng/Ngày/Năm theo Mỹ ... để các bạn bắt buộc
// run quote phải để ngày theo định dạng Mỹ, không cần thêm định dạng ngày Việt Nam".
// Từ 10/08 tới 09/10 có hai nút chọn kiểu gõ (Tháng/Ngày, Ngày/Tháng) và tool tự hiểu
// theo kiểu kia khi kiểu đang chọn không hợp lệ. Nay BỎ CẢ HAI:
//   - gõ ngày chỉ hợp lệ ở kiểu Việt (25/12/1990) → BÁO SAI, không tự đổi giúp;
//   - lựa chọn 'DMY' người dùng từng lưu ở localStorage `tst-tinhtuoi-thutu` bị bỏ qua.
// Thứ còn giữ làm chốt chặn: dòng ĐỌC NGƯỢC ngày ra chữ ngay dưới ô nhập. Với ngày
// nhập nhằng (05/06/1979) đó là chỗ duy nhất sale thấy mình vừa gõ tháng 5 hay tháng 6.
// ---------------------------------------------------------------------------

// Dựng ngày từ 3 số, trả null nếu ngày không tồn tại (31/02, 29/02 năm thường…)
function ttDungNgay(nam, thang, ngay) {
  if (thang < 1 || thang > 12 || ngay < 1 || ngay > 31) return null;
  if (nam < 1900 || nam > 2100) return null;
  const d = new Date(nam, thang - 1, ngay);
  if (d.getFullYear() !== nam || d.getMonth() !== thang - 1 || d.getDate() !== ngay) return null;
  return { nam, thang, ngay, d };
}

// Đọc theo ĐÚNG một thứ tự. KHÔNG dùng new Date(chuỗi): mỗi trình duyệt đoán một kiểu.
function ttDocNgayTheo(chuoi, thuTu) {
  const m = String(chuoi || '').trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
  if (!m) return null;
  const a = +m[1], b = +m[2], nam = +m[3];
  return thuTu === 'DMY' ? ttDungNgay(nam, b, a) : ttDungNgay(nam, a, b);
}

// Giữ tên cũ cho bàn đo + scripts/kiem-tinh-tuoi.js: mặc định kiểu Mỹ.
function ttDocNgay(chuoi) { return ttDocNgayTheo(chuoi, 'MDY'); }

/**
 * Đọc ĐÚNG kiểu Mỹ, không tự đổi.
 * → { ns, goKieuViet }
 *   ns         = ngày đọc được theo MM/DD/YYYY, null nếu không hợp lệ
 *   goKieuViet = true khi kiểu Mỹ không hợp lệ NHƯNG đảo lại (DD/MM) thì hợp lệ:
 *                gần như chắc là sale gõ ngày trước tháng sau. Chỉ dùng để viết câu
 *                báo lỗi cho trúng, KHÔNG dùng để tính.
 */
function ttDocNgayMy(chuoi) {
  const ns = ttDocNgayTheo(chuoi, 'MDY');
  return { ns, goKieuViet: !ns && !!ttDocNgayTheo(chuoi, 'DMY') };
}

// ---------------------------------------------------------------------------
// CHUẨN HOÁ CHUỖI ĐANG GÕ / VỪA DÁN về dạng MM/DD/YYYY (09/10/2026)
//
// Bản trước chỉ làm một việc: vứt hết ký tự không phải số rồi chèn "/" sau chữ số
// thứ 2 và thứ 4. Chạy 100 ca gõ thật trong trình duyệt thì lộ ra:
//   - gõ "5/22/1990" (không có số 0 đầu) → ô biến thành "52/21/990" → bị từ chối;
//   - dán "5/22/1990 0:00:00" từ Excel → y như trên;
//   - ô có maxlength=10 nên dán " 05/22/1990" hay "DOB: 05/22/1990" bị trình duyệt
//     CẮT ĐUÔI trước khi mã kịp đọc → còn "05/22/199";
//   - gõ thừa một chữ số (kẹt phím: 19990) thì số thừa bị nuốt IM LẶNG.
// Nay: dấu ngăn do người gõ (/ - . dấu cách) được TÔN TRỌNG, tháng/ngày một chữ số
// được thêm số 0, và báo lại `thua` khi có chữ số bị bỏ để dòng đọc lại lên tiếng.
// ☠️ Hàm này KHÔNG đoán thứ tự tháng/ngày. Chỉ có đúng một ca được đổi thứ tự là
// NĂM ĐỨNG ĐẦU (1990-05-22): dạng đó chỉ có một cách hiểu. Ngày-trước-tháng-sau
// (25/12/1990) vẫn bị từ chối như chủ tool chốt.
// → { chuoi, thua }
// ---------------------------------------------------------------------------
function ttChuanHoaGo(raw) {
  // Chữ số "toàn chiều rộng" (bộ gõ tiếng Nhật/Trung, chép từ vài app chat) → chữ số thường
  const s = Array.from(String(raw || ''), ch => {
    const c = ch.charCodeAt(0);
    return (c >= 0xFF10 && c <= 0xFF19) ? String.fromCharCode(c - 0xFEE0) : ch;
  }).join('');
  const nhom = s.match(/\d+/g) || [];
  if (!nhom.length) return { chuoi: '', thua: false };
  const haiSo = x => (x.length === 1 ? '0' + x : x);
  const dauCuoi = /\d\D+$/.test(s);            // vừa bấm một dấu ngăn ngay sau con số

  // NĂM ĐỨNG ĐẦU: 1990-05-22, 1990/5/22
  if (nhom.length >= 3 && nhom[0].length === 4 && nhom[1].length <= 2 && nhom[2].length <= 2) {
    return { chuoi: haiSo(nhom[1]) + '/' + haiSo(nhom[2]) + '/' + nhom[0], thua: false };
  }

  // CÓ DẤU NGĂN: 5/22/1990 · 05-22-1990 · "DOB: 05/22/1990 0:00:00"
  // Một nhóm số có dấu ngăn đứng sau nghĩa là người gõ đã gõ XONG nhóm đó.
  if ((nhom.length > 1 || dauCuoi) && nhom[0].length <= 2 && (nhom.length < 2 || nhom[1].length <= 2)) {
    let ra = haiSo(nhom[0]);
    if (nhom.length === 1) return { chuoi: ra + '/', thua: false };
    const ngayXong = nhom.length > 2 || dauCuoi;
    ra += '/' + (ngayXong ? haiSo(nhom[1]) : nhom[1]);
    if (!ngayXong) return { chuoi: ra, thua: false };
    if (nhom.length === 2) return { chuoi: ra + '/', thua: false };
    // Sau năm còn nhóm số nữa (giờ phút của Excel) thì bỏ, không tính là gõ thừa
    return { chuoi: ra + '/' + nhom[2].slice(0, 4), thua: nhom[2].length > 4 };
  }

  // CHỈ CÓ CHỮ SỐ (gõ liền 05221990): tự chèn "/" như trước nay
  const so = nhom.join('');
  const tam = so.slice(0, 8);
  let ra = tam;
  if (tam.length > 4) ra = tam.slice(0, 2) + '/' + tam.slice(2, 4) + '/' + tam.slice(4);
  else if (tam.length > 2) ra = tam.slice(0, 2) + '/' + tam.slice(2);
  return { chuoi: ra, thua: so.length > 8 };
}

// Vì sao chuỗi này KHÔNG đọc được thành ngày, để câu báo lỗi nói trúng chỗ sai.
// Trước 09/10/2026 mọi ca đều nhận chung một câu "Ngày này không tồn tại", kể cả
// 12/31/1899 (ngày có thật, chỉ là năm nằm ngoài khoảng tool nhận).
// → 'dang' (chưa đúng dạng) · 'nam' (năm ngoài 1900–2100) · 'viet' (gõ ngày trước
//   tháng sau) · 'khong-co' (đúng dạng nhưng lịch không có ngày đó, vd 02/30)
function ttLyDoSai(chuoi) {
  const m = String(chuoi || '').trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
  if (!m) return 'dang';
  if (+m[3] < 1900 || +m[3] > 2100) return 'nam';
  if (ttDocNgayTheo(chuoi, 'DMY')) return 'viet';
  return 'khong-co';
}

// Khoá so sánh "cùng một ngày": của ngày sinh đã đọc, và của một Date theo giờ máy
const ttKhoaNs = ns => ns.nam + '-' + ns.thang + '-' + ns.ngay;
const ttKhoaNgay = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();

// Sinh nhật rơi vào 29/02 mà năm đích không nhuận → lấy 28/02 (thông lệ ngành)
function ttSinhNhatTrongNam(ns, nam) {
  const d = new Date(nam, ns.thang - 1, ns.ngay);
  if (d.getMonth() !== ns.thang - 1) return new Date(nam, ns.thang - 1 + 1, 0);
  return d;
}

// Cộng n tháng vào một ngày, KẸP về cuối tháng nếu tràn (31/08 + 6 tháng = 28/02,
// không phải 03/03). Không kẹp là ca sinh cuối tháng lệch mất một ngày.
function ttCongThang(d, n) {
  const nam = d.getFullYear(), thang = d.getMonth() + n, ngay = d.getDate();
  const cuoi = new Date(nam, thang + 1, 0).getDate();
  return new Date(nam, thang, Math.min(ngay, cuoi));
}

/**
 * Trả về { tuoiThat, tuoiBaoHiem, snVua, snToi, mocDoiTuoi, daQua, conLai, homNay }
 * @param ns  kết quả của ttDocNgay
 * @param moc ngày tính (mặc định hôm nay) — truyền vào được để bàn đo kiểm ca biên
 */
function tinhTuoiBaoHiem(ns, moc) {
  const homNay = moc ? new Date(moc.getFullYear(), moc.getMonth(), moc.getDate()) : (function () {
    const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  })();

  let tuoiThat = homNay.getFullYear() - ns.nam;
  const snNamNay = ttSinhNhatTrongNam(ns, homNay.getFullYear());
  if (homNay < snNamNay) tuoiThat -= 1;

  const snVua = ttSinhNhatTrongNam(ns, homNay < snNamNay ? homNay.getFullYear() - 1 : homNay.getFullYear());
  const snToi = ttSinhNhatTrongNam(ns, snVua.getFullYear() + 1);

  // ☠️ ĐO BẰNG THÁNG LỊCH, KHÔNG PHẢI SỐ NGÀY — xem chú thích đầu file.
  // `mocDoiTuoi` = ngày đầu tiên khách bị tính lên một tuổi. Đưa luôn ra giao diện:
  // sale nhìn là biết còn bao lâu nữa thì bậc phí đổi.
  const ngaySau = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const sauSauThang = ttCongThang(snVua, 6);
  const tuoiBaoHiem = homNay > sauSauThang ? tuoiThat + 1 : tuoiThat;

  // `mocTiepTheo` = ngày ĐẦU TIÊN khách được tính tuổi mới.
  // ⚠️ Đã lên tuổi rồi thì mốc kế tiếp nằm ở CHU KỲ SAU (sinh nhật tới + 6 tháng),
  // không phải mốc vừa qua — không có nhánh này là hiện ra ngày trong quá khứ.
  // ⚠️ KHÁC bản forum 1 ngày: forum hiện đúng ngày "sinh nhật + 6 tháng", nhưng
  // chính nó vẫn tính tuổi CŨ trong ngày đó (đo 10/08/2026: sinh 02/10/1990 →
  // forum ghi "Ngày Tăng Tuổi = Aug 10, 2026" mà tuổi bảo hiểm vẫn 36). Ở đây lấy
  // ngày HÔM SAU — tức ngày con số thật sự đổi.
  const mocTiepTheo = ngaySau(tuoiBaoHiem > tuoiThat ? ttCongThang(snToi, 6) : sauSauThang);

  const NGAY = 86400000;
  const daQua = Math.round((homNay - snVua) / NGAY);
  const conLai = Math.round((snToi - homNay) / NGAY);

  return { tuoiThat, tuoiBaoHiem, snVua, snToi, mocTiepTheo, daQua, conLai, homNay };
}

// --- LỊCH SỬ (localStorage — KHÔNG lên máy chủ) ---
function ttDocLichSu() {
  try {
    const raw = localStorage.getItem(TT_KHOA_LS);
    const ds = raw ? JSON.parse(raw) : [];
    // Lọc dòng hỏng: một phần tử null trong mảng làm veLichSuTuoi văng lỗi NGAY lúc mở
    // công cụ, trước khi ô nhập kịp nối sự kiện → gõ không chèn "/", bấm Tính không
    // phản hồi, không có thông báo nào (đo 09/10/2026 với '[null]').
    return Array.isArray(ds) ? ds.filter(r => r && typeof r === 'object') : [];
  } catch (e) { return []; }
}
function ttGhiLichSu(ds) {
  try { localStorage.setItem(TT_KHOA_LS, JSON.stringify(ds.slice(0, TT_TOI_DA))); } catch (e) {}
}

// --- MỤC TRÊN CÂY ĐIỀU HƯỚNG: MỘT DÒNG PHẲNG, không menu phụ ---
// Cùng lý do đã ghi ở renderCompareNavSection / renderSmsNavSection: bên trong chỉ
// có MỘT màn hình, dựng dropdown chứa một dòng là bắt bấm hai lần cho một việc.
function renderTinhTuoiNavSection(container, q) {
  if (q && !'tính tuổi bảo hiểm age calculator'.includes(q)) return 0;

  const folder = document.createElement('div');
  folder.className = 'tree-folder nav-section nav-section-flat';

  const el = document.createElement('div');
  el.className = 'tree-folder-header' + (appState.activeLibraryPath === 'tinhtuoi' ? ' is-open' : '');
  el.setAttribute('title', 'Tính tuổi bảo hiểm từ ngày sinh khách hàng');
  el.innerHTML = `
    <span class="tree-folder-icon">${NAV_ICONS.tinhtuoi}</span>
    <span class="tree-folder-label">${nhanMuc('Age / Tính tuổi')}</span><span class="nav-new">new</span>
  `;
  el.addEventListener('click', async () => {
    if (!(await confirmLeaveUnsaved())) return;
    document.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
    openTinhTuoi();            // gọi TRƯỚC: bên trong gọi hideLibraryPreview, hàm đó xoá dấu is-open
    el.classList.add('is-open');
  });
  makeKeyboardActivatable(el);

  folder.appendChild(el);
  container.appendChild(folder);
  return 1;
}

// --- MÀN HÌNH: vẽ vào #doc-viewport, KHÔNG PHẢI CANVAS ---
// Canvas chỉ dành cho công cụ MỞ FILE SVG và sửa trực tiếp. Công cụ này có ô gõ chữ:
// nhét vào canvas là dính `user-select:none` + lăn chuột bị nuốt thành zoom (cảnh báo
// đã ghi ở đầu openCompareTable trong js/sosanh.js).
function openTinhTuoi() {
  hideLibraryPreview();
  dom.canvasWrapper.innerHTML = '';
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  appState.activeLibraryPath = 'tinhtuoi';
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = 'Age / Tính tuổi';
    dom.activeFileTitle.classList.add('is-active');
  }
  dom.btnSaveTop.disabled = true;

  // Đo lường: 1 lượt MỞ công cụ. KHÔNG bao giờ ghi ngày sinh khách vào đây.
  if (window.TSTAuth && TSTAuth.logUsage) TSTAuth.logUsage('view', 'Age / Tính tuổi');

  document.body.classList.add('doc-mode');
  const view = document.getElementById('doc-viewport');
  view.innerHTML = `
    <div class="tt-wrap">
      <section class="tt-card tt-card-main">
        <h2 class="tt-title">Tính tuổi bảo hiểm</h2>

        <div class="tt-label-hang">
          <label class="tt-label" for="tt-dob">Ngày sinh khách hàng</label>
          <!-- Chỉ còn kiểu Mỹ (09/10/2026). Ghi thứ tự ra bằng CHỮ ở chỗ hai nút chọn
               kiểu từng đứng: placeholder MM/DD/YYYY biến mất ngay khi gõ ký tự đầu. -->
          <span class="tt-kieu" id="tt-kieu">Tháng / Ngày / Năm</span>
        </div>
        <div class="tt-row">
          <div class="tt-input-wrap">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <!-- ☠️ KHÔNG đặt maxlength: trình duyệt cắt đuôi chuỗi dán TRƯỚC khi mã đọc được
                 (dán "DOB: 05/22/1990" còn "05/22/199") và chặn luôn việc gõ ngày mới khi
                 ô còn ngày cũ. Độ dài do ttChuanHoaGo giữ. -->
            <input id="tt-dob" class="tt-input" type="text" inputmode="numeric" autocomplete="off"
                   placeholder="MM/DD/YYYY" aria-describedby="tt-kieu tt-doclai">
          </div>
          <button class="btn btn-primary tt-btn" id="tt-tinh">Tính</button>
        </div>
        <!-- Một hàng phụ: bên trái là ngày đọc ngược ra chữ (MM/DD hay DD/MM là chỗ
             dễ hiểu nhầm nhất, nhầm là sai luôn bậc phí), bên phải là câu giải thích
             vì sao ra tuổi đó. Gộp một hàng để khỏi đẻ thêm dòng dưới bảng kết quả. -->
        <div class="tt-dong-phu">
          <div class="tt-doclai" id="tt-doclai" aria-live="polite"></div>
          <p class="tt-giaithich" id="tt-giaithich"></p>
        </div>

        <div class="tt-ketqua" id="tt-ketqua" hidden>
          <div class="tt-o">
            <span class="tt-o-nhan">Tuổi thật</span>
            <span class="tt-o-so" id="tt-tuoithat">—</span>
          </div>
          <div class="tt-o tt-o-chinh">
            <span class="tt-o-nhan">Tuổi bảo hiểm</span>
            <span class="tt-o-so" id="tt-tuoibh">—</span>
          </div>
          <!-- SẮP TĂNG TUỔI: chỉ hiện khi còn từ TT_BAO_TRUOC (60) ngày trở xuống.
               Chủ tool 09/10/2026: "nếu KH đã tăng tuổi rồi thì thôi, không cần thông
               báo, còn khi nào tầm 60 ngày tức 2 tháng sẽ tăng, hãy cho ô này thông báo
               rõ nét hơn". Trước đó ô này LUÔN hiện, kể cả "Còn 365 ngày" ngay sau khi
               khách vừa lên tuổi: một con số không ai cần mà chiếm 1/3 hàng kết quả.
               Ngày ghi ở đây là ngày ĐẦU TIÊN khách được tính tuổi mới (khác bản forum,
               xem chú thích ở tinhTuoiBaoHiem). -->
          <div class="tt-o tt-o-ngay" id="tt-o-ngay" hidden role="status">
            <span class="tt-o-nhan">Sắp tăng tuổi</span>
            <span class="tt-o-ngay-so" id="tt-sap-con">—</span>
            <span class="tt-o-conlai" id="tt-sap-ngay"></span>
          </div>
        </div>
      </section>

      <aside class="tt-card tt-card-ls">
        <div class="tt-ls-dau">
          <h3 class="tt-ls-tieude">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
            Gần đây
          </h3>
          <button class="btn btn-secondary btn-sm" id="tt-xoa-ls">Xoá</button>
        </div>
        <div class="tt-ls-bang" id="tt-ls-bang"></div>
      </aside>
    </div>
  `;

  veLichSuTuoi();

  const oDob = document.getElementById('tt-dob');
  const nutTinh = document.getElementById('tt-tinh');

  ttDangHien = null;            // màn vừa dựng lại, chưa bày kết quả nào

  oDob.addEventListener('input', () => {
    let thua = false;
    const viTri = oDob.selectionStart;
    if (viTri !== null && viTri < oDob.value.length) {
      // ĐANG SỬA Ở GIỮA (đổi một số của tháng hay ngày): KHÔNG dựng lại cả chuỗi.
      // Dựng lại là các số phía sau dồn lệch và con trỏ nhảy về cuối: sửa "05" thành
      // "12" ra "02/21/9906" (đo 09/10/2026). Chỉ bỏ ký tự lạ và giữ nguyên con trỏ;
      // đúng sai để bộ đọc ngày phán (nó nhận cả tháng/ngày một chữ số).
      const truoc = oDob.value.slice(0, viTri).replace(/[^\d/]/g, '');
      const sau = oDob.value.slice(viTri).replace(/[^\d/]/g, '');
      if ((truoc + sau).split('/').length === 3) {
        oDob.value = truoc + sau;
        oDob.setSelectionRange(truoc.length, truoc.length);
      } else {
        // Vừa xoá mất (hoặc gõ thêm) một dấu "/": khung tháng/ngày/năm vỡ, "0522/1990"
        // không đọc được. Dựng lại từ các chữ số và đặt con trỏ sau đúng số chữ số mà
        // nó đang đứng sau (bài chạy lại 100 ca bắt được chỗ này ở bản sửa đầu).
        const soTruoc = truoc.replace(/\D/g, '').length;
        const moi = ttChuanHoaGo((truoc + sau).replace(/\D/g, '')).chuoi;
        let dem = 0, cho = 0;
        while (cho < moi.length && dem < soTruoc) { if (/\d/.test(moi[cho])) dem++; cho++; }
        oDob.value = moi;
        oDob.setSelectionRange(cho, cho);
      }
    } else {
      const kq = ttChuanHoaGo(oDob.value);
      oDob.value = kq.chuoi;
      thua = kq.thua;
    }
    sauKhiODoi(thua);
  });

  // Việc phải làm sau MỌI lần chữ trong ô đổi (gõ hay dán)
  function sauKhiODoi(thua) {
    docLaiNgay(thua);
    // Ngày trong ô không còn là ngày của kết quả đang bày → cất kết quả. Trước đây
    // sửa ngày xong mà chưa bấm Tính thì dòng đọc lại nói ngày MỚI còn hai ô tuổi và
    // ô "Sắp tăng tuổi" vẫn là của ngày CŨ, đứng ngay cạnh nhau.
    if (ttDangHien) {
      const ns = ttDocNgayMy(oDob.value).ns;
      if (!ns || ttKhoaNs(ns) !== ttDangHien.khoa) ttXoaKetQua();
    }
  }

  // DÁN CẢ MỘT NGÀY thì THAY hết ô, dù con trỏ đang đứng ở đâu. Không có đoạn này,
  // dán vào cuối một ô đang có ngày cũ sẽ nối đuôi thành 16 chữ số, 8 số sau bị bỏ và
  // ô vẫn là ngày của khách trước. Dán một mẩu ngắn (vài chữ số) thì để trình duyệt
  // chèn như thường.
  oDob.addEventListener('paste', e => {
    const chu = (e.clipboardData && e.clipboardData.getData('text')) || '';
    const kq = ttChuanHoaGo(chu);
    if (kq.chuoi.replace(/[^0-9]/g, '').length < 8) return;
    e.preventDefault();
    oDob.value = kq.chuoi;
    sauKhiODoi(kq.thua);
  });

  // VÀO Ô LÀ BÔI ĐEN HẾT: gõ hay dán ngày của khách kế tiếp sẽ THAY ngày cũ. Trước
  // đây ô còn ngày khách trước thì gõ tiếp không vào, bấm Tính ra lại khách cũ mà
  // không báo gì. Bấm chuột lần nữa vào ô đang mở thì đặt con trỏ như thường.
  let vuaVao = false;
  oDob.addEventListener('focus', () => { if (oDob.value) { oDob.select(); vuaVao = true; } });
  oDob.addEventListener('mouseup', e => { if (vuaVao) { e.preventDefault(); vuaVao = false; } });
  oDob.addEventListener('blur', () => { vuaVao = false; });
  oDob.addEventListener('keydown', e => {
    vuaVao = false;
    // e.repeat: giữ phím Enter là trình duyệt bắn liên tục, mỗi phát thêm một dòng lịch
    // sử và một lượt ghi đo lường (đo được 6 dòng cho một lần giữ phím).
    if (e.key === 'Enter' && !e.repeat) nutTinh.click();
  });
  nutTinh.addEventListener('click', bamTinh);

  // TAB ĐỂ QUA ĐÊM: con số trên màn hình là của HÔM QUA ("Còn 1 ngày" vẫn hiện sau khi
  // khách đã lên tuổi). Quay lại tab, cửa sổ được chọn lại, hoặc mỗi phút một lần: thấy
  // đã sang ngày khác thì tính lại và vẽ lại, không ghi thêm lịch sử hay đo lường.
  if (window.__ttQuaNgay) {
    document.removeEventListener('visibilitychange', window.__ttQuaNgay);
    window.removeEventListener('focus', window.__ttQuaNgay);
    clearInterval(window.__ttQuaNgayHen);
  }
  window.__ttQuaNgay = ttKiemQuaNgay;
  document.addEventListener('visibilitychange', ttKiemQuaNgay);
  window.addEventListener('focus', ttKiemQuaNgay);
  window.__ttQuaNgayHen = setInterval(ttKiemQuaNgay, 60000);

  document.getElementById('tt-xoa-ls').addEventListener('click', async () => {
    const ds = ttDocLichSu();
    if (!ds.length) return;
    if (!(await showAppConfirm(`Xoá ${ds.length} lần tính đã lưu trên máy này?`,
      { title: 'Xoá lịch sử', tone: 'danger', okText: 'Xoá' }))) return;
    ttGhiLichSu([]);
    veLichSuTuoi();
  });

  capChieuCaoLichSu();
  // Đo lại khi đổi cỡ cửa sổ. Gỡ listener cũ trước để mở lại màn không chồng listener.
  if (window.__ttResize) window.removeEventListener('resize', window.__ttResize);
  window.__ttResize = () => { if (document.getElementById('tt-ls-bang')) capChieuCaoLichSu(); };
  window.addEventListener('resize', window.__ttResize);

  oDob.focus();
  updateStatus('Tính tuổi bảo hiểm — nhập ngày sinh khách hàng');
}

const TT_THANG = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
                  'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];

// Câu báo ngắn cho dòng đọc lại, theo đúng lý do (xem ttLyDoSai)
function ttCauBaoSai(chuoi) {
  const lyDo = ttLyDoSai(chuoi);
  if (lyDo === 'viet') return `⚠️ Không có tháng ${+chuoi.split('/')[0]}. Gõ tháng trước, ngày sau.`;
  if (lyDo === 'nam') return '⚠️ Năm phải từ 1900 tới 2100.';
  if (lyDo === 'dang') return '⚠️ Chưa đúng dạng MM/DD/YYYY.';
  return '⚠️ Ngày này không tồn tại.';
}

// `thua` = true khi ttChuanHoaGo vừa phải bỏ bớt chữ số gõ thừa
function docLaiNgay(thua) {
  const o = document.getElementById('tt-doclai');
  if (!o) return;
  const chuoi = document.getElementById('tt-dob').value;
  const { ns } = ttDocNgayMy(chuoi);
  o.classList.remove('ok', 'canh-bao', 'can-xem');
  if (!ns) {
    // THÁNG SAI THÌ BÁO NGAY, không chờ gõ hết: gõ liền "5221990" (quên số 0 đầu) hay
    // "25121990" (ngày trước tháng sau) đều lộ ra ở hai chữ số đầu. Trước đây phải gõ
    // xong, bấm Tính, mới nhận một hộp báo lỗi.
    const thangGo = chuoi.match(/^(\d{2})\//);
    if (thangGo && (+thangGo[1] > 12 || +thangGo[1] === 0)) {
      o.textContent = `⚠️ Không có tháng ${+thangGo[1]}. Gõ tháng trước, ngày sau.`;
      o.classList.add('canh-bao');
      return;
    }
    // Còn lại chỉ lên tiếng khi đã gõ ĐỦ 8 chữ số (hoặc đủ 10 ký tự); đang gõ dở mà
    // báo sai là làm phiền.
    if (chuoi.length < 10 && chuoi.replace(/\D/g, '').length < 8) { o.textContent = ''; return; }
    o.textContent = ttCauBaoSai(chuoi);
    o.classList.add('canh-bao');
    return;
  }
  const docRa = `${ns.ngay} ${TT_THANG[ns.thang - 1]}, ${ns.nam}`;
  if (thua) {
    // Kẹt phím (05/22/19990): số thừa bị bỏ, ô còn 05/22/1999 là một ngày HỢP LỆ khác
    // hẳn ý người gõ. Không đoán được họ định gõ gì, nhưng phải nói ra là có số bị bỏ.
    o.textContent = `⚠️ Gõ thừa chữ số. Đang hiểu là ${docRa}.`;
    o.classList.add('canh-bao');
    return;
  }
  // Chữ ngắn gọn (chủ tool 10/08/2026), bỏ "Tức ngày…", giữ đúng phần có ích
  o.textContent = `→ ${docRa}`;
  // NGÀY ĐỌC ĐƯỢC CẢ HAI CHIỀU (05/06 là 6 tháng 5 hay 5 tháng 6): tool không thể biết
  // sale gõ nhầm ngày trước tháng sau. 132/365 ngày trong năm rơi vào vùng này, và
  // 42% số lần nhầm làm đổi tuổi bảo hiểm (đo 09/10/2026). Dòng này là chốt chặn duy
  // nhất nên cho nó nổi hẳn lên (nền vàng) đúng ở những ngày đó.
  o.classList.add(ns.ngay <= 12 && ns.ngay !== ns.thang ? 'can-xem' : 'ok');
}

const TT_BAO_TRUOC = 60;    // còn từ ngần này ngày trở xuống mới hiện ô "Sắp tăng tuổi"
const TT_GAN_KE = 30;       // còn từ ngần này ngày trở xuống thì ô đó tô đậm hẳn

// Ngày vừa gõ không dùng được → XOÁ con số của lần tính trước khỏi màn hình.
// ☠️ Trước 09/10/2026 chỗ này chỉ đặt `oKq.hidden = true`, và nó CHƯA BAO GIỜ ẩn được
// gì: .tt-ketqua có `display: grid` (selector class) nên thắng thuộc tính hidden. Hậu
// quả đo được: gõ ngày sai, hộp báo lỗi hiện lên, nhưng hai ô tuổi vẫn bày số của khách
// TRƯỚC ngay cạnh ngày mới. Không đổi sang ẩn hẳn khối (người dùng đã quen thấy hai ô
// có dấu gạch ngay từ lúc mở công cụ), chỉ trả số về dấu gạch và cất ô cảnh báo.
// Kết quả ĐANG BÀY trên màn hình là của ngày sinh nào, tính vào ngày nào.
// null = hai ô tuổi đang là dấu gạch. Dùng để: (1) cất kết quả khi ô nhập đổi sang
// ngày khác, (2) tính lại khi tab để qua đêm.
let ttDangHien = null;

function ttXoaKetQua() {
  ttDangHien = null;
  document.getElementById('tt-tuoithat').textContent = '—';
  document.getElementById('tt-tuoibh').textContent = '—';
  document.getElementById('tt-giaithich').textContent = '';
  document.getElementById('tt-o-ngay').hidden = true;
  document.getElementById('tt-ketqua').classList.remove('co-sap-tang');
  capChieuCaoLichSu();        // ô cảnh báo vừa cất → cột trái có thể thấp đi, đo lại
}

function bamTinh() {
  const oDob = document.getElementById('tt-dob');
  const { ns, goKieuViet } = ttDocNgayMy(oDob.value);
  const oKq = document.getElementById('tt-ketqua');
  if (!ns) {
    ttXoaKetQua();
    updateStatus('Chưa đọc được ngày sinh');
    // Gõ kiểu Việt (ngày trước) thì nói TRÚNG lỗi đó. KHÔNG tự đảo lại giúp: chủ tool
    // muốn sale quen tay kiểu Mỹ, vì hệ thống run quote của hãng chỉ nhận kiểu đó.
    showAppAlert(goKieuViet
      ? `Ô này chỉ nhận dạng MM/DD/YYYY, tháng trước rồi tới ngày.\n\n"${oDob.value}" có tháng ${+oDob.value.split('/')[0]}, không có tháng đó. Nếu ý là ngày ${+oDob.value.split('/')[0]} tháng ${+oDob.value.split('/')[1]} thì gõ lại: ${oDob.value.split('/')[1]}/${oDob.value.split('/')[0]}/${oDob.value.split('/')[2]}`
      : (ttLyDoSai(oDob.value) === 'nam'
          ? 'Năm sinh phải nằm trong khoảng 1900 tới 2100.'
          : 'Ô này chỉ nhận dạng MM/DD/YYYY, tháng trước rồi tới ngày.\n\nNgày vừa gõ không tồn tại hoặc chưa đủ 8 chữ số.'),
      { title: 'Chưa đọc được ngày sinh', tone: 'danger' });
    return;
  }
  const kq = tinhTuoiBaoHiem(ns);
  if (kq.tuoiThat < 0) {
    ttXoaKetQua();
    showAppAlert('Ngày sinh đang ở tương lai.', { title: 'Ngày sinh không hợp lệ', tone: 'danger' });
    return;
  }

  const conNgay = ttVeKetQua(ns, kq);

  // Tính xong thì bôi đen ngày vừa tính: gõ ngày của khách kế tiếp là THAY luôn, khỏi
  // phải xoá tay. Trên điện thoại không tự đưa con trỏ vào ô, vì bàn phím bật lên sẽ
  // che mất kết quả vừa ra; ở đó ô tự bôi đen khi người dùng chạm vào (sự kiện focus).
  if (document.activeElement === oDob || !window.matchMedia('(pointer: coarse)').matches) {
    oDob.focus();
    oDob.select();
  }

  const ds = ttDocLichSu();
  ds.unshift({
    luc: new Date().toLocaleTimeString('vi-VN'),
    // Mốc thời gian đầy đủ (từ 09/10/2026): cột "Lúc" chỉ ghi giờ nên một dòng tính từ
    // 52 ngày trước trông y như vừa tính, trong khi tuổi bảo hiểm của khách đã đổi.
    // Có `ts` thì dòng khác ngày hiện NGÀY thay cho giờ (xem ttLucHien).
    ts: Date.now(),
    // Ghi dạng KHÔNG NHẬP NHẰNG ("2 thg 7, 1998"), đừng ghi "02/07/1998": đọc lại
    // vào hôm sau thì chính mình cũng không biết là ngày 2 tháng 7 hay 7 tháng 2.
    dob: `${ns.ngay} thg ${ns.thang}, ${ns.nam}`,
    that: kq.tuoiThat,
    bh: kq.tuoiBaoHiem
  });
  ttGhiLichSu(ds);

  // ĐO LƯỜNG TỪNG LƯỢT TÍNH (18/08/2026 — chủ tool: "anh muốn tracking công cụ tính
  // tuổi xem sale nào chạy và chạy cái gì"). Ghi kind 'calc', KHÔNG throttle: mỗi lần
  // bấm Tính là một lần tra cứu thật, gộp lại là mất đúng thứ chủ tool muốn xem.
  // ⚠️ Ghi chú cũ ở openTinhTuoi ("KHÔNG bao giờ ghi ngày sinh khách") HẾT HIỆU LỰC từ
  // đây — chủ tool chốt ghi đủ ngày sinh + tuổi ra. Cùng mức nhạy cảm với cột `detail`
  // của Proposal (tên/tuổi/tiểu bang/số tiền), chỉ Admin+ đọc được qua RLS.
  if (window.TSTAuth && TSTAuth.logUsage) {
    TSTAuth.logUsage('calc', 'Age / Tính tuổi', {
      // Dạng ISO để bảng đo lường tự bày lại theo kiểu nào cũng được, không nhập nhằng
      ngaysinh: `${ns.nam}-${String(ns.thang).padStart(2, '0')}-${String(ns.ngay).padStart(2, '0')}`,
      tuoi_that: kq.tuoiThat,
      tuoi_bh: kq.tuoiBaoHiem,
      ngay_tang: `${kq.mocTiepTheo.getFullYear()}-${String(kq.mocTiepTheo.getMonth() + 1).padStart(2, '0')}-${String(kq.mocTiepTheo.getDate()).padStart(2, '0')}`,
      con_ngay: conNgay,
      kieu_go: 'MDY'                // chỉ còn kiểu Mỹ từ 09/10/2026, giữ trường cho bảng đo lường cũ
    });
  }

  veLichSuTuoi();
  capChieuCaoLichSu();          // khối kết quả vừa hiện ra → cột trái cao lên, đo lại
  updateStatus(`Tuổi bảo hiểm: ${kq.tuoiBaoHiem}`);
}

// VẼ kết quả của một ngày sinh ra màn hình. Tách khỏi bamTinh (09/10/2026) để lúc tab
// để qua đêm có thể vẽ lại mà KHÔNG ghi thêm lịch sử hay đo lường. → số ngày còn lại
// tới mốc đổi tuổi.
function ttVeKetQua(ns, kq) {
  const oKq = document.getElementById('tt-ketqua');
  ttDangHien = { khoa: ttKhoaNs(ns), ns: ns, ngayTinh: ttKhoaNgay(kq.homNay) };
  document.getElementById('tt-tuoithat').textContent = kq.tuoiThat;
  document.getElementById('tt-tuoibh').textContent = kq.tuoiBaoHiem;
  // Ngày hiện ra cũng theo kiểu Mỹ, cùng kiểu với ô nhập: bày kiểu khác là mời đọc nhầm
  const dd = d => {
    const t = String(d.getDate()).padStart(2, '0'), th = String(d.getMonth() + 1).padStart(2, '0');
    return `${th}/${t}/${d.getFullYear()}`;
  };
  const conNgay = Math.round((kq.mocTiepTheo - kq.homNay) / 86400000);
  // Ô "Sắp tăng tuổi": còn xa (vừa lên tuổi xong, còn cả năm) thì ẨN HẲN; vào tầm
  // TT_BAO_TRUOC ngày mới hiện, và hiện cho ra hiện: nói số ngày còn lại, tuổi mới,
  // và ngày bắt đầu tính tuổi mới. Tuổi mới = tuổi bảo hiểm hiện tại + 1, đúng theo
  // định nghĩa của `mocTiepTheo` (ngày đầu tiên con số tuổi bảo hiểm đổi).
  const oSap = document.getElementById('tt-o-ngay');
  const sapTang = conNgay <= TT_BAO_TRUOC;
  oSap.hidden = !sapTang;
  oKq.classList.toggle('co-sap-tang', sapTang);     // 3 cột khi có ô này, 2 cột khi không
  if (sapTang) {
    document.getElementById('tt-sap-con').textContent =
      conNgay <= 0 ? 'Hôm nay' : conNgay === 1 ? 'Còn 1 ngày' : `Còn ${conNgay} ngày`;
    document.getElementById('tt-sap-ngay').textContent =
      `Lên ${kq.tuoiBaoHiem + 1} tuổi từ ${dd(kq.mocTiepTheo)}`;
    oSap.classList.toggle('gan-ke', conNgay <= TT_GAN_KE);
  }
  // Ngắn gọn: giữ đúng LÝ DO (mốc 6 tháng) mà bỏ hết chữ đệm
  document.getElementById('tt-giaithich').textContent = kq.tuoiBaoHiem === kq.tuoiThat
    ? 'Chưa qua sinh nhật 6 tháng → giữ nguyên'
    : 'Qua sinh nhật hơn 6 tháng → +1 tuổi';
  oKq.hidden = false;
  return conNgay;
}

// Tab mở từ hôm trước: đã sang ngày khác thì tính lại kết quả đang bày và vẽ lại.
function ttKiemQuaNgay() {
  if (!ttDangHien) return;
  if (!document.getElementById('tt-ketqua')) { ttDangHien = null; return; }   // đã chuyển sang công cụ khác
  if (ttKhoaNgay(new Date()) === ttDangHien.ngayTinh) return;
  const ns = ttDangHien.ns;
  const kq = tinhTuoiBaoHiem(ns);
  if (kq.tuoiThat < 0) { ttXoaKetQua(); return; }
  ttVeKetQua(ns, kq);
  capChieuCaoLichSu();
}

// Cột "Lúc" của lịch sử: dòng tính HÔM NAY hiện giờ, dòng tính ngày khác hiện NGÀY.
// Dòng lưu trước 09/10/2026 không có `ts` nên không biết ngày: giữ nguyên giờ như cũ.
function ttLucHien(r) {
  if (!r.ts) return r.luc || '';
  const d = new Date(r.ts), nay = new Date();
  if (ttKhoaNgay(d) === ttKhoaNgay(nay)) return r.luc || '';
  return d.getDate() + ' thg ' + (d.getMonth() + 1) + (d.getFullYear() !== nay.getFullYear() ? ', ' + d.getFullYear() : '');
}

// Kẹp chiều cao danh sách lịch sử = đúng chiều cao cột trái (chủ tool 10/08/2026).
// CSS không tự đo được chiều cao của phần tử ANH EM nên phải đo bằng JS. Đo lại sau
// mỗi lần cột trái đổi chiều cao (hiện/ẩn khối kết quả) và khi đổi cỡ cửa sổ.
function capChieuCaoLichSu() {
  const khung = document.querySelector('.tt-wrap');
  const trai = document.querySelector('.tt-card-main');
  const the = document.querySelector('.tt-card-ls');
  const bang = document.getElementById('tt-ls-bang');
  if (!khung || !trai || !the || !bang) return;

  // ☠️ Phải đo chiều cao THẬT của cột trái, không phải chiều cao đang hiển thị.
  // Khung dùng `align-items: stretch` nên cột trái bị KÉO GIÃN bằng cột phải —
  // đo lúc đó là đo chính cái mình định kẹp, kẹp xong vẫn dư khoảng trắng ở đáy
  // cột trái (chủ tool bắt được 10/08/2026). Bỏ kéo giãn → đo → trả lại.
  bang.style.maxHeight = '';
  const cu = khung.style.alignItems;
  khung.style.alignItems = 'start';
  const caoTrai = trai.getBoundingClientRect().height;
  const thua = the.getBoundingClientRect().height - bang.getBoundingClientRect().height;
  khung.style.alignItems = cu;

  bang.style.maxHeight = Math.max(120, Math.round(caoTrai - thua)) + 'px';
}

function veLichSuTuoi() {
  const ds = ttDocLichSu();
  const o = document.getElementById('tt-ls-bang');
  if (!o) return;
  if (!ds.length) {
    o.innerHTML = '<p class="tt-ls-trong">Chưa có lần tính nào.</p>';
    return;
  }
  o.innerHTML = `
    <div class="tt-ls-hang tt-ls-dau-cot">
      <span>Lúc</span><span>Ngày sinh</span><span>Tuổi BH</span>
    </div>
    ${ds.map(r => `
      <div class="tt-ls-hang">
        <span>${escapeHtml(ttLucHien(r))}</span>
        <span>${escapeHtml(r.dob)}</span>
        <span class="tt-ls-tuoi">${escapeHtml(String(r.bh))}</span>
      </div>`).join('')}
  `;
}
