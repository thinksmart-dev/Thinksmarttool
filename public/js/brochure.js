/**
 * THINKSMART TOOL — BROCHURE (thư viện tải về)
 * Mọi logic riêng của công cụ Brochure nằm ở file này:
 *  - Tải danh sách thư viện từ /api/library
 *  - Section "Brochure" trên cây điều hướng (nhóm theo hãng, gộp brochure nhiều trang)
 *  - Preview 1 file / nhiều trang / cả nhóm + nút tải về
 * Phần dùng chung (canvas, trạng thái, cây thư mục...) nằm ở js/core.js.
 */

// --- LIBRARY DATA ---
async function fetchLibrary() {
  if (appState.mode !== 'server') {
    appState.library = { brochure: {}, namecard: {}, sms: {} };
    return;
  }
  try {
    // Lần gọi ĐẦU dùng lại kết quả đã bắn sớm từ <head> tool.html (bỏ được trọn một
    // vòng mạng ~298ms khỏi đường tới lúc menu hiện — xem chú thích dài ở đó).
    // Các lần sau (thêm/xoá file trong thư viện) PHẢI lấy dữ liệu mới → xoá đi để
    // không bao giờ dùng lại bản cũ. Cùng cách làm với __svgsSom trong core.js.
    let data = null;
    if (window.__libSom) {
      data = await window.__libSom;
      window.__libSom = null;
    }
    if (!data) {
      const resp = await fetch('/api/library');
      data = await resp.json();
    }
    appState.library = (data && data.success && data.library) ? data.library : { brochure: {}, namecard: {}, sms: {} };
  } catch (e) {
    appState.library = { brochure: {}, namecard: {}, sms: {} };
  }
}

// A clickable, downloadable library item (brochure / name card)
// `giuTenHang` = true → KHÔNG cắt tên hãng khỏi nhãn.
// ☠️ Bắt được 11/08/2026 ở mục Application Form: file rơi vào nhóm "Chung" (folder
// không chia hãng con) nên KHÔNG có tiêu đề hãng ở trên — mà nhãn vẫn bị cắt tên
// hãng, thành ra "AIG Application Form" và "Allianz Application Form" hiện ra
// GIỐNG HỆT NHAU: hai dòng "Application Form". Sale bấm nhầm hãng mà không biết.
// Cắt tên hãng chỉ đúng khi mục nằm DƯỚI tiêu đề hãng; nhóm "Chung" thì không.
function makeDownloadItem(item, giuTenHang) {
  const el = document.createElement('div');
  const isActive = appState.activeLibraryPath === item.path || (appState.activeFile && appState.activeFile.path === item.path);
  el.className = `tree-file-item lib-item ${isActive ? 'active' : ''}`.trim();
  const t = tachTenMau(item);
  const display = giuTenHang ? (t.hang ? `${t.hang} — ${t.chuongTrinh}` : t.chuongTrinh)
                             : t.chuongTrinh;
  el.innerHTML = `
    <span class="tree-file-icon">${NAV_ICONS.fileDl}</span>
    <span class="tree-file-name" title="${escapeHtml(item.name)}">${escapeHtml(display)}</span>
  `;
  el.addEventListener('click', async () => {
    if (!(await confirmLeaveUnsaved())) return;
    document.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');

    // If it's an SVG file, load it as editable template on the canvas!
    if (item.ext === 'svg') {
      appState.activeLibraryPath = null;
      loadSvgContent(item);
    } else {
      openLibraryItem(item);
    }
  });
  makeKeyboardActivatable(el);
  return el;
}

function preprocessLibraryItems(items) {
  const processed = [];
  const groups = {}; // baseName -> { jpgs: [], pdf: null }

  items.forEach(it => {
    const ext = (it.ext || '').toLowerCase();
    // Normalize names to match "Name" and "Name (2)" to the same group
    const baseName = it.name.replace(/\s*\(\d+\)\.jpe?g$/i, '').replace(/\.jpe?g$/i, '').replace(/\.pdf$/i, '');

    if (ext === 'jpg' || ext === 'jpeg' || ext === 'pdf') {
      if (!groups[baseName]) {
        groups[baseName] = { jpgs: [], pdf: null };
      }
      if (ext === 'pdf') {
        groups[baseName].pdf = it;
      } else {
        groups[baseName].jpgs.push(it);
      }
    } else {
      processed.push(it);
    }
  });

  Object.keys(groups).forEach(baseName => {
    const g = groups[baseName];
    // Sort pages so "AIG IUL.jpg" (page 1) comes before "AIG IUL (2).jpg" (page 2)
    g.jpgs.sort((a, b) => {
      const aHasParen = a.name.includes('(');
      const bHasParen = b.name.includes('(');
      if (aHasParen && !bHasParen) return 1;
      if (!aHasParen && bHasParen) return -1;
      return a.name.localeCompare(b.name);
    });

    // Multiple JPG pages (with or WITHOUT a PDF) → merge into ONE multi-page brochure
    if (g.jpgs.length > 1) {
      processed.push({
        name: baseName,
        path: g.pdf ? g.pdf.path : g.jpgs[0].path,   // download target: the PDF if present, else pages
        ext: g.pdf ? 'pdf' : (g.jpgs[0].ext || 'jpg'),
        size: g.pdf ? g.pdf.size : g.jpgs.reduce((s, j) => s + (j.size || 0), 0),
        isMultiPage: true,
        pages: g.jpgs.map(p => p.path)
      });
    } else {
      // Single file (one JPG or one PDF) → individual item
      if (g.pdf) processed.push(g.pdf);
      g.jpgs.forEach(jpg => processed.push(jpg));
    }
  });

  return processed;
}

// --- NAV SECTION: "Brochure" (gọi từ renderFileTree trong js/main.js) ---
// `moi` = true → gắn huy hiệu "new" cạnh tên mục.
// ☠️ Có tham số riêng vì bản đầu (11/08/2026) nhét thẳng chuỗi
// `Application Form / Biểu mẫu</span><span class="nav-new">NEW` vào chỗ `label`.
// Nó CHẠY ĐƯỢC — nhưng chỉ vì `label` tình cờ đi thẳng vào innerHTML. Ngày nào
// có người bọc `escapeHtml(label)` cho an toàn thì tên mục hiện ra nguyên đoạn
// thẻ HTML, và lỗi đó không liên quan gì tới người vừa sửa.
function renderLibrarySection(container, label, iconHTML, groupsObj, q, moi) {
  groupsObj = groupsObj || {};
  // Huy hiệu truyền bằng `moi` để makeCollapsibleFolder đặt NGOÀI nhãn — nhét vào
  // trong nhãn thì bị `text-overflow: ellipsis` cắt thành "NE…" (chủ tool bắt được
  // 11/08/2026 ở đúng mục này, vì nó là mục CÓ dropdown nên nhãn hẹp hơn).
  const section = makeCollapsibleFolder(nhanMuc(label), { extraClass: 'nav-section', iconHTML, moi });
  let count = 0;
  Object.keys(groupsObj).sort(carrierSort).forEach(carrier => {
    let items = (groupsObj[carrier] || []).filter(it => !q || it.name.toLowerCase().includes(q));
    if (!items.length) return;

    // Group multi-page brochures (PDF + JPEGs)
    items = preprocessLibraryItems(items);

    if (carrier === 'Chung') {
      // Append items directly to section content, bypassing folder grouping.
      // GIỮ tên hãng trong nhãn: ở đây không có tiêu đề hãng phía trên để bù lại.
      // Xếp theo THỨ TỰ HÃNG trước (AIG → NLG → Allianz → Khác), giống hệt mọi mục
      // khác trên cây; cùng hãng mới xếp theo tên. Xếp thuần theo tên thì đổi tên file
      // là mục nhảy chỗ — đổi "AIG Application Form" thành "NLG & AIG — Application
      // Form" (12/08/2026) đủ để đẩy nó xuống dưới Allianz, trong khi chủ tool chỉ
      // yêu cầu đổi CHỮ. Chỉ mục Application Form rơi vào nhánh này (Brochure/ chia
      // hãng bằng thư mục con nên không có file lẻ nào ở gốc).
      items.sort((a, b) => carrierSort(carrierOf(a), carrierOf(b)) || a.name.localeCompare(b.name))
           .forEach(it => section.content.appendChild(makeDownloadItem(it, true)));
    } else {
      const grp = makeCollapsibleFolder(`${escapeHtml(carrier)} <span class="nav-count">${items.length}</span>`, { extraClass: 'nav-carrier', iconHTML: NAV_ICONS.carrier });

      // Add click event to the carrier header to show all items
      const headerEl = grp.folder.querySelector('.tree-folder-header');
      if (headerEl) {
        headerEl.addEventListener('click', async (e) => {
          if (!(await confirmLeaveUnsaved())) return;
          openLibraryGroup(items, carrier);
        });
      }

      items.sort((a, b) => a.name.localeCompare(b.name)).forEach(it => grp.content.appendChild(makeDownloadItem(it)));
      section.content.appendChild(grp.folder);
    }
    count += items.length;
  });
  if (count === 0) {
    // The hint must show the REAL folder name (before the " / vietnamese" display suffix)
    const folderName = String(label).split(' / ')[0];
    section.content.appendChild(makeEmptyHint(q ? 'Không có kết quả.' : `Chưa có file. Thả file vào folder "${folderName}/<Hãng>/".`));
  }
  container.appendChild(section.folder);
  return count;
}

