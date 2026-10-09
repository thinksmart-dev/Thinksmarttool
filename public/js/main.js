/**
 * THINKSMART TOOL — MAIN (khởi động app)
 * Ghép các công cụ lại: cây điều hướng trái (mỗi tool tự render section của mình),
 * gắn toàn bộ sự kiện chung (zoom/pan, phím tắt, nút lưu/xuất), và chạy app.
 *
 * Thêm công cụ mới: tạo js/<tool>.js với hàm render<Tool>NavSection(...) riêng,
 * rồi gọi nó trong renderFileTree() bên dưới + thêm <script> vào index.html.
 */

// --- CÂY ĐIỀU HƯỚNG TRÁI: mỗi tool một section ---
function renderFileTree() {
  const q = (appState.searchQuery || '').toLowerCase().trim();
  dom.treeContainer.innerHTML = '';
  let total = 0;

  // Split matched SVGs into proposals vs name cards
  const matched = appState.svgsList.filter(f => !q || f.name.toLowerCase().includes(q) || (f.path || '').toLowerCase().includes(q));
  const nameCards = matched.filter(isNameCardFile);
  const proposals = matched.filter(f => !isNameCardFile(f));

  // NẤC PHÁT HÀNH (10/08/2026 — xem CLAUDE.md mục 2b-bis): mục chưa tới nấc của
  // người đang đăng nhập thì KHÔNG vẽ ra chút nào. Khác hẳn `khoaMuc` bên dưới —
  // khoá là "vẫn thấy mục, nhưng đang cập nhật"; chưa tới nấc là "chưa có gì để thấy".
  const thay = ma => (typeof duocThayMuc === 'function' ? duocThayMuc(ma) : true);

  // ---------- PROPOSAL / BÁO GIÁ (js/proposal.js) ----------
  if (thay('proposal')) total += renderProposalNavSection(dom.treeContainer, proposals, q);

  // ---------- BROCHURE (js/brochure.js) ----------
  // 3 mục dưới đây khoá theo cùng một kiểu: đang khoá thì thay danh sách bằng một
  // khối giải thích (makeKhoiKhoa trong proposal.js) — KHÔNG ẩn sạch, vì ẩn thì sale
  // tưởng tool hỏng hoặc mình bị mất quyền, lại nhắn hỏi admin.
  if (!thay('brochure')) { /* chưa tới nấc — không vẽ */ }
  else if (appState.khoaMuc.brochure) {
    dom.treeContainer.appendChild(makeKhoiKhoa('Brochure / Tài liệu', NAV_ICONS.brochure, 'brochure'));
  } else {
    total += renderLibrarySection(dom.treeContainer, 'Brochure / Tài liệu', NAV_ICONS.brochure, appState.library.brochure, q);
  }

  // ---------- APPLICATION FORM ----------
  if (!thay('appform')) { /* chưa tới nấc */ }
  else if (appState.khoaMuc.appform) {
    dom.treeContainer.appendChild(makeKhoiKhoa('Application Form / Biểu mẫu', NAV_ICONS.appform, 'appform'));
  } else {
    total += renderLibrarySection(dom.treeContainer, 'Application Form / Biểu mẫu', NAV_ICONS.appform, appState.library.appform, q);
  }

  // ---------- NAME CARD (js/namecard.js) ----------
  if (!thay('namecard')) { /* chưa tới nấc */ }
  else if (appState.khoaMuc.namecard) {
    dom.treeContainer.appendChild(makeKhoiKhoa('Name Card / Danh thiếp', NAV_ICONS.namecard, 'namecard'));
  } else {
    total += renderNameCardNavSection(dom.treeContainer, nameCards, q);
  }

  // ---------- SO SÁNH QUYỀN LỢI CÁC HÃNG (js/brochure.js) ----------
  if (!thay('compare')) { /* chưa tới nấc */ }
  else if (appState.khoaMuc.compare) {
    dom.treeContainer.appendChild(makeKhoiKhoa('Compare / So sánh quyền lợi', NAV_ICONS.compare, 'compare'));
  } else {
    total += renderCompareNavSection(dom.treeContainer, q);
  }

  // ---------- SMS / TIN NHẮN MẪU (js/brochure.js — 10/08/2026) ----------
  // MỘT DÒNG PHẲNG như Compare, KHÔNG menu phụ (chủ tool yêu cầu). Bấm là mở hết
  // ảnh tin nhắn trong một khung cuộn dọc — ảnh rất cao (1080x7082) nên không
  // dùng được khung ảnh brochure. Chi tiết ở showSmsGallery.
  // File nằm ở thư mục `SMS/` NGAY GỐC dự án (không phải 2-Templates/ — chỗ đó
  // bị gitignore, bỏ vào là mất trên bản live).
  if (!thay('sms')) { /* chưa tới nấc */ }
  else if (appState.khoaMuc.sms) {
    dom.treeContainer.appendChild(makeKhoiKhoa('SMS / Tin nhắn mẫu', NAV_ICONS.sms, 'sms'));
  } else {
    total += renderSmsNavSection(dom.treeContainer, q);
  }

  // ---------- TÍNH TUỔI BẢO HIỂM (js/tinhtuoi.js — 10/08/2026) ----------
  // ĐANG Ở NẤC 1: chỉ Super Admin thấy (cột `hien_cho` = 'super' trong bảng khoa_muc).
  // Đưa về từ bản chủ tool làm trên forum. Lên nấc bằng tab "Khoá mục", KHÔNG sửa code.
  if (!thay('tinhtuoi')) { /* chưa tới nấc */ }
  else if (appState.khoaMuc.tinhtuoi) {
    dom.treeContainer.appendChild(makeKhoiKhoa('Age / Tính tuổi', NAV_ICONS.tinhtuoi, 'tinhtuoi'));
  } else {
    total += renderTinhTuoiNavSection(dom.treeContainer, q);
  }

  // ---------- TÍNH PHÍ BẢO HIỂM (js/tinhphi.js — 10/08/2026) ----------
  // ĐANG Ở NẤC 1: chỉ Super Admin thấy. Bảng tra phí Term Life NLG, dữ liệu lấy từ
  // Google Sheet do sếp chủ tool làm — xem đầu js/tinhphi.js.
  if (!thay('tinhphi')) { /* chưa tới nấc */ }
  else if (appState.khoaMuc.tinhphi) {
    dom.treeContainer.appendChild(makeKhoiKhoa('Quote / Tính phí', NAV_ICONS.tinhphi, 'tinhphi'));
  } else {
    total += renderTinhPhiNavSection(dom.treeContainer, q);
  }

  // Cây vẽ ra ở trạng thái ĐÓNG (xem makeCollapsibleFolder). Hai ngoại lệ:
  //  (1) đang gõ ô tìm → mở hết, không thì tìm ra kết quả mà nó nằm trong nhóm đóng;
  //  (2) đang mở một file → bung ĐÚNG nhánh chứa nó (kể cả nhóm hãng lồng bên trong),
  //      không thì vừa "Tạo bản cho khách" xong, cây vẽ lại là file mới biến mất.
  if (q) {
    dom.treeContainer.querySelectorAll('.tree-folder').forEach(f => f.classList.add('open'));
  } else {
    // Dò theo DẤU `.active` TRÊN CÂY, không theo `appState.activeFile` — mục thư
    // viện (brochure/name card) đánh dấu bằng `activeLibraryPath`, hỏi sai biến là
    // nhánh đó không bung mà chẳng có lỗi nào.
    const item = dom.treeContainer.querySelector('.tree-file-item.active');
    let cha = item && item.closest('.tree-folder');
    while (cha) { cha.classList.add('open'); cha = cha.parentElement.closest('.tree-folder'); }
  }

  dom.fileCount.textContent = total;
}

