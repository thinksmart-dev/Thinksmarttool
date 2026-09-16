// ============================================================================
// PORTAL — QUẢN LÝ THÀNH VIÊN (Super Admin / Admin)
// 3 role: super_admin > admin > user. 4 trạng thái: pending/active/suspended/deleted.
// Bảo mật THẬT ở DB (RLS + trigger enforce_member_update); UI dưới đây chỉ ẩn/hiện
// nút cho khớp — không thay thế cho tầng chặn database.
//   • Super Admin: duyệt, sửa hồ sơ, cấp/gỡ quyền, tạm khoá, xoá — trên MỌI người.
//   • Admin (manager): duyệt, sửa hồ sơ, tạm khoá, XOÁ — CHỈ trên Nhân viên (user).
//     Không đụng được Admin khác, không đụng Super Admin, không cấp/gỡ quyền.
// (31/07/2026) Admin được quyền xoá — chủ tool: "cho các manager chủ động xoá nhân
// viên của mình". Xoá + sửa hồ sơ đi qua /api/admin/* (service_role) chứ không update
// thẳng Supabase, vì trigger DB vẫn giữ luật cũ làm hàng rào cuối; server kiểm bậc thang.
// ============================================================================
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  let sb = null;
  let me = null; // hồ sơ người đang đăng nhập

  const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', user: 'Nhân viên' };

  // Phòng ban CỐ ĐỊNH (chủ tool chốt 21/07/2026) — thay ô nhập tự do window.prompt.
  // Thêm/bớt phòng ban thì sửa đúng mảng này, không rải chuỗi ra chỗ khác.
  const PHONG_BAN = ['Sale', 'Agent', 'MKT', 'CS', 'Admin'];

  // Quyền được phép TẠO qua form Thêm tài khoản (KHÔNG tạo super_admin qua UI).
  // Server cũng kiểm lại theo ROLE_TAO_HOP_LE — đây chỉ là danh sách cho dropdown.
  const QUYEN_TAO_MOI = ['user', 'admin'];

  // Danh sách người đang được tick chọn (id). Giữ nguyên qua mỗi lần load lại
  // để bấm một thao tác hàng loạt xong không mất hết lựa chọn còn dở.
  const dangChon = new Set();
  let danhSach = [];   // hồ sơ SAU khi lọc — mọi thao tác hàng loạt chạy trên đây
  let toanBo  = [];    // hồ sơ gốc, chưa lọc — dùng để đếm theo phòng ban
  let locPhongBan = null;  // null = không lọc
  // Lọc theo quyền — chủ tool 22/07 chỉ cần DUY NHẤT "Admin". null = không lọc.
  // GỘP CẢ `super_admin`: người đó có quyền cao hơn admin, hỏi "ai đang có quyền
  // quản trị" mà bỏ sót họ là sai. Con số trên nút vì vậy đếm cả hai.
  let locQuyen = null;
  const QUYEN_QUAN_TRI = ['admin', 'super_admin'];
  let timKiem = '';        // chuỗi tìm kiếm ĐÃ BỎ DẤU, rỗng = không tìm
  let usageLoaded = false;  // tab Đo lường đã nạp lần đầu chưa (nạp lười khi mở tab)
  let usageEvents = [];     // sự kiện 90 ngày gần nhất (nạp 1 lần, lọc khoảng ở client)
  let khoangFrom = null;    // khoảng ngày đang xem (biểu đồ + bảng) — mặc định 14 ngày
  let khoangTo = null;

  // --- PHÂN TRANG (22/07: chủ tool "phải scroll", xin chuyển sang dạng lật trang) ---
  // 12 hàng/trang: hàng cao 54px → 12×54 ≈ 650px, vừa một màn hình cùng tiêu đề và
  // thanh công cụ mà không phải cuộn. Đổi số này là đổi luôn cảm giác dùng, đừng
  // tăng bừa lên 20-30 rồi lại phải cuộn — mất đúng thứ vừa sửa.
  const MOI_TRANG = 12;
  const trang = { pending: 1, active: 1, suspended: 1 };
  // Dữ liệu TỪNG NHÓM sau khi lọc — giữ NGUYÊN VẸN, không cắt theo trang.
  // Ô "chọn tất cả" và mọi thao tác hàng loạt đọc từ đây, nên chúng vẫn tác động lên
  // CẢ NHÓM chứ không chỉ trang đang xem (xem ghi chú ở onPickChange).
  const nhom = { pending: [], active: [], suspended: [] };

  // Bỏ dấu tiếng Việt để gõ "duong" vẫn ra "Dương". Sale gõ nhanh, ít khi bỏ dấu
  // đúng, và tên trong danh sách thì luôn có dấu → không bỏ dấu là tìm gần như
  // không ra ai. `đ/Đ` phải xử riêng vì NFD không tách được nó.
  function khongDau(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase().trim();
  }

  // ---- Tiện ích ---------------------------------------------------------------
  function initial(name) {
    const s = (name || '').trim();
    return s ? s.charAt(0).toUpperCase() : '?';
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- Ô kết quả trong hộp Thêm / Sửa ----------------------------------------
  // ☠️ BẪY (chủ tool bắt được 31/07/2026: "sao em làm xấu thế"): `.notice` là FLEX
  // container. Nhét thẳng chuỗi có <b> vào innerHTML thì MỖI đoạn chữ và mỗi thẻ
  // thành MỘT flex item riêng → 5 cột hẹp, chữ rơi dọc từng từ. Mọi .notice trong
  // HTML đều viết đúng 2 con: <span> icon + <div> nội dung — hàm này ép đúng khuôn đó.
  // Sửa nội dung ô kết quả thì LUÔN đi qua đây, đừng gán innerHTML trực tiếp.
  function veKetQua(el, kieu, noiDung) {
    const icon = kieu === 'error' ? '⚠️' : (kieu === 'ok' ? '✅' : '💡');
    el.className = 'notice ' + (kieu === 'error' ? 'error' : 'info');
    el.style.display = '';
    el.innerHTML = '<span>' + icon + '</span><div>' + noiDung + '</div>';
  }

  // Khối "thông tin đăng nhập" — nhãn trái, giá trị phải, để admin đọc và gửi đi.
  function theCred(hang) {
    return '<div class="cred-box">' + hang.map(function (h) {
      return '<div><span>' + esc(h[0]) + '</span><code>' + esc(h[1]) + '</code></div>';
    }).join('') + '</div>';
  }

  // Người đang đăng nhập có được thao tác lên hàng `p` không?
  //   super_admin: mọi người (trừ chính mình). admin: chỉ 'user' (trừ chính mình).
  function canManage(p) {
    if (p.id === me.id) return false;
    if (me.role === 'super_admin') return true;
    if (me.role === 'admin') return p.role === 'user';
    return false;
  }

  // ---- Dựng nút thao tác: MỘT hành động chính + menu "⋯" ---------------------
  // Trước đây bày tối đa 4 nút cạnh nhau, trộn 3 kiểu (nút viền, chữ đỏ, nút đặc)
  // → rối mắt và cột bị kéo rộng (chủ tool 21/07). Giờ hiện việc hay dùng nhất
  // theo trạng thái, phần còn lại gom vào menu.
  function actionsFor(p) {
    if (p.id === me.id) return '<span class="m-self">Bạn</span>';

    const id = p.id;
    let chinh = '';          // hành động chính, luôn hiện
    const menu = [];         // các mục trong menu "⋯"

    // Duyệt / sửa / khoá / xoá — theo canManage (super_admin: mọi người; admin: chỉ 'user').
    // Chủ tool 31/07: admin (manager) chủ động XOÁ được nhân viên của mình — trước đó
    // xoá là đặc quyền riêng của super_admin.
    if (canManage(p)) {
      if (p.status === 'pending') {
        chinh = '<button class="btn btn-primary btn-sm" data-act="approve" data-id="' + id + '">Duyệt</button>';
      } else if (p.status === 'suspended') {
        chinh = '<button class="btn btn-primary btn-sm" data-act="reactivate" data-id="' + id + '">Mở khoá</button>';
      } else if (p.status === 'active') {
        chinh = '<button class="btn btn-secondary btn-sm" data-act="edit" data-id="' + id + '">Sửa</button>';
      }

      // Một cửa "Sửa tài khoản" thay cho 4 mục rải rác (phòng ban / đặt-bỏ Admin /
      // đổi mật khẩu) — chủ tool 31/07 "gom vào chung một hộp".
      // LUÔN có trong menu, kể cả khi nút "Sửa" đã hiện sẵn ngoài hàng (chủ tool
      // 31/07: "ở nút 3 chấm đang bị thiếu"). Mở menu ra là thấy ĐỦ việc làm được
      // với người này — đừng bắt người dùng nhớ cái nào nằm ngoài, cái nào nằm trong.
      menu.push('<button data-act="edit" data-id="' + id + '">Sửa tài khoản</button>');
      // Ngăn cách chỉ kẻ khi PHÍA TRÊN đã có mục — kẻ ngay dòng đầu menu thì nó là
      // một gạch lửng lơ, không ngăn cách cái gì.
      const nganCach = function () { if (menu.length) menu.push('<div class="m-menu-sep"></div>'); };
      if (p.status === 'active') {
        nganCach();
        menu.push('<button class="is-danger" data-act="suspend" data-id="' + id + '">Tạm khoá</button>');
      }
      nganCach();
      menu.push('<button class="is-danger" data-act="delete" data-id="' + id + '">Xoá khỏi danh sách</button>');
      menu.push('<button class="is-danger" data-act="delete-hard" data-id="' + id + '">Xoá vĩnh viễn…</button>');
    }

    // "Đổi mật khẩu" RỜI: chỉ còn cho người mình KHÔNG quản lý được (vd. admin đổi hộ
    // admin khác) — giữ đúng quyết định 23/07 "admin làm luôn". Người quản lý được thì
    // ô mật khẩu đã nằm sẵn trong hộp Sửa, bày thêm ở đây là nói hai lần.
    if (p.status === 'active' && !canManage(p)) {
      if (menu.length) menu.push('<div class="m-menu-sep"></div>');
      menu.push('<button data-act="reset-pw" data-id="' + id + '">Đổi mật khẩu</button>');
    }

    if (!chinh && !menu.length) return '<span class="m-self">—</span>';

    const nutMenu = menu.length
      ? '<span class="m-more-wrap">' +
          '<button class="m-more" data-more="' + id + '" aria-label="Thao tác khác" aria-haspopup="true">⋯</button>' +
          '<div class="m-menu" data-menu="' + id + '">' + menu.join('') + '</div>' +
        '</span>'
      : '';
    return chinh + nutMenu;
  }

  // ---- Dựng 1 hàng thành viên ------------------------------------------------
  function rowHtml(p) {
    const isMe = p.id === me.id;
    const name = p.full_name && p.full_name.trim() ? p.full_name.trim() : '(chưa đặt tên)';
    const roleCls = p.role === 'super_admin' ? 'role-super' : (p.role === 'admin' ? 'role-admin' : 'role-user');
    const roleBadge = '<span class="badge ' + roleCls + '">' + esc(ROLE_LABEL[p.role] || p.role) + '</span>';
    const statusBadge = p.status === 'active'
      ? '<span class="badge st-active">Đang hoạt động</span>'
      : (p.status === 'suspended'
          ? '<span class="badge st-suspended">Tạm khoá</span>'
          : '<span class="badge st-pending">Chờ duyệt</span>');
    const dept = p.department && p.department.trim()
      ? '<span class="m-dept">' + esc(p.department.trim()) + '</span>'
      : '<span class="m-empty">—</span>';

    // Chỉ cho tick người mình THỰC SỰ quản lý được — tick rồi mà thao tác bị DB
    // chặn thì vô nghĩa. Chính mình và người ngoài quyền: để ô trống.
    const chonDuoc = canManage(p);
    const oChon = chonDuoc
      ? '<div class="m-check"><input type="checkbox" class="m-pick" data-id="' + p.id + '"' +
        (dangChon.has(p.id) ? ' checked' : '') + ' aria-label="Chọn ' + esc(name) + '"></div>'
      : '<div class="m-check"></div>';

    // 7 ô, THỨ TỰ PHẢI TRÙNG với .member-head trong members.html và với
    // grid-template-columns của .member-table (portal.css). Đổi cột thì đổi cả 3 nơi.
    return '' +
      '<div class="member-row' + (isMe ? ' is-me' : '') +
        (chonDuoc && dangChon.has(p.id) ? ' is-picked' : '') + '">' +
        oChon +
        '<div class="m-user">' +
          '<span class="m-avatar">' + esc(initial(p.full_name)) + '</span>' +
          '<div class="m-id">' +
            '<b>' + esc(name) + '</b>' +
            '<span title="' + esc(p.email || '') + '">' + esc(p.email || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="m-cell" data-label="Phòng ban">' + dept + '</div>' +
        '<div class="m-cell" data-label="Quyền">' + roleBadge + '</div>' +
        '<div class="m-cell" data-label="Trạng thái">' + statusBadge + '</div>' +
        '<div class="m-cell m-date" data-label="Tham gia">' + fmtDate(p.created_at) + '</div>' +
        '<div class="member-actions">' + actionsFor(p) + '</div>' +
      '</div>';
  }

  // ---- Đếm người theo phòng ban (cột phải) + lọc nhanh -----------------------
  function veDemPhongBan(rows) {
    const hop = $('ms-depts');
    if (!hop) return;
    const dem = {};
    PHONG_BAN.forEach(function (d) { dem[d] = 0; });
    let chuaXep = 0;
    rows.forEach(function (r) {
      const d = (r.department || '').trim();
      if (Object.prototype.hasOwnProperty.call(dem, d)) dem[d]++;
      else chuaXep++;
    });
    let html = PHONG_BAN.map(function (d) {
      return '<button class="ms-dept' + (locPhongBan === d ? ' is-on' : '') + '" data-dept="' + esc(d) + '">' +
               '<span class="msd-name">' + esc(d) + '</span>' +
               '<span class="msd-count">' + dem[d] + '</span>' +
             '</button>';
    }).join('');
    // Chỉ hiện "Chưa xếp" khi thật sự có người chưa xếp — không bày ô rỗng
    if (chuaXep) {
      html += '<button class="ms-dept' + (locPhongBan === '' ? ' is-on' : '') + '" data-dept="">' +
                '<span class="msd-name">Chưa xếp</span>' +
                '<span class="msd-count">' + chuaXep + '</span>' +
              '</button>';
    }
    hop.innerHTML = html;
  }

  // Nút lọc theo quyền — chỉ MỘT nút "Admin" (chủ tool 22/07).
  // Đếm trên TOÀN BỘ, không phụ thuộc bộ lọc đang bật — giống veDemPhongBan,
  // nếu không thì bấm lọc xong con số tự tụt về chính nó.
  function veDemQuyen(rows) {
    const hop = $('ms-roles');
    if (!hop) return;
    const n = rows.filter(function (r) { return QUYEN_QUAN_TRI.indexOf(r.role) !== -1; }).length;
    hop.innerHTML =
      '<button class="ms-dept' + (locQuyen ? ' is-on' : '') + '" data-role="admin">' +
        '<span class="msd-name">Admin</span>' +
        '<span class="msd-count">' + n + '</span>' +
      '</button>';
  }

  function onRoleClick(e) {
    const btn = e.target.closest('[data-role]');
    if (!btn) return;
    locQuyen = locQuyen ? null : 'admin';   // bấm lại chính nó = bỏ lọc
    trang.pending = trang.active = trang.suspended = 1;
    dangChon.clear();                        // xem ghi chú ở ô tìm: đổi bộ lọc là bỏ chọn
    veDanhSach();
  }

  function onDeptClick(e) {
    const btn = e.target.closest('.ms-dept');
    if (!btn) return;
    const d = btn.getAttribute('data-dept');
    locPhongBan = (locPhongBan === d) ? null : d;   // bấm lại chính nó = bỏ lọc
    trang.pending = trang.active = trang.suspended = 1;  // lọc lại thì về trang đầu
    dangChon.clear();                                // đổi bộ lọc thì bỏ chọn cũ
    // Trước 22/07 chỗ này gọi load() — nạp LẠI từ Supabase chỉ để lọc, trong khi dữ
    // liệu đã nằm sẵn trong `toanBo`. Vừa chậm vừa tốn quota, lại khác hẳn cách bộ
    // lọc quyền và ô tìm làm việc. Cho cả ba dùng chung veDanhSach() để hành vi
    // giống nhau (nhất là việc reset trang — thiếu nó thì lọc xong còn kẹt ở trang 3).
    veDanhSach();
  }

  // ---- Trạng thái đang tải ---------------------------------------------------
  // CỐ Ý không dùng banner "Đang tải…" nữa: nó chen vào giữa trang, đẩy nội dung
  // tụt xuống rồi biến mất → giật bố cục mỗi lần bấm Tải lại (chủ tool đã chê).
  // Thay bằng phản hồi tại chỗ: nút đổi nhãn + bảng mờ nhẹ, không xê dịch gì.
  let firstLoad = true;
  function setLoading(on) {
    const btn = $('btn-refresh');
    if (btn) {
      btn.disabled = on;
      btn.textContent = on ? 'Đang tải…' : '↻ Tải lại';
    }
    $('page-content').classList.toggle('is-loading', on);
  }

  // Khung xương cho lần tải ĐẦU (lúc đó bảng trống, không có gì để làm mờ)
  function skeletonRows(n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += '<div class="member-row is-skeleton">' +
             '<div class="m-user"><span class="sk sk-avatar"></span>' +
               '<div class="m-id"><span class="sk sk-line"></span><span class="sk sk-line short"></span></div></div>' +
             '<div class="m-cell"><span class="sk sk-pill"></span></div>' +
             '<div class="m-cell"><span class="sk sk-pill"></span></div>' +
             '<div class="m-cell"><span class="sk sk-pill"></span></div>' +
             '<div class="m-cell"><span class="sk sk-line short"></span></div>' +
             '<div class="member-actions"><span class="sk sk-btn"></span></div>' +
           '</div>';
    }
    return s;
  }

  // ---- Tải & render ----------------------------------------------------------
  async function load() {
    setLoading(true);
    if (firstLoad) $('list-active').innerHTML = skeletonRows(3);

    const { data, error } = await sb
      .from('profiles')
      .select('id, full_name, email, role, status, department, created_at')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    setLoading(false);
    firstLoad = false;

    if (error) {
      $('list-active').innerHTML = '';
      $('load-msg').className = 'notice error';
      $('load-msg').innerHTML = '<span>⚠️</span><div>Không tải được danh sách: ' + esc(error.message) + '</div>';
      $('load-msg').style.display = 'flex';
      return;
    }
    $('load-msg').style.display = 'none';

    const tatCa = data || [];
    // Sắp quyền cao lên trước trong mỗi nhóm cho dễ nhìn
    const rank = { super_admin: 0, admin: 1, user: 2 };
    tatCa.sort(function (a, b) { return (rank[a.role] || 9) - (rank[b.role] || 9); });
    toanBo = tatCa;
    veDanhSach();
  }

  // Vẽ lại danh sách từ `toanBo` — KHÔNG gọi lại Supabase. Gõ tìm kiếm mà mỗi phím
  // một lượt truy vấn thì vừa chậm vừa tốn quota; dữ liệu đã có sẵn trong bộ nhớ rồi.
  function veDanhSach() {
    const tatCa = toanBo;

    // Đếm theo phòng ban dựa trên TOÀN BỘ (không phụ thuộc bộ lọc đang bật),
    // nếu không thì bấm lọc xong mọi con số khác tụt về 0.
    veDemPhongBan(tatCa);
    veDemQuyen(tatCa);

    // Danh sách hiển thị = đã lọc phòng ban + đã lọc theo ô tìm.
    // Mọi thao tác hàng loạt chạy trên danh sách này.
    let rows = locPhongBan
      ? tatCa.filter(function (r) { return (r.department || '').trim() === locPhongBan; })
      : tatCa;
    if (locQuyen) {
      rows = rows.filter(function (r) { return QUYEN_QUAN_TRI.indexOf(r.role) !== -1; });
    }
    if (timKiem) {
      rows = rows.filter(function (r) {
        return khongDau(r.full_name).indexOf(timKiem) !== -1
            || khongDau(r.email).indexOf(timKiem) !== -1;
      });
    }
    const oHit = $('mem-hit');
    if (oHit) oHit.textContent = timKiem ? (rows.length + ' kết quả') : '';
    danhSach = rows;
    const dangLoc = [];
    if (locPhongBan !== null) dangLoc.push('phòng ban ' + (locPhongBan || 'Chưa xếp'));
    if (locQuyen) dangLoc.push('quyền Admin');
    $('filter-bar').classList.toggle('open', dangLoc.length > 0);
    if (dangLoc.length) $('filter-name').textContent = dangLoc.join(' + ');
    // Bỏ khỏi danh sách chọn những người đã biến mất sau lần tải này (vd vừa bị xoá)
    const conTon = new Set(rows.map(function (r) { return r.id; }));
    Array.from(dangChon).forEach(function (id) { if (!conTon.has(id)) dangChon.delete(id); });

    const pending = rows.filter(function (r) { return r.status === 'pending'; });
    const active = rows.filter(function (r) { return r.status === 'active'; });
    const suspended = rows.filter(function (r) { return r.status === 'suspended'; });

    // Module tổng quan (cột phải). Null-safe: thẻ nào bị gỡ khỏi HTML thì bỏ qua,
    // đừng để cả hàm tải danh sách chết vì một thẻ thống kê không còn (đã dính:
    // gỡ thẻ "Tạm khoá" ngày 21/07 mà quên dòng ghi ở đây).
    const setSo = function (id, v) { const e = $(id); if (e) e.textContent = v; };
    setSo('ms-total', rows.length);
    setSo('ms-pending', pending.length);
    setSo('ms-active', active.length);
    setSo('ms-suspended', suspended.length);
    // Chỉ hiện hàng "Tạm khoá" khi CÓ người bị khoá. Không có mà vẫn bày số 0 thì
    // thành nhiễu; nhưng CÓ mà không bày thì tổng không khớp — 22/07 chủ tool bắt
    // đúng lỗi này: Tổng 72, Đang hoạt động 71, mất tiêu 1 người.
    const hangKhoa = $('ms-row-suspended');
    if (hangKhoa) hangKhoa.style.display = suspended.length ? '' : 'none';

    nhom.pending = pending; nhom.active = active; nhom.suspended = suspended;

    $('seg-pending').style.display = pending.length ? 'block' : 'none';
    $('count-pending').textContent = pending.length;
    veNhom('pending');

    $('count-active').textContent = active.length;
    veNhom('active');
    $('empty-active').style.display = active.length ? 'none' : 'block';

    $('seg-suspended').style.display = suspended.length ? 'block' : 'none';
    $('count-suspended').textContent = suspended.length;
    veNhom('suspended');

    capNhatThanhHangLoat();
  }

  // Vẽ MỘT nhóm: cắt đúng trang đang xem + dựng thanh lật trang.
  function veNhom(khoa) {
    const ds = nhom[khoa];
    const soTrang = Math.max(1, Math.ceil(ds.length / MOI_TRANG));
    // Kẹp lại số trang: xoá/lọc bớt người có thể làm trang hiện tại không còn tồn tại
    // → không kẹp thì màn hình trắng trơn mà không hiểu vì sao.
    if (trang[khoa] > soTrang) trang[khoa] = soTrang;
    if (trang[khoa] < 1) trang[khoa] = 1;

    const dau = (trang[khoa] - 1) * MOI_TRANG;
    $('list-' + khoa).innerHTML = ds.slice(dau, dau + MOI_TRANG).map(rowHtml).join('');

    const oLat = $('pager-' + khoa);
    if (!oLat) return;
    if (soTrang <= 1) { oLat.innerHTML = ''; oLat.style.display = 'none'; return; }
    oLat.style.display = 'flex';
    oLat.innerHTML =
      '<span class="pager-info">' + (dau + 1) + '–' + Math.min(dau + MOI_TRANG, ds.length) +
        ' trên ' + ds.length + '</span>' +
      '<span class="pager-sep"></span>' +
      '<button type="button" class="pager-nut" data-trang="truoc" data-nhom="' + khoa + '"' +
        (trang[khoa] === 1 ? ' disabled' : '') + ' aria-label="Trang trước">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>' +
      soNut(khoa, soTrang) +
      '<button type="button" class="pager-nut" data-trang="sau" data-nhom="' + khoa + '"' +
        (trang[khoa] === soTrang ? ' disabled' : '') + ' aria-label="Trang sau">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>';
  }

  // Dãy số trang. Nhiều trang thì rút gọn bằng "…" để thanh không dài ra vô tận.
  function soNut(khoa, soTrang) {
    const hienTai = trang[khoa];
    const ds = [];
    for (let i = 1; i <= soTrang; i++) {
      if (i === 1 || i === soTrang || Math.abs(i - hienTai) <= 1) ds.push(i);
      else if (ds[ds.length - 1] !== '…') ds.push('…');
    }
    return ds.map(function (i) {
      if (i === '…') return '<span class="pager-cham">…</span>';
      return '<button type="button" class="pager-nut pager-so' + (i === hienTai ? ' dang-xem' : '') +
             '" data-trang="' + i + '" data-nhom="' + khoa + '"' +
             (i === hienTai ? ' aria-current="page"' : '') + '>' + i + '</button>';
    }).join('');
  }

  function onPagerClick(e) {
    const nut = e.target.closest('.pager-nut');
    if (!nut || nut.disabled) return;
    const khoa = nut.dataset.nhom;
    const v = nut.dataset.trang;
    const soTrang = Math.max(1, Math.ceil(nhom[khoa].length / MOI_TRANG));
    if (v === 'truoc') trang[khoa] = Math.max(1, trang[khoa] - 1);
    else if (v === 'sau') trang[khoa] = Math.min(soTrang, trang[khoa] + 1);
    else trang[khoa] = Number(v);
    veNhom(khoa);
    capNhatThanhHangLoat();
    // Kéo về đầu nhóm — lật trang mà mắt còn ở giữa danh sách thì mất phương hướng.
    // ⚠️ KHÔNG dùng `scrollIntoView` trần: nó đưa phần tử lên sát mép trên cửa sổ, mà
    // mép trên đang bị các thanh DÍNH (`.topbar`, `.bulk-bar`) che → hàng đầu chui
    // xuống dưới chúng. Phải trừ đi chiều cao các thanh đó. Đo tại thời điểm bấm chứ
    // không hardcode: thanh công cụ cao thấp khác nhau tuỳ có đang chọn người hay không.
    const seg = $('list-' + khoa).closest('.seg');
    if (!seg) return;
    let che = 0;
    ['.topbar', '#bulk-bar'].forEach(function (sel) {
      const el = document.querySelector(sel);
      if (el && getComputedStyle(el).position === 'sticky') che += el.offsetHeight;
    });
    const y = seg.getBoundingClientRect().top + window.scrollY - che - 24;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  // ---- Gọi API admin (server dùng service_role) — LUÔN kèm token đăng nhập -----
  // Bản IM: trả { data, error } chứ KHÔNG bật hộp thoại. Dùng cho vòng lặp hàng loạt —
  // 40 người lỗi mà mỗi người một hộp thoại thì không ai bấm hết nổi.
  async function goiAdminApiIm(path, body) {
    const session = await TSTAuth.getSession();
    if (!session) return { error: 'Phiên đăng nhập đã hết hạn. Mời đăng nhập lại.', hetPhien: true };
    let res, data;
    try {
      res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
        body: JSON.stringify(body || {})
      });
      data = await res.json().catch(function () { return {}; });
    } catch (e) {
      return { error: 'Không gọi được máy chủ: ' + e.message, ketNoi: true };
    }
    if (!res.ok) return { error: (data && data.error) || ('Lỗi ' + res.status) };
    return { data: data };
  }

  // Bản thường: tự báo lỗi bằng hộp thoại, trả về data hoặc null.
  async function goiAdminApi(path, body) {
    const kq = await goiAdminApiIm(path, body);
    if (kq.error) {
      await showAppAlert(kq.error, kq.hetPhien
        ? { tone: 'warning' }
        : { title: kq.ketNoi ? 'Lỗi kết nối' : 'Không thực hiện được', tone: 'danger' });
      return null;
    }
    return kq.data;
  }

  // Đổi mật khẩu 1 thành viên (admin & super_admin — chủ tool 23/07). Admin GÕ ĐƯỢC mật khẩu
  // tuỳ ý; điền sẵn Drt$2022 để giữ mặc định cho nhanh nếu muốn.
  async function doiMatKhauThanhVien(id) {
    const p = danhSach.find(function (x) { return x.id === id; });
    const ten = p ? (p.full_name || p.email || 'thành viên này') : 'thành viên này';
    const nhap = await showAppPrompt('Mật khẩu mới cho “' + ten + '” (giữ mặc định hoặc gõ mật khẩu khác):',
      { title: 'Đổi mật khẩu', initialValue: 'Drt$2022', confirmText: 'Đổi mật khẩu' });
    if (nhap === null) return;   // bấm Huỷ
    const pass = String(nhap).trim();
    if (pass.length < 6) { await showAppAlert('Mật khẩu cần tối thiểu 6 ký tự.', { tone: 'warning' }); return; }
    setLoading(true);
    const data = await goiAdminApi('/api/admin/reset-password', { userId: id, password: pass });
    setLoading(false);
    if (!data) return;
    await showAppAlert('Đã đổi mật khẩu cho “' + ten + '”.\n\nMật khẩu mới:  ' + data.password +
      '\n\nGửi cho họ.', { title: 'Xong', tone: 'success' });
  }

  // ---- HỘP "SỬA TÀI KHOẢN" (chủ tool 31/07) ----------------------------------
  // Một cửa cho: họ tên · email đăng nhập · phòng ban · quyền · mật khẩu.
  // Chỉ gửi lên server những trường THỰC SỰ đổi — tránh vô tình ghi đè thứ mình
  // không định đụng, và để server phân biệt "không gửi" với "gửi rỗng".
  let dangSua = null;   // hồ sơ đang mở trong hộp

  function moHopSua(id) {
    const p = danhSach.find(function (x) { return x.id === id; });
    if (!p) return;
    dangSua = p;
    $('edit-who').textContent = 'Đang sửa: ' + (p.full_name || p.email || 'thành viên này');
    $('edit-name').value = p.full_name || '';
    $('edit-email').value = p.email || '';
    $('edit-pass').value = '';
    $('edit-email-warn').hidden = true;
    $('edit-dept').innerHTML = '<option value="">— Không thuộc phòng ban —</option>' +
      PHONG_BAN.map(function (d) {
        return '<option value="' + esc(d) + '"' + (d === (p.department || '').trim() ? ' selected' : '') + '>' + esc(d) + '</option>';
      }).join('');
    // ☠️ Custom dropdown (js/dropdown.js) chỉ cập nhật nhãn nút khi nghe 'change'.
    // Đổ option bằng innerHTML KHÔNG tự bắn 'change' → nút hiện rỗng cho tới khi
    // người dùng bấm mở (đo 16/09/2026: ô Quyền trống trong hộp Sửa). Bắn tay.
    $('edit-dept').dispatchEvent(new Event('change'));

    // Quyền: CHỈ Super Admin đổi được (server chặn lại lần nữa). Danh sách chọn vẫn
    // là user/admin — không phong Super Admin qua giao diện; chỉ thêm mục super_admin
    // khi người đang sửa vốn đã là Super Admin, để ô này hiển thị đúng giá trị hiện có.
    const laSuper = me.role === 'super_admin';
    $('edit-role-field').style.display = laSuper ? '' : 'none';
    const dsQuyen = QUYEN_TAO_MOI.slice();
    if (p.role === 'super_admin') dsQuyen.push('super_admin');
    $('edit-role').innerHTML = dsQuyen.map(function (r) {
      return '<option value="' + esc(r) + '"' + (r === p.role ? ' selected' : '') + '>' + esc(ROLE_LABEL[r] || r) + '</option>';
    }).join('');
    $('edit-role').dispatchEvent(new Event('change'));   // nhãn nút — xem ghi chú ở edit-dept

    const kq = $('edit-result'); kq.style.display = 'none'; kq.textContent = '';
    $('edit-backdrop').classList.add('open');
    $('edit-backdrop').setAttribute('aria-hidden', 'false');
    $('edit-name').focus();
  }

  function dongHopSua() {
    dangSua = null;
    $('edit-backdrop').classList.remove('open');
    $('edit-backdrop').setAttribute('aria-hidden', 'true');
  }

  // Đang gõ dở gì chưa? So từng ô với hồ sơ gốc.
  function coThayDoiSua() {
    if (!dangSua) return false;
    const p = dangSua;
    if ($('edit-pass').value.trim()) return true;
    if ($('edit-name').value.trim() !== (p.full_name || '')) return true;
    if ($('edit-email').value.trim().toLowerCase() !== (p.email || '').trim().toLowerCase()) return true;
    if ($('edit-dept').value !== (p.department || '').trim()) return true;
    if (me.role === 'super_admin' && $('edit-role').value !== p.role) return true;
    return false;
  }

  // MỌI đường đóng hộp Sửa (bấm ra ngoài · Esc · Huỷ · ✕) đều phải đi qua đây.
  // Chủ tool 31/07: "vô tình bấm ra ngoài thì mất pop-up và thông tin đang sửa".
  // Chưa gõ gì thì đóng luôn cho nhẹ tay; đã gõ rồi thì hỏi — công gõ của người
  // dùng không được biến mất chỉ vì một cú bấm trượt.
  async function thuDongHopSua() {
    if (coThayDoiSua() && !(await showAppConfirm(
      'Bỏ những thay đổi chưa lưu cho “' + ((dangSua && (dangSua.full_name || dangSua.email)) || 'thành viên này') + '”?',
      { title: 'Chưa lưu', tone: 'warning', confirmText: 'Bỏ thay đổi' }))) return;
    dongHopSua();
  }

  async function luuSuaTaiKhoan() {
    if (!dangSua) return;
    const p = dangSua;
    const kq = $('edit-result');
    const ten = $('edit-name').value.trim();
    const mail = $('edit-email').value.trim().toLowerCase();
    const phong = $('edit-dept').value;
    const quyen = me.role === 'super_admin' ? $('edit-role').value : p.role;
    const pass = $('edit-pass').value.trim();

    function bao(msg) { veKetQua(kq, 'error', esc(msg)); }
    if (!ten) { bao('Họ tên không được để trống.'); $('edit-name').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { bao('Email không hợp lệ.'); $('edit-email').focus(); return; }
    if (pass && pass.length < 6) { bao('Mật khẩu cần tối thiểu 6 ký tự.'); $('edit-pass').focus(); return; }

    const body = { userId: p.id };
    if (ten !== (p.full_name || '')) body.full_name = ten;
    if (mail !== (p.email || '').trim().toLowerCase()) body.email = mail;
    if (phong !== (p.department || '').trim()) body.department = phong;
    if (quyen !== p.role) body.role = quyen;
    if (pass) body.password = pass;
    if (Object.keys(body).length === 1) { dongHopSua(); return; }   // không đổi gì thì đóng luôn

    // Đổi email = đổi lối vào của người ta → hỏi lại trước khi gửi.
    if (body.email && !(await showAppConfirm(
      'Đổi email đăng nhập của “' + (p.full_name || p.email) + '”\n\n' +
      'Từ:  ' + (p.email || '(chưa có)') + '\nSang: ' + mail + '\n\n' +
      'Sau khi đổi, họ CHỈ đăng nhập được bằng email mới. Nhớ báo cho họ.',
      { title: 'Xác nhận đổi email', tone: 'warning' }))) return;

    const nut = $('edit-save'); const cu = nut.textContent;
    nut.disabled = true; nut.textContent = 'Đang lưu…';
    const data = await goiAdminApi('/api/admin/update-user', body);
    nut.disabled = false; nut.textContent = cu;
    if (!data) return;

    dongHopSua();
    await load();
    // ☠️ KHÔNG bung hộp thoại "Xong" nữa (chủ tool 18/08: "những thông báo vô tri —
    // xấu — không có ý nghĩa"). Đổi tên / phòng ban / quyền thì bảng phía sau ĐÃ hiện
    // giá trị mới ngay trước mắt — bắt bấm OK để đọc lại đúng thứ vừa thấy là thêm một
    // cú bấm cho không có tin nào. Luật chung: chỉ báo khi THẤT BẠI.
    // NGOẠI LỆ giữ lại: mật khẩu / email đăng nhập mới — đó là thông tin phải CHÉP
    // ra gửi cho người ta, đóng hộp là mất, không có chỗ nào xem lại được.
    if (body.password || body.email) {
      const tin = [];
      if (body.email) tin.push('Email đăng nhập:  ' + data.email);
      if (body.password) tin.push('Mật khẩu mới:  ' + pass);
      await showAppAlert(tin.join('\n') + '\n\n' + 'Gửi cho “' + ten + '” — đóng cửa sổ này là không xem lại được.',
        { title: 'Thông tin đăng nhập mới', tone: 'success' });
    }
  }

  // ---- XOÁ: hai mức, cố ý tách rời -------------------------------------------
  // Mềm  = ẩn khỏi danh sách, khôi phục được, tài khoản đăng nhập VẪN CÒN
  //        ⇒ email đó chưa dùng lại để tạo người mới được.
  // Vĩnh viễn = xoá sạch, kéo theo toàn bộ lịch sử của họ ở tab Đo lường.
  async function xoaMem(id) {
    const p = danhSach.find(function (x) { return x.id === id; });
    const ten = p ? (p.full_name || p.email || 'thành viên này') : 'thành viên này';
    if (!(await showAppConfirm(
      'Xoá “' + ten + '” khỏi danh sách?\n\n' +
      'Họ sẽ không đăng nhập được nữa, nhưng tài khoản vẫn còn trong hệ thống để khôi phục nếu cần.\n' +
      'Muốn dùng lại chính email này cho người khác thì phải chọn “Xoá vĩnh viễn”.',
      { tone: 'warning' }))) return;
    setLoading(true);
    const data = await goiAdminApi('/api/admin/delete-user', { userId: id, hard: false });
    setLoading(false);
    if (data) await load();
  }

  async function xoaVinhVien(id) {
    const p = danhSach.find(function (x) { return x.id === id; });
    if (!p) return;
    const ten = p.full_name || p.email || 'thành viên này';
    const mail = (p.email || '').trim();

    // Hỏi lần 1 — nói thẳng cái BỊ MẤT, không nói chung chung "không thể hoàn tác".
    if (!(await showAppConfirm(
      'XOÁ VĨNH VIỄN “' + ten + '”?\n\n' +
      'Mất luôn và KHÔNG khôi phục được:\n' +
      '• Tài khoản đăng nhập (' + (mail || 'không có email') + ')\n' +
      '• Toàn bộ lịch sử của họ ở tab Đo lường — đã tải gì, xem mẫu nào, đăng nhập lúc nào\n\n' +
      'Đổi lại: email này dùng lại được để tạo tài khoản mới.\n' +
      'Chỉ muốn chặn họ đăng nhập thì dùng “Tạm khoá” hoặc “Xoá khỏi danh sách”.',
      { title: 'Xoá vĩnh viễn', tone: 'danger', confirmText: 'Tôi hiểu, đi tiếp' }))) return;

    // Hỏi lần 2 — gõ lại email. Bấm nhầm hai lần liên tiếp thì được, gõ đúng email
    // của người mình không định xoá thì khó hơn nhiều.
    const goi = await showAppPrompt('Gõ lại email của người này để xác nhận:\n\n' + mail,
      { title: 'Xác nhận lần cuối', confirmText: 'Xoá vĩnh viễn' });
    if (goi === null) return;
    if (String(goi).trim().toLowerCase() !== mail.toLowerCase()) {
      await showAppAlert('Email gõ vào không khớp — chưa xoá gì cả.', { tone: 'warning' });
      return;
    }

    setLoading(true);
    const data = await goiAdminApi('/api/admin/delete-user', { userId: id, hard: true });
    setLoading(false);
    if (!data) return;
    dangChon.delete(id);
    await load();
    await showAppAlert('Đã xoá vĩnh viễn “' + ten + '”. Email ' + mail + ' nay dùng lại được.',
      { title: 'Đã xoá', tone: 'success' });
  }

  // ---- Thao tác --------------------------------------------------------------
  async function apply(patch, id, confirmText, tone) {
    if (confirmText && !(await showAppConfirm(confirmText, { tone: tone || 'warning' }))) return;
    const { error } = await sb.from('profiles').update(patch).eq('id', id);
    if (error) { await showAppAlert(error.message, { title: 'Không cập nhật được', tone: 'danger' }); return; }
    await load();
  }

  // ---- Hộp thoại chọn phòng ban (thay window.prompt) -------------------------
  // Dùng chung cho cả sửa 1 người lẫn đổi hàng loạt. Trả về qua callback vì cần
  // chờ người dùng bấm Lưu.
  let deptCallback = null;
  function moHopPhongBan(tieuDe, giaTriHienTai, xong) {
    const sel = $('dept-select');
    sel.innerHTML = '<option value="">— Không thuộc phòng ban —</option>' +
      PHONG_BAN.map(function (d) {
        return '<option value="' + esc(d) + '"' + (d === giaTriHienTai ? ' selected' : '') + '>' + esc(d) + '</option>';
      }).join('');
    sel.dispatchEvent(new Event('change'));   // nhãn nút custom dropdown — xem ghi chú ở edit-dept
    $('dept-who').textContent = tieuDe;
    deptCallback = xong;
    $('dept-backdrop').classList.add('open');
    $('dept-backdrop').setAttribute('aria-hidden', 'false');
    sel.focus();
  }
  function dongHopPhongBan() {
    deptCallback = null;
    $('dept-backdrop').classList.remove('open');
    $('dept-backdrop').setAttribute('aria-hidden', 'true');
  }

  // ---- Chọn nhiều + thao tác hàng loạt --------------------------------------
  function capNhatThanhHangLoat() {
    const n = dangChon.size;
    const bar = $('bulk-bar');
    bar.classList.toggle('open', n > 0);
    $('bulk-count').textContent = 'Đã chọn ' + n;

    // --- Nút nào áp dụng được thì mới hiện, kèm SỐ NGƯỜI thực sự bị tác động ---
    // `nguoiHopLe()` vốn đã tính sẵn (dùng để chặn gọi DB thừa); giờ dùng luôn nó để
    // quyết định hiển thị. Trước đây luôn bày đủ 5 nút, bấm vào mới báo "không có ai
    // phù hợp" — đó là bắt người dùng thử-và-sai, và là lý do thanh này nhìn rối.
    let uuTien = null;   // nút sẽ được tô primary
    document.querySelectorAll('.bulk-act').forEach(function (nut) {
      const act = nut.dataset.bulk;
      const soNguoi = nguoiHopLe(act).length;
      nut.style.display = soNguoi ? '' : 'none';
      // Chỉ hiện số khi nó KHÁC tổng đang chọn — bằng nhau thì con số là thừa,
      // "Đã chọn 5" ngay bên trái đã nói rồi.
      const oSo = nut.querySelector('.bulk-n');
      if (oSo) oSo.textContent = (soNguoi && soNguoi !== n) ? String(soNguoi) : '';
      // Thứ tự ưu tiên việc chính: duyệt người mới > mở khoá > đổi phòng ban.
      // KHÔNG bao giờ để việc phá huỷ (tạm khoá/xoá) làm nút primary.
      if (soNguoi && !uuTien && ['approve', 'reactivate', 'dept'].indexOf(act) !== -1) uuTien = nut;
      nut.classList.remove('btn-primary');
    });
    if (uuTien) { uuTien.classList.remove('btn-secondary'); uuTien.classList.add('btn-primary'); }
    document.querySelectorAll('.bulk-act:not(.btn-primary)').forEach(function (nut) {
      if (!nut.classList.contains('btn-warn-outline') && !nut.classList.contains('btn-danger-outline')) {
        nut.classList.add('btn-secondary');
      }
    });

    // (31/07) Bỏ chốt "xoá chỉ dành cho Super Admin" — nay admin xoá được nhân viên
    // của mình; ai được xoá ai đã do canManage + nguoiHopLe('delete') quyết, và
    // server /api/admin/delete-user kiểm lại lần nữa.
    // Đồng bộ ô "chọn tất cả" — tính theo DỮ LIỆU CẢ NHÓM, không theo hàng đang hiển thị.
    // Tính theo hàng hiển thị thì lật sang trang chưa chọn ai là ô này tự bỏ tick, dù
    // 40 người ở trang khác vẫn đang được chọn — sai và gây hiểu nhầm nguy hiểm.
    document.querySelectorAll('.member-table').forEach(function (tbl) {
      const all = tbl.querySelector('.pick-all');
      if (!all) return;
      const khoa = ((tbl.querySelector('.member-list') || {}).id || '').replace('list-', '');
      const ds = (nhom[khoa] || []).filter(canManage);
      const daChon = ds.filter(function (p) { return dangChon.has(p.id); }).length;
      all.checked = ds.length > 0 && daChon === ds.length;
      all.indeterminate = daChon > 0 && daChon < ds.length;
      all.disabled = ds.length === 0;
    });
  }

  function onPickChange(e) {
    const box = e.target;
    if (box.classList.contains('pick-all')) {
      // ⚠️ Từ khi có phân trang, KHÔNG được duyệt theo `.m-pick` trên màn hình nữa —
      // làm vậy thì "chọn tất cả" chỉ chọn 12 người của trang đang xem, trong khi
      // tiêu đề vẫn ghi "Thành viên 51". Người dùng tưởng đã chọn hết cả 51.
      // Chọn theo DỮ LIỆU của cả nhóm, rồi mới đồng bộ ô tick đang hiển thị.
      const tbl = box.closest('.member-table');
      const khoa = (tbl.querySelector('.member-list') || {}).id || '';
      const ds = nhom[khoa.replace('list-', '')] || [];
      ds.forEach(function (p) {
        if (!canManage(p)) return;              // không tự chọn người mình không quản được
        if (box.checked) dangChon.add(p.id); else dangChon.delete(p.id);
      });
      tbl.querySelectorAll('.m-pick').forEach(function (c) {
        const co = dangChon.has(c.getAttribute('data-id'));
        c.checked = co;
        c.closest('.member-row').classList.toggle('is-picked', co);
      });
      capNhatThanhHangLoat();
      return;
    }
    if (!box.classList.contains('m-pick')) return;
    const id = box.getAttribute('data-id');
    if (box.checked) dangChon.add(id); else dangChon.delete(id);
    box.closest('.member-row').classList.toggle('is-picked', box.checked);
    capNhatThanhHangLoat();
  }

  // Lọc ra những người mà thao tác này THỰC SỰ áp dụng được — tránh gọi DB
  // những lệnh chắc chắn bị trigger từ chối.
  function nguoiHopLe(act) {
    return danhSach.filter(function (p) {
      if (!dangChon.has(p.id) || !canManage(p)) return false;
      if (act === 'approve') return p.status === 'pending';
      if (act === 'suspend') return p.status === 'active';
      if (act === 'reactivate') return p.status === 'suspended';
      // Xoá hàng loạt = xoá MỀM, và chỉ trên người mình quản được (canManage đã lọc ở trên).
      // Xoá vĩnh viễn CỐ Ý không có bản hàng loạt: mất sạch không lùi được thì phải làm
      // từng người, hỏi hai lần.
      if (act === 'delete') return true;
      if (act === 'dept') return true;
      return false;
    });
  }

  async function chayHangLoat(act, patch, hoiTruoc) {
    const ds = nguoiHopLe(act);
    if (!ds.length) {
      await showAppAlert('Không có ai trong danh sách đang chọn phù hợp với thao tác này.',
        { title: 'Chưa làm được', tone: 'warning' });
      return;
    }
    if (hoiTruoc && !(await showAppConfirm(hoiTruoc.replace('{n}', ds.length),
      { tone: act === 'delete' ? 'danger' : 'warning' }))) return;
    setLoading(true);
    const loi = [];
    for (const p of ds) {
      // Xoá đi ĐƯỜNG SERVER, không update thẳng Supabase: trigger enforce_member_update
      // ở DB vẫn chặn admin đặt status='deleted' (đó là hàng rào cuối cùng, giữ nguyên).
      // Quyền của admin được cấp ở tầng API — nơi có kiểm bậc thang bằng service_role.
      if (act === 'delete') {
        const kq = await goiAdminApiIm('/api/admin/delete-user', { userId: p.id, hard: false });
        if (kq.error) loi.push((p.full_name || p.email || p.id) + ': ' + kq.error);
        continue;
      }
      const { error } = await sb.from('profiles').update(patch).eq('id', p.id);
      if (error) loi.push((p.full_name || p.email || p.id) + ': ' + error.message);
    }
    dangChon.clear();
    setLoading(false);
    if (loi.length) await showAppAlert(loi.join('\n'),
      { title: 'Có ' + loi.length + ' người không cập nhật được', tone: 'danger' });
    await load();
  }

  function onBulkClick(e) {
    const btn = e.target.closest('button[data-bulk]');
    if (!btn) return;
    const act = btn.getAttribute('data-bulk');
    if (act === 'approve') chayHangLoat('approve', { status: 'active' }, 'Duyệt {n} tài khoản đang chọn?');
    else if (act === 'suspend') chayHangLoat('suspend', { status: 'suspended' }, 'Tạm khoá {n} tài khoản? Họ sẽ không đăng nhập được cho tới khi mở khoá.');
    else if (act === 'reactivate') chayHangLoat('reactivate', { status: 'active' }, 'Mở khoá {n} tài khoản?');
    else if (act === 'delete') chayHangLoat('delete', { status: 'deleted' }, 'Xoá {n} thành viên khỏi danh sách? Tài khoản vẫn còn trong hệ thống nhưng không đăng nhập được.');
    else if (act === 'dept') {
      const ds = nguoiHopLe('dept');
      if (!ds.length) { showAppAlert('Chưa chọn ai trong danh sách.', { tone: 'warning' }); return; }
      moHopPhongBan('Đổi phòng ban cho ' + ds.length + ' thành viên đang chọn.', '', function (val) {
        chayHangLoat('dept', { department: val });
      });
    }
  }

  // Đóng mọi menu "⋯" đang mở
  function dongMenu() {
    document.querySelectorAll('.m-menu.open').forEach(function (m) { m.classList.remove('open'); });
  }

  function onListClick(e) {
    // Nút "⋯" — mở/đóng menu của đúng hàng đó
    const more = e.target.closest('.m-more');
    if (more) {
      const menu = more.parentElement.querySelector('.m-menu');
      const dangMo = menu.classList.contains('open');
      dongMenu();
      if (!dangMo) menu.classList.add('open');
      e.stopPropagation();
      return;
    }

    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    dongMenu();
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    if (id === me.id) return; // chốt chặn: không thao tác lên chính mình

    if (act === 'approve') {
      apply({ status: 'active' }, id);
    } else if (act === 'reactivate') {
      apply({ status: 'active' }, id, 'Mở khoá cho thành viên này để họ đăng nhập lại?');
    } else if (act === 'suspend') {
      apply({ status: 'suspended' }, id, 'Tạm khoá tài khoản này? Họ sẽ không đăng nhập được cho tới khi mở khoá lại.');
    } else if (act === 'edit') {
      moHopSua(id);
    } else if (act === 'delete') {
      xoaMem(id);
    } else if (act === 'delete-hard') {
      xoaVinhVien(id);
    } else if (act === 'reset-pw') {
      doiMatKhauThanhVien(id);
    }
  }

  // ---- Shell dashboard (drawer mobile + đăng xuất) ---------------------------
  function wireShell() {
    const sidebar = $('sidebar');
    const backdrop = $('sidebar-backdrop');
    const toggle = $('menu-toggle');
    function closeMenu() { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }
    if (toggle) toggle.addEventListener('click', function () { sidebar.classList.toggle('open'); backdrop.classList.toggle('open'); });
    if (backdrop) backdrop.addEventListener('click', closeMenu);
    const logout = $('btn-logout-side');
    if (logout) logout.addEventListener('click', TSTAuth.signOut);
    TSTAuth.initDoiMatKhau();

    // Ô tìm thành viên. Lọc ngay trong bộ nhớ nên gõ tới đâu thấy tới đó, không debounce.
    const oTim = $('mem-search');
    const nutXoa = $('mem-search-clear');
    if (oTim) {
      oTim.addEventListener('input', function () {
        timKiem = khongDau(oTim.value);
        trang.pending = trang.active = trang.suspended = 1;   // lọc lại thì về trang đầu
        // Bỏ chọn những người vừa bị lọc ra khỏi màn hình — nếu giữ, người dùng bấm
        // "Duyệt" sẽ tác động lên cả người họ KHÔNG còn nhìn thấy. Nguy hiểm thầm lặng.
        dangChon.clear();
        if (nutXoa) nutXoa.style.display = oTim.value ? 'flex' : 'none';
        veDanhSach();
      });
      // type="search" trên Chrome có nút X riêng, bấm nó chỉ bắn 'search' chứ không 'input'
      oTim.addEventListener('search', function () { oTim.dispatchEvent(new Event('input')); });
      oTim.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && oTim.value) { e.stopPropagation(); oTim.value = ''; oTim.dispatchEvent(new Event('input')); }
      });
    }
    // Đo chiều cao THẬT của thanh công cụ rồi ghi vào biến CSS --bulk-h, để hàng
    // tiêu đề cột dính đúng ngay dưới nó. Hardcode con số sẽ sai khi thanh xuống
    // dòng ở màn hẹp, hoặc khi nhóm nút hàng loạt hiện ra làm nó cao thêm.
    const thanh = $('bulk-bar');
    if (thanh && window.ResizeObserver) {
      new ResizeObserver(function () {
        document.documentElement.style.setProperty('--bulk-h', thanh.offsetHeight + 'px');
      }).observe(thanh);
    }

    if (nutXoa) {
      nutXoa.style.display = 'none';
      nutXoa.addEventListener('click', function () {
        oTim.value = ''; oTim.dispatchEvent(new Event('input')); oTim.focus();
      });
    }
    // Super Admin dùng được MỌI công cụ (chủ tool quyết 20/07/2026) — giữ mục Công cụ.
  }

  // ---- ĐO LƯỜNG SỬ DỤNG (N1, 23/07/2026) — CHỈ Super Admin --------------------
  // Đọc usage_events (RLS chỉ cho super_admin đọc). Nạp LƯỜI: chỉ query khi mở tab.
  const NGAY_MS = 24 * 60 * 60 * 1000;
  function ngayKey(ts) { const d = new Date(ts); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function batDauNgay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function fmtNgay(d) { return d.getDate() + '/' + (d.getMonth() + 1); }

  function thoiGianTuong(ts) {
    if (!ts) return '<span class="ur-never">chưa</span>';
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'vừa xong';
    if (s < 3600) return Math.floor(s / 60) + ' phút trước';
    if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
    const d = Math.floor(s / 86400);
    if (d === 1) return 'hôm qua';
    if (d < 30) return d + ' ngày trước';
    const dt = new Date(ts);
    return dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + dt.getFullYear();
  }

  function initTracking() {
    // NỚI 10/08/2026 (chủ tool): trước đây 2 tab "Đo lường" + "Khoá mục" chỉ super_admin.
    // Nay Admin (leader/manager) cũng vào được — chủ tool dùng thấy ổn, muốn leader theo
    // dõi đội mình và tự khoá mục khi đang cập nhật nội dung.
    // ⚠️ Mở tab ở đây KHÔNG đủ: 4 policy trong schema.sql cũng phải là is_admin(), không
    // thì admin bấm vào chỉ thấy trống trơn (usage_events · presence · storage · khoa_muc).
    if (!me || !['admin', 'super_admin'].includes(me.role)) return;
    $('ms-head').style.display = '';   // lộ hàng tabs + ô tìm (bỏ inline none → về CSS flex)
    $('tab-members').addEventListener('click', function () { doiTab('members'); });
    $('tab-usage').addEventListener('click', function () { doiTab('usage'); });
    $('tab-khoa').addEventListener('click', function () { doiTab('khoa'); });
    $('khoa-list').addEventListener('click', function (e) {
      const nacNut = e.target.closest('[data-nac]');
      if (nacNut) { doiNac(nacNut.getAttribute('data-nac-muc'), nacNut.getAttribute('data-nac')); return; }
      const b = e.target.closest('[data-bat]');
      if (!b) return;
      const ma = b.getAttribute('data-bat');
      batKhoa(ma, !(khoaRows[ma] && khoaRows[ma].khoa));
    });
    // blur không nổi bọt → dùng capture để bắt được từ container
    $('khoa-list').addEventListener('blur', function (e) {
      const o = e.target.closest && e.target.closest('[data-nhan]');
      if (o) luuLoiNhan(o.getAttribute('data-nhan'), o.value.trim());
    }, true);
    $('khoa-list').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      const o = e.target.closest && e.target.closest('[data-nhan]');
      if (o) o.blur();
    });
    // Mốc nhanh 14/30/60 → lọc biểu đồ + bảng (không đụng 3 thẻ trên).
    // Hai ô nhập ngày đã GỠ 31/07 theo yêu cầu chủ tool ("không cần").
    $('usage-presets').addEventListener('click', function (e) {
      const b = e.target.closest('[data-preset]');
      if (b) datPreset(parseInt(b.getAttribute('data-preset'), 10));
    });
    // Mốc 30/60 RIÊNG của khối "Công cụ tra cứu" — cố ý tách khỏi dải trên (chủ tool
    // 12/08/2026), để so 30 với 60 ngày mà không phải kéo lên kéo xuống.
    $('usage-tools-presets').addEventListener('click', function (e) {
      const b = e.target.closest('[data-tpreset]');
      if (b) datKhoangCongCu(parseInt(b.getAttribute('data-tpreset'), 10));
    });
    // Bấm dòng "Tải về" → popup chi tiết tải gì
    $('uk-download-row').addEventListener('click', moChiTietTaiVe);
    $('uk-calc-row').addEventListener('click', moChiTietTinhTuoi);
    $('uct-close').addEventListener('click', dongChiTietTinhTuoi);
    $('uct-backdrop').addEventListener('click', function (e) { if (e.target === $('uct-backdrop')) dongChiTietTinhTuoi(); });
    // ☠️ Bộ nghe cho `#usage-rows` GỠ 10/08/2026 cùng bảng "Theo từng người".
    // Popup chi tiết tải về vẫn mở được qua thẻ tổng `#uk-download-row`.
    // Bấm tên người → bung/gập danh sách lượt tải của người đó; bấm 👁 → bung "đã điền gì"
    $('dl-rows').addEventListener('click', function (e) {
      const per = e.target.closest('.dl-per');
      if (per) {
        const than = per.nextElementSibling;
        if (!than) return;
        const mo = than.hidden;              // đang đóng → mở
        than.hidden = !mo;
        per.setAttribute('aria-expanded', String(mo));
        per.classList.toggle('is-open', mo);
        return;
      }
      const b = e.target.closest('.dl-eye');
      if (!b) return;
      const idx = b.getAttribute('data-idx');
      // Bấm lại đúng con mắt đang mở → đóng panel. Bấm con mắt KHÁC → đổi nội dung panel.
      if (dangXemIdx === idx) dongPanelXem();
      else moPanelXem(idx, b);
    });
    $('dl-search').addEventListener('input', locChiTietTaiVe);
    $('dl-close').addEventListener('click', dongChiTietTaiVe);
    $('dl-backdrop').addEventListener('click', function (e) { if (e.target === $('dl-backdrop')) dongChiTietTaiVe(); });
    // ☠️ Thanh "đang online" + hộp thoại của nó GỠ 10/08/2026.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if ($('dl-backdrop').classList.contains('open')) dongChiTietTaiVe();
      if ($('uct-backdrop').classList.contains('open')) dongChiTietTinhTuoi();
    });
  }

  // 3 tab (31/07: thêm "Khoá mục"). Viết theo BẢNG thay vì chuỗi if — thêm tab thứ 4
  // chỉ cần thêm một dòng, không phải sửa 6 chỗ như bản cũ.
  const TABS = [
    { khoa: 'members', nut: 'tab-members', panel: 'page-content' },
    { khoa: 'usage',   nut: 'tab-usage',   panel: 'tracking-content' },
    { khoa: 'khoa',    nut: 'tab-khoa',    panel: 'khoa-content' }
  ];
  function doiTab(which) {
    TABS.forEach(function (t) {
      const dang = t.khoa === which;
      const nut = $(t.nut); const panel = $(t.panel);
      if (nut) { nut.classList.toggle('is-on', dang); nut.setAttribute('aria-selected', String(dang)); }
      if (panel) panel.style.display = dang ? 'block' : 'none';
    });
    // Ô tìm nằm chung hàng với tabs nhưng chỉ có nghĩa ở tab "Thành viên" —
    // sang Đo lường / Khoá mục thì ẩn đi (16/09/2026).
    const oTim = $('mem-search-wrap'); if (oTim) oTim.style.display = which === 'members' ? '' : 'none';
    const oHit = $('mem-hit'); if (oHit) oHit.style.display = which === 'members' ? '' : 'none';
    if (which === 'usage' && !usageLoaded) { usageLoaded = true; taiDoLuong(); }
    if (which === 'khoa') taiKhoaMuc();
  }

  // ---- KHOÁ MỤC (10/08/2026) — chỉ Super Admin --------------------------------
  // Chủ tool tự khoá từng phần của Tool khi đang cập nhật, không phải sửa code + push.
  // ⚠️ Dùng UPDATE chứ KHÔNG upsert: 4 dòng đã được SQL tạo sẵn, và upsert =
  // `INSERT ... ON CONFLICT DO UPDATE` phải ĐỌC hàng để dò trùng khoá → rất dễ vướng
  // RLS (đúng lỗi đã làm tính năng "đang online" chết câm suốt 8 ngày).
  const MUC_KHOA = [
    { ma: 'proposal', ten: 'Proposal / Báo giá',        mo: 'Mẫu báo giá 4 hãng — phần sale dùng nhiều nhất' },
    { ma: 'brochure', ten: 'Brochure / Tài liệu',       mo: 'Thư viện tài liệu tải về' },
    { ma: 'appform',  ten: 'Application Form / Biểu mẫu', mo: 'Biểu mẫu đăng ký của các hãng' },
    { ma: 'namecard', ten: 'Name Card / Danh thiếp',    mo: 'Mẫu danh thiếp cá nhân' },
    { ma: 'compare',  ten: 'Compare / So sánh quyền lợi', mo: 'Bảng so sánh 16 hãng' },
    { ma: 'sms',      ten: 'SMS / Tin nhắn mẫu',         mo: 'Ảnh tin nhắn mẫu sale gửi khách' },
    { ma: 'tinhtuoi', ten: 'Age / Tính tuổi',   mo: 'Nhập ngày sinh → tuổi thật + tuổi báo giá' },
    { ma: 'tinhphi',  ten: 'Quote / Tính phí',  mo: 'Tra phí Term Life theo tuổi / mệnh giá / hạng' }
  ];

  // NẤC PHÁT HÀNH (10/08/2026) — luật "tính năng mới build dưới quyền super admin"
  // (CLAUDE.md mục 2b-bis). Khác hẳn công tắc Khoá: khoá là "vẫn thấy mục nhưng đang
  // cập nhật", nấc là "chưa tới lượt anh thấy, mục không hiện chút nào".
  const NAC = [
    { ma: 'super', ten: 'Chỉ mình tôi',  mo: 'Đang xây — chỉ Super Admin thấy' },
    { ma: 'admin', ten: '+ Admin',       mo: 'Đang thử — thêm 11 Admin thấy' },
    { ma: 'all',   ten: 'Cả đội',        mo: 'Đã phát hành — 77 Nhân viên thấy' }
  ];
  let khoaRows = {};

  async function taiKhoaMuc() {
    const bao = $('khoa-msg');
    // `hien_cho` có thể chưa tồn tại (chưa chạy migration) → thử cột đầy đủ trước,
    // lỗi thì lùi về bộ cột cũ để tab vẫn dùng được cho phần Khoá.
    let { data, error } = await sb.from('khoa_muc').select('muc, khoa, loi_nhan, cap_nhat_luc, hien_cho');
    if (error) ({ data, error } = await sb.from('khoa_muc').select('muc, khoa, loi_nhan, cap_nhat_luc'));
    if (error) {
      bao.style.display = ''; 
      bao.textContent = /khoa_muc/.test(error.message || '') && /does not exist|schema cache/i.test(error.message || '')
        ? "Chưa có bảng 'khoa_muc' — chạy phần KHOÁ MỤC trong supabase/schema.sql."
        : error.message;
      return;
    }
    bao.style.display = 'none';
    khoaRows = {};
    (data || []).forEach(function (r) { khoaRows[r.muc] = r; });
    veKhoaMuc();
  }

  // MỘT MỤC = MỘT HÀNG (chủ tool 10/08/2026: "làm gọn gàng lại, mỗi 1 phần là 1 hàng").
  // Trước đó mỗi mục chiếm HAI tầng (tên + công tắc Khoá ở trên, dải "Ai được thấy" ở
  // dưới) → 7 mục thành 14 tầng, phải cuộn mới thấy hết. Nay tất cả nằm trên một dòng:
  //   tên+mô tả  |  dải 3 nấc  |  trạng thái  |  nút Khoá
  // Ô lời nhắn vẫn xuống dòng riêng, nhưng nó CHỈ hiện khi mục đang khoá nên không
  // làm dài danh sách ở trạng thái thường.
  function veKhoaMuc() {
    $('khoa-list').innerHTML = MUC_KHOA.map(function (m) {
      const r = khoaRows[m.ma] || { khoa: false, loi_nhan: '' };
      // Ô lời nhắn CHỈ hiện khi mục đang khoá — lúc mở thì nó vô nghĩa, bày ra chỉ tổ rối.
      const oNhan = r.khoa
        ? '<div class="khoa-nhan">' +
            '<label for="nhan-' + m.ma + '">Lời nhắn hiện cho nhân viên</label>' +
            '<input id="nhan-' + m.ma + '" type="text" data-nhan="' + m.ma + '" maxlength="140" ' +
              'value="' + esc(r.loi_nhan || '') + '" ' +
              'placeholder="Để trống = dùng câu mặc định">' +
          '</div>'
        : '';
      // ☠️ Mục CHƯA CÓ DÒNG trong bảng: đừng vẽ như thể nấc là 'all'. Tool đọc mặc
      // định trong code (tính năng mới = 'super') nên hai bên sẽ nói ngược nhau, mà
      // bấm nút cũng vô ích — UPDATE không có dòng nào để sửa và trả 204 không báo lỗi.
      const chuaCoDong = !khoaRows[m.ma];
      const nacHienTai = r.hien_cho || 'all';
      // Dải 3 nấc. Bỏ nhãn "AI ĐƯỢC THẤY" và câu mô tả dài — cả hai nói lại đúng thứ
      // ba cái nút đã nói. Giữ mô tả trong `title` cho ai cần rà lại.
      const daiNac = chuaCoDong
        ? '<span class="khoa-nac-thieu" title="Chạy phần KHOÁ MỤC trong supabase/schema.sql rồi tải lại trang">' +
            'Chưa có dòng trong bảng</span>'
        : '<div class="khoa-nac-nut" role="group" aria-label="Ai được thấy mục này">' +
            NAC.map(function (n) {
              return '<button type="button" class="khoa-nac-o' + (n.ma === nacHienTai ? ' dang-chon' : '') +
                '" data-nac="' + n.ma + '" data-nac-muc="' + m.ma + '" title="' + esc(n.mo) + '"' +
                (n.ma === nacHienTai ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
                esc(n.ten) + '</button>';
            }).join('') +
          '</div>';

      return '<div class="khoa-row' + (r.khoa ? ' is-locked' : '') +
        (nacHienTai !== 'all' || chuaCoDong ? ' dang-xay' : '') + '" data-muc="' + m.ma + '">' +
        '<div class="khoa-info">' +
          '<b>' + esc(m.ten) + '</b>' +
          '<span>' + esc(m.mo) + '</span>' +
        '</div>' +
        daiNac +
        '<span class="khoa-trangthai">' + (r.khoa ? 'Đang khoá' : 'Đang mở') + '</span>' +
        '<button type="button" class="btn btn-sm ' + (r.khoa ? 'btn-primary' : 'btn-secondary') +
          '" data-bat="' + m.ma + '">' + (r.khoa ? 'Mở lại' : 'Khoá') + '</button>' +
        oNhan +
      '</div>';
    }).join('');
  }

  // Lưu lời nhắn khi rời ô (blur) — không lưu theo từng phím gõ, đỡ gọi máy chủ liên tục.
  async function luuLoiNhan(ma, chu) {
    const cu = (khoaRows[ma] && khoaRows[ma].loi_nhan) || '';
    if (chu === cu) return;                        // không đổi thì đừng gọi máy chủ
    const { error } = await sb.from('khoa_muc')
      .update({ loi_nhan: chu, cap_nhat_luc: new Date().toISOString(), cap_nhat_boi: me.id })
      .eq('muc', ma);
    if (error) { await showAppAlert(error.message, { title: 'Không lưu được lời nhắn', tone: 'danger' }); return; }
    if (khoaRows[ma]) khoaRows[ma].loi_nhan = chu;   // giữ trong bộ nhớ, khỏi vẽ lại cả bảng
  }

  // Đổi nấc phát hành. Nới ra (cho thêm người thấy) mới hỏi lại — siết vào thì cứ làm,
  // vì siết là hành động an toàn, còn hỏi mỗi lần chỉ tổ phiền.
  async function doiNac(ma, nac) {
    const m = MUC_KHOA.find(function (x) { return x.ma === ma; });
    const cu = (khoaRows[ma] && khoaRows[ma].hien_cho) || 'all';
    if (cu === nac) return;
    const thuTu = { super: 0, admin: 1, all: 2 };
    if (thuTu[nac] > thuTu[cu]) {
      const ai = nac === 'all' ? '77 Nhân viên' : '11 Admin';
      if (!(await showAppConfirm(
        'Cho ' + ai + ' thấy "' + m.ten + '"?\n\n' +
        'Chỉ mở khi mục này đã dùng được thật — họ sẽ đem đi làm việc với khách ngay.',
        { title: 'Mở rộng người thấy', tone: 'warning', confirmText: 'Cho thấy' }))) return;
    }

    setLoading(true);
    const { error } = await sb.from('khoa_muc')
      .update({ hien_cho: nac, cap_nhat_luc: new Date().toISOString(), cap_nhat_boi: me.id })
      .eq('muc', ma);
    // ⚠️ "không lỗi" KHÔNG có nghĩa là đã ghi — đọc lại giá trị thật (bài học 31/07).
    await taiKhoaMuc();
    setLoading(false);
    if (error) {
      await showAppAlert(/hien_cho/.test(error.message || '')
        ? "Bảng chưa có cột 'hien_cho' — chạy lại phần KHOÁ MỤC trong supabase/schema.sql."
        : error.message, { title: 'Không đổi được nấc', tone: 'danger' });
      return;
    }
    const thuc = (khoaRows[ma] && khoaRows[ma].hien_cho) || 'all';
    if (thuc !== nac) {
      await showAppAlert('Máy chủ không nhận thay đổi này — kiểm tra lại quyền.',
        { title: 'Chưa đổi được', tone: 'danger' });
    }
  }

  async function batKhoa(ma, khoa) {
    const m = MUC_KHOA.find(function (x) { return x.ma === ma; });
    if (khoa && !(await showAppConfirm(
      'Khoá "' + m.ten + '"?' + '\n\n' +
      '77 Nhân viên sẽ KHÔNG mở được mục này cho tới khi anh mở lại.\n' +
      'Anh và các Admin vẫn dùng bình thường.',
      { title: 'Khoá mục', tone: 'warning', confirmText: 'Khoá' }))) return;

    setLoading(true);
    const { error } = await sb.from('khoa_muc')
      .update({ khoa: khoa, cap_nhat_luc: new Date().toISOString(), cap_nhat_boi: me.id })
      .eq('muc', ma);
    // ⚠️ "không lỗi" KHÔNG có nghĩa là đã ghi (bài học 31/07: RLS lọc hết mà vẫn trả 204).
    // Đọc lại giá trị thật rồi mới vẽ lại.
    await taiKhoaMuc();
    setLoading(false);
    if (error) { await showAppAlert(error.message, { title: 'Không đổi được', tone: 'danger' }); return; }
    const thuc = khoaRows[ma] && khoaRows[ma].khoa;
    if (thuc !== khoa) {
      await showAppAlert('Máy chủ không nhận thay đổi này — kiểm tra lại quyền Super Admin.',
        { title: 'Chưa đổi được', tone: 'danger' });
    }
  }

  // ---- ☠️ ĐANG ONLINE (presence) — GỠ HẲN 10/08/2026 -------------------------
  // Chủ tool: "tracking online và từng người đến ngày hôm nay thì nó đã hoàn thành
  // nhiệm vụ rồi, anh không cần nó nữa". Gỡ ~120 dòng: taiOnline / veOnlineBar /
  // veOnlineChiTiet / modal + nhịp poll 30 giây.
  // Đây là gỡ CÓ CHỦ ĐÍCH, không phải sót. Bảng `presence` trên Supabase và
  // heartbeat trong js/portal/auth.js vẫn còn (xem chú thích ở đó) — muốn bật lại
  // thì dựng lại phần đọc, dữ liệu không mất.

  async function taiDoLuong() {
    const msg = $('usage-msg');
    msg.style.display = 'none';
    const from90 = new Date(Date.now() - 90 * NGAY_MS).toISOString();  // nạp 90 ngày, lọc khoảng ở client
    // Kèm 'label' (tải gì) + 'detail' (đã điền gì) + 'anh' (ảnh bản đã xuất) — cột thêm dần
    // qua các đợt; chưa chạy SQL thì TỰ LÙI về bộ cột cũ để trang vẫn chạy, không trắng.
    let resp = await sb.from('usage_events').select('user_id, kind, at, label, detail, anh').gte('at', from90).order('at', { ascending: false });
    if (resp.error && /(label|detail|anh|column)/i.test(resp.error.message || '')) {
      resp = await sb.from('usage_events').select('user_id, kind, at, label, detail').gte('at', from90).order('at', { ascending: false });
    }
    if (resp.error && /(label|detail|column)/i.test(resp.error.message || '')) {
      resp = await sb.from('usage_events').select('user_id, kind, at, label').gte('at', from90).order('at', { ascending: false });
      if (resp.error) {
        resp = await sb.from('usage_events').select('user_id, kind, at').gte('at', from90).order('at', { ascending: false });
      }
    }
    const { data, error } = resp;

    if (error) {
      const chuaCoBang = /usage_events/.test(error.message || '') &&
        /(does not exist|could not find|schema cache)/i.test(error.message || '');
      msg.className = 'notice error';
      msg.innerHTML = '<span>⚠️</span><div>' + (chuaCoBang
        ? 'Bảng <code>usage_events</code> chưa được tạo. Chạy phần SQL mới trong <code>supabase/schema.sql</code> (Supabase → SQL Editor → Run).'
        : 'Không đọc được dữ liệu sử dụng: ' + esc(error.message)) + '</div>';
      msg.style.display = 'flex';
      usageEvents = [];
    } else {
      usageEvents = data || [];
    }

    // 27/07: bỏ veThe() + 4 thẻ "Hôm nay" cố định — số liệu giờ CHỈ hiện ở dải
    // .usage-stats và đổi theo khoảng đang chọn (preset "Hôm nay" cho lại đúng
    // con số cũ). Gỡ phần tử khỏi HTML thì phải gỡ luôn chỗ JS ghi vào nó.
    await taiBanDoThuVien();   // cần TRƯỚC veTopMau: tra đường dẫn để gắn đúng nhãn Brochure/So sánh
    await bandamKhoaRows();    // cần TRƯỚC veKhoiCongCu: để in đúng nấc "đang mở cho ai"
    khoiTaoKhoang();      // đặt khoảng mặc định 14 ngày + min/max cho ô ngày
    apDungKhoang();       // lọc theo khoảng → số tổng + biểu đồ + bảng
    datKhoangCongCu(khoangCongCu);   // khối "Công cụ tra cứu" — khoảng RIÊNG, mặc định 30 ngày
  }

  // Đặt khoảng mặc định 14 ngày (lần đầu). Hai ô nhập ngày đã gỡ 31/07 nên không còn
  // phải đồng bộ giá trị/min/max cho chúng nữa.
  function khoiTaoKhoang() {
    const homNay = batDauNgay(new Date());
    if (!khoangTo) { khoangTo = homNay; khoangFrom = new Date(homNay.getTime() - 13 * NGAY_MS); }
    danhDauPreset(soNgayCuaKhoang());
  }

  function soNgayCuaKhoang() {
    if (!khoangFrom || !khoangTo) return 0;
    return Math.round((batDauNgay(khoangTo).getTime() - batDauNgay(khoangFrom).getTime()) / NGAY_MS) + 1;
  }

  // Mốc đang chọn phải NHÌN LÀ BIẾT. Bỏ hai ô ngày rồi thì dải nút này là chỉ báo duy
  // nhất cho "đang xem khoảng nào" — dựa vào viền focus là sai, bấm ra chỗ khác một cái
  // là mất dấu.
  function danhDauPreset(soNgay) {
    document.querySelectorAll('#usage-presets [data-preset]').forEach(function (b) {
      b.classList.toggle('is-on', parseInt(b.getAttribute('data-preset'), 10) === soNgay);
    });
  }

  function datPreset(soNgay) {
    const homNay = batDauNgay(new Date());
    khoangTo = homNay;
    khoangFrom = new Date(homNay.getTime() - (soNgay - 1) * NGAY_MS);
    danhDauPreset(soNgay);
    apDungKhoang();
  }

  // Lọc usageEvents theo [khoangFrom, khoangTo] → số tổng trong hộp + biểu đồ + bảng.
  function apDungKhoang() {
    if (!khoangFrom || !khoangTo) return;
    const f = batDauNgay(khoangFrom).getTime();
    const t = batDauNgay(khoangTo).getTime() + NGAY_MS - 1;   // tới hết ngày "đến"
    const trong = usageEvents.filter(function (e) { const ts = new Date(e.at).getTime(); return ts >= f && ts <= t; });

    const login = new Set(), tool = new Set(), act = new Set();
    let dl = 0;   // tải về đếm theo LƯỢT trong khoảng
    let vw = 0;   // xem mẫu/brochure đếm theo LƯỢT trong khoảng
    const pmap = {}; (toanBo || []).forEach(function (p) { pmap[p.id] = p; });
    const theoNguoi = {}, theoNgay = {}, theoMau = {};
    trong.forEach(function (e) {
      const ts = new Date(e.at).getTime();
      if (e.kind === 'login') login.add(e.user_id);
      if (e.kind === 'open_tool') tool.add(e.user_id);
      if (e.kind === 'download') dl++;
      if (e.kind === 'view') { vw++; const nh = e.label || '(không rõ)'; theoMau[nh] = (theoMau[nh] || 0) + 1; }
      act.add(e.user_id);
      const u = theoNguoi[e.user_id] || (theoNguoi[e.user_id] = { lastLogin: 0, lastTool: 0, tool: 0, download: 0 });
      if (e.kind === 'login') u.lastLogin = Math.max(u.lastLogin, ts);
      if (e.kind === 'open_tool') { u.lastTool = Math.max(u.lastTool, ts); u.tool++; }
      if (e.kind === 'download') u.download++;
      const k = ngayKey(ts); (theoNgay[k] || (theoNgay[k] = new Set())).add(e.user_id);
    });

    $('uk-download').textContent = dl;
    $('uk-view').textContent = vw;
    // Thẻ "Lượt tính tuổi" — đếm TỪNG LẦN BẤM TÍNH (kind 'calc'), không gộp 15 phút.
    // (Ba thẻ Đăng nhập / Mở công cụ / Người hoạt động gỡ 18/08 theo yêu cầu chủ tool.)
    $('uk-calc').textContent = trong.filter(function (e) { return e.kind === 'calc'; }).length;

    const soNgay = Math.round((batDauNgay(khoangTo).getTime() - batDauNgay(khoangFrom).getTime()) / NGAY_MS) + 1;
    // Bộ chọn ngày nằm trong khối này nhưng lọc CẢ TRANG → phải nói ra, kẻo tưởng
    // nó chỉ đổi mỗi biểu đồ (chủ tool 27/07 dời bộ chọn xuống đây).
    // ☠️ CHỈ khoảng ngày. Bỏ "N ngày" (nút mốc đã tô tím nói rồi) và "áp dụng cho cả
    // trang" (đúng với MỌI khối, nói ở đây là thừa). Chủ tool 31/07: "không ai đọc dòng
    // text phụ mà dài như thế này".
    $('usage-chart-range').textContent = fmtNgay(khoangFrom) + ' – ' + fmtNgay(khoangTo);

    veBieuDoKhoang(theoNgay, khoangFrom, soNgay);
    veTopMau(theoMau);
    // veBangNguoi() gỡ 10/08/2026 — `theoNguoi` vẫn tính vì popup "đã tải gì" dùng.
  }

  // Gọi ĐÚNG TÊN SẢN PHẨM (chủ tool 27/07: "mẫu và tài liệu là gì, phải để Brochure
  // hoặc Proposal thì anh mới biết"). KHÔNG đổi mù: 'Mẫu' cũ gộp cả "Sale Name Card"
  // (không phải Proposal), 'Tài liệu' cũ gộp cả bảng so sánh quyền lợi. Với tài liệu
  // thì tra ĐƯỜNG DẪN thật trong thư viện để biết nó nằm ở mục nào.
  function phanLoai(nhan, laTaiLieu) {
    if (laTaiLieu) {
      const ten = String(nhan).replace(/^Tài liệu:\s*/, '').trim();
      const duongDan = (thuVienMap && thuVienMap[ten]) || '';
      if (/^Bang so sanh/i.test(duongDan)) return { ten: 'So sánh', cls: 'top-tag-ss' };
      if (/^Brochure\//i.test(duongDan)) return { ten: 'Brochure', cls: 'top-tag-doc' };
      return { ten: 'Brochure', cls: 'top-tag-doc' };   // chưa tra được thì vẫn là thư viện tải về
    }
    // Mẫu mở trong Tool: Name Card là loại riêng, còn lại là Proposal (báo giá)
    if (/name\s*card/i.test(nhan)) return { ten: 'Name Card', cls: 'top-tag-nc' };
    // ☠️ Hai công cụ tra cứu (Age / Quote) KHÔNG phải Proposal — chúng không sinh ra
    // bản vẽ nào để gửi khách. Dán nhãn "Proposal" là đọc bảng xếp hạng ra sai:
    // "97 lượt NLG—IUL" và "8 lượt Tính tuổi" là hai loại việc khác hẳn nhau.
    if (/^(Age|Quote)\s*\//i.test(nhan) || /tính (tuổi|phí) bảo hiểm/i.test(nhan)) {
      return { ten: 'Công cụ', cls: 'top-tag-cc' };
    }
    return { ten: 'Proposal', cls: 'top-tag-mau' };
  }

  // Xếp hạng "Proposal / Brochure chạy nhiều nhất" trong khoảng (N2). Đếm theo label 'view'.
  function veTopMau(theoMau) {
    const arr = Object.keys(theoMau)
      .map(function (k) { return { ten: k, n: theoMau[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
    const box = $('usage-top-rows');
    if (!arr.length) {
      box.innerHTML = '';
      $('usage-top-empty').style.display = 'flex';
      return;
    }
    $('usage-top-empty').style.display = 'none';
    const max = arr[0].n || 1;
    box.innerHTML = arr.slice(0, 12).map(function (m, i) {
      const pct = Math.max(Math.round((m.n / max) * 100), 4);
      const laTaiLieu = /^Tài liệu:/.test(m.ten);
      const ten = esc(laTaiLieu ? m.ten.replace(/^Tài liệu:\s*/, '') : m.ten);
      const loai = phanLoai(m.ten, laTaiLieu);
      const tag = '<span class="top-tag ' + loai.cls + '">' + loai.ten + '</span>';
      return '<div class="top-row">' +
        '<span class="top-rank' + (i < 3 ? ' is-top' : '') + '">' + (i + 1) + '</span>' +
        '<span class="top-name" title="' + ten + '">' + tag + ten + '</span>' +
        '<span class="top-barwrap"><span class="top-bar" style="width:' + pct + '%"></span></span>' +
        '<span class="top-n">' + m.n + '</span>' +
      '</div>';
    }).join('');
  }

  function veBieuDoKhoang(theoNgay, from, soNgay) {
    const start = batDauNgay(from).getTime();
    const cols = [];
    let max = 1;
    for (let i = 0; i < soNgay; i++) {
      const d = new Date(start + i * NGAY_MS);
      const set = theoNgay[ngayKey(d.getTime())];
      const n = set ? set.size : 0;
      if (n > max) max = n;
      cols.push({ d: d, n: n });
    }
    // ☠️ CẮT PHẦN ĐẦU CHƯA TỪNG CÓ SỐ LIỆU (chủ tool 31/07: "biểu đồ gì đây em",
    // "thấy gớm vậy em"). Hệ đo lường mới bật 23/07/2026 nên chọn 30 ngày là 21 cột
    // rỗng, chọn 60 ngày là 51 cột rỗng — cụm cột dồn hết vào góc phải, không đọc ra gì.
    // Trước đó chỉ dán thêm một dòng ghi chú: đó là VÁ BỀ MẶT, mảng trắng vẫn nguyên.
    // Nay bỏ hẳn những ngày TRƯỚC ngày đầu tiên có ghi nhận.
    // ⚠️ CHỈ cắt phần ĐẦU. Ngày 0 người nằm GIỮA vùng đã có số liệu là thông tin thật
    // ("hôm đó không ai dùng") — cắt đi là nói dối biểu đồ.
    const iDau = cols.findIndex(function (c) { return c.n > 0; });
    const daCat = iDau > 0 ? iDau : 0;
    const veCols = daCat ? cols.slice(daCat) : cols;

    // Lời giải thích đặt NGAY DƯỚI dải nút mốc, không nhét vào dòng phụ đề trên cùng:
    // người dùng vừa bấm nút xong thì mắt đang ở đó, và một thông điệp chỉ nói MỘT nơi.
    const oNote = $('usage-range-note');
    if (oNote) {
      // ☠️ BỎ 18/08/2026 (chủ tool: "move mấy cái vô nghĩa này ra đi em"): dòng
      // "Số liệu từ <ngày>" nói lại đúng thứ trục ngày của biểu đồ đã hiện — cột đầu
      // tiên MANG SẴN nhãn ngày đó. Giữ lại đúng ca không nhìn ra được: rỗng hoàn toàn.
      if (iDau === -1) {
        oNote.textContent = 'Chưa có số liệu nào trong khoảng này.';
        oNote.hidden = false;
      } else {
        oNote.hidden = true;
      }
    }

    // Nhiều cột thì thưa nhãn ngày cho đỡ rối; luôn hiện nhãn cột cuối.
    // Tính theo SỐ CỘT THỰC SỰ VẼ, không theo soNgay — cắt xong mà vẫn thưa nhãn theo
    // 60 ngày thì 9 cột chỉ còn 2 nhãn.
    const soCot = veCols.length;
    const step = soCot <= 16 ? 1 : Math.ceil(soCot / 12);
    const chart = $('usage-chart');

    // ☠️ `gap: 6px` CỐ ĐỊNH là thủ phạm làm cột mảnh như cây kim khi khoảng dài
    // (đo 31/07 với 30 cột / bề rộng 1240px): 29 khe × 6px ăn mất 174px, mỗi ô còn
    // 15,9px, thanh `width: 66%` chỉ còn **11px** trong khi cao 136px — tỉ lệ 12,3:1.
    // Khe VÀ trần bề rộng thanh đều co giãn theo số cột: ít cột thì cho thanh dày hẳn
    // (khoảng rộng mà thanh vẫn 34px thì nhìn lỏng lẻo), nhiều cột thì siết lại.
    chart.style.gap = (soCot > 20 ? 3 : soCot > 14 ? 4 : 6) + 'px';
    chart.style.setProperty('--uc-bar-max', (soCot <= 10 ? 46 : soCot <= 20 ? 38 : 34) + 'px');

    chart.innerHTML = veCols.map(function (c, idx) {
      const h = c.n ? Math.max(Math.round((c.n / max) * 100), 6) : 0;
      const nhan = c.d.getDate() + '/' + (c.d.getMonth() + 1);
      const hienX = (idx % step === 0) || idx === cols.length - 1;
      // Ngày không có ai hoạt động thì KHÔNG vẽ gì. Trước đây vẫn vẽ một thanh
      // `min-height: 3px` màu xám → 21 gạch mờ rải khắp đáy, nhìn như nhiễu chứ
      // không đọc ra thông tin gì (khoảng trống đã tự nói "ngày này không ai dùng").
      const thanh = c.n ? '<span class="uc-bar" style="height:' + h + '%"></span>' : '';
      return '<div class="uc-col" title="' + nhan + ': ' + c.n + ' người">' +
               '<div class="uc-barwrap">' +
                 '<span class="uc-n">' + (c.n || '') + '</span>' +
                 thanh +
               '</div>' +
               '<span class="uc-x">' + (hienX ? c.d.getDate() : '') + '</span>' +
             '</div>';
    }).join('');
  }

  // ==========================================================================
  // KHỐI "CÔNG CỤ TRA CỨU" — Tính tuổi & Tính phí (12/08/2026)
  //
  // Chủ tool: *"anh cần thêm cột đo lường về tính tuổi và tính phí… các bạn sale truy
  // cập ra sao là được, anh cần một con số tổng quan và một biểu đồ 30 ngày và 60 ngày"*.
  //
  // ☠️ BA THỨ PHẢI NÓI RA TRÊN GIAO DIỆN, KHÔNG THÌ ĐỌC SỐ RA SAI:
  //
  // 1. **Có THROTTLE 15 phút** (USAGE_THROTTLE_MS.view trong auth.js). Cùng một người
  //    mở lại trong 15 phút chỉ ghi MỘT sự kiện. Nên con số là "lượt dùng", KHÔNG phải
  //    "số lần bấm". Ghi sai nhãn là chủ tool tưởng sale dùng ít hơn thực tế.
  //
  // 2. **Hai mục đang ở HAI NẤC KHÁC NHAU** (chủ tool xác nhận 12/08/2026):
  //    Tính tuổi mở cho `user` (cả đội) · Tính phí còn ở `admin`.
  //    → Số Tính phí thấp là ĐÚNG THEO THIẾT KẾ, không phải "sale chê". Vì vậy khối này
  //      đọc `khoa_muc.hien_cho` rồi in thẳng nấc lên cạnh mỗi con số. Thiếu dòng đó là
  //      mời người đọc kết luận sai về đội ngũ.
  //
  // 3. **Tách SALE với ADMIN.** Câu hỏi của chủ tool là "SALE truy cập ra sao", mà admin
  //    dùng thử cũng sinh sự kiện. Gộp chung thì 8 lượt của chính chủ tool trông như
  //    8 lượt của đội. Nên mỗi công cụ hiện cả hai con số.
  //
  // ⚠️ Khối này có khoảng ngày RIÊNG (30/60), không dùng khoangFrom/khoangTo của trang.
  const CONG_CU_DO = [
    { ma: 'tinhtuoi', nhan: 'Age / Tính tuổi',  ten: 'Tính tuổi' },
    { ma: 'tinhphi',  nhan: 'Quote / Tính phí', ten: 'Tính phí'  }
  ];
  const NAC_TEN = { super: 'chỉ Super Admin', admin: 'Admin trở lên', all: 'cả đội' };
  let khoangCongCu = 30;      // mặc định 30 ngày

  function datKhoangCongCu(soNgay) {
    khoangCongCu = soNgay;
    document.querySelectorAll('#usage-tools-presets [data-tpreset]').forEach(function (b) {
      b.classList.toggle('is-on', parseInt(b.getAttribute('data-tpreset'), 10) === soNgay);
    });
    veKhoiCongCu();
  }

  // `khoa_muc` do tab "Khoá mục" nạp. Tab Đo lường có thể mở TRƯỚC tab đó → tự nạp nếu
  // còn rỗng. Đọc hỏng thì thôi, chỉ mất dòng ghi nấc chứ không làm trắng cả khối.
  async function bandamKhoaRows() {
    if (Object.keys(khoaRows).length) return;
    try {
      let { data, error } = await sb.from('khoa_muc').select('muc, hien_cho');
      if (error || !data) return;
      data.forEach(function (r) { if (!khoaRows[r.muc]) khoaRows[r.muc] = r; });
    } catch (e) { /* bỏ qua */ }
  }

  function veKhoiCongCu() {
    const oStats = $('usage-tools-stats');
    if (!oStats) return;
    const homNay = batDauNgay(new Date());
    const from = new Date(homNay.getTime() - (khoangCongCu - 1) * NGAY_MS);
    const f = from.getTime(), t = homNay.getTime() + NGAY_MS - 1;

    // Vai trò từng người — để tách SALE với ADMIN. Không có hồ sơ thì coi như sale
    // (hỏng về phía "đếm là sale" an toàn hơn: không thổi phồng con số của đội).
    const vaiTro = {};
    (toanBo || []).forEach(function (p) { vaiTro[p.id] = p.role || 'user'; });

    const so = {};
    CONG_CU_DO.forEach(function (c) {
      so[c.ma] = { luot: 0, luotSale: 0, nguoi: new Set(), nguoiSale: new Set(), theoNgay: {} };
    });

    usageEvents.forEach(function (e) {
      if (e.kind !== 'view') return;
      const ts = new Date(e.at).getTime();
      if (ts < f || ts > t) return;
      let cc = null;
      for (let i = 0; i < CONG_CU_DO.length; i++) if (e.label === CONG_CU_DO[i].nhan) cc = CONG_CU_DO[i];
      if (!cc) return;
      const o = so[cc.ma];
      o.luot++; o.nguoi.add(e.user_id);
      if ((vaiTro[e.user_id] || 'user') === 'user') { o.luotSale++; o.nguoiSale.add(e.user_id); }
      const k = ngayKey(ts);
      (o.theoNgay[k] || (o.theoNgay[k] = { tinhtuoi: 0, tinhphi: 0 }))[cc.ma]++;
    });

    oStats.innerHTML = CONG_CU_DO.map(function (c) {
      const o = so[c.ma];
      const nac = (khoaRows[c.ma] && khoaRows[c.ma].hien_cho) || 'all';
      // ☠️ Mục chưa mở cho sale thì SỐ SALE luôn bằng 0 — phải nói vì sao, không thì
      // chủ tool đọc thành "sale không dùng".
      const chuaMo = nac !== 'all';
      return '<div class="ucc-stat ucc-' + c.ma + '">' +
               '<div class="ucc-stat-head">' +
                 '<span class="ucc-dot"></span>' +
                 '<span class="ucc-name">' + esc(c.ten) + '</span>' +
                 // Chỉ hiện khi mục CHƯA mở cho cả đội — lúc đó nó giải thích vì sao
                 // số sale bằng 0. Mở rồi thì nhãn "cả đội" là chữ thừa (18/08/2026).
                 (chuaMo ? '<span class="ucc-nac is-warn">Đang mở cho: ' +
                   esc(NAC_TEN[nac] || nac) + '</span>' : '') +
               '</div>' +
               // Số lượt và số người CÙNG MỘT DÒNG — tách hai dòng chỉ làm thẻ cao thêm.
               '<div class="ucc-big">' + o.luot + '<span class="ucc-unit">lượt</span>' +
                 '<span class="ucc-sub">· ' + o.nguoi.size + ' người</span></div>' +
               '<div class="ucc-sale' + (chuaMo ? ' is-muted' : '') + '">' +
                 (chuaMo
                   ? 'Sale chưa vào được mục này'
                   : '<b>' + o.luotSale + '</b> lượt của sale · <b>' + o.nguoiSale.size + '</b>/' +
                     demSale() + ' nhân viên') +
               '</div>' +
             '</div>';
    }).join('');

    veBieuDoCongCu(so, from, khoangCongCu);
  }

  // ---- TỪNG LƯỢT TÍNH TUỔI (18/08/2026) ------------------------------------
  // Chủ tool: "anh muốn tracking công cụ tính tuổi xem sale nào chạy và chạy cái gì".
  // Nguồn: usage_events kind='calc' (KHÔNG throttle — mỗi lần bấm Tính là một dòng),
  // detail = { ngaysinh, tuoi_that, tuoi_bh, ngay_tang, con_ngay, kieu_go }.
  // ⚠️ Dữ liệu cũ hơn 18/08 KHÔNG có kind này → khối tự ẩn khi rỗng, đó là đúng chứ
  // không phải hỏng. Đừng "sửa" bằng cách suy ngược từ kind 'view'.
  // Popup mở từ thẻ "Lượt tính tuổi" — dùng KHOẢNG CHUNG của trang (14/30/60 ngày),
  // đúng như popup Tải về, để số trong popup luôn khớp số trên thẻ.
  function moChiTietTinhTuoi() {
    if (!khoangFrom || !khoangTo) return;
    veBangTinhTuoi();
    $('uct-backdrop').classList.add('open');
    $('uct-backdrop').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const oTim = $('usage-calc-tim');
    if (oTim) { oTim.value = ''; loc(''); oTim.focus(); }
  }
  function dongChiTietTinhTuoi() {
    $('uct-backdrop').classList.remove('open');
    $('uct-backdrop').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function loc(q) {
    const rows = document.querySelectorAll('#usage-calc-rows .uct-row[data-tim]');
    let hien = 0;
    rows.forEach(function (r) {
      const khop = !q || r.getAttribute('data-tim').indexOf(q) !== -1;
      r.hidden = !khop; if (khop) hien++;
    });
    const oHit = $('uct-hit');
    if (oHit) oHit.textContent = q ? hien + '/' + rows.length + ' lượt' : '';
  }

  function veBangTinhTuoi() {
    const oBlock = $('usage-calc-block');
    if (!oBlock) return;
    const f = batDauNgay(khoangFrom).getTime();
    const t = batDauNgay(khoangTo).getTime() + NGAY_MS - 1;
    const vaiTro = {};
    const pmap = {};
    (toanBo || []).forEach(function (p) { pmap[p.id] = p; vaiTro[p.id] = p.role || 'user'; });

    const calcRows = usageEvents.filter(function (e) {
      if (e.kind !== 'calc') return false;
      const ts = new Date(e.at).getTime();
      return ts >= f && ts <= t;
    }).sort(function (a, b) { return new Date(b.at).getTime() - new Date(a.at).getTime(); });

    $('uct-range').textContent = fmtNgay(khoangFrom) + ' – ' + fmtNgay(khoangTo) +
      ' · ' + calcRows.length + ' lượt';
    $('usage-calc-empty').style.display = calcRows.length ? 'none' : 'flex';

    const head = '<div class="uct-row is-head">' +
        '<span>Sale</span><span>Ngày sinh khách</span><span>Tuổi thật / BH</span>' +
        '<span class="uct-ngaytang">Ngày tăng tuổi</span><span class="uct-luc">Lúc</span>' +
      '</div>';

    $('usage-calc-rows').innerHTML = calcRows.length ? head + calcRows.map(function (e) {
      const p = pmap[e.user_id] || {};
      const ten = p.full_name || p.email || '(không rõ)';
      const vai = (vaiTro[e.user_id] || 'user');
      const d = (e.detail && typeof e.detail === 'object' && !Array.isArray(e.detail)) ? e.detail : {};
      // Ngày lưu dạng ISO (2026-08-18) → bày ra kiểu Mỹ MM/DD/YYYY, đúng kiểu sale gõ
      // trong tool. Thiếu/hỏng thì để "—", đừng dựng số giả.
      const bay = function (iso) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
        return m ? (m[2] + '/' + m[3] + '/' + m[1]) : '—';
      };
      const gan = typeof d.con_ngay === 'number' && d.con_ngay <= 30;
      return '<div class="uct-row" data-tim="' + esc(khongDau(ten + ' ' + (p.email || ''))) + '">' +
        '<span class="uct-ten">' + esc(ten) +
          (vai !== 'user' ? '<span class="uct-vai">' + esc(vai === 'super_admin' ? 'Super' : 'Admin') + '</span>' : '') +
        '</span>' +
        '<span class="uct-num">' + bay(d.ngaysinh) + '</span>' +
        '<span class="uct-num">' + (d.tuoi_that != null ? d.tuoi_that : '—') +
          ' / <b class="uct-bh">' + (d.tuoi_bh != null ? d.tuoi_bh : '—') + '</b></span>' +
        '<span class="uct-num uct-ngaytang' + (gan ? ' uct-gan' : '') + '">' + bay(d.ngay_tang) +
          (gan ? ' · còn ' + d.con_ngay + 'n' : '') + '</span>' +
        '<span class="uct-luc">' + thoiGianTuong(new Date(e.at).getTime()) + '</span>' +
      '</div>';
    }).join('') : '';
  }

  // Ô tìm lọc ngay trên DOM (danh sách ngắn, không cần vẽ lại).
  document.addEventListener('input', function (ev) {
    if (!ev.target || ev.target.id !== 'usage-calc-tim') return;
    loc(khongDau(ev.target.value.trim()));
  });

  function demSale() {
    return (toanBo || []).filter(function (p) { return (p.role || 'user') === 'user'; }).length;
  }

  // Biểu đồ hai loạt cột đứng cạnh nhau. Dùng lại đúng luật của veBieuDoKhoang:
  // cắt phần ĐẦU chưa từng có số liệu (hệ đo lường mới bật 23/07, chọn 60 ngày mà
  // không cắt là một mảng trắng dài), nhưng GIỮ ngày 0 nằm giữa vì đó là tin thật.
  function veBieuDoCongCu(so, from, soNgay) {
    const chart = $('usage-tools-chart');
    if (!chart) return;
    const start = batDauNgay(from).getTime();
    const cols = [];
    let max = 1;
    for (let i = 0; i < soNgay; i++) {
      const d = new Date(start + i * NGAY_MS);
      const k = ngayKey(d.getTime());
      const a = (so.tinhtuoi.theoNgay[k] || {}).tinhtuoi || 0;
      const b = (so.tinhphi.theoNgay[k]  || {}).tinhphi  || 0;
      if (a > max) max = a;
      if (b > max) max = b;
      cols.push({ d: d, a: a, b: b });
    }
    // ☠️ SÀN 10 CỘT. Cắt sạch phần đầu chưa có số liệu là đúng (21 cột rỗng thì "thấy
    // gớm" — chủ tool 31/07), NHƯNG cắt tới mức chỉ còn 2 cột thì biểu đồ thành hai
    // que lạc lõng giữa mảng trắng — đúng cái chủ tool chê 12/08. Giữ ít nhất 10 ngày
    // gần nhất để còn ra hình một biểu đồ; mấy cột 0 nằm trong đó là tin THẬT
    // ("mấy hôm đó không ai dùng"), không phải rác.
    const SAN_COT = 10;
    const iDau = cols.findIndex(function (c) { return c.a > 0 || c.b > 0; });
    const daCat = iDau > 0 ? Math.min(iDau, Math.max(0, soNgay - SAN_COT)) : 0;
    const veCols = daCat ? cols.slice(daCat) : cols;

    const oNote = $('usage-tools-note');
    if (oNote) {
      if (iDau === -1) { oNote.textContent = 'Chưa có lượt dùng nào trong khoảng này.'; oNote.hidden = false; }
      else oNote.hidden = true;
    }

    const soCot = veCols.length;
    const step = soCot <= 16 ? 1 : Math.ceil(soCot / 12);
    chart.style.gap = (soCot > 20 ? 3 : soCot > 14 ? 4 : 6) + 'px';

    chart.innerHTML = veCols.map(function (c, idx) {
      const hienX = (idx % step === 0) || idx === veCols.length - 1;
      const nhanNgay = c.d.getDate() + '/' + (c.d.getMonth() + 1);
      const thanh = function (n, lop) {
        if (!n) return '';
        const h = Math.max(Math.round((n / max) * 100), 6);
        return '<span class="uc-bar ' + lop + '" style="height:' + h + '%"></span>';
      };
      const tong = c.a + c.b;
      return '<div class="uc-col" title="' + nhanNgay + ': Tính tuổi ' + c.a + ' · Tính phí ' + c.b + '">' +
               '<div class="uc-barwrap ucc-barwrap">' +
                 '<span class="uc-n">' + (tong || '') + '</span>' +
                 '<span class="ucc-pair">' + thanh(c.a, 'ucc-bar-a') + thanh(c.b, 'ucc-bar-b') + '</span>' +
               '</div>' +
               '<span class="uc-x">' + (hienX ? c.d.getDate() : '') + '</span>' +
             '</div>';
    }).join('');
  }

  // Tên tiếng Anh của sale = PHẦN TRƯỚC @ của email công ty (chủ tool 27/07 chỉ vào danh
  // sách thành viên: henry@ = Mai Thành Trọng, casey@ = Nguyễn Vũ Yến Nhi, tommy@ = Huỳnh
  // Thanh Long). DB không có trường riêng nên suy từ email. Hai chốt chặn:
  //  (1) CHỈ email công ty — email cá nhân (gmail) phần trước @ là chuỗi vô nghĩa
  //      ("xuanthuongqtkd"), hiện ra chỉ tổ rối;
  //  (2) trùng với tên tiếng Việt rồi thì thôi (celine@ ↔ "Celine Nguyen" — không nói 2 lần).
  const MAIL_CTY = '@thinksmartinsurance.com';
  function tenTiengAnh(p) {
    const mail = String((p && p.email) || '').toLowerCase();
    if (mail.indexOf(MAIL_CTY) === -1) return '';
    const local = mail.split('@')[0].replace(/[._-]+/g, ' ').trim();
    if (!local) return '';
    const goc = khongDau(String((p && p.full_name) || '')).replace(/\s+/g, '');
    const canBo = local.replace(/\s+/g, '');
    // Bỏ luôn kiểu email "chữ-cái-đầu + họ" (jhuynh ↔ "Hung Huynh") — đó là handle email,
    // không phải tên tiếng Anh; hiện ra chỉ là nhiễu. Chặn ở độ dài >3 để tên ngắn thật
    // (gus, ty…) không bị loại oan.
    if (goc && (goc.indexOf(canBo) !== -1 || (canBo.length > 3 && goc.indexOf(canBo.slice(1)) !== -1))) return '';
    return local.replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); });
  }

  // ☠️ veBangNguoi() — bảng "Theo từng người" — GỠ HẲN 10/08/2026 theo yêu cầu
  // chủ tool. Giữ tenTiengAnh() ở trên vì popup "đã tải gì" vẫn dùng.

  // Popup "tải CÁI GÌ" — liệt kê sự kiện download trong khoảng đang chọn (chủ tool 23/07).
  // Bản đồ "tên file → đường dẫn" của thư viện (Brochure / Bảng so sánh quyền lợi).
  // Sự kiện download của brochure chỉ lưu TÊN file trong label ("Tài liệu: NLG IUL.jpg",
  // xem main.js) nên muốn XEM lại đúng tài liệu thì phải tra ngược qua /api/library.
  let thuVienMap = null;
  async function taiBanDoThuVien() {
    if (thuVienMap) return thuVienMap;
    const map = {};
    try {
      const res = await fetch('/api/library');
      const json = await res.json();
      Object.keys(json.library || {}).forEach(function (mucLon) {
        const nhom = json.library[mucLon] || {};
        Object.keys(nhom).forEach(function (hang) {
          (nhom[hang] || []).forEach(function (f) {
            if (f && f.name && !map[f.name]) map[f.name] = f.path;
          });
        });
      });
      thuVienMap = map;   // chỉ cache khi đọc được, hỏng thì lần sau thử lại
    } catch (e) { return map; }
    return thuVienMap;
  }

  function moChiTietTaiVe() {
    if (!khoangFrom || !khoangTo) return;
    const f = batDauNgay(khoangFrom).getTime();
    const t = batDauNgay(khoangTo).getTime() + NGAY_MS - 1;
    const pmap = {}; (toanBo || []).forEach(function (p) { pmap[p.id] = p; });
    const trongKhoang = usageEvents
      .filter(function (e) { const ts = new Date(e.at).getTime(); return e.kind === 'download' && ts >= f && ts <= t; });
    // CHỈ Proposal (chủ tool 27/07: "phần brochure thì anh không cần"). Brochure tải về
    // chỉ là lấy nguyên file có sẵn — không có gì để soi; Proposal mới cho biết sale điền gì.
    const rows = trongKhoang
      .filter(function (e) { return !/^Tài liệu:/.test(e.label || ''); })
      .sort(function (a, b) { return new Date(b.at).getTime() - new Date(a.at).getTime(); });
    const soBrochure = trongKhoang.length - rows.length;

    // Số ở đây PHẢI khớp số dòng đang hiện, nếu không thì lệch với thẻ "Tải về" (đếm cả
    // brochure) mà người xem không hiểu vì sao → nói thẳng phần bị ẩn.
    const soCoAnh = rows.filter(function (e) { return !!e.anh; }).length;
    // ☠️ MỘT dòng, hai mẩu. Bỏ "ẩn N lượt tải Brochure" (chủ tool 27/07 đã chốt
    // "brochure anh không cần") và bỏ hẳn dòng ghi chú dài phía dưới.
    $('dl-range').textContent = fmtNgay(khoangFrom) + ' – ' + fmtNgay(khoangTo) +
      ' · ' + rows.length + ' lượt';
    // Không nói ra thì bấm 👁 thấy bảng số liệu sẽ tưởng tính năng hỏng (chủ tool 27/07
    // báo "chưa xem được"). Ảnh chỉ có với lượt xuất SAU khi bật lưu ảnh.
    // Dòng ghi chú CŨ dài 2 câu, giải thích chuyện lịch sử (ảnh chỉ lưu từ 27/07) mà
    // người dùng không làm gì được với nó. Chỉ giữ khi CHƯA có ảnh nào — lúc đó bấm 👁
    // ra bảng số liệu dễ tưởng hỏng. Có ảnh rồi thì im.
    const ghiChu = $('dl-note');
    ghiChu.textContent = (rows.length && !soCoAnh) ? 'Các lượt cũ chưa có ảnh — bấm 👁 xem thông tin đã điền.' : '';
    if (!rows.length) {
      $('dl-rows').innerHTML = '';
      $('dl-empty').style.display = 'flex';
    } else {
      $('dl-empty').style.display = 'none';
      // GỘP THEO TỪNG NGƯỜI (chủ tool 27/07: "làm gọn thành dropdown của từng người").
      // Danh sách phẳng lặp tên một người 5–10 lần; gộp lại mỗi người 1 dòng, bung mới thấy.
      // `rows` đã sort mới→cũ nên thứ tự trong nhóm và mốc "gần nhất" lấy luôn ds[0].
      const nhomNguoi = {}; const thuTu = [];
      rows.forEach(function (e) {
        const k = e.user_id || 'khong-ro';
        if (!nhomNguoi[k]) { nhomNguoi[k] = []; thuTu.push(k); }
        nhomNguoi[k].push(e);
      });
      let idx = 0;
      $('dl-rows').innerHTML = thuTu.map(function (k) {
        const ds = nhomNguoi[k];
        const p = pmap[k] || {};
        const ten = p.full_name || p.email || '(không rõ)';
        const en = tenTiengAnh(p);
        const tim = [ten, en, p.email || ''];   // gom chữ để ô tìm khớp cả tên tiếng Anh lẫn tên khách

        const than = ds.map(function (e) {
          const myIdx = idx++;
          const nhan = e.label ? esc(e.label) : '<span class="ur-never">không rõ (bản cũ)</span>';
          const coDetail = Array.isArray(e.detail) && e.detail.length;
          const coAnh = !!e.anh;
          if (e.label) tim.push(e.label);
          // 👁 = MỞ BẢN ĐÃ XUẤT (chủ tool 27/07). Lượt cũ chưa có ảnh thì lùi về bảng giá
          // trị đã điền — có còn hơn không; hết cả hai mới là "—".
          const eye = (coAnh || coDetail)
            ? '<button type="button" class="dl-eye" data-idx="' + myIdx + '"' +
              (coAnh ? ' data-anh="' + esc(e.anh) + '"' : '') +
              ' title="' + (coAnh ? 'Xem bản đã tải về' : 'Bản cũ chưa lưu ảnh — xem giá trị đã điền') + '">👁</button>'
            : '<span class="dl-eye-empty" title="Lượt xuất cũ, chưa lưu ảnh lẫn giá trị đã điền">—</span>';
          // Lưu dữ liệu để dựng panel TRÁI lúc bấm 👁 — không dựng sẵn inline nữa
          // (chủ tool 31/07: bung xuống dưới làm danh sách dài quá).
          dlChiTiet[myIdx] = { anh: e.anh || '', detail: coDetail ? e.detail : null, nhan: e.label || '' };
          // ⚠️ GIỮ dòng này khi dọn code: giá trị sale đã điền phải vào `tim` thì ô tìm
          // mới khớp được — gõ "Em Trang" ra đúng người đã xuất bản báo giá cho khách đó.
          // (Suýt xoá mất lúc chuyển sang panel trái 31/07.)
          if (coDetail) e.detail.forEach(function (f) { tim.push(f.v); });
          // KHÔNG dựng khối chi tiết inline nữa — nội dung dựng vào panel TRÁI lúc bấm 👁
          // (moPanelXem). Ảnh vẫn nạp LƯỜI: mở popup 50 dòng mà tải sẵn 50 ảnh thì vừa
          // chậm vừa tốn băng thông của thứ chưa chắc ai xem.
          return '<div class="dl-item">' +
            '<div class="dl-row">' +
              '<span class="dl-what" data-label="Tải gì">' + nhan + '</span>' +
              '<span class="ta-right dl-when" data-label="Lúc">' + thoiGianTuong(new Date(e.at).getTime()) + '</span>' +
              '<span class="ta-right dl-eye-cell">' + eye + '</span>' +
            '</div>' +
          '</div>';
        }).join('');

        return '<div class="dl-group" data-tim="' + esc(khongDau(tim.join(' '))) + '" data-so="' + ds.length + '">' +
          '<button type="button" class="dl-per" aria-expanded="false">' +
            '<span class="dl-per-caret" aria-hidden="true">›</span>' +
            '<span class="dl-per-name">' + esc(ten) + '</span>' +
            '<span class="dl-per-en">' + (en ? esc(en) : '') + '</span>' +
            // Chip chỉ SỐ (chữ "lượt" lặp lại ở 10 hàng là nhiễu; nghĩa nằm ở title).
            // Bỏ "gần nhất " — cột này chỉ có thể là mốc gần nhất, nói ra là thừa.
            '<span class="dl-per-n" title="' + ds.length + ' lượt tải">' + ds.length + '</span>' +
            '<span class="dl-per-when">' + thoiGianTuong(new Date(ds[0].at).getTime()) + '</span>' +
          '</button>' +
          '<div class="dl-per-body" hidden>' + than + '</div>' +
        '</div>';
      }).join('');
      dongPanelXem();              // mở lại popup thì đóng panel xem của lần trước
      $('dl-search').value = '';   // mở lại popup thì trả ô tìm về trống
      locChiTietTaiVe();
    }
    $('dl-backdrop').classList.add('open');
    $('dl-backdrop').setAttribute('aria-hidden', 'false');
  }
  // Nạp ảnh "bản đã tải" khi bấm 👁. Bucket private → phải xin link có hạn 60s.
  // Nạp MỘT LẦN cho mỗi dòng (đánh dấu data-xong) để gập/mở lại không xin link mới.
  // ---- Panel XEM BẢN ĐÃ TẢI (bên trái danh sách) ----------------------------
  const dlChiTiet = {};      // idx → { anh, detail, nhan }
  let dangXemIdx = null;     // con mắt nào đang mở

  function dongPanelXem() {
    dangXemIdx = null;
    const pn = $('dl-preview');
    pn.hidden = true; pn.innerHTML = '';
    $('dl-main').classList.remove('has-preview');
    document.querySelectorAll('.dl-eye.is-open').forEach(function (x) { x.classList.remove('is-open'); });
  }

  function moPanelXem(idx, nut) {
    const ct = dlChiTiet[idx];
    if (!ct) return;
    dangXemIdx = idx;
    document.querySelectorAll('.dl-eye.is-open').forEach(function (x) { x.classList.remove('is-open'); });
    if (nut) nut.classList.add('is-open');

    // ☠️ CÓ ẢNH THẬT thì KHÔNG bày bảng "Thông tin sale đã điền" (chủ tool 31/07:
    // "đã có bảng preview thực tế rồi thì anh không cần bảng chi tiết này nữa").
    // Ảnh chính là bản khách nhận — mọi giá trị đều nằm trên đó, bày lại thành bảng
    // là nói hai lần và kéo panel dài gấp đôi.
    // Bảng CHỈ còn là đường lùi cho lượt CŨ chưa lưu ảnh — lúc đó nó là thứ duy nhất.
    const bang = (!ct.anh && ct.detail)
      ? '<div class="dl-fields">' +
        ct.detail.map(function (f) {
          return '<div class="dl-f"><span class="dl-f-k">' + esc(f.k) + '</span><span class="dl-f-v">' + esc(f.v) + '</span></div>';
        }).join('') + '</div>'
      : '';
    const khungAnh = ct.anh
      ? '<div class="dl-anh" id="dl-anh-' + idx + '"><span class="dl-anh-cho">Đang mở bản đã tải…</span></div>'
      : '';
    $('dl-preview').innerHTML =
      '<div class="dl-preview-head">' +
        '<b>' + (ct.nhan ? esc(ct.nhan) : 'Bản đã tải') + '</b>' +
        '<button type="button" class="icon-btn" id="dl-preview-close" aria-label="Đóng bản xem">✕</button>' +
      '</div>' +
      '<div class="dl-preview-body">' + khungAnh + bang + '</div>';
    $('dl-preview').hidden = false;
    $('dl-main').classList.add('has-preview');
    $('dl-preview-close').addEventListener('click', dongPanelXem);
    if (ct.anh) napAnhBanXuat(idx, ct.anh);
  }

  async function napAnhBanXuat(idx, duongDan) {
    if (!duongDan) return;
    const khung = $('dl-anh-' + idx);
    if (!khung || khung.getAttribute('data-xong') === '1') return;
    khung.setAttribute('data-xong', '1');
    const link = TSTAuth.linkAnhBanXuat ? await TSTAuth.linkAnhBanXuat(duongDan) : null;
    if (!link) {
      // Nói ĐÚNG việc: link hỏng thường là do chưa tạo bucket/chưa chạy SQL, không phải mất bản
      khung.innerHTML = '<span class="dl-anh-cho">Chưa mở được bản này. Kiểm tra bucket ' +
        '<code>proposal-snapshots</code> trong Supabase đã tạo chưa.</span>';
      khung.setAttribute('data-xong', '0');   // cho thử lại lần sau
      return;
    }
    khung.innerHTML = '<a href="' + esc(link) + '" target="_blank" rel="noopener" ' +
      'title="Mở ảnh cỡ đầy đủ ở tab mới"><img src="' + esc(link) + '" alt="Bản đã tải về" loading="lazy"></a>';
  }

  // Lọc theo ô tìm: ẩn/hiện cả NHÓM người. data-tim đã bỏ dấu sẵn lúc dựng (gõ "trong"
  // ra "Trọng", gõ "em trang" ra người đã xuất bản báo giá cho khách đó).
  function locChiTietTaiVe() {
    const q = khongDau($('dl-search').value);
    const nhom = $('dl-rows').querySelectorAll('.dl-group');
    let nguoi = 0, luot = 0;
    nhom.forEach(function (g) {
      const hop = !q || g.getAttribute('data-tim').indexOf(q) !== -1;
      g.style.display = hop ? '' : 'none';
      if (hop) { nguoi++; luot += parseInt(g.getAttribute('data-so'), 10) || 0; }
    });
    $('dl-hit').textContent = q ? (nguoi ? nguoi + ' người · ' + luot + ' lượt' : 'không có ai khớp') : '';
  }

  function dongChiTietTaiVe() {
    $('dl-backdrop').classList.remove('open');
    $('dl-backdrop').setAttribute('aria-hidden', 'true');
  }

  // ---- Khởi động -------------------------------------------------------------
  async function boot() {
    if (!TSTAuth.configured) { $('config-notice').style.display = 'flex'; return; }

    const { profile } = await TSTAuth.requireLogin();

    $('app-shell').style.display = 'flex';
    TSTAuth.initShell();
    me = profile || {};
    wireShell();
    if (profile) $('chip-role').textContent = ROLE_LABEL[profile.role] || 'Nhân viên';

    // Chỉ Super Admin / Admin đang hoạt động mới vào được
    const canView = profile && profile.status === 'active' && (profile.role === 'admin' || profile.role === 'super_admin');
    if (!canView) { $('noaccess-notice').style.display = 'flex'; return; }

    sb = TSTAuth.getClient();
    $('page-content').style.display = 'block';
    initTracking();   // bật tab "Đo lường" nếu là super_admin
    $('list-pending').addEventListener('click', onListClick);
    $('list-active').addEventListener('click', onListClick);
    $('list-suspended').addEventListener('click', onListClick);
    $('btn-refresh').addEventListener('click', load);
    // Đang ở tab Đo lường mà bấm "↻ Tải lại" thì làm mới luôn số liệu sử dụng
    // (load() ở trên làm mới profiles → tên trong bảng cũng cập nhật theo).
    $('btn-refresh').addEventListener('click', function () {
      if (me.role === 'super_admin' && $('tracking-content').style.display === 'block') taiDoLuong();
    });

    // Ô chọn: bắt ở cấp #page-content vì hàng được vẽ lại sau mỗi lần load,
    // gắn trực tiếp vào từng ô sẽ mất listener.
    $('page-content').addEventListener('change', onPickChange);
    // Một handler cho cả 3 thanh lật trang (uỷ quyền sự kiện — nút được dựng lại
    // sau mỗi lần vẽ nên gắn trực tiếp vào nút là mất handler).
    $('page-content').addEventListener('click', onPagerClick);
    $('bulk-bar').addEventListener('click', onBulkClick);
    $('bulk-clear').addEventListener('click', function () {
      dangChon.clear();
      document.querySelectorAll('.m-pick').forEach(function (c) {
        c.checked = false;
        c.closest('.member-row').classList.remove('is-picked');
      });
      capNhatThanhHangLoat();
    });

    // Lọc theo phòng ban (cột phải) + bỏ lọc
    $('ms-depts').addEventListener('click', onDeptClick);
    $('ms-roles').addEventListener('click', onRoleClick);
    // "Bỏ lọc" phải xoá MỌI bộ lọc đang bật, không chỉ phòng ban — nếu không thì
    // bấm Bỏ lọc xong mà danh sách vẫn bị lọc theo quyền, người dùng tưởng hỏng.
    $('filter-clear').addEventListener('click', function () {
      locPhongBan = null; locQuyen = null;
      trang.pending = trang.active = trang.suspended = 1;
      dangChon.clear(); veDanhSach();
    });

    // Bấm ra ngoài / Esc → đóng menu "⋯"
    document.addEventListener('click', dongMenu);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dongMenu(); });

    // Thêm tài khoản TRỰC TIẾP — server /api/admin/create-user (service_role, có kiểm quyền
    // admin). role='user', phòng ban chọn (mặc định Sale), status active, mật khẩu tạm Drt$2022.
    $('btn-add-member').addEventListener('click', function () {
      $('add-name').value = '';
      $('add-email').value = '';
      $('add-dept').innerHTML = PHONG_BAN.map(function (d) {
        return '<option value="' + esc(d) + '"' + (d === 'Sale' ? ' selected' : '') + '>' + esc(d) + '</option>';
      }).join('');
      $('add-role').innerHTML = QUYEN_TAO_MOI.map(function (r) {
        return '<option value="' + esc(r) + '"' + (r === 'user' ? ' selected' : '') + '>' + esc(ROLE_LABEL[r] || r) + '</option>';
      }).join('');
      $('add-pass').value = 'Drt$2022';   // điền sẵn — admin giữ hoặc gõ mật khẩu khác
      const kq = $('add-result'); kq.style.display = 'none'; kq.textContent = '';
      $('add-backdrop').classList.add('open');
      $('add-backdrop').setAttribute('aria-hidden', 'false');
      $('add-name').focus();
    });
    function dongThemThanhVien() {
      $('add-backdrop').classList.remove('open');
      $('add-backdrop').setAttribute('aria-hidden', 'true');
    }
    // Giống hộp Sửa: đang gõ dở mà bấm trượt ra ngoài thì không được mất công gõ.
    // Chỉ tính Họ tên + Email — ô mật khẩu luôn có sẵn "Drt$2022" nên không kể là "đã gõ".
    async function thuDongThemThanhVien() {
      const dangGo = $('add-name').value.trim() || $('add-email').value.trim();
      if (dangGo && !(await showAppConfirm('Bỏ thông tin tài khoản đang nhập?',
        { title: 'Chưa tạo', tone: 'warning', confirmText: 'Bỏ' }))) return;
      dongThemThanhVien();
    }
    $('add-close').addEventListener('click', thuDongThemThanhVien);
    $('add-cancel').addEventListener('click', thuDongThemThanhVien);
    $('add-backdrop').addEventListener('click', function (e) {
      if (e.target === $('add-backdrop')) thuDongThemThanhVien();
    });
    $('add-create').addEventListener('click', async function () {
      const ten = $('add-name').value.trim();
      const mail = $('add-email').value.trim().toLowerCase();
      const phong = $('add-dept').value;
      const quyen = $('add-role').value;
      const pass = $('add-pass').value.trim() || 'Drt$2022';
      const kq = $('add-result');
      if (!ten) { $('add-name').focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        veKetQua(kq, 'error', 'Email không hợp lệ.'); $('add-email').focus(); return;
      }
      if (pass.length < 6) {
        veKetQua(kq, 'error', 'Mật khẩu cần tối thiểu 6 ký tự.'); $('add-pass').focus(); return;
      }
      const btn = $('add-create'); const cu = btn.textContent; btn.disabled = true; btn.textContent = 'Đang tạo…';
      const data = await goiAdminApi('/api/admin/create-user', { full_name: ten, email: mail, department: phong, role: quyen, password: pass });
      btn.disabled = false; btn.textContent = cu;
      if (!data) return;
      // Việc kế tiếp của admin là GỬI thông tin này cho người mới → bày rõ từng dòng
      // và cho copy một phát, thay vì bắt bôi đen trong một đoạn văn.
      // ⚠️ CHỈ Email + Mật khẩu. KHÔNG bày "Quyền" ở đây (chủ tool 31/07: "không được
      // cho nhân viên thấy mình là quyền gì"): khối này để admin chụp/copy gửi thẳng
      // cho người mới, lộ vai trò nội bộ ra ngoài là không nên. Ô "Quyền" ngay phía
      // trên cũng đã nói rồi — nhắc lại là nói hai lần.
      veKetQua(kq, 'ok',
        '<b>Đã tạo tài khoản cho ' + esc(ten) + '</b>' +
        theCred([['Email', mail], ['Mật khẩu', data.password]]) +
        '<button type="button" class="btn btn-secondary btn-sm" id="add-copy">Sao chép để gửi</button>');
      const nutChep = $('add-copy');
      nutChep.addEventListener('click', async function () {
        const noiDung = 'Email: ' + mail + '\nMật khẩu: ' + data.password;
        try {
          await navigator.clipboard.writeText(noiDung);
          nutChep.textContent = 'Đã sao chép ✓';
          setTimeout(function () { nutChep.textContent = 'Sao chép để gửi'; }, 2000);
        } catch (e) {
          // Trình duyệt chặn clipboard (không phải https/localhost) — vẫn phải có
          // đường lấy được nội dung, không được im lặng thất bại.
          await showAppAlert(noiDung, { title: 'Chép tay giúp em nhé', tone: 'info' });
        }
      });
      $('add-name').value = ''; $('add-email').value = '';
      await load();
    });

    // Hộp "Sửa tài khoản"
    $('edit-save').addEventListener('click', luuSuaTaiKhoan);
    $('edit-close').addEventListener('click', thuDongHopSua);
    $('edit-cancel').addEventListener('click', thuDongHopSua);
    $('edit-backdrop').addEventListener('click', function (e) {
      if (e.target === $('edit-backdrop')) thuDongHopSua();
    });
    // Nhắc hậu quả NGAY khi email bị sửa khác đi, không đợi tới lúc bấm Lưu.
    $('edit-email').addEventListener('input', function () {
      const goc = dangSua ? (dangSua.email || '').trim().toLowerCase() : '';
      $('edit-email-warn').hidden = this.value.trim().toLowerCase() === goc;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('edit-backdrop').classList.contains('open')) thuDongHopSua();
    });

    // Hộp thoại phòng ban
    $('dept-save').addEventListener('click', function () {
      const val = $('dept-select').value;
      const cb = deptCallback;
      dongHopPhongBan();
      if (cb) cb(val);
    });
    $('dept-cancel').addEventListener('click', dongHopPhongBan);
    $('dept-close').addEventListener('click', dongHopPhongBan);
    $('dept-backdrop').addEventListener('click', function (e) {
      if (e.target === $('dept-backdrop')) dongHopPhongBan();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('dept-backdrop').classList.contains('open')) dongHopPhongBan();
    });

    load();
  }

  boot();
})();