// Mục "So sánh quyền lợi / Compare" đã CHUYỂN sang js/sosanh.js (21/07/2026):
// từ danh sách 16 logo → bảng 5 cột theo yêu cầu chủ tool. Đừng viết lại ở đây.

// --- PREVIEWS ---
function openLibraryGroup(items, groupName) {
  // ☠️ LỖI CÓ SẴN, SỬA 10/08/2026: hai hàm mở thư viện này KHÔNG gọi
  // hideLibraryPreview → mở bảng So sánh (bật `doc-mode`) rồi bấm sang một
  // brochure thì thân trang vẫn ở doc-mode: canvas bị ẩn, người dùng vẫn nhìn
  // thấy BẢNG SO SÁNH trong khi tool tưởng đang mở brochure. Gọi TRƯỚC khi đặt
  // activeLibraryPath, vì hàm này xoá giá trị đó (bẫy đã ghi ở openCompareTable).
  hideLibraryPreview();
  appState.activeLibraryPath = 'group:' + groupName;
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = groupName + ` (${items.length} files)`;
    dom.activeFileTitle.classList.add('is-active');
  }
  dom.btnSaveTop.disabled = true;

  dom.canvasWrapper.innerHTML = '';
  showLibraryGroupPreview(items);
  updateStatus(`Đang xem nhóm: ${groupName}`);
}

// ---------------------------------------------------------------------------
// MỤC "SMS / Tin nhắn mẫu" — MỘT DÒNG PHẲNG, KHÔNG menu phụ (10/08/2026)
//
// Chủ tool: *"phần này em hãy để giống phần ở trên, nó không sinh ra menu phụ"*
// (phần ở trên = Compare). Bản đầu em dựng nó thành nhóm xổ được như Brochure →
// thanh bên dài thêm một tầng cho đúng MỘT dòng con. Cùng lý do đã ghi ở
// renderCompareNavSection: dựng dropdown chứa một dòng là bắt bấm hai lần cho
// một việc.
// Nhiều ảnh thì sao? Bấm một lần mở HẾT, xếp dọc trong cùng khung cuộn — đọc
// liền mạch, vẫn không đẻ thêm tầng menu nào.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// HASHTAG NẰM NGAY TRONG TÊN FILE (09/10/2026)
//
// Anh Kevin (sale): "làm nhỏ hình lại, mỗi hình có hashtag của chương trình (IUL,
// TERM, MAXFUND...) để search ra đúng hình muốn gửi". Chủ tool chốt: đặt tên file
// theo nội dung hình, hashtag viết luôn trong tên:
//     "Thợ nail 1 - Yên tâm làm việc #IUL #ThoNail.jpg"
//      |------ tiêu đề hiện dưới ảnh -----| |- hashtag -|
// Thêm ảnh mới = thả file đặt tên đúng kiểu đó vào thư mục SMS/ rồi push. Không
// có bảng tag nào khác phải sửa theo.
// ☠️ Thư mục con bắt đầu bằng "_" (SMS/_goc/ giữ bản ảnh dài gốc trước khi cắt)
// KHÔNG lên lưới: bỏ điều kiện này là ảnh dài 1080x7082 hiện lại thành một ô
// trùng hình với ô đầu tiên.
// ---------------------------------------------------------------------------
// Dải dấu thanh sau khi tách NFD. Dựng bằng fromCharCode chứ không gõ escape:
// công cụ ghi file đã từng nuốt gạch chéo ngược làm regex hỏng im lặng.
const SMS_DAU_THANH = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
const SMS_DUOI_ANH = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

// "Thợ Nail" -> "tho nail": gõ có dấu hay không dấu, hoa hay thường đều ra.
function smsBoDau(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(SMS_DAU_THANH, '').replace(/đ/g, 'd').trim();
}

function tachTagSms(tenFile) {
  const tru = smsBoDuoi(tenFile);
  const manh = tru.split('#');
  let tieuDe = manh[0].trim();
  while (tieuDe.endsWith('-')) tieuDe = tieuDe.slice(0, -1).trim();
  const tags = [];
  manh.slice(1).forEach(m => {
    const t = m.trim().split(' ')[0];           // hashtag kết thúc ở dấu cách đầu tiên
    if (t && !tags.some(x => smsBoDau(x) === smsBoDau(t))) tags.push(t);
  });
  return { tieuDe: tieuDe || tru, tags };
}

// Mỗi FILE ẢNH = một ô. Cố ý KHÔNG qua preprocessLibraryItems: hàm đó gộp
// "Tên.jpg" + "Tên (2).jpg" thành một tài liệu nhiều trang, còn ở đây sale gửi
// từng tấm lẻ nên tấm nào cũng phải tìm và tải riêng được.
//
// ẢNH NHỎ CHO LƯỚI: SMS/_thumb/<cùng tên>.jpg (rộng 480px, vài chục KB). Lưới chỉ
// tải ảnh nhỏ; ảnh đủ nét chỉ tải khi bấm xem to hoặc bấm Tải về. Không có ảnh nhỏ
// thì lưới dùng thẳng ảnh gốc: vẫn chạy, chỉ nặng. Sinh ảnh nhỏ bằng
// `python scripts/tao-anh-nho-sms.py` sau mỗi lần thêm ảnh vào SMS/.
function smsBoDuoi(ten) {
  return String(ten).replace(/[.](jpe?g|png|pdf|svg|webp|gif)$/i, '');
}

function danhSachSms() {
  const groups = appState.library.sms || {};
  const anhNho = {};
  (groups['_thumb'] || []).forEach(f => { anhNho[smsBoDuoi(f.name)] = f.path; });
  return Object.keys(groups).filter(g => !g.startsWith('_')).sort(carrierSort)
    .flatMap(g => groups[g] || [])
    .filter(it => SMS_DUOI_ANH.includes(String(it.ext || '').toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }))
    .map(it => {
      const t = tachTagSms(it.name);
      const khoa = smsBoDau(t.tieuDe + ' ' + t.tags.join(' '));
      return Object.assign({}, it, {
        tieuDe: t.tieuDe, tags: t.tags,
        thumb: anhNho[smsBoDuoi(it.name)] || it.path,
        khoaTim: khoa, khoaLien: khoa.split(' ').join('')
      });
    });
}

// Một ảnh có khớp từ khoá không. Khớp khi MỌI từ gõ vào đều có mặt (thứ tự nào
// cũng được), hoặc khi viết liền thì trùng một hashtag ("thonail" ra "#ThoNail",
// "tho nail" cũng ra). Dấu # và dấu gạch nối trong ô tìm coi như dấu cách:
// sách của hãng in "MAX - FUNDED IUL" nên sale gõ "max-funded" vẫn phải ra "#MaxFundedIUL".
function khopSms(item, tuKhoa) {
  const q = smsBoDau(String(tuKhoa || '').split('#').join(' ').split('-').join(' '));
  if (!q) return true;
  const tu = q.split(' ').filter(Boolean);
  if (tu.every(w => item.khoaTim.includes(w))) return true;
  return item.khoaLien.includes(tu.join(''));
}

function renderSmsNavSection(container, q) {
  const items = danhSachSms();
  if (q && !'sms tin nhắn mẫu'.includes(q) && !items.some(it => khopSms(it, q))) return 0;

  const folder = document.createElement('div');
  folder.className = 'tree-folder nav-section nav-section-flat';

  const el = document.createElement('div');
  el.className = 'tree-folder-header' + (appState.activeLibraryPath === 'sms:all' ? ' is-open' : '');
  el.setAttribute('title', items.length ? `${items.length} tin nhắn mẫu` : 'Chưa có tin nhắn mẫu');
  el.innerHTML = `
    <span class="tree-folder-icon">${NAV_ICONS.sms}</span>
    <span class="tree-folder-label">${nhanMuc('SMS / Tin nhắn mẫu')}</span><span class="nav-new">new</span>
  `;
  el.addEventListener('click', async () => {
    if (!(await confirmLeaveUnsaved())) return;
    document.querySelectorAll('.tree-file-item').forEach(x => x.classList.remove('active'));
    openSmsAll();               // gọi TRƯỚC: bên trong nó gọi hideLibraryPreview, hàm này xoá dấu is-open
    el.classList.add('is-open');
  });
  makeKeyboardActivatable(el);

  folder.appendChild(el);
  container.appendChild(folder);
  return 1;
}