function showErrorState(message) {
  dom.treeContainer.innerHTML = `
    <div class="error-state">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="var(--color-danger)" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>Có lỗi xảy ra: ${message}</span>
      <button class="btn btn-secondary btn-sm" onclick="fetchSvgsList()">Thử lại</button>
    </div>
  `;
}

// --- UTILITIES & SYSTEM EVENT BINDINGS ---
function initEventListeners() {
  // Right editor panel starts hidden — only shown when a proposal is opened
  setEditorVisible(false);

  // Search & Filters
  if (dom.searchInput) {
    dom.searchInput.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value;
      renderFileTree();
    });
  }

  // Text Editor Live Search
  const textSearchInput = document.getElementById('text-search-input');
  if (textSearchInput) {
    textSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const groups = dom.textsList.querySelectorAll('.text-group');

      groups.forEach(group => {
        const items = group.querySelectorAll('.text-edit-block');
        let hasMatch = false;

        items.forEach(item => {
          const textarea = item.querySelector('.text-input-field');
          const textValue = textarea ? textarea.value.toLowerCase() : '';
          const id = item.querySelector('.text-id') ? item.querySelector('.text-id').textContent.toLowerCase() : '';

          if (textValue.includes(query) || id.includes(query)) {
            item.style.display = 'flex';
            hasMatch = true;
          } else {
            item.style.display = 'none';
          }
        });

        if (hasMatch || query === '') {
          group.style.display = 'block';
        } else {
          group.style.display = 'none';
        }
      });
    });
  }

  if (dom.categoryPills) {
    dom.categoryPills.forEach(pill => {
      pill.addEventListener('click', () => {
        dom.categoryPills.forEach(el => el.classList.remove('active'));
        pill.classList.add('active');

        appState.selectedCategory = pill.dataset.category;
        renderFileTree();
      });
    });
  }

  // Canvas Control Bar Actions
  if (dom.btnZoomIn) dom.btnZoomIn.addEventListener('click', () => handleZoom(ZOOM_SPEED, window.innerWidth / 2, window.innerHeight / 2));
  if (dom.btnZoomOut) dom.btnZoomOut.addEventListener('click', () => handleZoom(-ZOOM_SPEED, window.innerWidth / 2, window.innerHeight / 2));
  if (dom.btnZoomFit) dom.btnZoomFit.addEventListener('click', zoomToFit);

  if (dom.btnToggleGrid) {
    dom.btnToggleGrid.addEventListener('click', () => {
      dom.btnToggleGrid.classList.toggle('active');
      dom.canvasContainer.classList.toggle('grid-backdrop');
    });
  }

  // Canvas Background Presets
  if (dom.presetBtns) {
    dom.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.presetBtns.forEach(el => el.classList.remove('active'));
        btn.classList.add('active');

        const bgColor = btn.dataset.bg;
        appState.canvasBgColor = bgColor;

        const renderBox = document.getElementById('svg-render-box');
        if (renderBox) {
          renderBox.style.backgroundColor = bgColor;
        }
      });
    });
  }

  // Zoom & Pan Mouse Wheel events
  if (dom.canvasContainer) {
    dom.canvasContainer.addEventListener('wheel', (e) => {
      // ☠️ ĐỪNG NUỐT WHEEL Ở VÙNG CHỈ ĐỌC (chủ tool 31/07: "trang này anh scroll không
      // được"). Thư viện Brochure (#library-view) và Bảng so sánh (#doc-viewport) chỉ
      // để ĐỌC — không có gì để zoom — nhưng chúng nằm trong .canvas-container nên
      // `preventDefault()` ở đây chặn luôn cuộn của trình duyệt.
      // Cảnh báo này đã ghi sẵn trong sosanh.js từ 22/07 ("main.js nuốt wheel để đổi
      // thành zoom → LĂN CHUỘT KHÔNG CUỘN ĐƯỢC") mà vẫn để sót đúng chỗ Brochure.
      if (e.target.closest('#library-view, #doc-viewport')) return;
      e.preventDefault();
      // Delta direction mapping
      const delta = -e.deltaY * 0.0015;
      handleZoom(delta, e.clientX, e.clientY);
    }, { passive: false });

    // Panning drag-drop mouse event actions
    dom.canvasContainer.addEventListener('mousedown', (e) => {
      // Space key active or middle click / right click
      if (appState.isSpacePressed || e.button === 1 || e.button === 2) {
        e.preventDefault();
        appState.isPanning = true;
        appState.startX = e.clientX - appState.panX;
        appState.startY = e.clientY - appState.panY;
      }
    });
  }

  window.addEventListener('mousemove', (e) => {
    if (appState.isPanning) {
      appState.panX = e.clientX - appState.startX;
      appState.panY = e.clientY - appState.startY;
      applyTransform();
    }
  });

  window.addEventListener('mouseup', () => {
    appState.isPanning = false;
  });

  // Prevent context menu default popup on right click pan
  if (dom.canvasContainer) {
    dom.canvasContainer.addEventListener('contextmenu', (e) => {
      if (appState.isSpacePressed) {
        e.preventDefault();
      }
    });
  }

  // Handle space keydown mapping for Figma-like spacebar drag
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      // Avoid browser window auto-scroll down on space
      e.preventDefault();
      appState.isSpacePressed = true;
      if (dom.canvasContainer) dom.canvasContainer.style.cursor = 'grab';
      updateStatus('Mẹo: Nhấn kéo chuột để di chuyển canvas');
    }

    // Zoom Hotkeys: Ctrl + / Ctrl - / Ctrl 0
    if (e.ctrlKey && e.key === '=') {
      e.preventDefault();
      if (dom.btnZoomIn) dom.btnZoomIn.click();
    }
    if (e.ctrlKey && e.key === '-') {
      e.preventDefault();
      if (dom.btnZoomOut) dom.btnZoomOut.click();
    }
    if (e.shiftKey && e.key === '1') {
      e.preventDefault();
      if (dom.btnZoomFit) dom.btnZoomFit.click();
    }
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (dom.btnSaveTop && !dom.btnSaveTop.disabled) saveSvgToServer();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      appState.isSpacePressed = false;
      dom.canvasContainer.style.cursor = '';
    }
  });

  // Save button
  if (dom.btnSaveTop) dom.btnSaveTop.addEventListener('click', saveSvgToServer);

  // Inspector export buttons (JPEG + PDF only)
  if (dom.btnExportJpeg) dom.btnExportJpeg.addEventListener('click', exportToJpeg);
  if (dom.btnExportPdf) dom.btnExportPdf.addEventListener('click', exportToPdf);

  // Đo lường "tải về" cho BROCHURE — uỷ quyền trong #library-view (nút tải nằm ở đó,
  // dựng động nên phải delegate). Chỉ trong #library-view nên KHÔNG bắt nhầm link tạm
  // của export JPEG/PDF (link đó gắn vào <body>). Xem ghiTaiXuong() trong core.js.
  document.addEventListener('click', (e) => {
    const el = e.target.closest('#library-view a[download], #library-view .library-download, #library-view .library-card-btn');
    if (el && typeof ghiTaiXuong === 'function') {
      let nhan = 'Tài liệu';
      const href = el.getAttribute('href') || '';
      const m = href.match(/[?&]path=([^&]+)/);
      if (m) { try { nhan = 'Tài liệu: ' + decodeURIComponent(m[1]).split('/').pop(); } catch (e2) {} }
      ghiTaiXuong(nhan);
    }
  });

  // New proposal button
  if (dom.btnNewProposal) dom.btnNewProposal.addEventListener('click', createNewProposal);

  // Click-to-Edit Visual Inspector mapping
  if (dom.canvasWrapper) {
    dom.canvasWrapper.addEventListener('click', (e) => {
      const target = e.target.closest('.svg-editable-text');
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();

      // The tag may sit on the <text> block (data-editor-target) or on the id-carrying tspan
      const editorId = target.getAttribute('data-editor-target') || target.getAttribute('data-editor-id');
      if (!editorId) return;

      // Find the corresponding textarea in the right sidebar
      const textarea = document.querySelector(`.text-input-field[data-editor-id="${editorId}"]`);
      if (!textarea) return;

      // Mobile: tapping text on the canvas opens the editor bottom-sheet first
      if (isMobileViewport()) {
        document.body.classList.remove('nav-open');
        document.body.classList.add('editor-open');
      }

      // Find the parent group section (.text-group) and expand it if collapsed
      const groupItems = textarea.closest('.text-group-items');
      if (groupItems && groupItems.style.display === 'none') {
        // Find the group title and simulate a click to expand
        const groupEl = groupItems.closest('.text-group');
        const groupTitle = groupEl ? groupEl.querySelector('.text-group-title') : null;
        if (groupTitle) groupTitle.click();
      }

      // Scroll the textarea into view smoothly
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Focus the field; select its text when it's a text input (dropdowns have no .select())
      textarea.focus();
      if (typeof textarea.select === 'function') textarea.select();

      // Briefly highlight the edit block to give visual feedback
      const editBlock = textarea.closest('.text-edit-block');
      if (editBlock) {
        editBlock.classList.add('highlight-flash');
        setTimeout(() => {
          editBlock.classList.remove('highlight-flash');
        }, 1500);
      }
    });
  }
}

