/* ==========================================================================
   NÚT REQUEST (gửi yêu cầu): nút tròn nổi ở MỌI trang
   Dựng 17/09/2026 làm hòm thư góp ý; 09/10/2026 chủ tool đổi thành nút gửi yêu cầu,
   form 3 ô (tiêu đề · nội dung mong muốn · nhóm khách hàng) và tự báo vào Lark.
   Đi kèm `gopy.css`. Cần `js/portal/auth.js` nạp TRƯỚC (dùng window.TSTAuth).
   --------------------------------------------------------------------------
   Sale bấm nút tròn góc dưới phải → điền 3 ô → máy chủ (POST /api/yeu-cau, server.js)
   kiểm phiên đăng nhập, lưu rồi báo nhóm Lark của chủ tool. Bảng lưu: `public.gop_y`.
   Cần chạy supabase/yeucau.sql (thêm cột). Chỉ Super Admin đọc được (policy trong `supabase/gopy.sql`).

   ☠️ HỎNG VỀ PHÍA GIẤU, KHÔNG PHẢI PHÍA LỘ (luật CLAUDE.md 2b-bis).
   Đọc nấc phát hành thất bại — mạng lỗi, chưa chạy gopy.sql, RLS chặn — thì coi
   như nấc 'super' và KHÔNG hiện nút. Ngược lại với công tắc "khoá mục" (lỗi mạng
   thì coi như không khoá): khoá sai làm cả đội đứng hình, còn LỘ một tính năng
   đang xây ra 77 sale thì không rút lại được.

   ☠️ KHÔNG bao giờ đóng hộp bằng cách xoá nội dung đang gõ. Đóng chỉ ẩn đi, chữ
   còn nguyên, mở lại vẫn thấy. Chỉ xoá SAU KHI gửi thành công.
   ========================================================================== */