function openSmsAll() {
  const items = danhSachSms();

  // Dọn khung cũ TRƯỚC rồi mới đặt trạng thái mới — hideLibraryPreview xoá
  // activeLibraryPath, gọi sau là mất luôn dấu chọn ở thanh bên (đúng bẫy đã
  // ghi trong openCompareTable).
  hideLibraryPreview();
  dom.canvasWrapper.innerHTML = '';

  appState.activeLibraryPath = 'sms:all';
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  const ten = items.length === 1
    ? items[0].tieuDe
    : `Tin nhắn mẫu (${items.length})`;
  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = items.length ? ten : 'Tin nhắn mẫu';
    dom.activeFileTitle.classList.add('is-active');
  }
  dom.btnSaveTop.disabled = true;

  // Đo lường: 1 lượt XEM, gộp nhóm giống brochure. Best-effort.
  if (items.length && window.TSTAuth && TSTAuth.logUsage) TSTAuth.logUsage('view', 'Tin nhắn mẫu: ' + ten);

  smsLoc.q = ''; smsLoc.tag = '';      // moi lan mo muc la xem lai tu dau
  showSmsGallery(items);
  updateStatus(items.length ? `Đang xem: ${ten}` : 'Chưa có tin nhắn mẫu nào');
}

// ---------------------------------------------------------------------------
// LƯỚI ẢNH NHỎ + Ô TÌM + HASHTAG — "SMS / Tin nhắn mẫu" (09/10/2026)
//
// Trước đây bấm mục SMS là mở ảnh to hết khung, cuộn dọc (hàm cũ đã gỡ, nằm ở
// đúng chỗ này). Có nhiều ảnh thì phải cuộn qua từng tấm mới thấy tấm cần gửi. Nay:
//   - ảnh thu nhỏ xếp lưới, dưới mỗi ảnh là tiêu đề + hashtag
//   - ô tìm (tên hoặc hashtag, không cần gõ dấu) + hàng hashtag bấm để lọc
//   - bấm ảnh nhỏ thì ảnh to THAY CHỖ lưới ngay trong khung, có nút "Quay lại
//     lưới"; nút Tải về có sẵn ở cả hai chỗ
// ☠️ Ảnh to KHÔNG làm thành lớp phủ `position: fixed`: .library-view có z-index
// riêng nên tự thành một tầng xếp, lớp phủ nằm trong nó không bao giờ nổi lên
// trên thanh bên (z 200) và thanh đầu trang (z 100) được, thanh nút sẽ chui xuống
// dưới. Đưa lớp phủ ra ngoài #library-view thì lại mất việc ghi lượt tải.
// Nút tải là thẻ <a download> nằm trong #library-view nên lượt tải vẫn được ghi
// vào Đo lường bởi đoạn uỷ quyền trong main.js, không phải nối dây gì thêm.
// ---------------------------------------------------------------------------
const smsLoc = { q: '', tag: '' };     // điều kiện lọc đang áp, đặt lại mỗi lần mở mục
let smsDangXem = null;                 // ô ảnh nhỏ vừa bấm, để đóng ảnh to thì trả tiêu điểm về
let smsCuonCu = 0;                     // lưới đang cuộn tới đâu lúc bấm, quay lại thì về đúng chỗ đó

// ---------------------------------------------------------------------------
// ĐỔI SỐ ĐIỆN THOẠI IN TRÊN ẢNH SMS (10/10/2026)
//
// Chủ tool: "phần hình ảnh mess anh cần chỉnh sửa được số phone ... chỉ cần thay đổi
// được đúng ở phần số phone thôi, hình ảnh nào không có thì không cần, còn hình ảnh
// nào có thì hãy có chỗ để cho anh chỉnh sửa".
//
// Ảnh SMS là file JPEG, số "(888) 909-1446" nằm chết trong điểm ảnh ở dải chân. Không
// có lớp chữ nào để sửa như file SVG của Proposal / Name Card. Nên làm ngay trong trình
// duyệt, trên ảnh đủ nét, ba bước:
//   1. DÒ chỗ có số (smsTimHopSo): tìm dòng chữ trắng thứ nhất giữa hai vạch dọc của
//      dải chân, rồi so bề rộng/chiều cao với khuôn đã đo. Đo 10/10/2026 trên cả 34 ảnh:
//      30 ảnh vuông ra đúng một khuôn (rộng 17,46 đến 17,55% ảnh, cao 2,23 đến 2,35%),
//      4 ảnh thợ nail không có số và bị loại đúng. Ảnh mới cùng mẫu chân thì tự ăn,
//      không phải khai báo gì thêm.
//   2. VÁ NỀN (smsVaNen): tô lại đúng ô chữ cũ bằng màu lấy từ chính dải chân ở ngay
//      phía trên, theo TỪNG CỘT (dải chân là dải màu chuyển ngang, mỗi ảnh một màu).
//   3. VIẾT SỐ MỚI (smsVeSo) bằng phông Google Sans Flex. Cỡ chữ không gõ cứng: đo
//      chuỗi số GỐC bằng phông đó rồi co cho vừa khít ô chữ cũ, nên ảnh 2000px hay
//      1254px đều ra đúng cỡ.
// ☠️ Phông chưa nạp được thì KHÔNG vẽ bằng phông khác: số mới sẽ lệch kiểu với dòng
//    "Miễn phí hỗ trợ 24/7" ngay dưới và ảnh đó đi thẳng tới khách. Báo lỗi, không tải.
// ☠️ Số chỉ đổi khi đủ 10 chữ số kiểu Mỹ (formatPhoneValue trong core.js). Gõ dở thì
//    ảnh GIỮ số gốc và dòng trạng thái nói rõ điều đó, không có trạng thái lửng lơ.
// Số đã nhập lưu ở máy người dùng (localStorage), không gửi lên máy chủ.
// ---------------------------------------------------------------------------
const SMS_SO_GOC = '(888) 909-1446';
const SMS_SO_KHOA = 'tst-sms-sdt';
const SMS_PHONG = {
  ho: 'Google Sans Flex', dam: 575,     // 575 khớp số gốc nhất trong dải 450 tới 650 (đo 10/10/2026)
  css: 'https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400..700&display=swap'
};
// Khuôn của dòng số trên ảnh, tính theo tỉ lệ so với cạnh ảnh (đo 10/10/2026, xem trên)
const SMS_KHUON = { x: [0.345, 0.552], y: [0.885, 0.975], rong: [0.165, 0.185], cao: [0.020, 0.026] };

let smsSo = '';                         // '' = giữ số gốc; còn lại luôn ở dạng "(123) 456-7890"
let smsPhongSan = null;                 // lời hứa "phông đã nạp xong", dùng chung cho mọi ảnh
const smsHopSo = new Map();             // đường dẫn ảnh → hộp số đã dò (null = ảnh không có số)
const smsAnhMoi = new Map();            // đường dẫn ảnh → { so, url, blob } của bản đã đổi số

function smsDocSoLuu() {
  try {
    const so = formatPhoneValue(localStorage.getItem(SMS_SO_KHOA) || '');
    return so && so !== SMS_SO_GOC ? so : '';
  } catch (e) { return ''; }
}

// Chữ trong ô nhập → { so, tt }: tt = 'rong' (để trống) · 'thieu' (gõ dở/không hợp lệ) ·
// 'goc' (gõ lại đúng số gốc) · 'du' (số mới hợp lệ)
// (12/10/2026) Tách thêm ba lý do 'thua' · 'so0' · 'chu'. Bản đầu gom hết vào 'thieu' nên
// gõ thừa một số (11 chữ số) hay gõ số bắt đầu bằng 0 đều nhận câu "Cần đủ 10 chữ số"
// trong khi không hề thiếu, còn gõ toàn chữ thì không có câu nào. Người gõ không biết
// mình sai ở đâu, mà ảnh thì đã lặng lẽ quay về số gốc.
//   'thua' nhiều hơn 10 chữ số · 'so0' đủ 10 chữ số nhưng bắt đầu bằng 0 (kiểu Việt Nam)
//   'chu'  có chữ mà không có chữ số nào
function smsDocO(raw) {
  const chu = String(raw || '').trim();
  if (!chu) return { so: '', tt: 'rong' };
  let so10 = chu.replace(/\D/g, '');
  if (!so10) return { so: '', tt: 'chu' };
  if (so10.length === 11 && so10[0] === '1') so10 = so10.slice(1);     // mã nước +1, cùng luật với formatPhoneValue
  if (so10.length < 10) return { so: '', tt: 'thieu' };
  if (so10.length > 10) return { so: '', tt: 'thua' };
  const so = formatPhoneValue(chu);
  if (!so) return { so: '', tt: 'so0' };
  return so === SMS_SO_GOC ? { so: '', tt: 'goc' } : { so: so, tt: 'du' };
}