// --- MOBILE UI: drawer trái (danh sách file) + bottom-sheet phải (sửa chữ) ---
const isMobileViewport = () => window.matchMedia('(max-width: 900px)').matches;

function initMobileUI() {
  const btnNav = document.getElementById('btn-mobile-nav');
  const btnEditor = document.getElementById('btn-mobile-editor');
  const btnEditorClose = document.getElementById('btn-editor-close');
  const backdrop = document.getElementById('mobile-backdrop');

  const closeAll = () => {
    document.body.classList.remove('nav-open', 'editor-open', 'export-open');
    capNhatThanhDay();
  };

  if (btnNav) btnNav.addEventListener('click', () => {
    document.body.classList.remove('editor-open', 'export-open');
    document.body.classList.toggle('nav-open');
    capNhatThanhDay();
  });
  if (btnEditor) btnEditor.addEventListener('click', () => {
    document.body.classList.remove('nav-open', 'export-open');
    document.body.classList.toggle('editor-open');
    capNhatThanhDay();
  });
  if (btnEditorClose) btnEditorClose.addEventListener('click', closeAll);
  if (backdrop) backdrop.addEventListener('click', closeAll);

  // Chọn một file trong drawer → tự đóng drawer để lộ canvas
  if (dom.treeContainer) {
    dom.treeContainer.addEventListener('click', (e) => {
      if (isMobileViewport() && e.target.closest('.tree-file-item')) {
        document.body.classList.remove('nav-open');
      }
    });
  }

  initThanhDay();
}

