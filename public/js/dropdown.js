/* ==========================================================================
   DROPDOWN DUNG CHUNG — thay danh sach xo cua <select> bang panel tu dung
   --------------------------------------------------------------------------
   ☠️ VI SAO PHAI TU DUNG: danh sach option cua <select> do HE DIEU HANH ve,
   CSS khong cham toi duoc. Dong `select.text-input-field option { ... }` trong
   style.css gan nhu vo tac dung tren Windows/Chrome — do that 18/08/2026.

   ☠️ GIU NGUYEN THE <select> TRONG DOM (chi an ve mat nhin). Ba cho khac dang
   truy van no va se hong lang le neu go di:
     - core.js:1189  document.querySelectorAll('.text-input-field[data-editor-id]')
     - core.js:1728  chupThongTinDaDien() doc .value + aria-label
     - main.js:338   bam chu tren ban ve -> tim o tuong ung roi focus
   Nen: <select> van o day, van giu class + data-editor-id + aria-label + value.
   Nut hien thi chi la lop ao ben tren; chon xong thi ghi vao <select> roi ban
   su kien 'change' — moi doan code cu chay y nguyen.

   Panel dat position:fixed va gan vao <body> de khong bi cat boi khung cuon
   cua thanh ben (.texts-list co overflow).
   ========================================================================== */