function smsDatSo(so) {
  if (so === smsSo) return;
  smsSo = so;
  // Số đổi thì mọi bản đã dựng với số cũ thành rác: thu lại bộ nhớ
  smsAnhMoi.forEach(a => URL.revokeObjectURL(a.url));
  smsAnhMoi.clear();
  try { if (so) localStorage.setItem(SMS_SO_KHOA, so); else localStorage.removeItem(SMS_SO_KHOA); } catch (e) {}
}

function smsNapPhong() {
  if (smsPhongSan) return smsPhongSan;
  smsPhongSan = (async () => {
    let l = document.querySelector('link[data-sms-phong]');
    if (!l) {
      l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = SMS_PHONG.css; l.dataset.smsPhong = '1';
      await new Promise((ok, loi) => {
        l.onload = ok;
        l.onerror = () => { l.remove(); loi(new Error('không tải được phông chữ')); };
        document.head.appendChild(l);
      });
    }
    // ☠️ document.fonts.check() trả true cả với phông KHÔNG tồn tại (đo 10/10/2026), nên
    // phải nhìn danh sách mặt chữ mà load() thật sự nạp về: rỗng nghĩa là chưa có phông.
    const mat = await document.fonts.load(SMS_PHONG.dam + ' 48px "' + SMS_PHONG.ho + '"', '(0123456789) -');
    if (!mat || !mat.length) throw new Error('không tải được phông chữ');
  })();
  smsPhongSan.catch(() => { smsPhongSan = null; });      // hỏng thì lần bấm sau thử lại từ đầu
  return smsPhongSan;
}

function smsTaiAnh(path) {
  return new Promise((ok, loi) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => loi(new Error('không tải được ảnh gốc'));
    im.src = '/api/download?path=' + encodeURIComponent(path) + '&inline=1';
  });
}

// Dò dòng số trên ảnh đã vẽ vào ctx. → { x0, y0, x1, y1, duoi } (điểm ảnh, tính cả hai
// mép; `duoi` = hàng đầu tiên của dòng chữ phụ bên dưới) hoặc null nếu ảnh không có số.
function smsTimHopSo(ctx, w, h) {
  const X0 = Math.floor(w * SMS_KHUON.x[0]), X1 = Math.floor(w * SMS_KHUON.x[1]);
  const Y0 = Math.floor(h * SMS_KHUON.y[0]), Y1 = Math.floor(h * SMS_KHUON.y[1]);
  const W = X1 - X0, H = Y1 - Y0;
  const d = ctx.getImageData(X0, Y0, W, H).data;
  // "Trắng" = kênh màu NHỎ NHẤT vẫn sáng. Nền dải chân có màu (đỏ, xanh, vàng) nên luôn
  // có ít nhất một kênh tối; chữ trắng thì cả ba kênh đều sáng.
  const trang = (x, y) => { const i = (y * W + x) * 4; return Math.min(d[i], d[i + 1], d[i + 2]) > 185; };
  const dong = [];
  let bat = -1;
  for (let y = 0; y <= H; y++) {
    let co = false;
    if (y < H) for (let x = 0; x < W; x++) if (trang(x, y)) { co = true; break; }
    if (co && bat < 0) bat = y;
    if (!co && bat >= 0) { if (y - 1 - bat >= h * 0.008) dong.push([bat, y - 1]); bat = -1; }
  }
  if (dong.length < 2) return null;
  const a = dong[0][0], b = dong[0][1];
  let xDau = -1, xCuoi = -1;
  for (let x = 0; x < W; x++) {
    for (let y = a; y <= b; y++) if (trang(x, y)) { if (xDau < 0) xDau = x; xCuoi = x; break; }
  }
  // w, h đi kèm để chỗ khác đổi hộp này ra phần trăm của ảnh (vùng bấm trên ảnh to)
  const hop = { x0: X0 + xDau, y0: Y0 + a, x1: X0 + xCuoi, y1: Y0 + b, duoi: Y0 + dong[1][0], w: w, h: h };
  const rong = (hop.x1 - hop.x0) / w, cao = (hop.y1 - hop.y0) / h;
  if (rong < SMS_KHUON.rong[0] || rong > SMS_KHUON.rong[1] || cao < SMS_KHUON.cao[0] || cao > SMS_KHUON.cao[1]) return null;
  return hop;
}

// Tô lại nền dưới dòng số cũ. Màu lấy theo TỪNG CỘT từ hai dải hàng sạch phía trên chữ
// (dải gần và dải xa hơn): dải gần cho màu của cột, hiệu hai dải cho độ dốc theo chiều
// dọc (lấy trung bình mọi cột cho đỡ nhiễu). Không lấy mẫu phía DƯỚI chữ: khe tới dòng
// "Miễn phí hỗ trợ 24/7" ở ảnh 1254px chỉ 13 điểm ảnh, không còn hàng nào sạch viền nén.
function smsVaNen(ctx, hop, w, h) {
  const le = Math.max(8, Math.round(h * 0.005));          // nới ra để nuốt cả viền nén JPEG quanh chữ
  const kc = Math.max(12, Math.round(h * 0.01));          // khoảng cách giữa hai dải mẫu
  const px0 = hop.x0 - le, px1 = hop.x1 + le;
  const py0 = hop.y0 - le;
  const py1 = hop.y1 + Math.min(le, Math.max(3, Math.floor((hop.duoi - hop.y1) * 0.4)));
  const PW = px1 - px0 + 1, PH = py1 - py0 + 1;
  const gan = ctx.getImageData(px0, py0 - 5, PW, 4).data;
  const xa = ctx.getImageData(px0, py0 - 5 - kc, PW, 4).data;
  const cot = new Float32Array(PW * 3), doc = [0, 0, 0];
  for (let x = 0; x < PW; x++) {
    for (let c = 0; c < 3; c++) {
      let g = 0, f = 0;
      for (let r = 0; r < 4; r++) { g += gan[(r * PW + x) * 4 + c]; f += xa[(r * PW + x) * 4 + c]; }
      cot[x * 3 + c] = g / 4;
      doc[c] += (g - f) / 4 / kc / PW;
    }
  }
  // Làm mịn theo chiều ngang (7 cột) để nhiễu nén của từng cột không thành sọc dọc
  const min = new Float32Array(PW * 3);
  for (let x = 0; x < PW; x++) {
    for (let c = 0; c < 3; c++) {
      let s = 0, n = 0;
      for (let k = -3; k <= 3; k++) { const xx = x + k; if (xx >= 0 && xx < PW) { s += cot[xx * 3 + c]; n++; } }
      min[x * 3 + c] = s / n;
    }
  }
  const va = ctx.createImageData(PW, PH);
  for (let y = 0; y < PH; y++) {
    const cach = y + 3.5;                                  // số hàng tính từ tâm dải mẫu gần
    for (let x = 0; x < PW; x++) {
      const i = (y * PW + x) * 4;
      va.data[i] = min[x * 3] + doc[0] * cach;
      va.data[i + 1] = min[x * 3 + 1] + doc[1] * cach;
      va.data[i + 2] = min[x * 3 + 2] + doc[2] * cach;
      va.data[i + 3] = 255;
    }
  }
  ctx.putImageData(va, px0, py0);
}

// Viết số mới đúng chỗ số cũ: cùng mép trái, cùng đường chân chữ, cùng cỡ.
function smsVeSo(ctx, hop, so) {
  const phong = px => SMS_PHONG.dam + ' ' + px + 'px "' + SMS_PHONG.ho + '"';
  ctx.font = phong(100);
  const m = ctx.measureText(SMS_SO_GOC);                   // đo chuỗi GỐC để suy ra cỡ chữ của ảnh này
  const tl = (hop.x1 - hop.x0 + 1) / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
  ctx.font = phong(100 * tl);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Tham số cuối = bề rộng tối đa: số toàn chữ số rộng ("(800) 000-0000") dài hơn số gốc
  // khoảng 6%, mà vạch dọc ngăn với ô website chỉ cách mép phải số gốc 2,6% bề ngang
  // ảnh. Vượt 7% thì trình duyệt tự ép hẹp lại, không để chữ chạm vạch.
  ctx.fillText(so, hop.x0 + m.actualBoundingBoxLeft * tl, hop.y0 + m.actualBoundingBoxAscent * tl,
    (hop.x1 - hop.x0 + 1) * 1.07);
}