// --- THANH THAO TÁC ĐÁY (mobile) -------------------------------------------
// 4 nút này KHÔNG chứa logic riêng: chúng bấm hộ các nút thật đã có sẵn. Nhờ vậy
// dirty-tracking, xác nhận ghi đè, nạp jsPDF lúc cần… chỉ tồn tại MỘT bản.
// (Bài học: hai bản sao của cùng một luồng thì sớm muộn cũng lệch nhau.)
function initThanhDay() {
  const dock = document.getElementById('tool-dock');
  if (!dock) return;

  const bamHo = (id) => {
    const that = document.getElementById(id);
    if (that && !that.disabled) that.click();
  };

  const dTree = document.getElementById('dock-tree');
  const dEdit = document.getElementById('dock-edit');
  const dSave = document.getElementById('dock-save');
  const dExport = document.getElementById('dock-export');

  if (dTree) dTree.addEventListener('click', () => bamHo('btn-mobile-nav'));
  if (dEdit) dEdit.addEventListener('click', () => {
    // Chưa mở bản vẽ nào thì nút này làm việc của "Tạo bản cho khách" —
    // xem nhãn động trong capNhatThanhDay().
    if (document.body.classList.contains('no-editor')) bamHo('btn-new-proposal');
    else bamHo('btn-mobile-editor');
  });
  if (dSave) dSave.addEventListener('click', () => bamHo('btn-save-top'));

  // "Xuất" mở bảng chọn định dạng (JPEG / PDF) ngay trên thanh đáy
  const sheet = document.getElementById('dock-export-sheet');
  const dongBangXuat = () => {
    document.body.classList.remove('export-open');
    if (sheet) sheet.setAttribute('aria-hidden', 'true');
    if (dExport) dExport.setAttribute('aria-expanded', 'false');
  };
  if (dExport) dExport.addEventListener('click', () => {
    const dangMo = document.body.classList.toggle('export-open');
    if (sheet) sheet.setAttribute('aria-hidden', String(!dangMo));
    dExport.setAttribute('aria-expanded', String(dangMo));
  });
  const bindXuat = (id, dich) => {
    const b = document.getElementById(id);
    if (b) b.addEventListener('click', () => { dongBangXuat(); bamHo(dich); });
  };
  bindXuat('dock-export-jpeg', 'btn-export-jpeg');
  bindXuat('dock-export-pdf', 'btn-export-pdf');
  const huy = document.getElementById('dock-export-cancel');
  if (huy) huy.addEventListener('click', dongBangXuat);

  // Bấm ra ngoài / bấm Esc thì đóng bảng chọn định dạng
  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('export-open')) return;
    if (e.target.closest('#dock-export-sheet') || e.target.closest('#dock-export')) return;
    dongBangXuat();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('export-open')) dongBangXuat();
  });

  capNhatThanhDay();
}