(function () {
  'use strict';

  // Khớp YC_TOI_DA trong server.js và các constraint trong supabase/yeucau.sql
  var TOI_DA = { tieuDe: 150, noiDung: 4000, nhom: 200 };
  var NAC_MAC_DINH = 'super';  // xem ghi chú "hỏng về phía giấu" ở trên

  function svgThu() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>' +
      '<path d="m3 7 9 6 9-6"/></svg>';
  }
  function svgDong() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/>' +
      '<line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  // Trang nào gửi lên — để sau này biết sale hay vướng ở chỗ nào nhất
  function tenTrang() {
    var p = (location.pathname || '').replace(/\/+$/, '');
    if (!p || p === '/index.html') return 'index';
    return p.replace(/^\//, '').replace(/\.html$/, '') || 'index';
  }

  // Nấc phát hành + công tắc khoá của mục 'gopy'. Mọi đường hỏng → 'super' (giấu).
  // Đọc CẢ `khoa`: tab "Khoá mục" bày công tắc cho mục này, công tắc đó phải có tác
  // dụng thật — bày một nút không làm gì là nói dối người bấm.
  async function docNac(sb) {
    try {
      var r = await sb.from('khoa_muc').select('hien_cho, khoa').eq('muc', 'gopy').maybeSingle();
      if (r.error || !r.data) return { nac: NAC_MAC_DINH, khoa: false };
      return { nac: r.data.hien_cho || NAC_MAC_DINH, khoa: !!r.data.khoa };
    } catch (e) { return { nac: NAC_MAC_DINH, khoa: false }; }
  }

  function duocThay(nac, vaiTro) {
    if (nac === 'all') return true;
    if (nac === 'admin') return vaiTro === 'admin' || vaiTro === 'super_admin';
    return vaiTro === 'super_admin';
  }

  function dung(hoSo, sb) {
    if (document.getElementById('gopy-nut')) return;   // đã dựng rồi

    var nut = document.createElement('button');
    nut.type = 'button';
    nut.id = 'gopy-nut';
    nut.className = 'gopy-nut';
    nut.setAttribute('aria-expanded', 'false');
    nut.setAttribute('aria-controls', 'gopy-hop');
    nut.title = 'Gửi yêu cầu';
    nut.setAttribute('aria-label', 'Gửi yêu cầu');
    nut.innerHTML = svgThu();

    var hop = document.createElement('div');
    hop.id = 'gopy-hop';
    hop.className = 'gopy-hop';
    hop.hidden = true;
    hop.setAttribute('role', 'dialog');
    hop.setAttribute('aria-label', 'Gửi yêu cầu');
    // BA Ô do chủ tool chốt 09/10/2026, đúng thứ tự: tiêu đề · nội dung mong muốn ·
    // nhóm khách hàng muốn gửi tới. Cả ba đều bắt buộc: thiếu nhóm khách hàng thì người
    // nhận phải nhắn hỏi lại, mất đúng cái lợi của việc có form.
    // ☠️ CỐ Ý KHÔNG có dòng mô tả "ai đọc được" hay "sẽ trả lời trong bao lâu" (chủ tool
    // bỏ 17/09/2026). Hộp này KHÔNG hứa gì với người gửi, nên không có gì để sai lời.
    hop.innerHTML =
      '<div class="gopy-dau">' +
        '<h3>Gửi yêu cầu</h3>' +
      '</div>' +
      '<div class="gopy-than">' +
        '<label class="gopy-nhan" for="gopy-tieude">Tiêu đề</label>' +
        '<input type="text" id="gopy-tieude" maxlength="' + TOI_DA.tieuDe + '" autocomplete="off" ' +
        'placeholder="Ví dụ: Ảnh SMS giới thiệu IUL">' +
        '<label class="gopy-nhan" for="gopy-chu">Nội dung mong muốn</label>' +
        '<textarea id="gopy-chu" maxlength="' + TOI_DA.noiDung + '" ' +
        'placeholder="Bạn cần gì, dùng vào việc gì, cần trước ngày nào"></textarea>' +
        '<label class="gopy-nhan" for="gopy-nhom">Nhóm khách hàng muốn gửi tới</label>' +
        '<input type="text" id="gopy-nhom" maxlength="' + TOI_DA.nhom + '" autocomplete="off" ' +
        'placeholder="Ví dụ: thợ nail, người sắp về hưu">' +
      '</div>' +
      '<div class="gopy-bao" id="gopy-bao" hidden></div>' +
      '<div class="gopy-chan">' +
        '<span class="gopy-dem" id="gopy-dem"></span>' +
        '<button type="button" class="gopy-gui" id="gopy-gui" disabled>Gửi yêu cầu</button>' +
      '</div>';

    document.body.appendChild(hop);
    document.body.appendChild(nut);

    var oTieuDe = hop.querySelector('#gopy-tieude');
    var oChu = hop.querySelector('#gopy-chu');
    var oNhom = hop.querySelector('#gopy-nhom');
    var nutGui = hop.querySelector('#gopy-gui');
    var oDem = hop.querySelector('#gopy-dem');
    var oBao = hop.querySelector('#gopy-bao');
    var dangGui = false;

    function bao(loai, chu) {
      if (!chu) { oBao.hidden = true; oBao.textContent = ''; return; }
      oBao.hidden = false;
      oBao.className = 'gopy-bao ' + loai;
      oBao.textContent = chu;
    }

    function duBaO() {
      return !!(oTieuDe.value.trim() && oChu.value.trim() && oNhom.value.trim());
    }

    function capNhatDem() {
      var n = oChu.value.trim().length;
      nutGui.disabled = dangGui || !duBaO();
      // Chỉ đếm khi đã gần chạm trần: bày số suốt là bắt mắt đọc thứ không cần
      if (n > TOI_DA.noiDung - 300) {
        oDem.textContent = n + '/' + TOI_DA.noiDung;
        oDem.classList.toggle('qua', n >= TOI_DA.noiDung);
      } else {
        oDem.textContent = '';
        oDem.classList.remove('qua');
      }
    }

    function moDong(mo) {
      hop.hidden = !mo;
      nut.setAttribute('aria-expanded', String(mo));
      nut.innerHTML = mo ? svgDong() : svgThu();
      nut.title = mo ? 'Đóng' : 'Gửi yêu cầu';
      nut.setAttribute('aria-label', nut.title);
      // Mở lại khi đang gõ dở thì vào đúng ô còn trống đầu tiên
      if (mo) (!oTieuDe.value.trim() ? oTieuDe : !oChu.value.trim() ? oChu : !oNhom.value.trim() ? oNhom : oChu).focus();
    }

    nut.addEventListener('click', function () { moDong(hop.hidden); });

    // Esc đóng hộp nhưng GIỮ NGUYÊN chữ đang gõ, mở lại vẫn còn.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !hop.hidden) { moDong(false); nut.focus(); }
    });

    [oTieuDe, oChu, oNhom].forEach(function (o) {
      o.addEventListener('input', function () { capNhatDem(); bao(null); });
    });
    // Enter ở ô tiêu đề = sang ô nội dung. Không có nút gửi nào ăn phím Enter: gửi nhầm
    // một yêu cầu gõ dở là một tin Lark thừa tới chủ tool, không rút lại được.
    oTieuDe.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); oChu.focus(); }
    });

    nutGui.addEventListener('click', async function () {
      if (dangGui || !duBaO()) return;

      if (!sb) {   // chế độ mở: chạy `node server.js` chưa cấu hình Supabase
        bao('loi', 'Chế độ mở (máy dev) chưa nối Supabase nên yêu cầu không gửi đi được.');
        return;
      }

      dangGui = true;
      nutGui.disabled = true;
      var chuCu = nutGui.textContent;
      nutGui.textContent = 'Đang gửi…';
      bao(null);

      // Đi qua MÁY CHỦ (POST /api/yeu-cau), không ghi thẳng vào bảng như bản 17/09:
      // máy chủ lưu, đếm giới hạn, rồi báo Lark. Link bot Lark chỉ máy chủ giữ.
      var loi = '';
      try {
        var phien = await TSTAuth.getSession();
        if (!phien) {
          loi = 'Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại rồi gửi giúp.';
        } else {
          var res = await fetch('/api/yeu-cau', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + phien.access_token },
            body: JSON.stringify({
              tieu_de: oTieuDe.value.trim(),
              noi_dung: oChu.value.trim(),
              nhom_khach: oNhom.value.trim(),
              trang: tenTrang()
            })
          });
          var data = await res.json().catch(function () { return {}; });
          if (!res.ok || !data.success) loi = 'Chưa gửi được: ' + (data.error || ('máy chủ trả mã ' + res.status));
        }
      } catch (e) {
        loi = 'Chưa gửi được: không gọi được máy chủ (' + e.message + '). Bạn thử lại giúp.';
      }

      dangGui = false;
      nutGui.textContent = chuCu;

      if (loi) {
        // Báo THẬT khi thất bại: im lặng ở đây nghĩa là người ta tưởng đã gửi.
        // Chữ trong ba ô GIỮ NGUYÊN để bấm gửi lại được ngay.
        bao('loi', loi);
        capNhatDem();
        return;
      }

      oTieuDe.value = '';        // chỉ xoá SAU KHI gửi xong
      oChu.value = '';
      oNhom.value = '';
      capNhatDem();
      // ☠️ KHÔNG tự đóng hộp sau vài giây (bản đầu 17/09 làm vậy, chủ tool bắt sửa:
      // "trạng thái gửi xong phải có thông báo tại ô là đã gửi mới được").
      // Hộp tự đóng thì dòng xác nhận chớp qua rồi mất, người gửi không kịp đọc và
      // không biết chắc đã gửi được hay chưa. Để nguyên cho tới khi họ TỰ đóng, hoặc
      // tự mất khi họ bắt đầu gõ yêu cầu tiếp (xem listener 'input' ở trên).
      bao('ok', '✓ Đã gửi yêu cầu.');
    });

    capNhatDem();
  }

  async function khoiDong() {
    // Chế độ mở (máy dev, chưa cấu hình Supabase): vẫn dựng để xem/đo giao diện,
    // nhưng bấm Gửi sẽ báo rõ là không lưu được — không giả vờ thành công.
    if (!window.TSTAuth || !TSTAuth.configured) { dung({ id: null }, null); return; }

    var sb = TSTAuth.getClient();
    if (!sb) return;

    var hoSo = await TSTAuth.getProfile();
    if (!hoSo || hoSo.status !== 'active') return;   // chưa duyệt / bị khoá thì không có hòm thư

    var tt = await docNac(sb);
    if (!duocThay(tt.nac, hoSo.role)) return;
    // Khoá chỉ áp cho Nhân viên — giống mọi mục khác. Admin/Super vẫn gửi được,
    // vì họ chính là người đang tạm đóng hòm thư để xử lý.
    if (tt.khoa && hoSo.role === 'user') return;

    dung(hoSo, sb);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', khoiDong);
  } else {
    khoiDong();
  }
})();