// Dựng ảnh mang số `so` ('' = chỉ dò xem ảnh có số không).
// → { coSo, url, blob }: url/blob chỉ có khi coSo và so khác rỗng.
async function smsDungAnh(item, so) {
  const daDo = smsHopSo.has(item.path);
  if (daDo && !smsHopSo.get(item.path)) return { coSo: false, url: null, blob: null };
  if (daDo && !so) return { coSo: true, url: null, blob: null };
  const san = smsAnhMoi.get(item.path);
  if (so && san && san.so === so) return { coSo: true, url: san.url, blob: san.blob };

  const im = await smsTaiAnh(item.path);
  const cv = document.createElement('canvas');
  cv.width = im.naturalWidth; cv.height = im.naturalHeight;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(im, 0, 0);
  let hop = smsHopSo.get(item.path);
  if (hop === undefined) { hop = smsTimHopSo(ctx, cv.width, cv.height); smsHopSo.set(item.path, hop); }
  if (!hop) return { coSo: false, url: null, blob: null };
  if (!so) return { coSo: true, url: null, blob: null };

  await smsNapPhong();
  smsVaNen(ctx, hop, cv.width, cv.height);
  smsVeSo(ctx, hop, so);
  const blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.92));
  if (!blob) throw new Error('trình duyệt không xuất được ảnh');
  if (so !== smsSo) return { coSo: true, url: null, blob: blob };      // số đã đổi tiếp trong lúc dựng: đừng cất bản cũ
  const cu = smsAnhMoi.get(item.path);
  if (cu) URL.revokeObjectURL(cu.url);
  const url = URL.createObjectURL(blob);
  smsAnhMoi.set(item.path, { so: so, url: url, blob: blob });
  return { coSo: true, url: url, blob: blob };
}