// Đồng bộ thanh đáy theo ngữ cảnh. Gọi từ updateHeaderActions() (core.js) — cùng
// choke point với nút header, nên không cần MutationObserver.
// Nguồn sự thật là TRẠNG THÁI CỦA CÁC NÚT THẬT, không phải đoán lại từ appState:
// đoán lại là hai nơi cùng suy luận một việc, kiểu gì cũng có ngày lệch nhau.
function capNhatThanhDay() {
  const dock = document.getElementById('tool-dock');
  if (!dock) return;

  const dEdit = document.getElementById('dock-edit');
  const dSave = document.getElementById('dock-save');
  const dExport = document.getElementById('dock-export');
  const dTree = document.getElementById('dock-tree');

  const btnSave = document.getElementById('btn-save-top');
  const btnJpeg = document.getElementById('btn-export-jpeg');

  const coBanVe = !document.body.classList.contains('no-editor');
  // Nút Lưu ở header bị ẩn khi đang mở MẪU GỐC (mẫu gốc không lưu đè được)
  const luuDuoc = !!btnSave && btnSave.style.display !== 'none' && !btnSave.disabled;
  const xuatDuoc = !!btnJpeg && !btnJpeg.disabled;

  // Nhãn nút giữa đổi theo việc đang cần làm: chưa mở gì thì việc tiếp theo là
  // TẠO BẢN, mở rồi thì là ĐIỀN. Đặt tên nút trùng tên bước của workflow
  // (Chọn mẫu → Điền → Lưu nháp → Xuất) như màn chào đang in.
  if (dEdit) {
    const nhan = dEdit.querySelector('span');
    if (nhan) nhan.textContent = coBanVe ? 'Điền thông tin' : 'Tạo bản mới';
    // LUÔN bấm được. ⚠️ Đừng suy ra trạng thái từ `btnNew.style.display`: nút
    // "Tạo bản cho khách" ở header bị ẩn khi chưa mở file vì lý do THỊ GIÁC
    // (màn chào đã có nút y hệt, hai nút giống nhau cùng lúc gây phân vân —
    // chủ tool hỏi 21/07), chứ không phải vì việc đó không làm được. Lần ráp
    // đầu tôi đọc display rồi tắt nút → thanh đáy xám ngắt ngay màn chào.
    dEdit.disabled = false;
    dEdit.setAttribute('aria-current', String(document.body.classList.contains('editor-open')));
  }
  if (dTree) dTree.setAttribute('aria-current', String(document.body.classList.contains('nav-open')));
  if (dSave) dSave.disabled = !luuDuoc;
  if (dExport) dExport.disabled = !xuatDuoc;

  // Bảng chọn định dạng không được sống sót khi bản vẽ đã đóng
  if (!xuatDuoc && document.body.classList.contains('export-open')) {
    document.body.classList.remove('export-open');
    const sheet = document.getElementById('dock-export-sheet');
    if (sheet) sheet.setAttribute('aria-hidden', 'true');
    if (dExport) dExport.setAttribute('aria-expanded', 'false');
  }

  // MỘT primary duy nhất, gán ĐỘNG (quy tắc 44 sổ bài học): việc cần làm nhất
  // là Điền/Tạo khi nút đó dùng được, còn không thì là Mẫu.
  const cta = (dEdit && !dEdit.disabled) ? dEdit : dTree;
  [dTree, dEdit, dSave, dExport].forEach((b) => { if (b) b.classList.remove('dock-cta'); });
  if (cta) cta.classList.add('dock-cta');
}