(function () {
  'use strict';

  var MO = null;   // dropdown dang mo (chi mot cai)

  function svgChevron() {
    return '<svg class="dd-mui" viewBox="0 0 24 24" width="12" height="12" fill="none" ' +
      'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
  }
  function svgCheck() {
    return '<svg class="dd-check" viewBox="0 0 24 24" width="14" height="14" fill="none" ' +
      'stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  }

  function dong() {
    if (!MO) return;
    var d = MO;
    MO = null;
    d.panel.hidden = true;
    d.btn.setAttribute('aria-expanded', 'false');
    if (d.panel.parentNode === document.body) document.body.removeChild(d.panel);
  }

  function datViTri(d) {
    var r = d.btn.getBoundingClientRect();
    var p = d.panel;
    p.style.minWidth = r.width + 'px';
    p.style.left = r.left + 'px';
    // do chieu cao that roi moi quyet dinh mo len hay xuong
    p.style.top = '-9999px';
    p.hidden = false;
    var h = p.offsetHeight;
    var duoi = window.innerHeight - r.bottom - 8;
    var tren = r.top - 8;
    if (h <= duoi || duoi >= tren) {
      p.style.top = (r.bottom + 4) + 'px';
      p.style.maxHeight = Math.max(120, duoi - 4) + 'px';
    } else {
      p.style.top = Math.max(8, r.top - 4 - Math.min(h, tren)) + 'px';
      p.style.maxHeight = Math.max(120, tren - 4) + 'px';
    }
  }

  // ☠️ DUNG LAI DANH SACH MOI LAN MO, dung chup mot lan luc nap trang.
  // members.html khai <select> RONG roi members.js do option vao sau — chup mot lan
  // se ra panel trong tron. Dung lai moi lan mo thi luon dung, va bat duoc ca thay doi
  // option ve sau (vd doi phong ban).
  function dungMuc(d) {
    d.panel.innerHTML = '';
    Array.prototype.forEach.call(d.sel.options, function (o) {
      var m = document.createElement('div');
      m.className = 'dd-muc';
      m.setAttribute('role', 'option');
      m.setAttribute('tabindex', '-1');
      m.dataset.gt = o.value;
      m.innerHTML = '<span class="dd-chu"></span>' + svgCheck();
      m.querySelector('.dd-chu').textContent = o.textContent;
      d.panel.appendChild(m);
    });
    dongBoNhan(d);
  }

  function mo(d) {
    if (MO === d) { dong(); return; }
    dong();
    dungMuc(d);
    document.body.appendChild(d.panel);
    MO = d;
    d.btn.setAttribute('aria-expanded', 'true');
    datViTri(d);
    var chon = d.panel.querySelector('.dd-muc[aria-selected="true"]') || d.panel.firstElementChild;
    if (chon) { chon.focus(); chon.scrollIntoView({ block: 'nearest' }); }
  }

  function ganGiaTri(d, giaTri) {
    if (d.sel.value !== giaTri) {
      d.sel.value = giaTri;
      d.sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    dongBoNhan(d);
    dong();
    d.btn.focus();
  }

  function dongBoNhan(d) {
    // ☠️ Hien CHU cua option dang chon, KHONG hien d.sel.value. Voi o "Quyen"
    // value la 'user'/'admin' con chu la 'Nhan vien'/'Admin' — lay value thi nut
    // hien sai (do 16/09/2026). Voi "Phong ban" value == chu nen loi nay bi che.
    var o = d.sel.options[d.sel.selectedIndex];
    d.nhan.textContent = o ? o.textContent : '';
    d.panel.querySelectorAll('.dd-muc').forEach(function (m) {
      m.setAttribute('aria-selected', m.dataset.gt === d.sel.value ? 'true' : 'false');
    });
  }

  function dungMot(sel) {
    if (sel.dataset.ddXong) return;
    sel.dataset.ddXong = '1';

    var wrap = document.createElement('div');
    wrap.className = 'dd';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('dd-native');
    sel.setAttribute('tabindex', '-1');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dd-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    var nhanAria = sel.getAttribute('aria-label');
    if (nhanAria) btn.setAttribute('aria-label', nhanAria);
    var nhan = document.createElement('span');
    nhan.className = 'dd-nhan';
    btn.appendChild(nhan);
    btn.insertAdjacentHTML('beforeend', svgChevron());
    wrap.appendChild(btn);

    var panel = document.createElement('div');
    panel.className = 'dd-panel';
    panel.setAttribute('role', 'listbox');
    panel.hidden = true;

    var d = { sel: sel, btn: btn, panel: panel, nhan: nhan };
    dongBoNhan(d);

    btn.addEventListener('click', function (e) { e.stopPropagation(); mo(d); });
    // main.js focus vao <select> an -> chuyen sang nut that de nguoi dung thay
    sel.addEventListener('focus', function () { btn.focus(); });
    sel.addEventListener('change', function () { dongBoNhan(d); });

    panel.addEventListener('click', function (e) {
      var m = e.target.closest('.dd-muc');
      if (m) ganGiaTri(d, m.dataset.gt);
    });

    function diChuyen(tu, buoc) {
      var ds = Array.prototype.slice.call(panel.querySelectorAll('.dd-muc'));
      var i = ds.indexOf(tu);
      var t = ds[Math.min(ds.length - 1, Math.max(0, i + buoc))];
      if (t) { t.focus(); t.scrollIntoView({ block: 'nearest' }); }
    }
    panel.addEventListener('keydown', function (e) {
      var cur = document.activeElement.closest ? document.activeElement.closest('.dd-muc') : null;
      if (e.key === 'ArrowDown') { e.preventDefault(); diChuyen(cur, 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); diChuyen(cur, -1); }
      else if (e.key === 'Home') { e.preventDefault(); diChuyen(cur, -999); }
      else if (e.key === 'End') { e.preventDefault(); diChuyen(cur, 999); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (cur) ganGiaTri(d, cur.dataset.gt); }
      else if (e.key === 'Escape' || e.key === 'Tab') { dong(); btn.focus(); }
      else if (e.key.length === 1) {
        var c = e.key.toLowerCase();
        var ds = Array.prototype.slice.call(panel.querySelectorAll('.dd-muc'));
        var hit = ds.find(function (m) { return m.textContent.trim().toLowerCase().indexOf(c) === 0; });
        if (hit) { hit.focus(); hit.scrollIntoView({ block: 'nearest' }); }
      }
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mo(d); }
    });
  }

  function nap(root) {
    (root || document).querySelectorAll('select.select-field').forEach(dungMot);
  }

  document.addEventListener('click', function () { dong(); });
  window.addEventListener('resize', dong);
  // Khung ben cuon thi dong lai — panel dat fixed nen se troi ra khoi nut.
  // ☠️ PHAI BO QUA SCROLL CUA CHINH PANEL (loi that 18/08/2026, chu tool bao
  // "loi scroll o tieu bang"): danh sach 50 bang phai cuon trong panel, ma
  // `capture: true` nghe duoc CA su kien scroll khong bubble cua panel —
  // lan chuot mot cai la dropdown dong sap, khong cach nao chon bang cuoi.
  // Do that truoc khi sua: dat panel.scrollTop = 200 -> panel bi go khoi DOM.
  window.addEventListener('scroll', function (e) {
    if (MO && MO.panel && (e.target === MO.panel || (e.target && e.target.nodeType === 1 && MO.panel.contains(e.target)))) return;
    dong();
  }, true);

  window.napDropdown = nap;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { nap(); });
  else nap();
})();