function showSmsGallery(items) {
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  let view = document.getElementById('library-view');
  if (!view) {
    view = document.createElement('div');
    view.id = 'library-view';
    view.className = 'library-view';
    dom.canvasContainer.appendChild(view);
  }
  view.classList.remove('has-group', 'is-wide');
  view.classList.add('is-tall');       // mượn khung cuộn dọc sẵn có

  if (!items.length) {
    view.innerHTML = `<div class="tall-doc"><div class="tall-doc-bar">
        <span class="tall-doc-title">Chưa có tin nhắn mẫu. Thả ảnh vào thư mục "SMS/" ở gốc dự án.</span>
      </div></div>`;
    view.style.display = 'block';
    return;
  }

  // Hashtag gom từ chính các ảnh đang có, kèm số ảnh mang tag đó
  const dem = {};
  items.forEach(it => it.tags.forEach(t => {
    const k = smsBoDau(t);
    if (!dem[k]) dem[k] = { nhan: t, n: 0 };
    dem[k].n++;
  }));
  const chips = Object.keys(dem).sort((a, b) => dem[b].n - dem[a].n || a.localeCompare(b));

  const the = items.map((it, i) => {
    const dl = `/api/download?path=${encodeURIComponent(it.path)}`;
    const tagHtml = it.tags.map(t =>
      `<button type="button" class="sms-tag" data-tag="${escapeHtml(smsBoDau(t))}" title="Lọc theo #${escapeHtml(t)}">#${escapeHtml(t)}</button>`).join('');
    return `
      <article class="sms-card" data-i="${i}">
        <button type="button" class="sms-thumb" data-i="${i}" aria-label="Xem ảnh lớn: ${escapeHtml(it.tieuDe)}">
          <img loading="lazy" decoding="async" src="/api/download?path=${encodeURIComponent(it.thumb)}&inline=1" alt="${escapeHtml(it.tieuDe)}">
        </button>
        <div class="sms-ten" title="${escapeHtml(it.tieuDe)}">${escapeHtml(it.tieuDe)}</div>
        <div class="sms-tags">${tagHtml}</div>
        <a class="btn btn-secondary btn-sm sms-dl" href="${dl}" download>${NAV_ICONS.download} Tải về</a>
      </article>`;
  }).join('');

  view.innerHTML = `
    <div class="sms-kho">
      <!-- Ô đổi số điện thoại đứng TRÊN thanh tìm và KHÔNG dính theo khi cuộn: đặt một lần
           rồi thôi (số được nhớ lại). Nhét vào thanh dính thì ở điện thoại thanh đó cao
           218px, chiếm 27% màn hình (đo 10/10/2026); để ngoài thì thanh vẫn 147px. -->
      <div class="sms-so-hang" title="Đổi số điện thoại in ở chân ảnh. Để trống là giữ số gốc ${SMS_SO_GOC}.">
        <label class="sms-so-nhan" for="sms-so">Số điện thoại trên ảnh</label>
        <input type="tel" id="sms-so" inputmode="tel" autocomplete="off"
               placeholder="${SMS_SO_GOC}" aria-describedby="sms-so-tt">
        <span class="sms-so-tt" id="sms-so-tt" aria-live="polite"></span>
      </div>
      <div class="sms-bar">
        <div class="search-input-container sms-tim">
          <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" id="sms-tim" autocomplete="off"
                 placeholder="Tìm theo tên hoặc hashtag, ví dụ: IUL, thợ nail"
                 aria-label="Tìm tin nhắn mẫu theo tên hoặc hashtag">
        </div>
        <div class="sms-chips" role="group" aria-label="Lọc theo hashtag">
          <button type="button" class="sms-chip" data-tag="">Tất cả <b>${items.length}</b></button>
          ${chips.map(k => `<button type="button" class="sms-chip" data-tag="${escapeHtml(k)}">#${escapeHtml(dem[k].nhan)} <b>${dem[k].n}</b></button>`).join('')}
        </div>
        <span class="sms-dem" id="sms-dem" aria-live="polite"></span>
      </div>
      <div class="sms-luoi">${the}</div>
      <div class="sms-rong" hidden>
        <b>Không có ảnh nào khớp.</b>
        <span>Thử gõ ít chữ hơn, hoặc bấm "Tất cả" để xem lại toàn bộ.</span>
      </div>
    </div>
    <div class="sms-xem" hidden>
      <div class="tall-doc">
        <div class="tall-doc-bar sms-xem-bar">
          <button type="button" class="btn btn-secondary btn-sm sms-xem-dong">‹ Quay lại lưới</button>
          <span class="tall-doc-title sms-xem-ten"></span>
          <a class="btn btn-primary btn-sm tall-doc-dl sms-xem-dl" href="#" download>${NAV_ICONS.download} Tải về</a>
        </div>
        <!-- Chỉ hiện với ảnh CÓ số điện thoại (chủ tool 10/10/2026: "hình ảnh nào không có
             thì không cần, còn hình ảnh nào có thì hãy có chỗ để cho anh chỉnh sửa") -->
        <div class="sms-so-hang sms-xem-so" hidden>
          <label class="sms-so-nhan" for="sms-xem-so-o">Số điện thoại trên ảnh</label>
          <input type="tel" id="sms-xem-so-o" inputmode="tel" autocomplete="off"
                 placeholder="${SMS_SO_GOC}" aria-describedby="sms-xem-so-tt">
          <span class="sms-so-tt" id="sms-xem-so-tt" aria-live="polite"></span>
        </div>
        <!-- (12/10/2026) Chủ tool: "anh bấm vào số phone không thay được số phone". Anh bấm
             thẳng vào con số in trên ảnh, như bấm vào chữ bên Proposal, còn bản đầu chỉ có ô
             nhập nằm phía trên. Nút trong suốt dưới đây nằm đúng trên con số: bấm vào là
             nhảy lên ô nhập, số cũ đã bôi đen sẵn. Nó chỉ là lớp phủ trên màn hình, KHÔNG
             nằm trong file ảnh tải về. -->
        <div class="sms-xem-khung">
          <img class="tall-doc-img sms-xem-img" alt="">
          <button type="button" class="sms-xem-diem" hidden
                  title="Bấm để đổi số điện thoại" aria-label="Đổi số điện thoại trên ảnh"></button>
        </div>
      </div>
    </div>`;

  const oTim = view.querySelector('#sms-tim');
  const kho = view.querySelector('.sms-kho');
  const xem = view.querySelector('.sms-xem');

  // ---- ĐỔI SỐ ĐIỆN THOẠI: hai ô nhập (thanh lưới + ảnh to) là hai cửa vào CÙNG một số ----
  const oSo = view.querySelector('#sms-so'), ttSo = view.querySelector('#sms-so-tt');
  const hangSoXem = xem.querySelector('.sms-xem-so');
  const oSoXem = xem.querySelector('#sms-xem-so-o'), ttSoXem = xem.querySelector('#sms-xem-so-tt');
  let dangXemI = -1;                   // ảnh to đang mở là ảnh thứ mấy, -1 = đang ở lưới
  let luotVe = 0;                      // tăng mỗi lần phải vẽ lại ảnh to: kết quả về trễ của lượt cũ bị bỏ

  const soLuu = smsDocSoLuu();         // số sale đã nhập lần trước trên máy này
  if (soLuu !== smsSo) smsDatSo(soLuu);

  // Mọi câu báo "chưa dùng được số này" đều nói thêm ảnh đang mang số nào: người gõ phải
  // biết là ảnh ĐÃ quay về số gốc chứ không dừng ở số vừa gõ dở.
  const GIU_GOC = ' Ảnh đang giữ số gốc.';
  const CAU_SO = {
    du: 'Ảnh tải về sẽ mang số này.',
    thieu: 'Cần đủ 10 chữ số.' + GIU_GOC,
    thua: 'Thừa chữ số: số Mỹ chỉ có 10 chữ số.' + GIU_GOC,
    so0: 'Chỉ nhận số Mỹ, không bắt đầu bằng số 0.' + GIU_GOC,
    chu: 'Ô này chỉ nhận chữ số.' + GIU_GOC
  };
  function veTrangThaiSo(tt, loi) {
    const canhBao = !!loi || ['thieu', 'thua', 'so0', 'chu'].includes(tt);
    [ttSo, ttSoXem].forEach(o => {
      o.textContent = loi || CAU_SO[tt] || '';
      o.className = 'sms-so-tt' + (canhBao ? ' canh-bao' : tt === 'du' ? ' ok' : '');
    });
  }

  function khiGoSo(o) {
    const k = smsDocO(o.value);
    // Đủ số và con trỏ đang ở CUỐI ô thì viết lại cho đúng dạng (123) 456-7890. Đang sửa ở
    // giữa thì để yên, viết lại là con trỏ nhảy về cuối (bài học ô ngày sinh 09/10).
    if ((k.tt === 'du' || k.tt === 'goc') && o.selectionStart === o.value.length) o.value = formatPhoneValue(o.value);
    [oSo, oSoXem].forEach(x => { if (x !== o) x.value = o.value; });
    smsDatSo(k.so);
    veTrangThaiSo(k.tt);
    if (!xem.hidden) veAnhLon();
  }
  [oSo, oSoXem].forEach(o => {
    o.value = smsSo;
    o.addEventListener('input', () => khiGoSo(o));

    // (12/10/2026) Hai thứ dưới đây là bài học của ô ngày sinh (09/10) mà bản đầu của ô này
    // quên mang sang. Thử lại mới lộ: ô đang có "(832) 980-4749", gõ hay dán số mới vào
    // đuôi ra "(832) 980-47497142356777", ảnh lặng lẽ quay về số gốc.
    // 1. VÀO Ô LÀ BÔI ĐEN HẾT: gõ hoặc dán số mới sẽ THAY số cũ. Bấm chuột lần nữa vào ô
    //    đang mở thì đặt con trỏ như thường, để sửa lẻ một chữ số.
    let vuaVao = false;
    o.addEventListener('focus', () => { if (o.value) { o.select(); vuaVao = true; } });
    o.addEventListener('mouseup', e => { if (vuaVao) { e.preventDefault(); vuaVao = false; } });
    o.addEventListener('blur', () => { vuaVao = false; });
    o.addEventListener('keydown', () => { vuaVao = false; });
    // 2. DÁN CẢ MỘT SỐ thì THAY hết ô, dù con trỏ đang ở đâu. Chỉ can thiệp khi thứ được
    //    dán tự nó là một số hợp lệ; dán một mẩu (vài chữ số) thì để trình duyệt chèn như thường.
    o.addEventListener('paste', e => {
      const so = formatPhoneValue((e.clipboardData && e.clipboardData.getData('text')) || '');
      if (!so) return;
      e.preventDefault();
      o.value = so;
      khiGoSo(o);
    });
  });
  veTrangThaiSo(smsSo ? 'du' : 'rong');

  // Vẽ (lại) ảnh to theo số đang đặt. Luôn dò xem ảnh có số không, kể cả khi đang giữ số
  // gốc: đó là thứ quyết định ô nhập có hiện ra cho ảnh này hay không.
  async function veAnhLon() {
    const it = items[dangXemI];
    if (!it) return;
    const luot = ++luotVe;
    const img = xem.querySelector('.sms-xem-img');
    const goc = `/api/download?path=${encodeURIComponent(it.path)}&inline=1`;
    try {
      const kq = await smsDungAnh(it, smsSo);
      if (luot !== luotVe) return;                 // đã mở ảnh khác hoặc gõ số khác trong lúc chờ
      hangSoXem.hidden = !kq.coSo;
      // Đặt vùng bấm lên đúng con số, tính bằng PHẦN TRĂM của ảnh nên ảnh hiện to nhỏ
      // cỡ nào cũng trúng. Nới mỗi phía một chút cho dễ bấm bằng ngón tay.
      const diem = xem.querySelector('.sms-xem-diem');
      const hop = smsHopSo.get(it.path);
      diem.hidden = !hop;
      if (hop) {
        const noiX = hop.w * 0.012, noiY = hop.h * 0.012;
        diem.style.left = ((hop.x0 - noiX) / hop.w * 100) + '%';
        diem.style.top = ((hop.y0 - noiY) / hop.h * 100) + '%';
        diem.style.width = ((hop.x1 - hop.x0 + 2 * noiX) / hop.w * 100) + '%';
        diem.style.height = ((hop.y1 - hop.y0 + 2 * noiY) / hop.h * 100) + '%';
      }
      const can = kq.url || goc;
      if (img.getAttribute('src') !== can) img.src = can;
    } catch (e) {
      if (luot !== luotVe) return;
      if (img.getAttribute('src') !== goc) img.src = goc;
      veTrangThaiSo('', 'Chưa đổi được số: ' + e.message + '. Ảnh đang hiện số gốc.');
    }
  }

  // Bấm "Tải về" khi đang đặt số mới: dựng ảnh mang số đó rồi mới cho tải. Đang giữ số
  // gốc thì không can thiệp, trình duyệt tải thẳng file gốc như trước nay.
  // ☠️ Link tạm gắn vào <body>, NGOÀI #library-view: đoạn ghi lượt tải trong main.js bắt
  // mọi cú bấm vào `#library-view a[download]`, link tạm mà nằm trong đó là ghi hai lần.
  // Cú bấm gốc của người dùng vẫn nổi lên tới đoạn đó nên lượt tải được ghi đúng một lần.
  async function taiCoSo(e, it, a) {
    if (!smsSo || !it) return;
    e.preventDefault();
    if (a.dataset.dang) return;
    a.dataset.dang = '1';
    const chuCu = a.innerHTML;
    a.textContent = 'Đang đổi số…';
    try {
      const kq = await smsDungAnh(it, smsSo);
      const tam = document.createElement('a');
      tam.download = it.name;
      tam.href = kq.blob ? URL.createObjectURL(kq.blob) : a.getAttribute('href');   // ảnh không có số: tải file gốc
      document.body.appendChild(tam);
      tam.click();
      tam.remove();
      if (kq.blob) { const u = tam.href; setTimeout(() => URL.revokeObjectURL(u), 60000); }
    } catch (err) {
      showAppAlert('Chưa đổi được số trên ảnh (' + err.message + ').\n\nẢnh CHƯA được tải về. Bạn bấm lại, hoặc xoá trống ô số điện thoại để tải ảnh với số gốc.',
        { title: 'Chưa tải được ảnh', tone: 'danger' });
    } finally {
      delete a.dataset.dang;
      a.innerHTML = chuCu;
    }
  }

  function apDung() {
    const cards = view.querySelectorAll('.sms-card');
    let hien = 0;
    cards.forEach(c => {
      const it = items[Number(c.dataset.i)];
      const ok = khopSms(it, smsLoc.q) && (!smsLoc.tag || it.tags.some(t => smsBoDau(t) === smsLoc.tag));
      c.hidden = !ok;
      if (ok) hien++;
    });
    view.querySelectorAll('.sms-chip').forEach(ch => {
      const dangChon = ch.dataset.tag === smsLoc.tag;
      ch.classList.toggle('is-on', dangChon);
      ch.setAttribute('aria-pressed', String(dangChon));
    });
    // Điện thoại: hàng hashtag vuốt ngang (style.css). Bấm hashtag ngay trên một thẻ ảnh thì
    // nút đang chọn có thể nằm ngoài mép: kéo hàng cho nó hiện ra. Tự tính scrollLeft chứ
    // không gọi scrollIntoView, hàm đó có thể kéo luôn cả khung lưới theo chiều dọc.
    const hang = view.querySelector('.sms-chips');
    const dangOn = hang.querySelector('.sms-chip.is-on');
    if (dangOn && hang.scrollWidth > hang.clientWidth) {
      const dau = dangOn.offsetLeft - hang.offsetLeft, cuoi = dau + dangOn.offsetWidth;
      if (dau < hang.scrollLeft) hang.scrollLeft = dau;
      else if (cuoi > hang.scrollLeft + hang.clientWidth) hang.scrollLeft = cuoi - hang.clientWidth;
    }
    view.querySelector('.sms-rong').hidden = hien > 0;
    view.querySelector('#sms-dem').textContent =
      hien === items.length ? `${items.length} ảnh` : `${hien} / ${items.length} ảnh`;
  }

  function moAnhLon(i, nut) {
    const it = items[i];
    if (!it) return;
    const dl = `/api/download?path=${encodeURIComponent(it.path)}`;
    xem.querySelector('.sms-xem-ten').textContent = it.tieuDe;
    xem.querySelector('.sms-xem-ten').title = it.name;
    xem.querySelector('.sms-xem-dl').href = dl;
    const img = xem.querySelector('.sms-xem-img');
    // Đang đặt số mới thì KHÔNG bày ảnh gốc ra trước: số cũ sẽ hiện to rõ một nhịp rồi
    // mới đổi, nhìn như tool quên số vừa nhập. Bày tạm ảnh nhỏ (đã có sẵn trong bộ đệm,
    // chữ số trên đó bé không đọc nổi) cho tới khi bản mang số mới dựng xong.
    img.src = smsSo ? `/api/download?path=${encodeURIComponent(it.thumb)}&inline=1` : dl + '&inline=1';
    img.alt = it.tieuDe;
    dangXemI = i;
    hangSoXem.hidden = true;           // hiện lại ngay khi dò ra ảnh này có số
    xem.querySelector('.sms-xem-diem').hidden = true;   // vùng bấm trên con số cũng vậy
    smsDangXem = nut || null;
    smsCuonCu = view.scrollTop;
    kho.hidden = true;
    xem.hidden = false;
    view.scrollTop = 0;
    xem.querySelector('.sms-xem-dong').focus();
    veAnhLon();
  }

  function dongAnhLon() {
    if (xem.hidden) return;
    dangXemI = -1;
    luotVe++;                          // bỏ kết quả của lượt dựng ảnh còn đang chạy dở
    xem.hidden = true;
    kho.hidden = false;
    view.scrollTop = smsCuonCu;
    if (smsDangXem && document.contains(smsDangXem)) smsDangXem.focus({ preventScroll: true });
    smsDangXem = null;
  }

  oTim.value = smsLoc.q;
  oTim.addEventListener('input', () => { smsLoc.q = oTim.value; apDung(); });

  kho.addEventListener('click', (e) => {
    const chip = e.target.closest('.sms-chip, .sms-tag');
    if (chip) {
      // Bấm lại đúng tag đang chọn (ở thẻ ảnh) thì bỏ lọc; chip "Tất cả" có data-tag rỗng
      const t = chip.dataset.tag || '';
      smsLoc.tag = (chip.classList.contains('sms-tag') && smsLoc.tag === t) ? '' : t;
      apDung();
      return;
    }
    const taiVe = e.target.closest('a.sms-dl');
    if (taiVe) { taiCoSo(e, items[Number(taiVe.closest('.sms-card').dataset.i)], taiVe); return; }
    const thumb = e.target.closest('.sms-thumb');
    if (thumb) moAnhLon(Number(thumb.dataset.i), thumb);
  });

  xem.addEventListener('click', (e) => {
    if (e.target.closest('.sms-xem-dong')) { dongAnhLon(); return; }
    // Bấm vào con số trên ảnh = vào ô nhập. Ô tự bôi đen khi nhận tiêu điểm (xem trên)
    // nên gõ là thay số luôn. Cuộn về đầu để ô nhập không nằm khuất dưới thanh nút dính.
    if (e.target.closest('.sms-xem-diem')) {
      view.scrollTop = 0;
      oSoXem.focus({ preventScroll: true });
      oSoXem.select();
      return;
    }
    const taiVe = e.target.closest('a.sms-xem-dl');
    if (taiVe) taiCoSo(e, items[dangXemI], taiVe);
  });
  xem.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); dongAnhLon(); } });

  apDung();
  view.style.display = 'block';
  view.scrollTop = 0;
}