// --- TOUCH GESTURES trên canvas: 1 ngón kéo = pan, 2 ngón chụm = zoom ---
function initTouchGestures() {
  const cc = dom.canvasContainer;
  if (!cc) return;

  let mode = null; // 'pan' | 'pinch'
  let lastX = 0, lastY = 0, lastDist = 0;

  const touchDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  cc.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      mode = 'pan';
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    } else if (e.touches.length >= 2) {
      mode = 'pinch';
      lastDist = touchDist(e.touches);
    }
  }, { passive: true });

  cc.addEventListener('touchmove', (e) => {
    if (mode === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      appState.panX += dx;
      appState.panY += dy;
      applyTransform();
      e.preventDefault();
    } else if (mode === 'pinch' && e.touches.length >= 2) {
      const dist = touchDist(e.touches);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (lastDist > 0 && dist > 0) {
        handleZoom(dist / lastDist - 1, midX, midY); // zoom quanh trung điểm 2 ngón
      }
      lastDist = dist;
      e.preventDefault();
    }
  }, { passive: false });

  const endTouch = (e) => {
    if (e.touches.length === 0) {
      mode = null;
    } else if (e.touches.length === 1) {
      mode = 'pan';
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  };
  cc.addEventListener('touchend', endTouch);
  cc.addEventListener('touchcancel', endTouch);
}

