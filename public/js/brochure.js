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
        <img class="tall-doc-img sms-xem-img" alt="">
      </div>
    </div>`;

  const oTim = view.querySelector('#sms-tim');
  const kho = view.querySelector('.sms-kho');
  const xem = view.querySelector('.sms-xem');

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
    img.src = dl + '&inline=1';
    img.alt = it.tieuDe;
    smsDangXem = nut || null;
    smsCuonCu = view.scrollTop;
    kho.hidden = true;
    xem.hidden = false;
    view.scrollTop = 0;
    xem.querySelector('.sms-xem-dong').focus();
  }

  function dongAnhLon() {
    if (xem.hidden) return;
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
    const thumb = e.target.closest('.sms-thumb');
    if (thumb) moAnhLon(Number(thumb.dataset.i), thumb);
  });

  xem.addEventListener('click', (e) => { if (e.target.closest('.sms-xem-dong')) dongAnhLon(); });
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