function showLibraryGroupPreview(items) {
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  let view = document.getElementById('library-view');
  if (!view) {
    view = document.createElement('div');
    view.id = 'library-view';
    view.className = 'library-view';
    dom.canvasContainer.appendChild(view);
  }

  view.classList.remove('is-tall');
  view.classList.add('has-group');

  let html = '<div class="library-view-group">';

  items.forEach(item => {
    const dl = `/api/download?path=${encodeURIComponent(item.path)}`;
    const inlineUrl = dl + '&inline=1';
    const ext = (item.ext || '').toLowerCase();
    const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
    const isPdf = ext === 'pdf';

    let previewHTML;
    if (item.isMultiPage) {
      const coverUrl = `/api/download?path=${encodeURIComponent(item.pages[0])}&inline=1`;
      previewHTML = `
        <div class="library-card-preview">
          <img src="${coverUrl}" alt="${escapeHtml(item.name)}" loading="lazy">
          <div style="position: absolute; top: 12px; right: 12px; background: var(--brand); color: white; padding: 4px 10px; border-radius: var(--r-xs); font-size: 10px; font-weight: 800; letter-spacing: 0.5px; box-shadow: var(--shadow-sm);">${item.pages.length} TRANG</div>
        </div>`;
    } else if (isImg) {
      previewHTML = `
        <div class="library-card-preview">
          <img src="${inlineUrl}" alt="${escapeHtml(item.name)}" loading="lazy">
        </div>`;
    } else if (isPdf) {
      previewHTML = `
        <div class="library-card-preview">
          <div class="library-card-preview-pdf">
            <div class="pdf-icon-wrapper">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div style="font-size: 13px; font-weight: 700; opacity: 0.9;">Tài Liệu PDF</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">Click để tải về xem chi tiết</div>
          </div>
        </div>`;
    } else {
      previewHTML = `
        <div class="library-card-preview">
          <div class="library-thumb-file" style="display: flex; align-items: center; justify-content: center;">${NAV_ICONS.bigFile}</div>
        </div>`;
    }

    html += `
      <div class="library-item-card">
        ${previewHTML}
        <div class="library-card-info">
          <div class="library-card-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name.replace(/\.[^.]+$/, ''))}</div>
          <!-- KHÔNG hiện định dạng + dung lượng ("PDF · 249 KB") — chủ tool gạch bỏ 22/07,
               cùng lý do đã bỏ đuôi file khỏi tiêu đề hôm 21/07: đội sale chỉ cần biết
               "NLG IUL" và bấm Tải về, dung lượng là chi tiết kỹ thuật gây nhiễu. -->
          <a class="library-card-btn" href="${dl}" download>${NAV_ICONS.download} Tải về</a>
        </div>
      </div>
    `;
  });

  html += '</div>';
  view.innerHTML = html;
}

// Open a brochure / name card asset → preview in canvas + download button (no editor panel)
function openLibraryItem(item) {
  hideLibraryPreview();   // xem chú thích ở openLibraryGroup — thoát doc-mode của bảng So sánh
  appState.activeLibraryPath = item.path;
  appState.activeFile = null;
  clearDirty();
  setEditorVisible(false);
  updateHeaderActions();

  // Tên hiển thị KHÔNG kèm đuôi file (.jpg/.pdf…) — chủ tool gạch bỏ 21/07:
  // đội sale đọc "NLG IUL" chứ không cần biết định dạng. Tên file thật giữ nguyên.
  const tenSach = String(item.name).replace(/\.(jpe?g|png|pdf|svg|webp)$/i, '');

  // Đo lường: 1 lượt XEM brochure/tài liệu (kind='view', N2). "Tài liệu:" khớp nhãn download →
  // xếp hạng "chạy nhiều nhất" nhóm gọn. Throttle 15'/tài liệu nằm trong logUsage. Best-effort.
  if (window.TSTAuth && TSTAuth.logUsage) TSTAuth.logUsage('view', 'Tài liệu: ' + tenSach);

  if (dom.activeFileTitle) {
    dom.activeFileTitle.textContent = tenSach;
    dom.activeFileTitle.classList.add('is-active');
  }
  dom.btnSaveTop.disabled = true;

  dom.canvasWrapper.innerHTML = '';

  let view = document.getElementById('library-view');
  if (view) view.classList.remove('has-group', 'is-tall', 'is-wide');

  if (item.isMultiPage) {
    showLibraryMultiPagePreview(item);
  } else {
    showLibraryPreview(item);
  }
  updateStatus(`Đang xem: ${tenSach}`);
}