// --- NÚT "CÔNG CỤ" Ở THANH TRÁI: VỀ MÀN TRỐNG, ĐÓNG HẾT DROPDOWN (10/08/2026) ---
// Chủ tool muốn bấm cờ lê là quay về trạng thái sạch: cây thu về đúng 7 dòng,
// bên phải trống chờ chọn.
// ☠️ Nó là <a href="/tool">, mà mình ĐANG ở /tool → tải lại nguyên trang: chớp
// trắng, nạp lại toàn bộ bảng phí, và NHÁP CHƯA LƯU thì trình duyệt phải chặn
// bằng hộp thoại xấu xí của beforeunload. Xử lý tại chỗ thì hỏi được bằng hộp
// thoại của tool, và tức thì.
// Chỉ chặn khi ĐÃ ở /tool — ở trang khác thì cứ để nó điều hướng bình thường.
function ganNutCongCu() {
  const a = document.querySelector('.sidebar-nav a[href="/tool"]');
  // Chấp nhận cả `/tool` (đường dẫn thật, cả local lẫn Vercel) lẫn `/tool.html`
  // — mở thẳng file thì pathname là dạng thứ hai, và đó là lúc dễ quên nhất.
  const p = location.pathname.replace(/\/$/, '');
  if (!a || (p !== '/tool' && p !== '/tool.html')) return;
  a.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!(await confirmLeaveUnsaved())) return;
    // Đóng mọi dropdown đang xổ (Proposal / Brochure / Name Card và các nhóm hãng
    // lồng bên trong), và bỏ dấu "đang mở" của các mục phẳng.
    document.querySelectorAll('.tree-folder.open').forEach(f => f.classList.remove('open'));
    document.querySelectorAll('.tree-folder-header.is-open').forEach(h => h.classList.remove('is-open'));
    document.querySelectorAll('.tree-file-item.active').forEach(x => x.classList.remove('active'));
    resetCanvasToWelcome();   // gọi sẵn hideLibraryPreview + thoát doc-mode
    updateStatus('Chọn một mục ở cột trái để bắt đầu');
  });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  initMobileUI();
  initTouchGestures();
  updateHeaderActions();
  ganNutCongCu();
  fetchSvgsList();
});

// Đóng tab / tải lại khi bản khách còn thay đổi chưa Lưu Nháp → trình duyệt hỏi xác nhận
window.addEventListener('beforeunload', (e) => {
  if (appState.isDirty && appState.activeFile && !isMasterFile(appState.activeFile)) {
    e.preventDefault();
    e.returnValue = '';
  }
});