function showLibraryMultiPagePreview(item) {
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  let view = document.getElementById('library-view');
  if (!view) {
    view = document.createElement('div');
    view.id = 'library-view';
    view.className = 'library-view';
    dom.canvasContainer.appendChild(view);
  }

  view.classList.add('has-group');

  const isPdf = (item.ext || '').toLowerCase() === 'pdf';
  const dl = `/api/download?path=${encodeURIComponent(item.path)}`;

  let html = '<div class="library-view-group" style="padding-bottom: 20px;">';

  item.pages.forEach((pagePath, index) => {
    const inlineUrl = `/api/download?path=${encodeURIComponent(pagePath)}&inline=1`;
    const pageDl = `/api/download?path=${encodeURIComponent(pagePath)}`;
    html += `
      <div class="library-item-card">
        <div class="library-card-preview">
          <img src="${inlineUrl}" alt="Page ${index + 1}" loading="lazy" onload="if(this.naturalWidth > this.naturalHeight) this.closest('.library-item-card').classList.add('is-landscape')">
        </div>
        <div class="library-card-info">
          ${isPdf ? '' : `<a class="btn btn-primary library-card-btn" href="${pageDl}" download>${NAV_ICONS.download} Tải về</a>`}
        </div>
      </div>
    `;
  });

  html += '</div>';

  // Big download bar for the whole brochure
  html += `
    <div class="library-meta" style="margin-top: 10px; margin-bottom: 30px; padding: 0 40px; width: 100%;">
      ${isPdf
        ? `<a class="btn btn-primary library-download" href="${dl}" download style="padding: 12px 40px; font-size: 14px; font-weight: 700;">${NAV_ICONS.download} Tải file PDF trọn bộ</a>`
        : `<button class="btn btn-primary library-download" id="btn-dl-all-pages" style="padding: 12px 40px; font-size: 14px; font-weight: 700;">${NAV_ICONS.download} Tải tất cả ${item.pages.length} trang</button>`}
    </div>
  `;

  view.innerHTML = html;
  view.style.display = 'flex';

  // ⚠️ CÒN TREO (12/08/2026): thuộc tính `onload` gắn `is-landscape` ở trên KHÔNG
  // chạy khi ảnh đã nằm trong bộ đệm — cùng lỗi đã sửa ở showLibraryPreview (xem
  // khiAnhCoKichThuoc). Ở đây CHƯA sửa vì không đo được: ảnh `loading="lazy"` chỉ
  // giải mã khi trình duyệt thật sự dựng khung, mà bàn đo không dựng. Sửa mù trên
  // đường brochure (thứ đội sale dùng nhiều nhất) thì rủi ro hơn là để nguyên.
  // Sửa khi nào mở được tool.html có đăng nhập: đổi sang khiAnhCoKichThuoc rồi đo
  // đúng brochure vừa xem lần thứ hai — trang ngang phải rộng hết hàng, không co
  // về một phần ba.

  // For image (non-PDF) multi-page brochures: download every page on "Tải tất cả"
  if (!isPdf) {
    const btnAll = view.querySelector('#btn-dl-all-pages');
    if (btnAll) {
      btnAll.addEventListener('click', () => {
        item.pages.forEach((pagePath, i) => {
          setTimeout(() => {
            const a = document.createElement('a');
            a.href = `/api/download?path=${encodeURIComponent(pagePath)}`;
            a.download = '';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
          }, i * 400);
        });
        updateStatus(`Đang tải ${item.pages.length} trang...`);
      });
    }
  }
}

function showLibraryPreview(item) {
  if (dom.noSelection) dom.noSelection.style.display = 'none';

  let view = document.getElementById('library-view');
  if (!view) {
    view = document.createElement('div');
    view.id = 'library-view';
    view.className = 'library-view';
    dom.canvasContainer.appendChild(view);
  }

  // Tự dọn chế độ của LƯỢT TRƯỚC ngay tại đây, đừng trông vào hàm gọi. Đo 12/08/2026:
  // xem ảnh ngang rồi bấm sang ảnh dọc thì ảnh dọc vẫn ăn khung rộng, cao 1797px
  // trong khung 719px. Hàm nào BẬT một chế độ thì chính nó phải TẮT được chế độ đó.
  view.classList.remove('is-wide');

  const dl = `/api/download?path=${encodeURIComponent(item.path)}`;
  const inlineUrl = dl + '&inline=1';
  const ext = (item.ext || '').toLowerCase();
  const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';

  let previewHTML;
  if (isImg) {
    // ẢNH NGANG RẤT RỘNG (Application Form 7440x3508) — họ hàng với `is-tall` của SMS,
    // chỉ khác trục. Khung ảnh thường ghim `max-width: min(72%,760px)` + `max-height:
    // 62vh`; ảnh tỉ lệ 2,1:1 bị mốc CHIỀU CAO chặn trước → đo 12/08/2026 chỉ còn
    // 726px bề ngang trong khung rộng 1279px, chữ nhỏ như kiến. Cùng ảnh đó nằm
    // trong lưới nhiều trang lại được `is-landscape` cho rộng 100% (~1150px).
    // Ngưỡng 1,3 (không phải "ngang > dọc") để brochure 4:3 vẫn dùng khung thường.
    previewHTML = `<div class="library-thumb"><img src="${inlineUrl}" alt="${escapeHtml(item.name)}"></div>`;
  } else if (isPdf) {
    previewHTML = `<div class="library-thumb library-thumb-pdf"><iframe src="${inlineUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH" title="preview"></iframe></div>`;
  } else {
    previewHTML = `<div class="library-thumb library-thumb-file">${NAV_ICONS.bigFile}</div>`;
  }

  view.innerHTML = `
    ${previewHTML}
    <div class="library-meta">
      <a class="btn btn-primary library-download" href="${dl}" download>${NAV_ICONS.download} Tải về</a>
    </div>
  `;
  view.style.display = 'flex';

  // Ảnh biết kích thước rồi mới quyết được khung — xem chú thích `.library-view.is-wide`.
  if (isImg) {
    const img = view.querySelector('.library-thumb img');
    if (img) khiAnhCoKichThuoc(img, () => {
      if (img.naturalWidth > img.naturalHeight * 1.3) view.classList.add('is-wide');
    });
  }
}

// ☠️ ẢNH ĐÃ NẰM TRONG BỘ ĐỆM THÌ `onload` KHÔNG BAO GIỜ CHẠY.
// Gắn bằng innerHTML: ảnh đã cache xong ngay lúc trình duyệt đọc thẻ → `complete`
// đã là true trước khi có ai kịp nghe, và sự kiện `load` đã bay mất. Đo 12/08/2026:
// lần vào đầu tiên chạy đúng, bấm lại chính file đó thì khung không đổi. Loại lỗi
// "chỉ sai từ lần thứ hai" nên rất dễ nghiệm thu nhầm là đã xong.
// Ảnh hỏng (naturalWidth = 0 dù complete) thì bỏ qua, đừng đo trên số 0.
function khiAnhCoKichThuoc(img, fn) {
  if (img.complete && img.naturalWidth) { fn(); return; }
  img.addEventListener('load', fn, { once: true });
}

function hideLibraryPreview() {
  const view = document.getElementById('library-view');
  if (view) {
    view.style.display = 'none';
    view.classList.remove('has-group', 'is-tall', 'is-wide');
  }
  // Đây là chỗ DUY NHẤT mọi luồng "mở thứ khác" đều đi qua (loadSvgContent,
  // resetCanvasToWelcome, mở brochure/name card) → tắt luôn khung tài liệu của
  // công cụ So sánh ở đây, khỏi phải nhớ gọi tay ở từng chỗ. (js/sosanh.js)
  if (typeof exitDocMode === 'function') exitDocMode();
  // Bỏ luôn dấu "đang mở" của các mục PHẲNG (Compare, SMS). Cùng lý do: đây là
  // chỗ duy nhất mọi luồng "mở thứ khác" đi qua. Trước đây mở Compare rồi bấm
  // sang một mẫu Proposal thì dòng Compare vẫn sáng như đang mở.
  // ⚠️ Hàm nào tự bật lại dấu đó thì phải bật SAU khi gọi hàm mở của nó
  // (openCompareTable / openSmsAll), không thì bị chính chỗ này xoá đi.
  document.querySelectorAll('.nav-section-flat > .tree-folder-header.is-open')
    .forEach(x => x.classList.remove('is-open'));
  appState.activeLibraryPath = null;
}
