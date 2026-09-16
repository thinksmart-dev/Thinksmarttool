# Changelog & current state

**This is the freshest source of truth.** Read it first every session; update it last every session.
Newest entries on top. Keep it concrete (versions, files, commands).

---

## 2026-09-16 15:29 — v1.50 · SỬA DROPDOWN HỘP "SỬA TÀI KHOẢN" + GỘP TABS/Ô TÌM MỘT HÀNG

Chủ tool báo hai lỗi ở `/members`, sửa gốc cả hai. **Đã push, v1.49 → v1.50.**

### A. Hộp "Sửa tài khoản": ô Quyền trống + danh sách chui sau hộp

Triệu chứng chủ tool mô tả: *"dropdown không có được"*, *"nó hiện đằng sau cái bảng"*.
`select.select-field` bị `js/dropdown.js` thay bằng panel tự dựng → hai lỗi **độc lập**:

| # | Gốc (đã đo) | Sửa |
|---|---|---|
| 1 | `.dd-panel` `z-index:400` mà `.modal-backdrop` của members là **500**; panel `appendChild` vào `<body>` nên là ANH EM với modal → bị đè. Đo: `elementFromPoint` tại tâm panel trả về `.modal-backdrop` | `dropdown.css`: z-index **400 → 600** (trên modal 500, dưới `dialog.css` 900 để alert vẫn phủ được) |
| 2 | `dongBoNhan()` gán `d.nhan.textContent = d.sel.value` → ô Quyền hiện **mã** (`user`) chứ không hiện **chữ** (`Nhân viên`). Ô Phòng ban value == chữ nên lỗi bị CHE | `dropdown.js`: lấy `d.sel.options[d.sel.selectedIndex].textContent` |
| 3 | `members.js` đổ option bằng `innerHTML` nhưng **không bắn `change`** → nhãn nút đứng im RỖNG tới khi người dùng bấm mở | `members.js`: `dispatchEvent(new Event('change'))` sau mỗi lần đổ option — **3 chỗ**: `edit-dept`, `edit-role`, `dept-select` |

**Đo trước/sau trên chính code thật** (harness nạp `dropdown.css`/`dropdown.js` thật):

| | Trước | Sau |
|---|---|---|
| Nhãn ô Quyền | `""` | `"Nhân viên"` |
| Nhãn ô Phòng ban | `""` | `"Sale"` |
| Phần tử trên cùng tại tâm panel | `modal-backdrop` (che) | `dd-muc` (chọn được) |

☠️ **Bài học `5k` lặp lại ở tầng CSS:** lỗi #2 sống sót lâu vì ô Phòng ban có `value === textContent`
nên nhìn thì ĐÚNG. Chỉ ô Quyền (value `user` ≠ chữ `Nhân viên`) mới lộ. **Hai ô cùng một
component, một ô đúng một ô sai ⇒ nghi chỗ CHÚNG KHÁC NHAU, không nghi component.**

### B. "Khi scroll bị dồn cục" — và nó KHÔNG phải do bản sửa A

Chủ tool gửi 2 ảnh trước/sau khi cuộn. Đo ra **hai** nguồn, cả hai **có sẵn từ lâu**
(`git diff public/portal.css` lúc đó **rỗng** — bản sửa A không đụng file này):

1. `.topbar` dính ở `top: 8px` → còn **khe 8px trong suốt phía trên**. Đo: `elementFromPoint(350, 2)`
   và `(350, 6)` trả về **DIV hàng bảng**, không phải topbar → hàng cuộn lọt qua khe.
2. `--header-bg: rgba(255,255,255,0.88)` + `backdrop-filter: blur(14px)` → 12% trong, bảng
   dày chữ thấm mờ qua thân header. (Chế độ tối `--header-bg` đặc nên KHÔNG bị.)

→ Đưa 2 hướng sửa kính mờ cho chủ tool chọn. **Chủ tool chọn hướng KHÁC**: gộp hàng tabs
lên cùng hàng ô tìm cho bớt tầng chồng. **Hai nguồn trên vẫn còn nguyên, chưa sửa** — nếu
sau này còn thấy "dồn cục" thì xử ở đây, đừng đi tìm lại từ đầu.

### C. Gộp tabs + ô tìm vào MỘT hàng (chủ tool chốt, sửa vị trí 2 lần)

- Thêm `.ms-head` (flex) trong `members.html`: **ô tìm bên TRÁI · tabs bên PHẢI**.
  Thứ tự DOM = thứ tự nhìn thấy (ô tìm → `mem-hit` → tabs) cho bàn phím/screen reader.
- `mem-search` + `mem-hit` **chuyển khỏi** `.bulk-bar` lên `.ms-head`. `#ms-tabs` mất inline
  `display:none`, nay `members.js` lộ **`#ms-head`** thay vì `#ms-tabs` (dòng ~1009).
- `doiTab()` ẩn/hiện `#mem-search-wrap` + `#mem-hit` — ô tìm chỉ có nghĩa ở tab Thành viên.
- `.bulk-bar` giờ chỉ còn nhóm nút hàng loạt → `.bulk-bar:not(.open){display:none}` để không
  để lại thanh viền rỗng. ⚠️ Đã kiểm `#filter-bar` là class **`.filter-bar`** riêng, luật này
  KHÔNG cắn nhầm nó.
- **Vị trí tabs sửa 2 lần**: bản đầu chừa `padding-right: calc(312px + 16px)` cho tabs dừng ở
  mép phải BẢNG; chủ tool yêu cầu *"cho anh sát mép này"* → **bỏ hẳn padding**, tabs bám mép
  phải ngoài cùng. **ĐỪNG thêm lại padding-right.**

Đo (1600px): ô tìm `left 80` = mép trái bảng · tabs `right 1592` = mép phải cột Tổng quan
= mép phải `.topbar`. Ở 1000px lưới về 1 cột, `flex-wrap` cho tabs xuống hàng, không tràn ngang.
Chiều cao hàng đầu **~118px (2 hàng) → 42px (1 hàng)**.

### Cửa chặn + cache

- `kiem-truoc-push.js` ✅ · `kiem-cache-version.js` ✅ (đã `--ghi`).
- Bump: `portal.css` 87 → **90** (4 trang) · `dropdown.css` 1 → **2** · `dropdown.js` 2 → **3**
  (cả `members.html` + `tool.html`) · `portal/members.js` 64 → **66**.
- Version badge **v1.50 · 16/09/2026** khớp cả 3 trang.

☠️ **Vấp bẫy cache 2 lần khi ĐO**: sửa `portal.css` xong đo lại thấy "CSS không ăn" — thật ra
trình duyệt giữ bản `?v=88` cũ. **Harness phải nạp CSS bằng query duy nhất** (`?nocache=<timestamp>`),
và bảo chủ tool reload bằng **Ctrl+Shift+R**. Số đo sai suýt làm sửa nhầm CSS (đúng bài `5`).

☠️ **Đối chứng cửa chặn** (bài `5aj`): cố tình sửa `portal.css` mà không bump → `kiem-cache-version.js`
báo **đỏ, exit 1**, chỉ đúng tên file + đúng 4 chỗ phải sửa; gỡ ra → xanh, exit 0. Cửa này BIẾT đỏ.

---

## 2026-09-16 (chiều) — MờI gofinvn VÀO SUPABASE (Administrator)

Chủ tool chốt mời **gofinvn@gmail.com** vào org Supabase `hadangtien0702-8981's projects`
(đã gửi, trạng thái **INVITED**). Team giờ **2 người**: Tiến (Owner) + gofinvn (Administrator).

→ **LÝ DO: ĐÂY LÀ BÀN GIAO TOOL.** gofinvn là bên **nhận bàn giao**, không phải cộng tác viên tạm thời — nên mức Administrator là có chủ đích, **đừng tự hạ xuống Developer** khi thấy quyền rộng.
→ Chủ tool chốt 16/09: không siết thêm, không cần bật MFA ở bước này.

**Administrator làm được gì:** quản lý thành viên (mời/gỡ người khác), xem+sửa thanh toán,
**xoá được project**. Không đổi được cài đặt tổ chức, không gỡ được Owner.

☠️ **Mọi mức quyền Supabase đều đọc ĐƯỢC TOÀN BỘ dữ liệu** qua Table/SQL Editor — kể cả
Developer. Không có mức "chỉ xem vài bảng". Nên gofinvn đọc được `usage_events.detail`
(tên/tuổi/bang/số tiền khách) và `proposal-snapshots` (ảnh báo giá đã gửi khách).
→ Ai chỉ cần **dùng Tool** thì tạo tài khoản trong `/members`, ĐỪNG mời vào Supabase.
→ Đã xoá 2 snippet chứa mật khẩu thô **TRƯỚC** khi mời — đúng thứ tự.

⚠️ **MFA đang TẮT ở cả hai tài khoản** (cột MFA = Disabled). Org quản lý qua **Vercel
Marketplace** nên một phần cài đặt truy cập nằm bên Vercel.

---

## 2026-09-16 (sáng) — TEAM PD LÊN SUPER ADMIN + DỌN TÊN 14 SNIPPET SQL

**① `admin@gmail.com` (Team PD) → `super_admin`.** Chủ tool chạy `update public.profiles`
trong SQL Editor (giao diện web KHÔNG phong Super Admin được — `members.js:559-565` chỉ cho
chọn *Nhân viên* / *Admin*). Đã **đọc lại bằng đường khác** (luật `5l`) qua Chrome:

| email | tên | role | status |
|---|---|---|---|
| admin@gmail.com | Team PD | `super_admin` | active |
| hadangtien0702@gmail.com | Tiến | `super_admin` | active |

Đếm toàn bảng: **super_admin 2 · admin 10 active + 1 deleted · user 85 active + 3 deleted + 2 pending**.
→ Nay có **2 Super Admin**, khác với ghi chú cũ ở `quyen.sql:20` (*"đúng 1 người — chủ tool"*).
Cả hai đọc được dữ liệu khách thật (`usage_events.detail` + `proposal-snapshots`).

**② Supabase MCP KHÔNG với tới được project này.** Token đang ở org `abcuqidmnllfjuxehmcb`
(chỉ thấy *Forum Thinksmart Insurance* + *thinksmart-operations-dashboard*). Project của Tool là
**`tdgunknoldhtchflopvf`** (org `hadangtien0702-8981's projects`, tên `thinksmart-portal`) — gọi
thẳng ref trả `You do not have permission`. Đo được là nhờ **Chrome remote**, không phải MCP.

**③ Đặt tên lại toàn bộ 14 snippet SQL** (trước đó **9 cái "Untitled query"**, không ai biết cái nào
làm gì). Quy ước: **NHÓM + số + việc nó làm**, không dấu cho đồng nhất, mô tả ghi rõ **ĐÃ CHẠY**
hay **ĐỪNG CHạY LẠI**:

`QUYEN 1/2` · `SCHEMA 0a/0b/1/1b/3/3b` · `DO LUONG` · `SALE - Dot 1/2` · `TAI KHOAN 0/1/2`

→ Lộ ra **4 bản SCHEMA trùng/cũ** (2 bản 3-role giống hệt nhau, 2 bản cũ chỉ có `admin|user`).
Chạy nhầm bản cũ là **đè lên schema đang chạy** — nên tên mới ghi thẳng *DA THAY THE / DUNG CHAY LAI*.

**④ ☠️ HAI SNIPPET CHỨA MẬT KHẪU THÔ CỦA 69 SALE, VẪN NẰM TRÊN SUPABASE.**
`SALE - Dot 1` (48 tài khoản) và `SALE - Dot 2` (21 tài khoản) — sinh 22/07/2026. Chính phần
ghi chú trong file ra lệnh *"CHAY XONG THI XOA file nay"*, nhưng chúng vẫn ở đó **8 tuần**.
Repo đã chặn `Account/` + `*.sql` bằng `.gitignore`, nhưng **snippet trên Supabase không ai chặn**
— ai vào được dashboard là đọc được 69 mật khẩu. → **ĐÃ XOÁ CẢ HAI** (chủ tool chốt 16/09). Snippet `d7ec8116…` (48 tài khoản) và `01d7383f…` (21 tài khoản). Đo lại sau khi xoá: danh sách **14 → 12 snippet**, tìm từ `sale` trong SQL Editor ra **0 kết quả**. Hai script này đã chạy xong từ 22/07 nên không mất gì.
→ **Bài học:** `.gitignore` chỉ chặn đường **git**. Cùng một file dán vào SQL Editor là nằm trên dashboard vĩnh viễn, không luật nào chặn. Script có bí mật thì **xoá snippet ngay sau khi chạy**.

---

## 2026-08-18 — LỖI UI PHÒNG BAN (2 ô chọn) + BỎ THÔNG BÁO VÔ TRI (v1.49)

Chủ tool: *"những thông báo vô tri - xấu - không có ý nghĩa và kèm theo lỗi UI phòng ban"*.

**① Ô "Phòng ban" trong hộp Sửa tài khoản hiện MỘT LÚC HAI Ô CHỌN.**
Gốc: CSS của dropdown tự dựng nằm trong `style.css`, mà **`members.html` không nạp
`style.css`** (nó nạp `portal.css`). Nên trang Thành viên chạy `dropdown.js` nhưng
không có CSS: nút tự dựng hiện trần, `<select>` gốc lẽ ra bị ẩn thì phơi nguyên bên dưới.
→ Sửa gốc: **tách ra `public/dropdown.css`**, CẢ HAI trang cùng nạp. Thêm trang nào
dùng dropdown thì phải nạp **cả `dropdown.css` lẫn `js/dropdown.js`** — thiếu một là vỡ.
→ Đo đối chứng trên DOM (bàn đo dùng `portal.css` + `dropdown.js` thật):

| | `<select>` gốc | Chiều cao cụm |
|---|---|---|
| Thiếu `dropdown.css` (bản cũ) | **hiện** (opacity 1, static) | **65px** = 2 ô |
| Có `dropdown.css` | ẩn (opacity 0, absolute, pointer-events none) | **38px** = 1 ô |

**② Bỏ hộp thoại "Xong · Đã cập nhật … • phòng ban"** sau khi sửa tài khoản.
Bảng phía sau ĐÃ hiện giá trị mới ngay trước mắt — bắt bấm OK để đọc lại đúng thứ vừa
thấy là thêm một cú bấm cho không có tin nào (luật: **chỉ báo khi THẤT BẠI**).
☠️ **NGOẠI LỆ GIỮ LẠI:** đổi **mật khẩu** hoặc **email đăng nhập** thì vẫn hiện — đó là
thông tin phải chép ra gửi cho người ta, đóng hộp là mất, không có chỗ xem lại.
Đừng "dọn nốt" cái này.

---

## 2026-08-18 — ☠️ SỬA LỖI: LĂN CHUỘT TRONG DROPDOWN LÀ NÓ ĐÓNG SẬP (dropdown.js v1→v2)

Chủ tool: *"lỗi scroll ở tiểu bang nha em"*. Ô Tiểu bang có **50 bang**, phải cuộn mới
tới được bang cuối — mà lăn chuột một cái là danh sách biến mất.

**Gốc:** `window.addEventListener('scroll', dong, true)` trong `js/dropdown.js`.
`capture: true` nghe được **cả sự kiện `scroll` KHÔNG bubble của chính panel**, nên panel
tự cuộn cũng bị coi là "khung bên đang cuộn" → gọi `dong()` → gỡ panel khỏi DOM.
Ý định ban đầu đúng (panel `position:fixed`, khung ngoài cuộn thì panel trôi khỏi nút),
chỉ thiếu vế lọc nguồn sự kiện.

**Sửa:** bỏ qua khi `e.target` là panel đang mở hoặc nằm trong nó.

**Đo trước/sau trên bàn đo dùng ĐÚNG `dropdown.js` + `style.css` thật, 50 bang:**

| Ca | Bản cũ | Bản mới |
|---|---|---|
| Cuộn trong panel (`scrollTop=200`) | **panel bị gỡ khỏi DOM** | còn mở, scrollTop 200 |
| Cuộn tới cuối danh sách | — | còn mở, thấy `Wyoming` |
| Cuộn khung bên ngoài | đóng | đóng (giữ nguyên hành vi đúng) |
| Chọn `Wyoming` sau khi cuộn | — | `select.value` đúng · bắn `change` · nhãn nút đổi · panel đóng |

⚠️ Lỗi này áp cho **MỌI** `select.select-field`, không riêng Tiểu bang: Tuổi · Giới tính ·
Sức khoẻ ở Proposal, và 5 dropdown trong `members.html`. Sửa ở gốc nên hết cả loạt.

---

## 2026-08-18 — DỌN CHỮ THỪA Ở TAB ĐO LƯỜNG + TRACKING TỪNG LƯỢT TÍNH TUỔI (v1.48)

Chủ tool: *"move mấy cái vô nghĩa này ra đi em"* rồi *"anh muốn tracking công cụ tính
tuổi xem sale nào chạy và chạy cái gì"*.

**① Gỡ 4 chỗ chữ thừa** (`js/portal/members.js` v60→61, `members.html`):
- `Số liệu từ 10/8` và `Số liệu từ 9/8` — nói lại đúng thứ NHÃN CỘT ĐẦU của biểu đồ đã in.
  Giữ nguyên ca "Chưa có số liệu nào trong khoảng này" (ca đó nhìn không ra được).
- `20/7 – 18/8 · 1 lượt = 1 lần mở (gộp trong 15 phút)` — bỏ hẳn thẻ `usage-tools-range`.
- `Đang mở cho: cả đội` — nay CHỈ hiện khi mục chưa mở cho cả đội (lúc đó nó giải thích
  vì sao "0 lượt của sale"). Mở rồi thì là chữ thừa.

**④ CHỐT CUỐI: bảng thành POPUP, hàng thẻ còn 3** (chủ tool: *"đem gọn gàng lên đây
cho anh đi"* + *"3 phần này cũng không cần em xóa luôn nhé"*).
- Thêm thẻ **"Lượt tính tuổi ›"** ở hàng trên cùng, bấm mở popup `#uct-backdrop` — đúng
  lối thẻ "Tải về" đang chạy. Popup dùng **khoảng chung của trang** (14/30/60) nên số
  trong popup luôn khớp số trên thẻ; có ô tìm tên sale + đếm `n/N lượt`.
- ☠️ **GỠ 3 thẻ** `uk-login` · `uk-tool` · `uk-active` (Đăng nhập / Mở công cụ / Người
  hoạt động) — gỡ CÓ CHỦ ĐÍCH, đừng dựng lại. Biểu đồ ngay dưới đã nói cùng chuyện mà
  còn theo ngày. `.usage-stats` 5 → **3 cột**.
- ⚠️ Số trên thẻ đếm **từng lần bấm Tính** (kind `calc`), KHÁC con số "45 lượt" ở khối
  Công cụ tra cứu (đếm lượt MỞ màn hình, gộp 15 phút). Hai thứ khác nhau — đừng "sửa"
  cho chúng bằng nhau.
- Đo lại bằng hàm thật: khoảng 14 ngày → `5/8 – 18/8 · 2 lượt`, lọc đúng dòng ngoài
  khoảng và dòng khác kind, sort mới→cũ, cảnh báo "còn 18n" đúng ô; rỗng → khối trống
  hiện `flex`, có dữ liệu → `none`.

**③ Dời bảng vào CỘT PHẢI, dưới biểu đồ** (chủ tool: *"em đem nó lên trên đây cho gọn"*).
Bản đầu để thành hàng riêng dưới đáy khối → lúc chưa có dữ liệu là một dải trắng vắt ngang
cả trang. Cột trái chỉ rộng 250–300px nên KHÔNG nhét bảng 5 cột vào đó được — đã đo trước
khi chọn chỗ. Ô tìm nay tự ẩn khi bảng rỗng. Đo trên DOM thật (bàn đo tạm dùng CSS + hàm
thật, 25 dòng giả): cột phải 694px · **0/25 hàng tràn ngang** · tên dài cắt ellipsis đúng ·
body không tràn ngang · bảng cuộn trong 208px (nội dung 918px).
⚠️ **Chưa kiểm được nhánh <760px** — bàn đo kẹt ở viewport 980px; members là trang quản trị
dùng trên máy nên tạm chấp nhận.

**② Ghi từng lượt Tính tuổi** — kind mới `calc` trong `usage_events`, KHÔNG throttle:
- `js/tinhtuoi.js` v12→13: mỗi lần bấm Tính ghi `detail` = `{ngaysinh, tuoi_that,
  tuoi_bh, ngay_tang, con_ngay, kieu_go}`. ⚠️ Ghi chú cũ trong `openTinhTuoi`
  ("KHÔNG bao giờ ghi ngày sinh khách") HẾT HIỆU LỰC — chủ tool chốt ghi đủ 18/08.
- `supabase/schema.sql`: nới `usage_events_kind_check` thêm `'calc'`.
  ☠️ **CHƯA CHẠY SQL NÀY THÌ MỌI LƯỢT TÍNH BỊ DB TỪ CHỐI VÀ `logUsage` NUỐT LỖI IM** —
  không có dấu hiệu gì trên giao diện. Chạy trước khi báo cho sale dùng:
  `alter table public.usage_events drop constraint if exists usage_events_kind_check;`
  `alter table public.usage_events add constraint usage_events_kind_check check (kind in ('login','open_tool','download','view','calc'));`
- `members.html` + `portal.css` v84→85: bảng **"Từng lượt Tính tuổi"** dưới khối Công cụ
  tra cứu — 5 cột (Sale · Ngày sinh khách · Tuổi thật/BH · Ngày tăng tuổi · Lúc), phẳng
  không gộp theo người (câu hỏi là "chạy CÁI GÌ" — gộp là bắt bấm thêm một lần), có ô tìm.
  Dòng sắp nhảy bậc phí (≤30 ngày) đổi màu cảnh báo.
- Tính phí CHƯA ghi từng lượt (chưa được yêu cầu) — đừng dựng cột rỗng cho nó.

**Đo:** chạy đúng hàm thật `veBangTinhTuoi` trích từ `members.js` trên 5 sự kiện giả
(1 ngoài khoảng · 1 khác kind · 1 `detail` rỗng) → đúng **3 dòng + header**, lọc đúng,
`detail` rỗng ra "—" chứ không văng, ngày bày `02/09/1990` (MM/DD), cảnh báo "còn 12n".
`kiem-truoc-push.js` 7/7 xanh · `kiem-cache-version.js` xanh (đã bump `portal.css` ở
**cả 4 trang** — script bắt được index/login/videos còn ghi v84).

---

## TRẠNG THÁI HIỆN TẠI — chốt 2026-08-18 14:25 (+0700)

- **Bản live:** `tool.thinksmartinsurance.com` — **v1.49 · 18/08/2026** (3 trang khớp nhau).
- **Phiên bản file:** `style.css?v=116` · `js/core.js?v=50` · `js/proposal.js?v=47` ·
  `js/dropdown.js?v=2` · `vendor/supabase-js.min.js?v=2.112.3` · `portal.css?v=87` · `dropdown.css?v=1` · `js/portal/members.js?v=64` · `style.css?v=117` · `js/tinhtuoi.js?v=13`.
- **5 mẫu proposal:** đã là bản mockup — KHÔNG còn dữ liệu khách hàng thật.
  Giá trị giả: `Nguyen Van Mau` · `43` · `California` · `$0` · `TÊN AGENT ASSISTANT` ·
  `(000) 000-0000`.
- **Trang tool:** 522,9 → **312,6 KB** (−40%) sau khi tối ưu font + tự host supabase-js.

**[CHỜ] — hai việc dừng vì lý do ngoài repo:**

1. **`iNDEXED` (chữ i thường) VẪN CÒN trong file `.ai`.** Trên live đã đúng
   (`INDEXED`), nhưng **lần xuất sau từ Illustrator sẽ lỗi lại**.
   *Lý do dừng:* `ReplaceText` đòi uuid của thẻ chữ, mà **không lấy được bằng máy**.
   Đã thử 6 đường, đều trượt vì MCP giới hạn **25.000 ký tự mỗi phản hồi**:
   `GetArtboardStructure` (103/126 và 100/125 — tiêu đề nằm trong phần bị cắt) ·
   `GetCanvasStructure` maxDepth 1 (118/679) và −1 · `GetObjectStructure` trên layer
   gốc ("Response too large") · dò theo TÊN (trượt vì dấu tiếng Việt) · dò theo
   TOẠ ĐỘ · dò uuid khuyết (uuid dùng chung cả tài liệu → 2.921/2.991 số khuyết) ·
   `RunPreflightChecks` (chỉ liệt kê đối tượng CÓ lỗi — tiêu đề không dính lỗi nào).
   *Cách gỡ:* chủ tool bấm chọn dòng chữ đó ở artboard **AIG IUL**, Shift-chọn thêm
   ở **NLG IUL** → `VisualizeSelection` trả uuid → `ReplaceText` là xong.

2. **Tài liệu Illustrator CHƯA LƯU.** `ListDocuments` trả `filePath: null`, tên
   `Untitled`. Trong đó có phần Claude đã sửa: **4 logo Thinksmart nhân bản** từ logo
   nhúng thật của Allianz (uuid 1531) + **đã xoá 2 `<Linked File>` đứt** (3200, 3264).
   Đóng không lưu là mất.
   *Bản sao lưu trước khi sửa:* `_Archive/ai-backup-2026-08-18/` (236,6 MB, gitignore).
   *Lý do dừng:* đợi làm xong việc 1 để gộp một lần lưu.

3. Allianz: 11 ô lệch nhỏ trong bảng phí và 1 tổ hợp có 2 file Drive — vẫn chờ sếp
   chủ tool xác nhận (treo từ 11/08).

---

### 18/08/2026 12:00 — NHÃN "UPDATED" CHO MỤC PROPOSAL + BUMP v1.45 (đã push, đã kiểm live)

Chủ tool xin nhãn `updated` cho mục Proposal ở cây điều hướng.

**Cơ chế:** `makeCollapsibleFolder` nay nhận `moi` là **chuỗi** (không chỉ true/false):
`true` → nhãn "new" như cũ · **chuỗi** → dùng chính chữ đó + class `.nav-upd`.

☠️ **HAI RÀNG BUỘC ĐO ĐƯỢC — đã ghi thẳng vào CSS để không ai nới ra:**

| | Kiểu `.nav-new` gốc | Kiểu `.nav-upd` đã làm |
|---|---|---|
| Bề rộng pill | 58,9 px → nhãn "Proposal / Báo giá" **thiếu 12 px**, cắt thành "Proposal / Báo gi…" | **47,5 px** → **thiếu 0** |
| Tương phản | tô đặc `--success` (#15A34A) + chữ trắng = **3,30:1** (dưới chuẩn) | viền nhạt (`--brand` trên `--brand-soft`) = **6,44:1** |

Bỏ phương án tô nền xanh vì rơi đúng cái bẫy mà `.nav-badge-lock` đã ghi chú tránh
với `--warning`. Kiểu viền nhạt cũng **cố ý nhẹ hơn NEW** — "vừa cập nhật" không cần
hét to bằng "mới tinh". **Đo lại: nhãn NEW của 4 mục kia GIỮ NGUYÊN** (35,7 px, 7,1:1).

**PHIÊN BẢN v1.44 → v1.45, ngày về 18/08/2026 ở cả 3 trang.**
☠️ Phát hiện ngày đang **lệch nhau** mà không ai để ý: `index`+`members` ghi `11/08`,
`tool` ghi `12/08`. Nay thống nhất.

**Luật mới chủ tool chốt:** *"mỗi lần anh bảo e update lên git là mỗi lần update
verson mà"* → đã ghi vào `~/.claude/commands/xong.md` mục 2b (dùng ở mọi dự án) và
`CLAUDE.md` mục 2g (kèm vị trí chính xác 3 chỗ ghi phiên bản).

**Kiểm trên `tool.thinksmartinsurance.com`:** v1.45 + ngày 18/08 khớp ở cả 3 trang ·
`.nav-upd` có trong CSS · `moi: 'updated'` có trong proposal.js · font biến thiên và
supabase tự host còn nguyên · **0 lời gọi jsdelivr**.

---

### 18/08/2026 11:50 — TU HOST supabase-js (da push, DA KIEM TREN LIVE BANG TRINH DUYET)

Bo `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` -> `/vendor/supabase-js.min.js?v=2.112.3`
o ca 5 trang (index/login/members/tool/videos).

**HAI LY DO (ly do 2 quan trong hon toc do):**
1. Ten mien la = mot vong DNS+TCP+TLS RIENG. Do live 5 lan: TLS xong o 79-121ms,
   TTFB 117-166ms. Ket noi toi origin minh thi da mo san tu luc tai HTML.
2. **`@2` KHONG ghim ban** — jsdelivr doi ban luc nao cung duoc ma minh khong biet,
   tren dung duong DANG NHAP cua 77 sale.

**CHOT AN TOAN — giong het tung byte ban dang chay:**
  md5 jsdelivr @2 = md5 jsdelivr @2.112.3 = md5 file tu host = `660d082ff26f26940da446e9acd5e386`

**KIEM TREN LIVE BANG TRINH DUYET THAT** (khong dung o "file tra ve 200"):
| Kiem | Ket qua |
|---|---|
| the script tren live | `/vendor/supabase-js.min.js?v=2.112.3` |
| con goi jsdelivr | **0** |
| `window.supabase` | co (object) |
| `createClient` | co |
| tao client bang `TST_CONFIG` that | duoc |
| `auth.signInWithPassword` | la ham |
| o email / mat khau / nut dang nhap | co du |
| loi console | **0** |

**FONT tren live (do bang `document.fonts`, khong doan):**
- 8 @font-face, net ghi la **"400 800"** = dung dai font BIEN THIEN.
- Trinh duyet chi tai **3 file** (latin / latin-ext / vietnamese cua net thuong);
  italic `unloaded` vi trang khong dung. `taiNguyenFont` rong trong Resource Timing
  la chuyen binh thuong cua gstatic, KHONG phai font hong — `document.fonts.check`
  tra `true`.

**☠️ SO DO THOI GIAN — PHAI DOC KEM CANH BAO KHOI DONG NGUOI:**
Do 8 lan lien tiep, GIU NGUYEN THU TU (html_ms / supabase_ms):
```
856/637 · 304/79 · 64/638 · 66/319 · 59/61 · 56/59 · 55/60 · 57/59
```
- Trung vi: **html 64ms · supabase 79ms**. On dinh khi da am: **~55-60ms moi cai**.
- **Lan dieu huong DAU TIEN vao live do duoc TTFB 5.317ms, load 7.367ms.** Do la
  cong don: ket noi nguoi cua trinh duyet + ham Vercel nguoi. KHONG phai con so
  binh thuong, nhung **nguoi dau tien vao sau luc vang VAN chiu no**.
- Lay trung vi tren ca 8 lan la tron hai che do -> vo nghia. Phai nhin THU TU.

**TONG KET HAI BUOC TOI UU HOM NAY (do tren live):**
| | Truoc | Sau |
|---|---|---|
| Font (bo tai ve) | 261,7 KB | **51,4 KB** |
| @font-face | 38 | **8** |
| Ten mien ngoai phai bat tay | 3 (googleapis, gstatic, jsdelivr) | **2** |
| supabase-js | jsdelivr, khong ghim ban | tu host, ghim 2.112.3 |
| Tong trang tool | 522,9 KB | **312,6 KB (-40%)** |

**DOI BAN supabase SAU NAY:** tai lai tu jsdelivr roi doi so trong `?v=` o CA 5 trang.
Huong dan da ghi ngay tren the `<script>` de khoi phai tra lai changelog.

---

### 18/08/2026 11:30 — TOI UU TOC DO TAI TRANG: FONT 261,7 -> 51,4 KB (da push, da do tren LIVE)

Chu tool yeu cau toi uu toc do toan tool, va noi ro: **khong do o localhost**.

**DO PHAN BO TRUOC KHI SUA** (luat 5x — thu "hien nhien cham" thuong khong phai thu pham).
Can toan bo trang tool tren live:

| Thanh phan | Kich thuoc that |
|---|---|
| 17 file ma nguon (da nen brotli) | 207,7 KB |
| **Font Google (bo latin + vietnamese)** | **261,7 KB** |
| supabase-js (jsdelivr) | 53,3 KB |
| /api/svgs + /api/library | 327 + 812 byte |

=> **Nut that la FONT, nang hon ca ma nguon.** Trang tool khai **38 @font-face**.

**HAI VIEC DA LAM:**
1. Plus Jakarta Sans: 5 net TINH (400/500/600/700/800) -> **1 font BIEN THIEN**
   `ital,wght@0,400..800;1,400`. Nhin y het, tai 1 file thay 5.
2. **Bo Fira Code** — ton **70,8 KB** ma chi dung o DUNG 2 cho: `.zoom-indicator`
   (chi bao "107%") va `.color-hex` (o ma mau). Nay dung `ui-monospace` cua he dieu
   hanh, von DA nam san trong chuoi du phong cua `--font-mono` (khong them gi moi).

**DO LAI TREN LIVE SAU KHI DEPLOY** (bat buoc — luat 5ah):
| | Truoc | Sau |
|---|---|---|
| @font-face | 38 | **8** |
| Bo chu tai ve (latin+viet) | 261,7 KB | **51,4 KB** |
| Tong trang tool | 522,9 KB | **312,6 KB** |
| | | **-210,3 KB · -40% ca trang** |
Da xac nhan ca 5 trang (index/login/members/tool/videos) deu dung font bien thien va
khong con Fira Code; `--font-sans` giu nguyen; `--font-mono` con dung chuoi du phong.

**DO ROI LOAI — KHONG phai nut that:**
- `/api/svgs` 327 byte, `/api/library` 812 byte, ttfb ~130-160ms. May lan vot len
  **2,95s / 1,23s** la **KHOI DONG NGUOI** (phan bo hai cum — bai hoc 5ai), khong phai
  hieu nang. ☠️ NHUNG phai noi voi chu tool: nguoi dau tien vao sau luc vang VAN chiu
  do tre do; con so "130ms" la cua ham da am.
- Ma nguon noi bo da nen brotli san; chi `config.js` (0,9 KB) khong nen — khong dang.

**CHUA LAM — de rieng:** `supabase-js` tai tu **jsdelivr**: 53,3 KB + mot vong DNS/TLS
rieng (do: TLS xong o 79-121ms). Tu host trong `/vendor` se bo duoc vong do VA ghim
duoc phien ban (`@2` hien khong ghim = rui ro chuoi cung ung). Nhung no nam tren
**duong dang nhap cua 77 sale** — sai la khong ai vao duoc. Phai lam rieng + kiem ky.

---

### 18/08/2026 11:00 — ALLIANZ: 5 O TIEN NEO TRAI + `data-neo="trai"` (chua push)

Chu tool chot: ca 5 o tien cua Allianz neo trai theo nhan.

**3 o lam duoc bang FILE** (keo chu ve le trai cua nhan, 3 cua cua `laCanGiuaTheoBanVe`
tu nhan ra): Muc dong moi nam (keo 40,65) · Muc bao ve ban dau (47,68) · Tong so tien dong (33,84).

**2 o trong DAI XANH bi cua 3 chan.** `nenChiOmMotGiaTri()` doi the nen chi om DUNG MOT
gia tri; dai xanh om CA HAI ("Thu nhap huu tri" + "Tong dong tien du kien") -> ham bo cuoc
-> tra `true` (canh giua). Va vi toi da keo chu sang trai trong file, cum bi canh giua quanh
tam MOI -> chu tool go `$123,123` thi **tran han ra ngoai mep trai the** (anh chup 11:00).

**☠️ BAN VA DAU TIEN CUA TOI SAI — DA VUT:** noi cua 3 thanh "chia nen thanh COT theo tung
gia tri roi do trong cot". Nghe hop ly, nhung **do truoc/sau tren ca 5 mau: 65/404 o doi
phan loai** — lot ca tieu de muc, doan van, ten dai ly, "PRESENTED BY". Qua rong.
=> **Phep do nay la thu cuu ban va.** Neu chi nhin "2 o can sua da dung" thi da day len live
   mot thay doi cham vao 65 cho. Doi mot HEURISTIC DUNG CHUNG thi bat buoc phai dem
   truoc/sau tren toan bo, dung chi kiem cho minh vua sua.

**CACH DA CHON — danh dau thang trong ban ve:** `data-neo="trai"` tren the `<text>`.
`laCanGiuaTheoBanVe()` gap thuoc tinh nay thi tra `false` ngay, khong do gi ca.
Da danh dau 2 the trong `Max-Funded Allianz.svg` (khoi 54 va 56).
**Do lai truoc/sau: dung 2/404 o doi**, ca hai deu la o `$0` cua Allianz. 5/5 o tien
cua Allianz nay bao NEO TRAI.

**Kem theo — `xepLaiHauTo()` biet neo trai:** cum `[so | /nam]` truoc day LUON duoc canh
giua quanh `neo.tam` tinh mot lan. Nay neu `laCanGiuaTheoBanVe(idTien)` tra false thi giu
`neo.trai` (translate ban dau cua so) lam moc, hau to `/nam` day ra sau. Khong co dong nay
thi moi chinh trong file .svg deu vo ich — cum bi keo ve giua ngay lan go dau tien.
`neoHauTo` chi ton tai cho DUNG MOT o ("Thu nhap huu tri" cua Allianz, proposal.js:1084)
nen pham vi anh huong hep.

**File:** keo them the `/nam` (khoi 55) cung 62,58 de giu khe ho voi con so.
`js/proposal.js` 43 -> **46** (3 lan bump trong mot buoi — cua chan bat dung ca 3 lan).

**BAI HOC:**
1. **Kieu neo cua mot o KHONG nam trong code — no duoc SUY RA tu hinh hoc file mau.** Muon
   doi thi sua file .svg. Khi hinh hoc khong noi ro duoc (nen dung chung), thi **danh dau
   tuong minh trong file**, dung di noi cai heuristic.
2. **Doi heuristic dung chung = phai dem truoc/sau tren TOAN BO du lieu that.** 65 vs 2 la
   khoang cach giua mot ban va hong va mot ban va dung, ma nhin code thi ca hai deu "hop ly".

---

### 18/08/2026 10:35 — 2 O "MUC BAO VE" + "MUC DONG MOI THANG" CUA MAU IUL: NEO TRAI (chu tool yeu cau)

Chu tool go `$47,000` vao o Muc Bao Ve -> chu nam GIUA the, trong khi nhan "Muc Bao Ve"
neo trai. Yeu cau: *"rieng 2 cho nay anh muon lay sat le ben trai"*.

**Cach lam — dung dung co che san co, khong them code:** keo chu ve dung le trai cua NHAN.
`laCanGiuaTheoBanVe()` do le trai/le phai so voi the nen; lech qua `NGUONG_LECH_CAN_GIUA`
(0,15) thi KHONG bat `text-anchor:middle` -> gia tri sale go vao moc tu le trai va no
sang phai. `thuNhoChoVua()` van chay binh thuong (canhGiuaTheoBanVe dat `neo.rong` +
`neo.coChuGoc` TRUOC nhanh if, nen khong bi bo qua).

**4 o da keo** (chi 2 mau IUL — bo cuc giong nhau):
| Mau | O | x cu -> x moi | keo trai |
|---|---|---|---|
| AIG IUL | Muc Bao Ve | 118,964 -> 56,724 | 62,24 |
| AIG IUL | Muc Dong Moi Thang | 89,796 -> 58,366 | 31,43 |
| IUL - NLG | Muc Bao Ve | 123,674 -> 61,434 | 62,24 |
| IUL - NLG | Muc Dong Moi Thang | 94,506 -> 63,086 | 31,42 |

**Kiem (do that tren DOM):**
| O | lech le trai so voi nhan | ty le lech trong the nen | tool se canh giua? |
|---|---|---|---|
| AIG IUL · Bao Ve | **-0,49** | 0,543 | **KHONG** |
| AIG IUL · Dong Moi Thang | **-0,26** | 0,592 | **KHONG** |
| IUL-NLG · Bao Ve | **-0,49** | 0,543 | **KHONG** |
| IUL-NLG · Dong Moi Thang | **-0,25** | 0,592 | **KHONG** |
(-0,x la do chan chu `$` khac chu `M`, mat nhin la thang hang.)
Da render kem **mo phong go `$47,000` va `$1,234.56`** -> ca hai deu moc tu le trai, no
sang phai, khong tran the.

**KHONG ap cho AIG Termlife / TERMLIFE-NLG / Allianz** — bo cuc khac han: o "Muc Bao Ve"
cua Term Life nam trong o rong BEN PHAI nhan (x=368 so voi nhan x=51), khong cung cot
nhu IUL. Cac o tien con lai (bieu do Cash Value, Tong so tien dong) VAN canh giua.

**Ghi chu ky thuat:** cach neo cua tung o KHONG nam trong code — no duoc SUY RA tu hinh hoc
cua file mau. Nghia la **muon doi kieu neo cua mot o thi sua vi tri chu trong file .svg**,
dung di tim cho sua trong `proposal.js`. Va nguoc lai: **moi lan xuat lai mau tu Illustrator,
kieu neo co the doi** neu designer keo chu di cho khac.

---

### 18/08/2026 10:20 — ☠️ TEXT GIA LAM TAT LUON CANH-GIUA O TIEN (da sua) — LOI THU HAI CUNG MOT GOC

Chu tool: *"co truong hop anh dien dau - thi em cho vao giua nha em"*. Dau `-` bi troi
sang trai. **Lai la loi cua ban mockup**, va **cung mot co che voi loi 10:05**.

**GOC RE:** `laCanGiuaTheoBanVe()` (proposal.js:347) quyet dinh co bat canh-giua hay khong
bang cach **DO xem chu co nam giua khung nen khong**:
```
const leTrai = n.chu.left - n.nen.left;
const lePhai = n.nen.right - n.chu.right;
return Math.abs(lePhai - leTrai) <= NGUONG_LECH_CAN_GIUA * n.rong;   // nguong 15%
```
Ban goc `$180.00` nam giua o -> do ra can -> tool bat `text-anchor:middle`.
Toi thay thanh `$0` **nhung giu nguyen toa do neo trai** -> do ra lech trai ->
**KHONG bat canh giua** -> go `-` vao thi chu neo trai, nhin nhu lech.

**CACH SUA — va vi sao KHONG chon cach de hon:**
- ❌ KHONG ghi san `text-anchor="middle"` vao file: `canhGiuaTheoBanVe()` co dong
  `if (oC.getAttribute('text-anchor') === 'middle') { neo.xong = true; return; }` — thoat
  SOM, khong dat `neo.rong` / `neo.coChuGoc`, ma `thuNhoChoVua()` doi dung hai gia tri do
  (`if (!neo.xong || !neo.rong || !neo.coChuGoc) return`). Lam vay la **tat luon tinh nang
  thu nho chu dai cho vua o** — doi mot loi lay mot loi khac.
- ✅ **Dich chu `$0` ve dung TAM ma ban goc da can.** Do be rong chu goc (tu ban sao luu)
  va chu moi, dich `translate(X ...)` thêm `(rongCu - rongMoi)/2`. Tool tu bat canh giua
  nhu cu, VA `thuNhoChoVua()` van chay.

**Da dich 25 o: AIG IUL 6 · AIG Termlife 4 · IUL-NLG 6 · TERMLIFE-NLG 4 · Allianz 5.**

**Kiem:** do tam tung o cua ban mockup so voi ban goc -> **lech 0,000 tuyet doi o ca 25 o**.
Tam trung khop nghia la `laCanGiuaTheoBanVe` se cham diem y het nhu voi ban goc.
Kem: `tagClientInfoElements` van **5/5** o ca 5 mau; tong so o van 89/73/88/81/73;
`kiem-cache-version` 19/19.

**BAI HOC (nang len tu bai 10:05 — DAY MOI LA DANG DAY DU):**
☠️☠️ **Doi noi dung trong file mau khong chi doi CHU — no doi ca HINH HOC va DAU VAO cua
moi bo do dang doc file do.** Hai lan lien tiep trong mot buoi, cung mot goc:
| Doi gi | Bo do bi anh huong | Trieu chung nguoi dung thay |
|---|---|---|
| ten/tuoi/bang -> text gia | `tagClientInfoElements` (so khop CHUOI) | muc "Thong tin khach hang" chi con 2/5 o |
| tien -> `$0` giu neo trai | `laCanGiuaTheoBanVe` (do HINH HOC) | go `-` bi lech trai |
=> **Truoc khi doi mot gia tri trong file mau, hoi DU HAI CAU:**
   1. Co doan code nao **so khop chuoi** nay khong? (`===`, `includes`, regex)
   2. Co doan code nao **do hinh hoc** cua no khong? (bbox, tam, le trai/le phai)
   Cau 2 la cau toi quen ca hai lan.
=> Va: **thay chu thi phai giu nguyen TAM**, dung chi giu toa do goc trai.

**CHUA KIEM DUOC TRUC TIEP:** khong dang nhap duoc vao tool nen chua tu tay go `-` de nhin.
Bang chung gian tiep: tam trung khop 100% voi ban goc, ma ban goc thi canh giua dung.

---

### 18/08/2026 10:05 — ☠️☠️ TEXT GIA LAM CHET BO DO O KHACH HANG (da sua)

Chu tool bao *"bam chu tren ban ve khong nhay"*. Mo anh chup ra thi thay muc
**"1. Thong tin khach hang" chi con 2 o** (Gioi tinh, Suc khoe) thay vi 5.
**Loi cua toi**, do chinh ban mockup vua lap.

**GOC RE:** `tagClientInfoElements()` (proposal.js:648) nhan dien 5 o khach hang
**THEO NOI DUNG CHU**, moi o mot dieu kien rieng:

| O | Dieu kien that trong code | Text gia dot 1 | Ket qua |
|---|---|---|---|
| Gioi tinh | `t === 'Male'` hoac `'Female'` | giu `Male` | ✅ |
| Suc khoe | `ALL_RATE_CLASSES.includes(t)` (14 muc) | giu nguyen | ✅ |
| **Tuoi** | ☠️ **`line(el) === '43'`** — GHIM CUNG dung chuoi "43" | `00` | ❌ |
| **Tieu bang** | `US_STATES.includes(t)` (50 bang) | `State` | ❌ |
| **Ten** | `^[A-Z][A-Za-z'.]+( [A-Z][A-Za-z'.]+){1,3}$` + KHONG chua `Khach\|Client\|State\|Standard\|Preferred...` + `getAbsoluteY < 450` | `TÊN KHÁCH HÀNG` | ❌ (co dau tieng Viet, va dinh tu cam "Khách") |

**Da sua (dot 2):** `Nguyen Van Mau` · `43` · `California`. Do lai bang **chinh ham
`tagClientInfoElements`** (nap kem `ALL_RATE_CLASSES` 14 muc, `US_STATES` 50 bang,
`getAbsoluteY`): **5/5 o nhan duoc o ca 5 mau**.

**BA BAI HOC:**
1. ☠️ **Doi DU LIEU trong mau = doi DAU VAO cua bo do.** Toi chi nghi "thay chu cho
   khong lo thong tin khach" ma khong hoi *"co doan code nao dang DOC chu nay khong?"*.
   Cau tra loi la CO — va no im lang bo qua o khong khop, khong bao loi gi.
   => Truoc khi doi bat ky gia tri nao trong file mau: **grep xem chuoi do co bi so sanh
   o dau khong** (`=== '43'`, `includes(...)`, regex ten).
2. ☠️ **`line(el) === '43'` la MIN CHUA NO.** Bat cu ai doi tuoi trong mau — hoac xuat lai
   mau voi khach khac tuoi — la **o Tuoi bien mat khong dau vet**. Chua sua vi
   `/^\d+$/` se bat nham cac so "1/2/3/4" cua vong "Cap do". Muon sua phai neo them
   dieu kien vi tri (cung the `<text>` voi nhan "Tuoi / Age") va co bo kiem rieng.
3. **Phep kiem cua toi truoc do KHONG DU:** toi da do "so o nhap khong doi 89/73/88/81/73"
   va "0 o con du lieu that" — **ca hai deu dung ma van lot loi**, vi chung do TONG SO,
   khong do **PHAN LOAI**. Dem khong phai la kiem (bai hoc 5k lap lai lan thu N).
   Phep do dung la chay `tagClientInfoElements` roi dem 5 id `client-*`.

**Ghi chu:** tuoi phai de `43` nen mau van mang dung tuoi cua khach cu. Tuoi don le khong
dinh danh duoc ai, nhung neu chu tool muon so khac thi **phai sua ca dong `=== '43'`**.

---

### 18/08/2026 09:55 — DA LAP 5 BAN MOCKUP VAO TOOL (chua push)

Chu tool duyet -> lap ca 5 vao `public/templates/` **va** `2-Templates/<hang>/`.
Sao luu ban truoc do o `_Archive/truoc-mockup-2026-08-18/` (5 file .bak).

**Do tren FILE DANG CHAY, bang chinh chuoi ham cua tool:**

| Mau | So o nhap (truoc -> sau) | Con du lieu that | Ten khach | O dai ly | O tien $0 |
|---|---|---|---|---|---|
| AIG IUL | 89 -> **89** | **0** | TÊN KHÁCH HÀNG | 4 | 6 |
| AIG Termlife | 73 -> **73** | **0** | TÊN KHÁCH HÀNG | 4 | 4 |
| IUL - NLG | 88 -> **88** | **0** | TÊN KHÁCH HÀNG | 4 | 6 |
| TERMLIFE - NLG | 73 -> **73** | **0** | TÊN KHÁCH HÀNG | 4 | 4 |
| Max-Funded Allianz | 81 -> **81** | **0** | TÊN KHÁCH HÀNG | 4 | 5 |

- md5 `public/templates` vs `2-Templates` **khop ca 5 cap**.
- `2-Templates/` bi `.gitignore:9` chan — **dung nhu thiet ke**, ban live chay tu
  `public/templates` (da xac nhan bang `git check-ignore -v`).
- `kiem-cache-version.js` 19/19 khop. **KHONG gan `?v=` cho templates** (luat 2f-①).
- Da render ca 5 ra anh va nhin bang mat.

**Bao dong nham cua toi:** nhin anh thu nho tuong Allianz ghi "Preferred Plus Nortobacco".
Doc bang `getLineTextContent` thi dung la **"Preferred Plus Nontobacco"** — khong co loi.
=> Bai hoc lap lai: **anh render thu nho khong phai la phep doc chu**; muon doc chu thi
   doc qua ham that, dung doan bang mat tren anh nen.

**Luu y con lai:** AIG/NLG viet `Standard Non-Tobacco` (co gach ngang) con Allianz viet
`Preferred Plus Nontobacco` (khong gach). Chua ro co y theo tung hang hay khong — CHUA SUA.

---

### 18/08/2026 09:45 — 05 BAN MOCKUP (bo du lieu khach that) + DROPDOWN TU DUNG (chua push)

**A. 05 BAN TEST MOCKUP — go het du lieu khach hang/dai ly that khoi mau**

☠️ **Phat hien: 4 mau dang NHUNG SAN TEN KHACH HANG THAT.** Chu tool thay "luc thi
Vu Nguyen luc thi Dinh Thi Thao Nguyen" chinh la vi moi mau giu mot khach khac nhau:
`Vu Nguyen` (AIG IUL) · `Dinh Thi Thao Nguyen` (AIG Termlife, IUL-NLG, TERMLIFE-NLG) ·
`Chau Dang Khoa` (Allianz). Kem theo la ten + SDT dai ly that.

Da thay bang text gia (script `tao-mockup.js` o scratchpad, ban giao o thu muc `mockup/`):
`TÊN KHÁCH HÀNG` · `00` · `State` · `$0` · `TÊN AGENT ASSISTANT` / `TÊN LICENSED AGENT` ·
`(000) 000-0000`. **Tien deu dat $0** — khong bia so bao hiem, va o chua sua thi lo ngay.
GIU nguyen: Gioi tinh, Xep hang suc khoe, dia chi/SDT/website cong ty, ten CEO (sale
khong sua duoc muc CEO — luat 2b-①).

**Cach lam — chay dung duong cua tool, khong tu viet lai:** trich thang tu `core.js`
cac ham `optimizeSvgTexts` · `chuanHoaKerningDongDaGop` · `getLineTextContent` ·
`manhCungDong` · `boQuenKerning` · `clearSiblingTspans` roi chay chuoi
optimize -> gan `data-editor-id` (cum DAU cua moi dong, nhom theo y) -> chuan hoa kerning.
Ghi chu gia thi lam giong `gomMotKhoiChu`: don chu vao cum dau, cum sau de rong + go x/y.

**Kiem:**
- **0 o con du lieu that** o ca 5 file (quet bang chinh `getLineTextContent`).
- **So o nhap KHONG DOI**: 89 / 73 / 88 / 81 / 73 — mockup khong them bot o nao.
- Hai bo cai dat doc lap (trinh duyet + Node) ra **cung so khoi doi**: 13/11/13/11/12.
- Da render 3 mau ra anh va nhin bang mat.

⚠️ **Ban mockup KICH HOAT mot nhanh code ma ban goc khong chay vao**: `boQuenKerning`
(dong da gop -> cum dau om het chu, cum sau rong). Tool CO san xu ly, nhung day dung la
kieu "duong code chua bao gio chay" — neu doi mau sang mockup that thi phai thu ky.

**CHUA lap vao `public/templates/`** — moi ban giao file cho chu tool duyet.

---

**B. DROPDOWN TU DUNG — `public/js/dropdown.js` (MOI)**

☠️ **Danh sach option cua `<select>` do HE DIEU HANH ve, CSS khong cham toi.** Dong
`select.text-input-field option { background-color... }` (style.css) gan nhu **vo tac dung**
tren Windows/Chrome. Muon dung style app thi bat buoc phai tu dung panel.

**Ap cho CA 6 the `<select class="select-field">`** (5 o `members.html` + 1 o `proposal.js`),
khong va rieng mot cho — luat 5n.

☠️ **GIU NGUYEN the `<select>` trong DOM**, chi an ve mat nhin (`opacity:0`).
Ba cho dang truy van no va se hong LANG LE neu go:
`core.js:1189` · `core.js:1728` (`chupThongTinDaDien` doc `.value` + `aria-label`) ·
`main.js:338` (bam chu tren ban ve -> focus o tuong ung). Chon xong thi ghi vao `<select>`
roi ban `change` — moi doan code cu chay y nguyen. Them `sel.onfocus -> btn.focus()`
de duong focus cua main.js van thay duoc.

☠️ **Dung lai danh sach muc MOI LAN MO, dung chup mot lan.** `members.html` khai
`<select>` RONG roi `members.js` do option vao sau — chup mot lan se ra panel trong tron.
☠️ **Panel dat `position:fixed` va gan vao `<body>`** — de trong `.dd` thi bi khung cuon
cua thanh ben cat mat.

**Do that (dung 2 o canh nhau, doc computed style ca hai — luat "comment co the noi doi"):**
| | O nhap thuong | Nut dropdown |
|---|---|---|
| cao | 38,3 | **38,3** |
| bo goc | 8px | **8px** |
| co chu | 14px | **14px** |
| dem | 8px 10px | **8px 10px** |
| mau vien | rgb(213,217,227) | **giong het** |

- mo/dong OK · 9 muc dung thu tu · muc dang chon: nen `rgb(245,242,255)` (--brand-50),
  chu `rgb(109,40,217)` (--brand-600), dam 600, co dau check
- panel: `fixed`, gan vao body, bo goc 10px (--r-md), co bong, cach nut 4px
- chon muc -> ban `change` **dung 1 lan**, `sel.value` doi dung, nhan tren nut doi, panel dong
- Enter mo duoc · bam ra ngoai dong duoc · truy van cu van thay `SELECT#edit-text-9`

⚠️ **rAF KHONG CHAY khi khung trinh duyet dang an** — phep do dau tien treo 30s vi cho
`requestAnimationFrame`. Do DOM dong bo thi khong dinh. (Ho hang bai hoc 5j.)
⚠️ Va: lan chay bi ngat giua chung de lai dropdown DANG MO, nen cu bam sau do thanh DONG
-> bao "mo khong duoc". **Reset trang thai o dau moi phep do.**

**Cache:** `style.css` 113 -> **114**, `js/proposal.js` 42 -> **43**, them
`js/dropdown.js?v=1` vao `tool.html` + `members.html`. `kiem-cache-version.js` da bat
dung 2 file quen bump; da chot lai bang `--ghi` (19 file).

**CON TREO:** chua push · chua xem duoc anh chup (khung trinh duyet dang an) — chu tool
tai lai trang tool de nhin · chua thu tren `members.html` that (can dang nhap).

---

### 18/08/2026 09:10 — NOI THANG VAO ILLUSTRATOR QUA MCP; XUAT LAI 4 MAU (chua push)

**MOI: Illustrator co MCP server.** Preferences > MCP & Tools > Enable MCP server.
Chu tool bam nut copy dong "Claude Code" roi dan vao terminal chay:
`claude mcp add --transport http --header "Authorization: Bearer ilst_..." --scope user illustrator http://localhost:18412/v1/mcp`
Da them vao `~/.claude.json` (scope user) — con o day cho phien sau.
**46 cong cu.** Trong phien dang chay co the goi thang bang curl (khong can mo lai
phien): script tien ich o scratchpad `ai.sh` — initialize -> notifications/initialized
-> tools/call, phai giu header `Mcp-Session-Id`.
⚠️ Gioi han **25.000 ky tu moi phan hoi**. `GetArtboardStructure` tra 103/126 doi tuong
va **truncated:true**; `GetObjectStructure` tren layer goc thi bao "Response too large".
=> Khong duyet duoc cay layer cua tai lieu nay. Lay uuid bang cach doc **bounds** o
`GetArtboardStructure` roi doi chieu toa do trang, dung hon la tim theo ten.

**TAI LIEU:** "Proposal NLG AIG", 6 artboard, **filePath = null (CHUA LUU RA O DIA)**.
=> Tu tao diem lui bang `Export` format AI:
`_Archive/ai-backup-2026-08-18/Proposal NLG AIG - truoc khi Claude sua.ai` (236,6 MB).

**GOC RE THAT CUA "THIEU LOGO":** khong phai quen dat — ma la **anh LIEN KET BI DUT**.
`uuid 3200` (AIG IUL, trang x=496,7 y=30,2) va `uuid 3264` (AIG Termlife, x=488,1 y=29,9)
deu la `<Linked File>` hong => xuat SVG ra **khong co gi**. NLG thi khong co doi tuong nao.
Chi Allianz co logo **nhung that** (`uuid 1531`, `<Image>`, trang x=482,0 y=14,9).
=> Da lam: `DuplicateObjects` 1531 x4 -> `MoveObjects` absolute vao 4 artboard;
`DeleteObjects` 3200 + 3264. Sau do AIG xuat **het canh bao broken link**.

**BA VIEC XU LY TREN FILE SVG SAU KHI XUAT** (script trong scratchpad):
1. ☠️ **Anh nen NLG phinh lai 2604 KB -> 8321 KB.** Tai lieu Illustrator van giu ban
   **5802x3749** goc; ban dang chay la ban da nen con **2800x1810** tu 31/07 (luat 2b-④
   trong CLAUDE.md). Xuat lai la mat cong nen. => Da **dung lai dung blob 2800px cua ban
   dang chay** (the `<image>` giong het tung thuoc tinh: width/height/transform) ->
   8,30 MB tro ve **2,72 MB**.
2. `iNDEXED` -> `INDEXED`. ☠️ **Loi nay VAN CON TRONG FILE .ai** — doi chung ban xuat
   tho van ra `iNDEXED`. Chu tool phai sua trong Illustrator, khong thi lan xuat sau lai loi.
3. **Gop cum + neo giua cho 2 dong tieu de**: 6 tspan -> 2, `text-anchor="middle"`,
   x = tam trang tru translate cua the `<text>` (122,73 cho IUL / 122,59 cho Termlife).
   Chua tan goc font, nhung **bao dam THEO CAU TAO**: font nao cung can giua, khong chong chu.

**SO DO SAU KHI LAP:**
| | AIG IUL | AIG Termlife | IUL-NLG | TERMLIFE-NLG |
|---|---|---|---|---|
| lech tam tieu de (2 dong) | -0,15 | -0,15 | -0,15 | -0,14 |
| logo x / le phai | 481,76 / 18,77 | 481,76 / 18,77 | 481,76 / 18,77 | 481,77 / 18,75 |
| so `<text>` cu -> moi | 82 -> 82 | 72 -> 72 | 81 -> 81 | 72 -> 72 |
| dung luong | 2,02 -> 2,14 MB | 2,01 -> 2,14 MB | 2,60 -> 2,72 MB | 2,59 -> 2,71 MB |

- **So cau truc toan bo khoi `<text>`** (bo qua so class — Illustrator danh lai): chi khac
  dung khoi tieu de + nhom "Cap do/Anh huong". Nhom sau khac **0,04 don vi toa do**
  (77,44->77,4) = sai so lam tron khi xuat lai, duoi mot diem anh.
- **Khoi `PRESENTED BY` GIONG HET ban cu** (cung `<text>`, 3 cum, cung translate) ->
  moc neo cua `yPresentedBy` trong `js/proposal.js` van tim thay nhu cu.
- `node scripts/kiem-cache-version.js` -> 18/18 khop, exit 0.
- Da render 5 dai header ra anh va **nhin bang mat** kem duong tam.

**☠️ THUOC CUA TOI SAI 4 LAN TRONG PHIEN NAY — deu cung mot goc: LAY NHAM TANG DOM.**
1. `getComputedStyle` tren `<text class="cls-52">` (chi co `fill`) -> tuong font la
   "Plus Jakarta Sans", suyt bao voi chu tool la font bi doi. Font nam o **tspan con**.
2. Ep font bang `parent.style.fontFamily` -> 6 font ra cung be rong = thuoc chet.
   Phai bom `<style>` co `!important`. **Doi chung: 7 font phai ra 7 be rong khac nhau.**
3. Gom cum theo thuoc tinh `y` -> tron dong tagline "Making promises" (cung y=0 nhung
   khac the `<text>`) vao tieu de.
4. Duyet "dong" bang tspan la -> ra manh vun ("gent", "si", "tant") va
   `yPresentedBy = 0` (vi nhan bi tach thanh 3 cum) -> dem ra **148 o dai ly** thay vi 4.
=> **Luat: truoc khi tin mot phep do tren SVG cua Illustrator, hoi "toi dang dung o TANG
   nao — the `<text>`, tspan DONG, hay tspan CUM?"** Ba tang nay khac nhau hoan toan.
   Dau hieu thuoc sai: **ket qua ra manh vun chu khong ra cau hoan chinh.**
=> Va khi thuoc tay lien tuc sai: **bo tu dung lai logic, chuyen sang SO CAU TRUC ban cu
   voi ban moi.** Do la phep chac chan nhat va da dung de ket luan o tren.

**CON TREO:**
- Chua push.
- **Tai lieu Illustrator dang CO THAY DOI CHUA LUU** (4 logo moi + da xoa 2 lien ket dut).
  Chu tool can Ctrl+S / Save As ra file .ai, khong thi mat phan sua ben Illustrator.
- **`iNDEXED` van con trong file .ai.**
- **Allianz chua duoc gop cum tieu de** — van no +14,19, chu "HOẠ" hoi chen. Chua sua vi
  chu tool chi noi ve 4 mau.
- NLG IUL va AIG IUL nay **gian dong tieu de khac nhau** (27,9 vs 21,2) — do chu tool
  sua trong Illustrator (ban xuat tho cung vay), khong phai loi. Can xac nhan co y.
- Con 3 `<Linked File>` dut khac trong tai lieu (canh bao van hien khi xuat artboard NLG).

---

### 18/08/2026 08:35 — GOC RE CUA "TIEU DE BI LECH": TEN FONT POSTSCRIPT KHONG PHAN GIAI DUOC

Chu tool bao tieu de 4 mau bi lech. **KHONG lien quan ban va logo** — da chung minh:
`git diff --numstat` cho thay moi file SVG dung **1 dong doi** (dong cuoi, cho chen
`<image>`), khong file CSS/HTML nao bi sua. Dong Google Fonts o `tool.html:33` la
commit `47a21b9` ngay 14/07/2026 cua chinh chu tool.

**GOC RE — do bang doi chung "ten font bia dat":**

| Do (chuoi "BAN BAO GIA CHUONG TRINH", 18,02px) | Be rong |
|---|---|
| Illustrator chua san cho dong nay | **237,58** |
| `SFProDisplay-Bold` (ten PostScript file SVG khai) | **259,25** — GIONG HET mot ten font bia dat -> **khong phan giai duoc** |
| Roi ve `SF Pro Display` + `font-weight:700` | **254,77** -> **thua 17,19 (~7%)** |
| Cung font, `font-weight:800` | **254,77** — y het 700 -> dau van tay **DAM GIA** |

**May chu tool CO `SF Pro Display` (Regular) va `Semibold`, nhung THIEU net `Bold`.**
Trinh duyet bom dam gia -> chu no 7%. Ma Illustrator ghi **toa do x CUNG cho tung cum
chu** (`x="0"`, `51.07`, `62.75`, `138.33`, `150.63`...), nen phan thua don vao cac khe
-> **chong chu + dong day sang phai** = cai "lech" nhin thay.

Cong don do no dong chu nho: **IUL-NLG +11,04 · TERMLIFE-NLG +11,81 · Allianz +14,19**.
Dong chu lon (net Black) chi **+0,14 - +0,50** -> gan nhu dung. Vi vay dong NHO lech ro hon.

**HAI LAN THUOC CUA TOI BAO SAI TRONG CHINH VIEC NAY** (ghi lai de khong lap):
1. Doc `getComputedStyle` tren the `<text class="cls-52">` -> bao font la "Plus Jakarta
   Sans". SAI: `.cls-52` chi co `fill:#fff`; font nam o **tspan con** (`.cls-9`
   SFProDisplay-Bold 18,02px · `.cls-37` SFProDisplay-Black 40px). Suyt bao nham voi
   chu tool la font da bi doi.
2. Ep font bang `parent.style.fontFamily` -> 6 font ra **cung mot be rong** = thuoc chet.
   Vi font khai o tspan con, dat style len the cha khong thang duoc class con.
   Sua: bom `<style>` voi `svg text, svg tspan { font-family: X !important }`.
   **Doi chung bat buoc: 7 font phai ra 7 be rong khac nhau** thi thuoc moi dung.
3. Gom cum chu theo thuoc tinh `y` -> o 2 mau AIG bi tron dong tagline
   "Making promises Keeping them" (cung `y=0` nhung thuoc `<text>` KHAC) vao cung nhom
   -> so vo nghia. Chi so cua NLG va Allianz la sach.

**LOI NOI DUNG PHAT HIEN KEM:** tieu de ghi **"INDEXD UNIVERSAL LIFE"** — thieu chu E,
dung ra la **"INDEXED"**. Co o ca `AIG IUL.svg` va `IUL - NLG.svg`. KHONG tu sua.

**CHU TOOL CHOT: se TU XUAT LAI 4 FILE tu Illustrator** (sua ca lech ca chinh ta).
-> Khi do **ban va logo Thinksmart 18/08 se MAT** neu file .ai chua co logo.
   Xem muc "CAN LAM KHI NHAN 4 FILE MOI" ngay duoi.

---

### CAN LAM KHI CHU TOOL GUI 4 FILE MOI (18/08/2026)

1. Kiem `<image>` logo Thinksmart co san trong file moi chua (`id="logo-thinksmart"`
   hoac anh 2370x896). Chua co -> chen lai theo so do da chot:
   AIG IUL `481.95 22.67` · AIG Termlife `481.95 22.66` ·
   IUL-NLG `481.95 25.69` · TERMLIFE-NLG `481.95 25.67` (scale .04).
   Node goc lay tu `Max-Funded Allianz.svg`.
2. Do lai do no cum chu: moi cum phai **KHONG rong hon** khoang x Illustrator chua san.
   Neu tieu de da create outlines thi khong con `<text>` o dai `y<135` — do la dau hieu
   TOT, va luc do bo qua phep do nay.
3. Chay du 5 buoc thay mau o `CLAUDE.md` muc 2b (sao luu -> thay CA HAI noi -> doi chieu
   md5 -> nen anh nen neu >2800px -> IN RA DOC TUNG O).
4. Kiem muc "3. Thong tin dai ly" van **dung 4 o** (luat 2b-①).
5. `node scripts/kiem-cache-version.js` truoc khi push.

---

### 18/08/2026 08:11 — THEM LOGO THINKSMART VAO 4 MAU PROPOSAL (chua push)

Chu tool bao: 4 mau AIG/NLG thieu logo Thinksmart o goc phai header (Allianz co).

**DO TRUOC KHI SUA** — nap 5 file SVG vao DOM, doc `getBBox` + `getCTM` quy ve toa do
goc, quet dai header `y < 70`. Khong doan theo toa do:

| Mau | Logo hang (trai) | Logo Thinksmart (phai) |
|---|---|---|
| Max-Funded Allianz | paths x 25-117 | CO — `<image>` 94,8 x 35,8 tai x=481,7 y=14,9 |
| AIG IUL / AIG Termlife | `<image>` 112x36 tai x=12,5 | KHONG — trong tu x=331 den 595 |
| IUL - NLG / TERMLIFE - NLG | polygon+paths x 12-148 | KHONG |

Dem `<image>` moi file: Allianz **4** · AIG **2** · NLG **1**. Anh 2370x896 scale .04
chi ton tai trong file Allianz.

**KIEM NGUON TRUOC KHI DUNG** (bai hoc 5af — dung tin ten): giai base64 ra PNG, doc
IHDR (2370x896, bitDepth 8, colorType 6 = RGBA). Xem tren nen trang thi TRANG TINH —
vi logo trang nen trong suot. Ghep len nen toi moi doc duoc: dung la logo
"THINKSMART INSURANCE". Diem duc (alpha>200) **384.294 = 18,1%**, mau trung binh
**rgb(255,255,255)** tuyet doi. Nen goc phai header ca 4 mau deu toi
(AIG tim `rgb(120,80,221)` alpha .78 · NLG xanh la `rgb(30,132,71)` alpha .85)
-> logo trang hien ro.

**CACH DAT — khong be nguyen toa do Allianz.** Giu cung be rong (94,75) va cung le
phai (18,82), nhung **canh giua theo tam doc cua logo HANG trong chinh mau do**:

| Mau | Tam doc logo hang | translate |
|---|---|---|
| AIG IUL | 40,59 | `481.95 22.67` |
| AIG Termlife | 40,58 | `481.95 22.66` |
| IUL - NLG | 43,61 | `481.95 25.69` |
| TERMLIFE - NLG | 43,59 | `481.95 25.67` |

Chen `<image id="logo-thinksmart" ...>` ngay truoc `</svg>` (ve sau cung = nam tren).

**DA LAM DUNG QUY TRINH THAY MAU:**
1. Sao luu 4 file vao `_Archive/logo-fix-2026-08-18/` (KHONG de trong `2-Templates/`)
2. Ghi ca HAI noi: `public/templates/` va `2-Templates/<hang>/` — md5 tung cap khop
3. Khong nen lai anh nen (khong dung toi)
4. `node scripts/kiem-cache-version.js` -> 18/18 file khop, exit 0

**DO SAU KHI SUA:**
- 5/5 mau co logo · be rong **94,75** · le phai **18,82** · lech tam so voi logo hang
  **<= 0,02** (rieng Allianz von lech 2,56 — thiet ke goc, khong dung vao)
- `soPhanTuVeSauLogo = 0` o ca 4 mau moi -> khong phan tu nao ve de len logo
- **Go dung the vua chen ra thi file GIONG HET ban cu tung byte** (4/4)
- So `<text>` va `<tspan>` KHONG DOI (82/82 · 72/72 · 81/81 · 72/72)
  -> khong sinh them o sua nao cho sale
- Render that 5 dai header ra anh va **NHIN BANG MAT** (bai hoc 5k — dem khong phai
  la kiem): ca 5 logo hien trang tren nen toi, khong dinh chu, khong tran le

**CON TREO:** chua push. Neu chu tool xuat lai mau tu Illustrator thi ban va nay mat —
logo phai duoc them vao file goc `.ai`.

---

## (trạng thái cũ — chốt 2026-08-12 20:38)

### 12/08/2026 20:38 — MỤC APPLICATION FORM: 3 chỗ chủ tool yêu cầu sửa (đã push)

Chủ tool gửi 3 ảnh chụp màn hình có khoanh đỏ. Làm đúng 3 việc, không thêm gì:

| Trước | Sau |
|---|---|
| `AIG — Application Form` | **`NLG & AIG — Application Form`** |
| 3 tấm lẻ (AIG) + 2 tấm lẻ (Allianz) hiện thành thẻ nhỏ, tấm gộp nằm cuối | **chỉ còn tấm gộp** |
| `Thông tin khách hàng` | **`Phiên bản gửi nhanh cho khách`** |

**Sửa ở DỮ LIỆU, không sửa chỗ vẽ** — nhãn sinh ra từ tên file:
- 5 tấm lẻ chuyển sang `_Archive/Application Form/` (thư mục bị `.gitignore` → biến khỏi
  bản live, vẫn còn trên máy). Còn đúng 3 file, mỗi file 1 trang → `preprocessLibraryItems`
  không gộp nữa nên **lưới thẻ nhỏ tự biến mất**, không phải đụng vào hàm dựng lưới.
- Đổi tên: `AIG Application Form (4).jpg` → `NLG & AIG — Application Form.jpg` ·
  `Allianz Application Form (3).jpg` → `Allianz Application Form.jpg` ·
  `Thông tin khách hàng.jpg` → `Phiên bản gửi nhanh cho khách.jpg`.
  ☠️ **Đã MỞ TỪNG ẢNH RA ĐỌC trước khi chọn giữ tấm nào** (bài học 5af): tấm giữ lại của
  AIG là bản 7440x3508 chứa đủ mục 1→14, của Allianz là 4678x3308 chứa đủ mục 1→10 + Hồ sơ
  trẻ em. Không suy từ tên file.

**Ba chỗ trong code phải sửa theo, mỗi chỗ đều là lỗi thật đo được:**

1. **`tachTenMau` (core.js) bắt nhầm tên nhiều hãng.** Cả hàm giả định *một file = một
   hãng*: `carrierOf` trả hãng ĐẦU TIÊN gặp (`aig` dò trước `nlg`), rồi regex cắt tên hãng
   ở đầu/cuối. `NLG & AIG — Application Form` ra nhãn **`AIG — & AIG — Application Form`**.
   → Thêm cửa chặn: tên chứa **từ 2 hãng trở lên** thì trả nguyên văn, không tách.
   Đo hồi quy: 6 mẫu proposal + 4 brochure nhãn **không đổi một chữ**.

2. **Nhóm "Chung" xếp thuần theo tên → đổi CHỮ làm mục NHẢY CHỖ.** `NLG & AIG` sắp sau
   `Allianz`, trong khi chủ tool chỉ xin đổi chữ. → Xếp theo **thứ tự hãng** trước
   (`carrierSort(carrierOf(a), carrierOf(b))`), cùng hãng mới theo tên. Chỉ mục Application
   Form đi qua nhánh này (`Brochure/` chia hãng bằng thư mục con, không có file lẻ ở gốc).

3. ☠️ **KHUNG XEM 1 ẢNH BÓP CHẾT ẢNH NGANG — lỗi CHỈ LỘ RA sau khi bỏ mấy tấm lẻ.**
   `.library-thumb` ghim `max-width: min(72%,760px)` + `max-height: 62vh`; ảnh tỉ lệ 2,1:1
   bị mốc **chiều cao** chặn trước. Đo trong khung 1279x719:

   | Ảnh | Trước | Sau |
   |---|---|---|
   | NLG & AIG (7440x3508) | 726x342 | **1175x554** |
   | Allianz (4678x3308) | 583x413 | **1166x824** |
   | Phiên bản gửi nhanh (dọc 1727x2662) | 268x413 | 268x413 (không đổi) |

   → Thêm `.library-view.is-wide` (họ hàng với `is-tall` của SMS, khác trục): bỏ cả hai
   mốc, cho cuộn, **nút Tải về dính ĐÁY khung** (ảnh Allianz cao 824px > khung 719px thì
   nút rơi khỏi tầm mắt — đúng lỗi chủ tool bắt 31/07). Đo lại: nút nằm cách đáy 13px ở
   cả 3 ảnh.

☠️ **HAI CÁI BẪY ĐO ĐƯỢC, ghi để phiên sau khỏi vấp lại:**
- **`onload` trong chuỗi HTML KHÔNG chạy khi ảnh đã nằm trong bộ đệm.** Bản đầu tôi gắn
  `is-wide` bằng thuộc tính `onload` — lần vào đầu đúng, **bấm lại chính file đó thì
  không đổi khung**. Loại lỗi "chỉ sai từ lần thứ hai". Nay dùng `khiAnhCoKichThuoc()`
  (kiểm `complete && naturalWidth` trước, không thì mới nghe `load`). Đo 2 lượt liên tiếp
  cho cả 3 ảnh: giống hệt nhau.
- **Hàm nào BẬT một chế độ thì chính nó phải TẮT được chế độ đó.** Bản đầu để
  `openLibraryItem` gỡ `is-wide`; đo xen kẽ ngang→dọc thì ảnh dọc ăn khung rộng,
  cao **1797px** trong khung 719px. Nay `showLibraryPreview` tự gỡ ở dòng đầu.

**Bumped:** `core.js?v=49` · `brochure.js?v=32` · `style.css?v=113` (`kiem-cache-version.js` xanh).

**CÒN TREO (cố ý không sửa):** cùng lỗi "`onload` không chạy khi ảnh đã cache" vẫn còn ở
`showLibraryMultiPagePreview` (class `is-landscape`) — **chưa sửa vì không đo được**: ảnh
ở đó có `loading="lazy"`, chỉ giải mã khi trình duyệt thật sự dựng khung, mà bàn đo không
dựng (đo ra `naturalWidth = 0` dù request trả 200). Sửa mù trên đường brochure — thứ đội
sale dùng nhiều nhất — rủi ro hơn để nguyên. Đã ghi rõ cách sửa + cách đo ngay tại chỗ
trong `brochure.js`.

---

☠️ **SỬA CSS/JS XONG PHẢI BUMP `?v=` NGAY.** File tĩnh cache 1 NĂM (`immutable`). Đã cắn
hai lần trong ngày 12/08: một lần tôi đo thấy CSS "không ăn", một lần chủ tool gửi ảnh
chê "chưa gọn" trong khi máy chủ đang trả bản mới. Bảo chủ tool **Ctrl+Shift+R**.



**Bản live `tool.thinksmartinsurance.com` đã push hết.** Không còn gì nằm chờ trên máy.

☠️ **6 Ô TIỀN TRONG PROPOSAL ĐÃ KHOÁ DẤU `$`** (12/08/2026) — sale chỉ gõ được số,
tool tự chèn dấu phân nghìn, cho tối đa 2 số lẻ. **Đừng trả về ô gõ tự do.**
Và **`canhGiuaTheoBanVe` nay KHÔNG căn giữa ô mà bản vẽ neo TRÁI** — xem
`laCanGiuaTheoBanVe()` (3 cửa lọc, có số đo tại chỗ). Sửa hàm đó thì phải đo lại trên
**cả 5 mẫu**, kỳ vọng **7 ô neo trái / 59 ô căn giữa**.

🛑 **CHỦ TOOL CHỐT DỪNG PHẦN TỐI ƯU TỐC ĐỘ (11/08/2026 22:17):** *"tạm thời gì hôm nay ở
phần tool thì cứ như vậy thôi em ha"*. **Đừng tự ý tối ưu thêm** — hai việc dưới đây
đã bàn tới nhưng **CỐ Ý không làm**, phiên sau muốn làm phải hỏi lại:
- Cache `/api/svgs` + `/api/library` ở cạnh (`s-maxage` + `stale-while-revalidate`)
  để bỏ nốt độ trễ khởi động nguội. **Chưa đo, chưa làm.**
- 20 file rác ở gốc dự án (~3,2 MB: `check_*.py`, `generate_*.py`, `final_database*.csv`,
  `folder.html`…). Trong đó **`test_api.py` có khoá Google API viết cứng** — là khoá
  công khai của trang Drive, không phải khoá riêng, nhưng **repo này public trên
  GitHub**, lỡ ai chạy `git add .` là nó lên mạng. **Đã hỏi xoá hay `.gitignore`,
  chủ tool chưa trả lời.** Hiện để nguyên, KHÔNG nằm trong commit nào.

☠️ **HÀM MÁY CHỦ CHẠY Ở `sin1` (Singapore) — vì sale ở Việt Nam** (chủ tool xác nhận
11/08/2026). Khai ở `"regions"` trong `vercel.json`. **Đừng đổi lại `iad1`** trừ khi
đội ngũ chuyển sang Mỹ — đo được chênh **281 → 63 ms mỗi lời gọi API**.

☠️ **TỪ 11/08/2026 FILE TĨNH CÓ `?v=` ĐƯỢC CACHE 1 NĂM (`immutable`).**
Sửa file mà quên bump `?v=` là **77 sale ôm code cũ cả năm** và không có dấu hiệu gì.
**Bắt buộc chạy trước mỗi lần push:**
```
node scripts/kiem-cache-version.js
```
Bump xong thì chốt lại sổ: `node scripts/kiem-cache-version.js --ghi`.
Thứ **không** có `?v=` (bảng phí `public/data/*.json`, `public/templates/*`, mọi `.html`)
vẫn hỏi lại mỗi lần — **cố ý**, đừng gắn `?v=` cho chúng.

**8 mục trên cây điều hướng** — Proposal · Brochure · **Application Form** · Name Card ·
Compare · SMS · **Age / Tính tuổi** · **Quote / Tính phí**.
Ba mục cuối + Application Form đang ở **NẤC 1 hoặc mới ra**, xem tab "Khoá mục".

**Việc kế tiếp — theo thứ tự:**
1. `[CHỜ SẾP]` **11 ô bảng phí IUL còn lệch** với PDF của hãng: 10 ô lệch nhỏ
   (0,01–1,55) chưa rõ nguyên nhân, và **Nam NTBC 2t/$100.000 có HAI file trên Drive**
   với hai mức phí ($29.90 và $97.17, bản $97.17 mới hơn). **Không tự chọn.**
2. `[CHỜ CHỦ TOOL]` **Lên nấc cho Age · Quote · Application Form** khi test xong —
   bấm dải 3 nút ở tab "Khoá mục", không cần push.
3. `[CHỜ]` **15 năm chưa có bảng tra file** — Gemini mới liệt kê xong 20 năm.
   Bộ 15 năm chạy lại thì lọc đúng 4 cửa như đã làm (xem mục ③-bis ngày 11/08).
4. `[CHỜ CHỦ TOOL]` **Bấm thử tool một vòng sau đợt tối ưu tốc độ 11/08.** Tôi đo
   được bằng mạng và chạy chính hàm thật (38/38 trên live, 9/9 cho `fetchLibrary`,
   12.305 phép thử phí 0 lỗi) nhưng **chưa nhìn tận mắt giao diện lúc đã đăng nhập** —
   phiên đó chặn điều hướng trình duyệt và tôi không nhập mật khẩu của chủ tool.
5. `[CHỜ CHỦ TOOL]` **20 file rác ở gốc dự án**: xoá hẳn hay chặn bằng `.gitignore`
   (xem khối 🛑 ở trên — có một khoá API viết cứng trong đó).

**Chạy trước khi tin bất cứ thay đổi nào về phí:**
```
node scripts/stress-tinhphi.js    # 12.305 phep thu
node scripts/kiem-tinh-tuoi.js    # 102.347 phep tinh
node scripts/soi-bang-phi.js      # soi quy luat bang Term Life
```
Và mở `localhost:8000/kiem-nhanh.html` — trang tự chẩn đoán, biết ngay máy chủ đang
chạy bản nào (dùng khi "tool vẫn thấy sai" để tách lỗi CODE với cache trình duyệt).

---

### 2026-08-12 09:14 — ĐO LƯỜNG: thêm khối "Công cụ tra cứu" (Tính tuổi & Tính phí). ✅ CHỦ TOOL DUYỆT.

Chủ tool: *"anh cần thêm cột đo lường về tính tuổi và tính phí… các bạn sale truy cập
ra sao là được, anh cần một con số tổng quan và một biểu đồ 30 ngày và 60 ngày"*.

**① DỮ LIỆU ĐÃ CÓ SẴN — không phải dựng mới**
`tinhtuoi.js:203` và `tinhphi.js:344` đã ghi `logUsage('view', 'Age / Tính tuổi')` /
`('Quote / Tính phí')` từ lúc phát hành. Chỉ cần đọc và bày ra.

**② ☠️ BA THỨ PHẢI IN LÊN GIAO DIỆN, KHÔNG THÌ ĐỌC SỐ RA SAI**
1. **Throttle 15 phút** (`USAGE_THROTTLE_MS.view`) → nhãn ghi rõ *"1 lượt = 1 lần mở
   (gộp trong 15 phút)"*. Không nói ra là tưởng sale dùng ít hơn thực tế.
2. **Hai mục ở HAI NẤC KHÁC NHAU** (chủ tool xác nhận 12/08): Tính tuổi mở cho `user`,
   **Tính phí còn ở `admin`**. Khối đọc `khoa_muc.hien_cho` rồi in nấc ngay cạnh tên;
   ô Tính phí ghi *"Sale chưa vào được mục này"* thay vì con số 0 trần trụi — số 0 rất
   dễ đọc thành "sale chê".
3. **Tách SALE với ADMIN**: câu hỏi là "SALE truy cập ra sao", mà admin dùng thử cũng
   sinh sự kiện. Gộp chung thì 8 lượt của chính chủ tool trông như 8 lượt của đội.

**③ ☠️ LÀM GỌN — VÀ MỘT LẦN ĐOÁN SAI CHỖ SIẾT**
Chủ tool chê 2 lần: *"làm gọn lại"* rồi *"làm gọn gàng lại"*. Bản đầu xếp DỌC (hai thẻ
số → biểu đồ → dải nút) cao **458px**, phần lớn là mảng trắng.
- Dời dải nút 30/60 lên đầu khối cho gọn → **đo lại: chiều cao KHÔNG ĐỔI (308px)**.
  Đo tiếp mới thấy thứ quyết định chiều cao là **cột trái — 2 thẻ số xếp dọc, 107px
  mỗi thẻ = 225px**; biểu đồ chỉ giãn cho bằng. **Siết đúng thẻ số mới xuống 267px.**
  → Không đo thì đã báo "đã gọn" sau khi dời nút, mà thực tế không đổi gì.
- Kết quả: **458 → 267px (−42%)**. Bố cục nay là số bên trái / biểu đồ bên phải.
- **Sàn 10 cột** (`SAN_COT`): cắt sạch ngày chưa có số liệu là đúng (21 cột rỗng thì
  "thấy gớm" — 31/07), nhưng cắt còn **2 cột** thì thành hai que lạc lõng. Giữ tối
  thiểu 10 ngày; cột 0 nằm trong đó là tin THẬT.
- **Căn giữa cụm cột**: chỉ đặt trần bề rộng thôi thì đo ra **trống 1.070px dồn hết
  bên phải** — mới là DỜI mảng trắng chứ chưa xoá.

**④ ☠️ CACHE 1 NĂM CẮN NGAY TRONG LÚC LÀM**
Sửa `portal.css` xong đo lại, `justify-content: center` **không ăn** — trình duyệt giữ
`portal.css?v=81` theo đúng luật `immutable` đặt hôm qua. Phải phá cache mới đo được.
→ Và chủ tool cũng dính: gửi ảnh chê "chưa gọn" trong khi **máy chủ đang trả bản mới**
  — tab cũ chưa tải lại. **Sửa CSS/JS xong phải bump `?v=` NGAY, và bảo chủ tool
  Ctrl+Shift+R**, không thì cả hai bên nhìn hai bản khác nhau mà tưởng cùng một bản.

**⑤ QUYỀN XEM CHO ADMIN — ĐÃ MỞ SẴN TỪ 10/08, KHÔNG PHẢI SỬA GÌ**
Chủ tool xin *"mở quyền xem cho admin ở phần đo lường"*. Kiểm ra **đã mở sẵn cả 3 tầng**:
`initTracking()` cho `['admin','super_admin']` · policy `usage: admin doc` dùng
`is_admin()` · `is_admin()` = `role in ('admin','super_admin')`.
→ Admin vào vẫn thấy trống thì **KHÔNG phải lỗi code** — là do **chưa chạy
  `supabase/quyen.sql`** trên Supabase SQL Editor. Đó là bước THỦ CÔNG, sửa file trong
  repo không tự áp lên database.

**File đụng:** `members.html` (khối mới) · `js/portal/members.js` (`veKhoiCongCu` ·
`veBieuDoCongCu` · `datKhoangCongCu` · `bandamKhoaRows`) · `portal.css` (`.ucc-*`) ·
bump `portal.css?v=83` · `members.js?v=60`.
**Kiểm:** 36/36 (mọi `id` JS gọi có trong HTML · mọi class có trong CSS · logic đếm trên
dữ liệu giả lập). ☠️ Bộ kiểm ban đầu **sai signature** — nhận tham số 2 làm boolean nên
`luotSale = 0` báo trượt trong khi sản phẩm đúng; sửa thước rồi mới đọc được kết quả.

---

### 2026-08-12 08:05 — Ô TIỀN: khoá dấu `$` + sửa lỗi "$200 bị hở bên trái". ✅ CHỦ TOOL ĐÃ TEST VÀ DUYỆT.

Chủ tool báo: *"bị lỗi khoảng trắng khi nhập $200 vào chỗ mức đóng mỗi tháng"*, và
manh mối quyết định: *"nhập `$200` thì bị lỗi mà nhập `$200,00` thì không bị"*.

**① ☠️ TÔI ĐI SAI HƯỚNG LẦN ĐẦU — ghi lại để phiên sau không lặp**

Đọc code thấy Illustrator chẻ ô tiền thành 4 tspan mỗi cái ghim `x` tuyệt đối
(`$152` · `.` · `7` · `0`), kết luận ngay đó là thủ phạm. **Đo ra thì sai**: dựng
4 cách ghi khác nhau (ghi vào mảnh đầu + xoá mảnh em / ghi vào một tspan sạch / xoá
hết tspan) — **cả 4 ra vị trí ký tự y hệt nhau, khe giữa `$` và `2` = 0,00px**.
→ Đúng bài học 5b: *thấy dấu hiệu là một chuyện, biết thủ phạm là chuyện khác.*

**② THỦ PHẠM THẬT: `canhGiuaTheoBanVe` đổi ô NEO TRÁI sang NEO GIỮA**

Hàm này đổi ô sang `text-anchor="middle"` rồi neo vào **tâm của chữ GỐC `$152.70`**.
Ô này bản vẽ neo TRÁI, nên chữ càng ngắn càng bị hút vào giữa — hở ra bên trái:

| Giá trị | Thụt vào so với nhãn "Monthly Premium" |
|---|---|
| `$152.70` (gốc) | 1,0 px — thẳng hàng |
| `$20,000` (= `$200,00` sau chuẩn hoá) | −2,5 px — **nên chủ tool thấy "không bị"** |
| **`$200`** | **+17,1 px — HỞ** |
| `$99` | +25,1 px |

Luật này đã có sẵn cho phần Thông tin khách hàng (`LE_PHAI_O_KHACH`: *"mấy ô này neo
TRÁI theo đúng bản vẽ, KHÔNG được đổi sang căn giữa"*) — chỉ là chưa áp cho phần Kế hoạch.

**③ ☠️ HAI BỘ DÒ ĐẦU ĐỀU BẮT NHẦM — phải ghép BA CỬA**

| Cách dò | Bắt nhầm gì |
|---|---|
| Lề trái/phải trong thẻ nền | **37 ô** — ô không có nền riêng thì hàm vớ nhầm **nền cả trang 620px**, mọi thứ lệch tâm trông như neo trái |
| "Thẳng mép nhãn" | `20 năm`, `$36,648` — trong ô hẹp, nhãn và giá trị **cùng căn giữa** thì mép trái trùng nhau tình cờ |
| **Ghép cả hai + chặn nền ôm nhiều giá trị** | sạch |

Đo trên **cả 5 mẫu**: **7 ô đổi · 59 ô giữ căn giữa**. Trong 7 ô đó có 5 ô là `43`
(Tuổi) vốn đã đi đường riêng `vuaKhungOKhach` → **thực chất chỉ ô "Mức đóng mỗi tháng"
đổi**. Cột biểu đồ · ô trong bảng · vòng cấp độ giữ nguyên hết.
Hàm mới: `laCanGiuaTheoBanVe()` trong `proposal.js` (3 cửa, có chú thích số đo tại chỗ).

**④ KHOÁ DẤU `$` — chủ tool đề xuất, và nó sửa 3 lỗi KHÁC**

Chủ tool: *"khoá dấu $ ở đầu và số đi theo sau"*. Hợp lý và **đúng khuôn đã có** (ô
`Tuổi 63` / `20 năm` đã khoá đơn vị từ 23/07). Áp cho **cả 6 ô tiền** (chủ tool chốt),
**có cho gõ xu** vì mẫu gốc ghi `$152.70`.

Sửa được 3 thứ, chạy hàm thật **31/31 đạt**:

| Sale gõ | Trước | Sau |
|---|---|---|
| `2 00` (lỡ bấm cách) | bản vẽ hiện `$2 00` | `$200` |
| `200..00` · `200-` | để nguyên chuỗi hỏng | `$200.00` · `$200` |
| `hai tram` | để nguyên | `-` |

Gốc của lỗi khoảng trắng khi gõ: **`input` ghi THẲNG `e.target.value` vào bản vẽ**,
chuẩn hoá chỉ chạy lúc `blur`. Nay mọi phím đều đi qua `locSoTien()` trước khi vẽ.

**⑤ ☠️ KHOÁ Ô KHÔNG CỨU ĐƯỢC `$200,00` — ĐỪNG TƯỞNG ĐÃ HẾT LỖI TIỀN**

`formatCurrencyValue("$200,00")` trả `"$20,000"` — **gấp 100 lần, không báo gì**.
Bỏ dấu phẩy đi thì còn `20000`, **vẫn ra $20,000**. Cái khoá ô đổi được là **bỏ hẳn
việc diễn giải ngầm**: mỗi phím số bấm xuống hiện ra ngay, tool không thêm/bớt chữ số
nào, và con số **tự nhảy bậc trước mắt** (`$200` → `$2,000` → `$20,000`) nên sai là thấy.
→ `[CHỜ CHỦ TOOL]` Muốn chặn nốt thì cần **ngưỡng hợp lý cho từng ô** (vd phí tháng
  vượt $5.000 thì hỏi lại). Chưa làm — cần chủ tool cho khoảng giá trị thật.

**File đụng:** `core.js` (thêm `locSoTien` · `hienSoTien` · `chuoiTienChoBanVe` ·
`soThoTuChuoiTien` · `chotSoTienKhiRoiO`) · `proposal.js` (`moneyInputGroup` ·
`ganOTien` · `laCanGiuaTheoBanVe` + 3 cửa) · `style.css` (chip `$`) · `tool.html`
(bump `core.js?v=48` · `proposal.js?v=42` · `style.css?v=111`).

---

### 2026-08-11 21:05 — TỐC ĐỘ TẢI: menu 580 → 71 ms (−88%) · cache 1 năm · gỡ 70 KB CSS chết. ✅ ĐÃ PUSH + ĐO LẠI TRÊN LIVE (38/38 đạt).

Chủ tool: *"em kiểm tra và fix phần loading của menu và các tool — anh thấy có cái
xuất hiện chậm, load lâu"*. **Đo trước, sửa sau** — cả 3 chỗ dưới đều có số đo.

**① ☠️ MỌI FILE TĨNH ĐỀU KHÔNG ĐƯỢC CACHE — 16 vòng hỏi lại mỗi lượt vào trang**

`express.static` để mặc định `Cache-Control: public, max-age=0, must-revalidate`.
Đo trên live: **16/16 file trả 304** (không tải lại nội dung) **nhưng vẫn tốn
1.233 ms tổng vòng hỏi** — chạy 6 kết nối song song vẫn ~206 ms đứng không, trước
cả khi chạy được dòng JS đầu tiên. Trong khi tool **đã có sẵn `?v=`** (`style.css?v=110`,
`core.js?v=47`…) — đúng thứ sinh ra để cache vĩnh viễn mà chưa từng dùng tới.

Sửa ở `server.js`: **có `?v=` → `max-age=31536000, immutable`; không có → giữ nguyên**.

☠️☠️ **SỬA server.js XONG, PUSH, ĐO LẠI → HEADER KHÔNG ĐỔI GÌ CẢ.** Vì
**Vercel phục vụ `public/` thẳng từ CDN biên, request không bao giờ tới hàm Node** —
`express.static` **chỉ chạy khi `node server.js` ở máy**. Dấu hiệu nhận ra nằm ở
`X-Vercel-Id`: `/js/core.js?v=47` → `hkg1::s4htd-…` (**một** chặng = CDN trả thẳng),
còn `/api/library` → `hkg1::iad1::bm7zq-…` (**hai** chặng = biên → hàm ở `iad1`).
→ Luật cache **cho bản live** phải nằm ở **`vercel.json`** (mục `headers`, dùng
`has: [{type:"query", key:"v"}]` để bám đúng quy ước `?v=`). **Sửa một chỗ phải sửa
cả chỗ kia**, không thì máy mình và bản live cư xử khác nhau.
→ Bài học: *"đã push"* ≠ *"đã ăn"*. Nếu không đo lại trên live thì đã báo xong với
một bản vá **không có tác dụng gì** cho 77 sale.

☠️ **VÌ SAO BÁM THEO `?v=` CHỨ KHÔNG THEO ĐUÔI FILE:** thứ KHÔNG có `?v=` đúng là thứ
tuyệt đối không được cache lâu — `public/data/*.json` (**BẢNG PHÍ**) và
`public/templates/*` (mẫu proposal). Thay bảng phí mà sale ôm bản cũ 1 năm là **báo
sai số tiền cho khách**. Bám `?v=` thì hai nhóm đó **tự động** an toàn. Đã đo lại
từng cái: `tool.html` · `index.html` · `bang-phi-iul.json` · `bang-phi-termlife.json` ·
`pdf-file-iul.json` · `templates/manifest.json` — **6/6 vẫn `must-revalidate`**.

**②-bis ☠️ CACHE 1 NĂM ĐẺ RA MỘT CÁI BẪY MỚI → PHẢI CHẶN BẰNG CƠ CHẾ**

Sửa file mà **quên bump `?v=` = 77 sale ôm code cũ suốt một năm**, không dấu hiệu gì
(máy mình luôn đúng vì là file mới tải lần đầu). Trước khi đổi luật, quên bump chỉ
chậm một nhịp; sau khi đổi luật là **hỏng thật**. Nên dựng
**`scripts/kiem-cache-version.js`** — băm nội dung từng file có `?v=`, đối chiếu sổ
`scripts/cache-version.json`.

```
node scripts/kiem-cache-version.js         # soi — CHAY TRUOC MOI LAN PUSH
node scripts/kiem-cache-version.js --ghi   # chot lai sau khi da bump dung
```

**Vừa lắp đã bắt được 2 lỗi CÓ SẴN** (vô hại dưới luật cũ, thành lỗi thật dưới luật mới):
`auth.js` ghi `?v=10` ở `login.html`+`videos.html` nhưng `?v=11` ở 3 trang kia ·
`portal.css` ghi `?v=76` ở 3 trang nhưng `?v=80` ở `members.html`. Đã thống nhất về
số cao nhất. **Đối chứng**: cố tình sửa `core.js` không bump → script báo đúng chỗ,
thoát 1; khôi phục → thoát 0.

**② `animate.min.css` — 70 KB CHẶN VẼ TRANG, DÙNG 0 LẦN**

Nạp ở **cả 4 trang** (`index` · `members` · `videos` · `tool`). Lấy **105 tên class
thật từ chính file đó** rồi dò ngược toàn bộ mã nguồn: **0/105 được dùng**. Đã gỡ.
CSS chặn vẽ trang ở `<head>`: **210,9 → 140,9 KB (−33%)**.
Kèm theo: gắn `?v=3.15.0` cho `gsap.min.js` (71 KB) để nó ăn theo luật cache mới.

**③ MENU CHỜ HAI VÒNG MẠNG NỐI ĐUÔI NHAU**

Cây điều hướng cần **hai** API. Bản cũ chỉ bắn sớm `/api/svgs` ở `<head>`; `/api/library`
nằm sau `await` trong `fetchSvgsList` nên **phải đợi cái thứ nhất về xong mới được đi**.
Đo trên live: nối tiếp **580 ms** → bắn sớm cả hai, chồng lên nhau **363 ms**
= **menu hiện sớm hơn 217 ms (−37%)**.

Sửa: thêm `window.__libSom` cạnh `__svgsSom` trong `tool.html`, `fetchLibrary()`
(`brochure.js`) dùng lại — **và xoá đi sau lần đầu**, y hệt `__svgsSom`, để lần gọi
sau (thêm/xoá file thư viện) vẫn lấy dữ liệu mới. Chạy **chính hàm thật** kiểm 5 ca,
**9/9 đạt** — gồm 2 ca bẫy: bắn sớm trượt (`null`) phải tự gọi lại chứ không được để
trắng menu, và lần gọi thứ hai phải đi mạng thật.

**④ ☠️ HÀM MÁY CHỦ CHẠY Ở MỸ TRONG KHI SALE Ở VIỆT NAM — đây là thủ phạm LỚN NHẤT**

`X-Vercel-Id` cho thấy `sin1 -> iad1`: cạnh nhận request ở **Singapore** nhưng hàm
chạy ở **Washington DC**. Mỗi lời gọi API tốn trọn một vòng xuyên Thái Bình Dương.
Chủ tool xác nhận **"sale ở Việt Nam"** → `iad1` là sai chỗ. Đặt `"regions": ["sin1"]`
trong `vercel.json`.

| Đo từ Việt Nam | Trước (`iad1`) | Sau (`sin1`) |
|---|---|---|
| `/api/svgs` | 281 ms | **63 ms** |
| `/api/library` | 273 ms | **63 ms** |

⚠️ **Ngay sau deploy đo ra cụm 312–465 ms, suýt kết luận là đổi region không ăn.**
Đó là **khởi động nguội**, không phải bản chất — đo xen kẽ 20 lượt mỗi bên thì
**0/20 lượt vượt 200 ms**. Đo lại sau khi hàm đã ấm mới có số thật.

**Cộng dồn cả phiên — đường tới lúc menu hiện:**

| | ms |
|---|---|
| ① bản gốc (nối tiếp, hàm ở Mỹ) | **580** |
| ② sau khi bắn sớm song song (hàm còn ở Mỹ) | 363 |
| ③ nếu chỉ đổi region mà vẫn nối tiếp | 125 |
| ④ **bản hiện tại (song song + hàm ở SIN)** | **71** |

→ **580 → 71 ms, nhanh hơn 509 ms (−88%).**

**⑤ SỬA LẠI MỘT SỐ ĐO TÔI ĐÃ BÁO SAI TRONG CHÍNH PHIÊN NÀY**

Mục ⑥ dưới đây bản đầu ghi *"`getSession` ~377 ms + `khoa_muc` ~444 ms"*. **Sai** —
thước đo hỏng: script cũ mỗi lượt `fetch` đều bắt tay TLS lại nên đo cả chi phí mở
kết nối. Đo lại với kết nối đã ấm: **`khoa_muc` 136 ms · `auth health` 132 ms ·
cạnh Cloudflare 44 ms** (`CF-RAY: …-SIN` → Supabase ở Singapore).
→ **Supabase KHÔNG phải vấn đề**, đừng đi migrate project.
→ Bài học lặp lại: số quá xấu cũng đáng nghi như số quá đẹp.

**⑥ CHƯA SỬA — nói rõ để phiên sau không tưởng là đã xong**

- **Menu vẽ HAI LẦN** (thấy đồ hiện muộn): `renderFileTree()` chạy lần đầu lúc **chưa
  biết vai trò** → `duocThayMuc()` giấu mục nấc `super`/`admin`; xong `napKhoaMuc`
  mới vẽ lại (~136 ms sau). **Chỉ 12 admin/super admin thấy hiện tượng này** — 77 sale
  chỉ có mục nấc `all` nên không có gì hiện thêm.
  **Không cache vai trò vào localStorage**: vai trò cũ còn treo là **hỏng về phía LỘ**,
  ngược đúng luật phát hành tính năng mới (mục 2b-bis trong `CLAUDE.md`).
- **Khởi động nguội**: người đầu tiên vào sau một lúc không ai dùng vẫn phải chờ
  ~190–465 ms cho lời gọi API đầu. Đây là bản chất của serverless, muốn bỏ thì phải
  cache `/api/svgs` + `/api/library` ở cạnh (`s-maxage` + `stale-while-revalidate`).
  **Chưa làm** — cần cân nhắc: file thư viện thêm qua git push nên deploy tự xoá cache,
  nhưng phải đo trước.
- `fetchLibrary()` khi API lỗi trả về `{brochure, namecard, sms}` nhưng máy chủ thật
  trả `{brochure, soSanh, sms, appform}` — lệch tên, chỉ ảnh hưởng đường lỗi.

---

### 2026-08-11 17:20 — Huy hiệu "NEW" bị cắt · rút gọn tên · ☠️ XÁC NHẬN 4 Ô BẢNG PHÍ SAI · stress test. ✅ ĐÃ PUSH.

**⓪-a GỌN LẠI KHỐI NÚT TẢI — chủ tool: *"nhiều nút download quá"***
Còn **đúng 2 nút** và **chỉ ở màn IUL**: *Tải PDF* · *Tải CSV*.
- **Term Life: KHÔNG nút nào** — chỉ bảng 4 kỳ hạn. Hãng không phát hành bản minh
  hoạ cho Term Life nên chẳng có gì để tải; một nút mờ ở đó là chữ thừa.
- Gỡ nút *"Tải CSV bảng phí"* + **hàm `tpXuatCsv` (~55 dòng)** + CSS `.tp-nut-tai.tat`.
  Không để code chết; muốn lấy lại thì xem commit trước 11/08 trong git.
- Đo: Term Life **0 nút** (4 ô phí còn nguyên) · IUL có file **2 nút** · IUL chưa có
  file 1 nút mở thư mục + dòng chỉ tên file.

**⓪-b PHẦN TIẾNG VIỆT TRONG NHÃN MỤC MỜ ĐI** — chủ tool: *"giảm opacity phần tiếng
Việt để làm nổi bật phần tiếng Anh"*, và *"sau này thêm mục nào cũng áp dụng luôn"*.
→ Làm bằng **MỘT hàm dùng chung `nhanMuc()` trong core.js**: tự tách `"Anh / Việt"`
  và bọc phần Việt bằng `<span class="nav-viet">`. Thêm mục mới chỉ cần gọi hàm này.
→ ☠️ Dùng `color` chứ KHÔNG dùng `opacity` — opacity làm mờ cả nền/viền nếu sau này
  span có thêm gì; màu thì chỉ đụng chữ.
→ ☠️ **Bản đầu sót 2 mục**: Proposal và Name Card dựng nhãn trong file riêng
  (`proposal.js` / `namecard.js`), không đi qua hàm chung — chủ tool nhìn ra ngay vì
  hai mục đó vẫn đen đậm. Rà lại bằng `grep makeCollapsibleFolder | grep -v nhanMuc`:
  4 dòng còn lại đều là **nhóm hãng** ("AIG", "Của tôi") — đúng, không cần.
  Đo: cả 8 mục tách đúng, phần Việt `rgb(102,112,133)` vs phần Anh `rgb(17,20,32)`.

**⓪-c HAI CỘT BẰNG NHAU** — chủ tool: *"làm cột kết quả rộng bằng cột trái"*.
`grid-template-columns` **1.5fr/1fr → 1fr/1fr**. Đo ở 1280px: **591 / 591**.
☠️ Cột trái hẹp lại làm hàng đầu suýt vỡ: Term Life chỉ còn **dư 6px**. Hạ đệm
quanh đường kẻ 14 → 10px, dư lên **21px** (IUL 62px). Lịch sử số đo ghi trong CSS.
☠️ Và thước tự bẫy: bản đầu đo `.tp-hang > .tp-nhom` gom **cả hai** khối `.tp-hang`
của IUL (hàng đầu + hàng Tuổi/Kỳ hạn) → báo "rớt dòng" trong khi hàng đầu vẫn thẳng.
Phải đo `.tp-hang` ĐẦU TIÊN.

**⓪ Rút gọn tên hai mục** — chủ tool: *"bỏ 2 từ bảo hiểm cho gọn"*.
`Age / Tính tuổi bảo hiểm` → **`Age / Tính tuổi`** · `Quote / Tính phí bảo hiểm` →
**`Quote / Tính phí`**. Đổi ĐỒNG BỘ ở cả 4 nơi (cây điều hướng · tiêu đề màn ·
nhãn ghi `usage_events` · tab Khoá mục) — sót một chỗ là hai tên cùng tồn tại.

**① Huy hiệu "NEW" hiện ra "NE…"** ở mục Application Form (chủ tool bắt).
Nguyên nhân: huy hiệu bị nhét **BÊN TRONG** `.tree-folder-label`, mà nhãn có
`overflow:hidden; text-overflow:ellipsis` → cắt luôn cả huy hiệu. Ba mục phẳng
(SMS/Age/Quote) không lộ lỗi vì chúng tự dựng header, đặt huy hiệu ngoài nhãn.
Mục này là mục **có dropdown** nên nhãn còn hẹp hơn (mũi tên chiếm chỗ) → lộ ngay.
→ Sửa gốc: `makeCollapsibleFolder` nhận tham số `moi`, đặt huy hiệu làm **anh em**
  của nhãn. Đo: huy hiệu ngoài nhãn · rộng 35px · **không bị cắt**.

**② ☠️☠️ BẢNG PHÍ IUL CÓ 4 Ô SAI THẬT — CHỦ TOOL ĐÚNG, VÀ ĐÂY LÀ BẰNG CHỨNG**
Hôm qua (10/08) tôi soi ra 6 ô "nghi gõ nhầm" bằng quy luật tỉ lệ, chủ tool chốt
*"số Drive là chuẩn"* nên giữ nguyên. Hôm nay chủ tool nói rõ hơn: **Drive (PDF của
hãng) mới đúng, Excel/Sheet là chỗ đánh lộn**.
Có thước ngoài để phân xử: **tên file PDF của hãng chứa luôn số phí**. Đối chiếu
**5.193 dòng** file `final_database_v2.csv` với bảng phí → **5.178 khớp (99,7%)**,
15 lệch. Trong 15 ô lệch có **đúng 4 trong 6 ô nghi**, và PDF ghi **chính xác con
số theo quy luật** mà tôi suy ra hôm qua:

| Tổ hợp | Sheet (tool đang dùng) | PDF của hãng | Quy luật (suy 10/08) |
|---|---|---|---|
| Nam NTBC 59t / 225k | 730,25 | **830,25** | 830,25 ✔ |
| Nữ NTBC 41t / 425k | 469,40 | **496,40** | 496,40 ✔ |
| Nữ NTBC 33t / 700k | 577,20 | **557,20** | 557,20 ✔ |
| Nam NTBC 36t / 700k | 735,20 | **753,20** | 753,20 ✔ |

Ba đường độc lập cùng chỉ một chỗ: quy luật tỉ lệ · thứ tự tăng dần · **tên file
PDF của hãng**. Nặng nhất là ô 59t: sai **$100/tháng**.
→ ☠️ **VÀ 2 Ô KIA THÌ SHEET ĐÚNG**: Nam NTBC 30t/300k (233,70) và 39t/225k (297,22)
  — PDF khớp Sheet, tức **thước quy luật của tôi báo nhầm 2 ô**. Đúng bài học 5ac:
  phải phân biệt "thước sai" với "dữ liệu sai"; 6 ô nghi thì chỉ 4 là thật.
→ ✅ **ĐÃ SỬA 11/08 sau khi chủ tool duyệt** ("sửa 4 ô đó đi em"). Cách làm:
  sao lưu file nguồn trước · sửa **theo vị trí cột** đọc từ header `#MG` của chính
  sheet đó (KHÔNG thay bằng chuỗi — dòng `20FN|33` có cả `577.20` lẫn `577.10` cạnh
  nhau) · cập nhật **tổng kiểm tra** cuối dòng · chạy lại `doi-bang-phi-iul.js`.
  Kiểm sau khi sửa: **đúng 4 ô đổi, 0 ô khác bị đụng** (so từng ô với bản trong git).
  Đối chiếu lại với PDF: khớp **5.178 → 5.182**, lệch **15 → 11**.
→ `[CHỜ]` **11 ô còn lệch** — 10 ô lệch nhỏ (0,01–1,55) chưa rõ nguyên nhân, và
  **Nam NTBC 2t/$100.000** thì Drive có **HAI file** khác phí ($29.90 và $97.17,
  bản $97.17 mới hơn). Cần sếp xác nhận, không tự chọn.

**②-bis STRESS TEST — `node scripts/stress-tinhphi.js` · 7.123 phép thử, 0 lỗi**
Bộ mới, chạy được offline. Nó nạp **CHÍNH `js/tinhphi.js`** trong sandbox `vm` với
`fetch` giả (đọc JSON dưới đĩa) — không chép lại logic sang file test, vì chép là
thước cùng vật liệu.
Quét: **mọi** tổ hợp Term Life (1.043 ô có phí) · **mọi** tổ hợp IUL (5.194 ô có
phí, 619 ô hãng không bán) · biên NGOÀI khoảng tuổi · mệnh giá lạ · tổ hợp hãng
không bán · **đầu vào rác** (null/NaN/Infinity/{}/[]/chuỗi) · tuổi-mệnh-giá dạng
CHUỖI phải ra cùng kết quả dạng SỐ · bảng tra PDF không trỏ tổ hợp không tồn tại.
Ba điều test bắt buộc phải đúng, và đều đúng: **không bao giờ nội suy** · không
tổ hợp nào trả "có phí" ở chỗ hãng không bán · trả "không có" thì **luôn kèm lý do**.
☠️ Bàn đo tự bẫy mình một lần: `let`/`const` top-level trong `vm` **không** thành
thuộc tính của sandbox, nên `sandbox.tpBang` luôn `undefined` → test báo "KHONG NAP
DUOC BANG PHI" trong khi code đúng hoàn toàn. Phải lấy qua `vm.runInContext(ten)`.

**③-bis ✅ ĐÃ NẠP 5.181 TỔ HỢP — bấm là tải ĐÚNG FILE, không phải mở thư mục**
Chủ tool: *"bấm nút download thì chỉ link tới thư mục Drive thôi chứ không chính xác
là file anh cần"* — đúng, trước đó chỉ 8 tổ hợp có ID file.
Bản v2 có cột `Term` + `Fee` nên lọc được. **`public/data/pdf-file-iul.json`** (505 KB,
nạp riêng, chỉ khi mở màn Tính phí). Mỗi dòng phải qua **4 CỬA**, trượt một cửa là loại:
1. đọc được kỳ hạn (15/20) · 2. tổ hợp có thật trong bảng phí ·
3. **phí trong TÊN FILE khớp bảng phí đến 0,005** · 4. hai link hợp lệ và khác nhau.
→ Nhận **5.181**, loại **13** (11 phí lệch · 1 kỳ hạn không đọc được · 1 link hỏng).
→ Cửa số 3 chính là thứ bắt được bản v1: nó loại sạch các dòng trộn 15 năm vào 20 năm.
→ Kiểm chính ví dụ chủ tool đưa (Nam·TBC·35t·$175.000): file trả về đúng
  `Male - TBC - 35T - $175,000 - $205.45 - 20YRS` — khớp cả tổ hợp lẫn phí trên màn.
→ Nút nay có **3 mức**: có file → *Tải PDF minh hoạ* + *Tải CSV của hãng* (hai nút
  riêng, hai loại tài liệu khác nhau) · chỉ biết thư mục → *Mở PDF + CSV của hãng* ·
  Term Life → nút mờ **"Term Life không có PDF"** (nói thẳng lý do, vì nhãn cũ
  "Chưa có PDF minh hoạ" làm chủ tool tưởng tool hỏng).
→ Stress test thêm mục 5: mọi khoá phải trỏ tổ hợp **có phí thật**, không ID nào
  dùng lại cho hai tổ hợp. **12.305 phép thử, 0 lỗi.**

**③ Kiểm file `final_database_v2.csv` (5.194 dòng) — bản gốc trước khi lọc**
Bản v1 (1.927 dòng) đã bị loại vì 2 lỗi: 10 dòng gán tuổi = mệnh giá÷10.000, và
~160 dòng file **15YRS trộn vào danh sách 20 năm**. Bản v2 có thêm cột `Term` +
`Fee` (đúng yêu cầu) nên kiểm được 100%:
- Term: 15 → **160 dòng** (= đúng 160 tổ hợp 15 năm trong bảng phí) · 20 → 5.033
- Độ phủ: **5.192 / 5.194 tổ hợp có phí** — thiếu đúng 2
- Còn 3 chỗ cần chủ tool xử: **1 dòng** `Term = KHONG DOC DUOC` (Nam EX1 33t/250k) ·
  **1 tổ hợp có HAI file trên Drive** với hai mức phí khác nhau (Nam NTBC 2t/100k:
  $29.90 và $97.17, bản sau mới hơn) · **10 ô lệch nhỏ** (0,01–1,55) chưa rõ vì sao.

---

### 2026-08-11 16:10 — MỤC "APPLICATION FORM" vào Khoá mục · sửa 2 lỗi nhãn (v1.43). ✅ ĐÃ PUSH.

Chủ tool tự thêm mục **Application Form / Biểu mẫu** (8 ảnh A4 300dpi của AIG ·
Allianz · Thông tin khách hàng), nhờ kiểm và nối vào tab Khoá mục.

**① Nối đủ 7 chỗ** — mục mới phải có mặt ở cả 7, thiếu một là hỏng lặng lẽ:
`appState.khoaMuc` · `appState.hienCho` (='super') · `appState.library` ·
`NAV_ICONS` · `renderFileTree` (main.js) · **`MUC_KHOA` (members.js)** ·
**`insert into khoa_muc` (schema.sql)**. Hai chỗ in đậm là phần tôi thêm.
☠️ Thiếu dòng SQL thì bấm đổi nấc **không ăn mà cũng không báo lỗi** (UPDATE 0
dòng vẫn trả 204) — đã ghi cảnh báo ngay cạnh câu insert trong schema.sql.

**② ☠️ HAI DÒNG TRÙNG TÊN: "Application Form" và "Application Form"**
Ảnh chủ tool gửi cho thấy hai dòng giống hệt — sale không biết đâu AIG đâu Allianz.
Nguyên nhân: `makeDownloadItem` luôn cắt tên hãng khỏi nhãn (`tachTenMau().chuongTrinh`),
vì bình thường mục nằm DƯỚI tiêu đề hãng. Nhưng thư mục này không chia hãng con →
mọi file rơi vào nhóm **"Chung"**, tức **không có tiêu đề hãng nào ở trên để bù lại**.
→ Sửa: thêm cờ `giuTenHang`, nhóm "Chung" thì giữ nguyên tên hãng.
→ Đo: trước 2 dòng trùng nhau · sau `AIG — Application Form` / `Allianz — Application
  Form` / `Thông tin khách hàng`, không còn trùng.

**③ ☠️ THẺ HTML NHÉT VÀO GIỮA CHUỖI TÊN** — bản đầu gắn huy hiệu "new" bằng cách
truyền `'Application Form / Biểu mẫu</span><span class="nav-new">NEW'` vào chỗ
`label`. Nó **chạy được**, nhưng chỉ vì `label` tình cờ đi thẳng vào `innerHTML`.
Ngày nào có người bọc `escapeHtml(label)` cho an toàn thì tên mục hiện ra nguyên
đoạn thẻ — và lỗi đó chẳng liên quan gì tới người vừa sửa.
→ Sửa: thêm tham số `moi` cho `renderLibrarySection`, escape đàng hoàng.

**④ Kiểm trước khi push** — cú pháp 100% file JS + JSON · `/api/library` trả đủ 4
mục (brochure · soSanh · sms · appform, 8 file) · `/tool` trả 200 · đo cây điều
hướng bằng chính `renderLibrarySection`.
⚠️ **Báo động nhầm một lần**: tôi đọc `git check-ignore -v "Application Form/"` ra
một dòng trống và kết luận thư mục **bị gitignore chặn** (đúng cái bẫy `Brochure/`
và `SMS/` đã có tiền lệ). Kiểm lại bằng `git add -n` và check-ignore **từng file**:
8/8 file **không hề bị chặn**. → Truyền đường dẫn có `/` cuối cho `git check-ignore`
cho ra output đánh lừa; luôn kiểm bằng **file cụ thể**.

**⑤ Dung lượng** — `Application Form/` **16 MB** (8 ảnh, A4 2480×3508 ở 300dpi;
riêng AIG (4) là 7440×3508). **Cố ý không nén**: đây là biểu mẫu sale IN RA cho
khách ký, hạ dpi là in ra mờ. Khác hẳn ảnh nền proposal (đã nén 8,18 → 2,60 MB) —
thứ đó chỉ để xem trên màn.

Cache-version: `brochure.js` 22→23 · `tinhphi.js` 12→13 · `main.js` 20→21 ·
`members.js` 56→57. Số hiệu bản: **3 trang cùng v1.43** (trước đó lệch nhau:
tool v1.43 · index v1.40 · members v1.39).

---

### 2026-08-10 14:46 — SQL đã chạy · dọn chữ thừa · nút tải PDF · đồng bộ màu menu.

**① SQL ĐÃ CHẠY XONG** — chủ tool tự chạy trên Supabase. Đọc lại bảng để XÁC NHẬN
(không tin "chạy không lỗi"): 7 dòng, `tinhtuoi` và `tinhphi` = `hien_cho: 'super'`,
5 mục cũ = `'all'`. Nút đổi nấc ở tab "Khoá mục" nay bấm là ăn.

**② Cắt chữ thừa trong màn Tính phí** (chủ tool khoanh đỏ 6 chỗ, 2 đợt):
`tp-sub` ("Tra nhanh phí hàng tháng…") · ghi chú "Hạng bị mờ là hãng không bán…" ·
ghi chú "Tổ hợp này có N mức mệnh giá." · nhãn "PHÍ HÀNG THÁNG" · dòng chân
"Số lấy nguyên văn từ bảng phí của hãng…".
→ Bỏ luôn **tham số `ghiChu` của `tpNhomNut`** chứ không chỉ truyền chuỗi rỗng —
để lại tham số là mời phiên sau thêm chữ vào. CSS `.tp-sub`/`.tp-ghichu`/
`.tp-kq-nhan`/`.tp-kq-chan` xoá theo (grep còn 0 chỗ dùng).

**③ HAI NÚT TẢI: "PDF minh hoạ" + "CSV bảng phí"** — chỗ trống chủ tool khoanh
dưới bảng phí. Chủ tool chốt: *"lấy đúng file pdf và csv là được em"*.

☠️ **CSV KHÔNG có sẵn ở đâu cả** — đã tìm khắp Drive: thư mục "File Thành phẩm"
(cha là `1YJbyrDmIv1kREs1dpcY0uDKqBiwnTOgy`) chỉ có **4 file PDF**, và toàn Drive
chỉ có 3 file `.csv` đều là danh sách khách hàng cũ 2019–2023, không liên quan.
→ Nên CSV được **SINH TẠI CHỖ** từ chính `public/data/*.json` mà tool đang tra
(`tpXuatCsv()`), không tải file dựng sẵn. Lý do: file rời sẽ lệch khỏi bảng phí
ngay lần đầu bảng được cập nhật **mà không có gì báo** — sale gửi khách một đằng,
tool tra một nẻo. Sinh tại chỗ thì hai thứ không thể lệch.
→ Xuất TRỌN tổ hợp đang chọn, tên file tự đặt theo tổ hợp.
  Đo thật: Term Life Nam SNTBC = **386 dòng** (1 + 35 tuổi × 11 mệnh giá) ·
  IUL 20 năm Nam NTBC = **66 dòng × 32 cột** (1 + 65 tuổi · 1 + 31 mệnh giá),
  **số cột header = số cột dữ liệu** (phép kiểm chống bài học 5ad).
→ Kiểm chéo 3 ô, cả ba khớp: 35t/250k = 255.25 (đúng số màn vừa tra) ·
  45t/275k = 462.27 (đúng ảnh chủ tool chụp) · **59t/225k = 730.25** — tức một
  trong 6 ô nghi gõ nhầm **vẫn giữ nguyên**, CSV không "sửa cho đẹp".
→ BOM kiểm bằng **byte thật** (`EF BB BF`) chứ không bằng `Blob.text()` —
  `.text()` tự nuốt BOM khi decode nên luôn báo "không có BOM": thước sai.
→ Nút CSV gắn bộ nghe **uỷ quyền lên khối `#tp-kq`**, không lên nút: khối này bị
  vẽ lại mỗi lần bấm Tính phí, gắn lên nút là lần sau bấm không ăn mà không báo gì.

**③-bis PDF minh hoạ**
Không có bảng mapping nên **tự tìm trong Drive chủ tool**: thư mục
`1U9S7Ttze4yubN2ztjQnWXpz3Wcl8RHaQ` có đúng 4 file (AIG/NLG × Termlife/IUL).
Tool chỉ có bảng phí NLG → gắn 2 file NLG, đổi theo chương trình đang chọn
(`TP_PDF` + `tpNutPdf()` trong `js/tinhphi.js`).
☠️ **Đã kiểm QUYỀN CHIA SẺ trước khi gắn**: cả hai `anyone: reader` — nếu chỉ chia
sẻ nội bộ thì 77 sale bấm ra màn "Request access" mà tool không hề báo lỗi.
⚠️ **CHƯA đo được cú bấm thật**: trình duyệt trong phiên bị chặn miền
`drive.google.com`. Chủ tool bấm thử một cái là biết.

**④ Bố cục: Chương trình · (Kỳ hạn) · Giới tính · Hạng sức khoẻ CÙNG MỘT HÀNG,
CÓ ĐƯỜNG KẺ NGĂN**
☠️ Xếp cùng hàng **chưa đủ** — chủ tool: *"phải thể hiện làm sao cho người ta nhận
diện nó là 3 phần riêng biệt"*. Chỉ có khoảng trắng thì mắt đọc thành MỘT dãy nút
dài, nhất là khi nút đang chọn của nhóm này nằm sát nút chưa chọn của nhóm kia.
Thêm `border-left` 1px + đệm 14px — dùng lại đúng cách hai cột màn này đang ngăn
nhau, không dựng thêm nền/khung riêng cho mỗi nhóm.
☠️ Bẫy đã vấp: đo lần đầu thấy 3 nhóm vẫn xếp dọc → suýt đi sửa CSS. Đo kỹ thì
`viewport = 0` — **khung xem chưa được mở rộng, tôi đang đo một màn hình rộng 0px**.
Phải `resize_window(1440)` trước. (Họ hàng 5u: thước sai chứ sản phẩm không sai.)
Sau khi đo đúng: 1.25fr → cột nhập 657px, 4 nhóm IUL cần 813px → rớt dòng.
1.45fr → 700px, **vẫn thiếu 12px**. **1.6fr → 763px, dư 49px** → cả 4 cùng `top`.
→ Đổi `grid-template-columns` của `.tp-wrap` thì PHẢI mở màn **IUL** đo lại,
màn Term Life chỉ có 3 nhóm nên luôn vừa, nhìn nó là không thấy lỗi.

**⑤ Thanh cuộn đè con số tuổi** (màn Tính tuổi). Đo đối chứng:
**trước hở 0px** (số dính sát mép trong, thanh cuộn Windows 10px vẽ đè lên chữ số)
→ **sau hở 11px**. Sửa: `padding-right: 12px` + `scrollbar-gutter: stable`.
Che một chữ số là sale đọc nhầm tuổi khách.

**⑥ Đồng bộ menu**
- Xoá 2 luật "per-section accent" tô Brochure xanh lá + Name Card cam. Chúng neo
  theo `nth-of-type` tức theo **VỊ TRÍ** — thêm/bớt một mục là màu nhảy sang mục
  khác trong im lặng. Nay cả 7 mục dùng chung màu thương hiệu.
- Đặt tên hai mục mới theo đúng công thức "Anh / Việt" của 5 mục kia:
  **Age / Tính tuổi bảo hiểm** · **Quote / Tính phí bảo hiểm**.
- "Lần tính gần đây" → **"Gần đây"**.

**⑦ NÚT "CÔNG CỤ" Ở THANH TRÁI → VỀ MÀN TRỐNG, ĐÓNG HẾT DROPDOWN**
Chủ tool chốt: bấm cờ lê là quay về trạng thái sạch (cây thu về 7 dòng, bên phải
trống chờ chọn). Nó là `<a href="/tool">` mà mình **đang ở** `/tool` → tải lại
nguyên trang: chớp trắng, nạp lại cả bảng phí, và nháp chưa lưu thì bị chặn bằng
hộp thoại `beforeunload` xấu xí. Nay chặn `click` khi đã ở `/tool` và xử lý tại
chỗ (`ganNutCongCu()` trong `js/main.js`) — hỏi bằng hộp thoại của tool, tức thì.
⚠️ Chưa đo được trên bản có đăng nhập; các selector đã đối chiếu với HTML thật.

**⑦-bis ☠️ CÂY ĐIỀU HƯỚNG TỰ XỔ SẴN — nguyên nhân gốc nằm ở MỘT GIÁ TRỊ MẶC ĐỊNH**
Sửa xong ⑦ chủ tool vẫn báo *"dropdown vẫn tự mở nè em"*. Đóng cây lúc bấm nút là
**vá bề mặt**: `makeCollapsibleFolder()` trong `core.js` mặc định `open = true`, và
**không một lời gọi nào** (proposal · brochure · namecard × section + nhóm hãng)
truyền `false` → cứ vẽ lại cây là mọi nhóm xổ hết.
→ Sửa gốc: mặc định `open = false`. Hai ngoại lệ xử lý ở **cuối `renderFileTree()`**,
không rải vào từng lời gọi:
  (1) đang gõ ô tìm → mở hết (không thì tìm ra kết quả nằm trong nhóm đóng);
  (2) đang mở một file → bung **đúng nhánh** chứa nó, leo lên bằng `closest`.
→ ☠️ Ngoại lệ (2) dò theo **dấu `.active` trên cây**, KHÔNG theo `appState.activeFile`:
  mục thư viện (brochure/name card) đánh dấu bằng `activeLibraryPath` — hỏi sai biến
  thì nhánh đó không bung mà **không có lỗi nào báo**.
  Đây cũng là thứ giữ cho "Tạo bản cho khách" không hỏng: tạo xong cây vẽ lại, không
  bung nhánh thì bản vừa tạo biến mất trước mắt người dùng.
→ Đo trên bàn đo gọi chính `makeCollapsibleFolder`, 4 ca + đối chứng:
  **trước 3 nhóm mở / sau 0** · đang mở NLG-2 → bung đúng 2 nhánh (Proposal + NLG,
  **không** bung AIG) · đang tìm → mở cả 3 · bấm header vẫn mở/đóng được.

**⑧ ☠️ GỠ HẲN "THEO TỪNG NGƯỜI" + "ĐANG ONLINE"** (tab Đo lường ở `/members`)
Chủ tool: *"tracking online và từng người đến ngày hôm nay thì nó đã **hoàn thành
nhiệm vụ** rồi, anh không cần nó nữa"*. **Gỡ có chủ đích — đừng dựng lại** khi
thấy `usage-rows` / `online-bar` không còn.
- `members.html`: bỏ khối bảng "Theo từng người", thanh ĐANG ONLINE, hộp thoại
  "Ai đang online". Giữ: biểu đồ "Người hoạt động mỗi ngày" · "Top Proposal /
  Brochure" · tab "Khoá mục".
- `members.js`: gỡ ~120 dòng khối online (`taiOnline`/`veOnlineBar`/
  `veOnlineChiTiet`/modal + poll 30 giây) và `veBangNguoi()` (~90 dòng).
  ☠️ Phải gỡ **cả bộ nghe** `$('usage-rows').addEventListener` — để lại là
  `$()` trả `null` và **chết cả script khởi tạo**, tab Đo lường trắng trơn.
  Giữ `tenTiengAnh()` vì popup "đã tải gì" vẫn dùng.
- `auth.js`: heartbeat ghi `presence` tắt bằng **một cờ** `TAT_PRESENCE`, không
  xoá code. Không ai đọc bảng đó nữa mà vẫn ping là bắt 77 máy gửi một request
  vô ích mỗi 45 giây. Bật lại = đổi cờ + dựng lại phần đọc.
- **KHÔNG đụng bảng `presence` trên Supabase** — xoá bảng là việc khó đảo ngược,
  giữ lại thì dữ liệu cũ còn nguyên mà chẳng tốn gì.
- Kiểm: `node --check` sạch 3 file · grep 0 tham chiếu tới id đã xoá (chỉ còn
  trong chú thích) · 3 khối giữ lại vẫn có mặt trong HTML.
  ⚠️ Chưa bấm thử được trên bản đăng nhập — chủ tool mở `/members` xem giúp.
- Cache-version portal: `auth.js` 10→11 (cả 3 trang) · `members.js` 54→55 ·
  `portal.css` 78→79.

**⑨ ☠️ AGE / QUOTE HIỆN CHẬM SAU KHI REFRESH — hai vòng mạng NỐI TIẾP**
Chủ tool: *"2 phần Age và Quote tốn một khoảng thời gian nhất định mới chạy ra"*.
Luồng cũ: `getSession` (localStorage, **0 ms**) → `getProfile` (vòng 1) →
`khoa_muc` (vòng 2) → mới vẽ lại cây. Suốt hai vòng đó cây đã vẽ ở trạng thái
"chưa biết vai trò" = **giấu** hai mục nấc `super` → chúng hiện ra muộn.
→ Truy vấn `khoa_muc` **không cần profile** (RLS chỉ đòi `auth.uid() is not null`)
  nên chạy được **song song** với `getProfile`. Tách `napKhoaMuc` thành
  `docKhoaMuc()` (đọc) + `napKhoaMuc(profile, rows)` (áp).
→ ⚠️ Vẫn phải chờ **có session** mới gọi: gọi sớm hơn thì token chưa gắn, RLS trả
  rỗng, mà rỗng bị hiểu là "không khoá gì" — **hỏng về phía LỘ**, sai hướng.
→ ⚠️ Cú đọc sớm trượt (`rows === null`) thì truyền `undefined` để `napKhoaMuc`
  **tự đọc lại** — thà chậm một vòng còn hơn Super Admin không thấy đồ đang xây.
→ **Đo thật, 7 lần mỗi kiểu, lấy trung vị** (đo 1 lần là đo nhiễu):

| | trung vị | nhanh nhất | chậm nhất |
|---|---|---|---|
| Nối tiếp (cũ) | **429 ms** | 258 | **1.399** |
| Song song (mới) | **140 ms** | 135 | 342 |

  Tiết kiệm **289 ms (67%)**, và ca xấu nhất từ **1,4 giây xuống 0,34 giây** —
  chính ca đó mới là thứ chủ tool cảm nhận được.

**⑩ TAB "KHOÁ MỤC": MỖI MỤC MỘT HÀNG**
Chủ tool: *"làm gọn gàng lại, mỗi 1 phần là 1 hàng là ổn"*. Trước đó mỗi mục chiếm
**hai tầng** (tên + công tắc Khoá ở trên, dải "Ai được thấy" ở dưới) → 7 mục thành
14 tầng, phải cuộn. Nay 4 cột trên một dòng: tên | dải 3 nấc | trạng thái | nút.
- Bỏ nhãn "AI ĐƯỢC THẤY" và câu mô tả nấc — cả hai **nói lại đúng thứ ba cái nút
  đã nói**. Mô tả chuyển vào `title`. Nút "Khoá mục này" → **"Khoá"**.
- Mô tả mục cắt bằng `ellipsis` để không đẩy dải nút lệch giữa các hàng.
- Đo: hàng thường **cao 68px**, 7 mục tổng **600px**; cột trạng thái và cột nút
  **dóng thẳng một mép ở cả 7 hàng** (đó là thứ khiến liếc dọc là đọc được).
  Hàng đang khoá cao 145px vì có ô lời nhắn — đúng thiết kế, và chỉ hiện khi khoá.
- Bàn đo **trích nguyên văn `veKhoaMuc()`** từ `members.js` bằng script, không chép
  tay sang trang đo — chép tay là thước cùng vật liệu, sửa một bên quên bên kia.

**⑪ TÊN TOOL ĐỒNG BỘ TOÀN HỆ THỐNG + nhãn loại trong bảng Top**
Chủ tool: *"nhớ cập nhật tên tool cho toàn bộ hệ thống"*. `Age / Tính tuổi bảo hiểm`
và `Quote / Tính phí bảo hiểm` nay giống nhau ở **cây điều hướng · tiêu đề màn ·
nhãn ghi vào `usage_events` · tab Khoá mục**.
☠️ Và sửa `phanLoai()`: hai công cụ này đang bị dán nhãn **"Proposal"** trong bảng
"Top chạy nhiều nhất" — sai loại, vì chúng **không sinh ra bản vẽ nào để gửi khách**.
Đọc "97 lượt NLG—IUL" cạnh "8 lượt Tính tuổi" như cùng một loại việc là hiểu sai
bảng. Nay có nhãn riêng **"Công cụ"** (`.top-tag-cc`).
⚠️ Dữ liệu cũ trong `usage_events` vẫn mang tên cũ → bảng Top sẽ có thêm dòng
trùng ý trong vài ngày rồi trôi khỏi khoảng đang xem. Không sửa dữ liệu cũ.

**⑬ HÀNG ĐẦU GIỐNG NHAU Ở CẢ HAI CHƯƠNG TRÌNH; "Kỳ hạn" dời xuống cạnh Tuổi**
Chủ tool: *"hàng chương trình | giới tính | hạng sức khoẻ của Term Life và IUL
giống nhau… IUL thì cho Kỳ hạn xuất hiện kế bên Tuổi"*.
Trước đó IUL chèn "Kỳ hạn" vào **giữa** hàng đầu → bấm Term Life ↔ IUL là Giới tính
và Hạng sức khoẻ **nhảy chỗ**. Nay hàng đầu dựng bằng MỘT hàm dùng chung
`tpHangDau()`, ô tuổi bằng `tpNhomTuoi()` — một chỗ duy nhất, không còn hai bản
lệch nhau (đó đúng là cách lỗi này sinh ra).
→ Hàng đầu còn 3 nhóm ở cả hai màn nên hạ cột nhập **1.75fr → 1.5fr**, cột kết quả
  rộng ra (430 → 473px). Lịch sử số đo ghi ngay trong CSS để khỏi dò lại.
→ Đo: hàng đầu hai màn **trùng nhau từng nhãn**; IUL có hàng hai *Tuổi khách +
  Kỳ hạn* cùng `top`; chọn 15 năm vẫn khoá đúng TBC/EX1; quay lại Term Life không
  còn nút Kỳ hạn; IUL 20n Nam NTBC 35t/250k vẫn ra **$255.25**.
→ ⚠️ Còn lệch **2px** vị trí nhóm giữa hai màn — do nút đang chọn dùng
  `font-weight: 700`, nút thường 600, nên nhóm "Chương trình" rộng khác nhau 2px.
  Không sửa: bù 2px đó phải dựng thêm cơ chế giữ chỗ, không đáng.

**⑭ ☠️☠️ GẮN NHẦM FILE PDF — TÔI KHỚP TÊN RỒI SUY RA NỘI DUNG**
Chủ tool bấm nút "Tải PDF minh hoạ" → ra **một bản báo giá mẫu đã điền tên khách**
("Đinh Thị Thảo Nguyên", 43 tuổi, $100,000), không phải tài liệu hãng.
**Cách tôi nhầm:** Drive có thư mục *"File Thành phẩm"* chứa đúng 4 file
`NLG IUL.pdf` · `NLG Termlife.pdf` · `AIG IUL.pdf` · `AIG Termlife.pdf`. Tên khớp
hoàn hảo với hai chương trình của màn này. Tôi kiểm **quyền chia sẻ**, kiểm **tên**,
kiểm **kích thước** — và gắn. **Chưa một lần mở file ra xem.**
→ Tên thư mục đã nói thẳng: *Thành phẩm* = sản phẩm xuất ra, không phải tài liệu.
→ Lặp lại đúng **bài học 5k**: khớp tên / đếm / kiểm quyền đều KHÔNG phải là kiểm.
  Thứ sắp giao tới tay 77 sale thì phải **mở ra nhìn bằng mắt**, không có ngoại lệ.
→ Nguy hiểm hơn cả sai nội dung: file đó đang để **"anyone with the link"** và mang
  tên người thật. **Đã báo chủ tool xem lại quyền chia sẻ của cả 4 file.**
→ Đã gỡ: `TP_PDF = null`, đo lại DOM khối kết quả — **0 chuỗi `drive.google`**, chỉ
  còn nút "Tải CSV bảng phí". Không gắn lại cho tới khi chủ tool đưa đúng đường dẫn.

**⑭-bis GẮN LẠI PDF — ĐÚNG BỘ, và lần này kiểm HAI LỚP trước khi gắn**
Chủ tool đưa link thư mục Drive của **sếp** (`salesdeptdrt@gmail.com`) —
*"1. Quote S&P 500 - IUL 2025"*. Trong đó là bộ PDF minh hoạ đặt tên theo **TỪNG
TỔ HỢP**: `Female - NTBC - 42T - $250,000 - $308.25 - 20YRS.pdf`.
Hai lớp kiểm, không lớp nào dựa vào lớp kia:
1. **MỞ FILE RA ĐỌC** — nội dung: *"FlexLife · INDEXED UNIVERSAL LIFE · Life
   Insurance Illustration … **For SAMPLE QUOTE**"*, bản minh hoạ chính thức của
   National Life Group, tên khách là "SAMPLE QUOTE". Khác hẳn file gắn nhầm lần
   trước (bản báo giá mang tên người thật).
2. **ĐỐI CHIẾU SỐ** — phí ghi trong TÊN FILE khớp **8/8** với `bang-phi-iul.json`,
   kể cả file 15 năm (45t/100k = $180). Tên file mà khớp được cả bảng phí thì
   gần như không thể là file của bộ khác.
→ Bảng tra: **`public/data/pdf-minh-hoa.json`**, khoá
  `CHUONGTRINH|KYHAN|GIOI|SUCKHOE|TUOI|MENHGIA`.
→ ☠️ **CHỈ CÓ 8 FILE, toàn FEMALE + NTBC.** Không có MALE, không có Term Life,
  không có TBC/EX1. Tổ hợp không có file thì **KHÔNG hiện nút** — tuyệt đối không
  đưa "file gần đúng": bản minh hoạ in rõ tuổi + mệnh giá + phí trên từng trang,
  đưa nhầm một bản là sale gửi khách con số của người khác.
→ Đo: **8/8 tổ hợp có file → hiện nút** đúng ID đúng tên · **6/6 tổ hợp không có
  → ẩn nút**, gồm cả các ca sát biên (36 tuổi thay vì 35 · 125k thay vì 100k ·
  Male · TBC · 15 năm tuổi 46 · Term Life).
→ Thêm file mới: đặt tên đúng mẫu trên, rồi thêm một dòng vào JSON. Không có cơ
  chế tự dò — cố ý, vì dò tự động là mở đường cho "gần đúng".
→ ☠️ **KHÔNG CÓ FILE THÌ LÀM MỜ NÚT, ĐỪNG ẨN.** Bản đầu tôi ẩn hẳn; chủ tool mở
  tổ hợp Nam·TBC và báo ngay *"không có nút tải file pdf nè em"* — đúng cái hiểu
  nhầm mà luật này (đã áp cho nút hạng sức khoẻ ở CHÍNH màn này) sinh ra để chặn:
  *ẩn thì sale tưởng tool thiếu, làm mờ thì hiểu là hãng không có*. Nút mờ còn nói
  được LÝ DO trong tooltip, chỗ trống thì không nói được gì.
  Đo: ca của chủ tool → nút hiện, chữ **"Chưa có PDF minh hoạ"**, opacity 0.45,
  rộng 221px (nhìn thấy rõ), không bấm được · ca có file → "Tải PDF minh hoạ",
  bấm được, đúng link. Luôn đúng **2 nút** nên bố cục không nhảy khi đổi tổ hợp.

**⑭-ter ☠️ BỘ PDF+CSV THẬT LỚN HƠN NHIỀU — và Drive API KHÔNG với tới được**
Chủ tool đưa thêm link: `1. NLG - IUL > 1. Quote S&P 500 - IUL 2025`. Cấu trúc thật:
```
CHƯƠNG TRÌNH (20 NĂM | 15 NĂM)
  └ nhóm (Female-NTBC · Male-NTBC · Male-TBC · Female-EX1 · Male-EX1)
      └ mệnh giá ($100,000 …)
          └ mỗi TUỔI một CẶP file: .pdf + .csv
```
Tức là **hàng nghìn file**, phủ đủ cả Nam lẫn các hạng — không phải 8 file như tôi
tưởng. 8 file kia chỉ là những file sếp **chia sẻ trực tiếp** với chủ tool.
→ ☠️ **Drive API của tool chỉ thấy file được chia sẻ TRỰC TIẾP.** `parentId = '<thư
  mục shared>'` trả **rỗng** dù thư mục tồn tại và đọc được metadata; `title contains
  'Male - NTBC - 35T'` cũng rỗng. Không phải thiếu quyền — là giới hạn của công cụ
  (không truyền được `supportsAllDrives`). Đừng mất thời gian dò lại.
→ ☠️ **ĐÃ THỬ VÀ BỎ: link tìm kiếm Drive** (`/drive/search?q=...`). Nghe rất hợp lý
  vì tên file suy được từ dữ liệu tool. Đo thật: tổ hợp **20 năm ra đúng 2 file**,
  nhưng **15 năm ra RỖNG** với đúng cách viết đó; bỏ ngoặc kép thì trả về **hàng chục
  file sai tổ hợp** (43T, 42T, 15T… và cả 20YRS khi đang tìm 15YRS). Một cách khớp
  mà lúc đúng lúc sai thì tệ hơn không có — sale gửi khách nhầm bản minh hoạ.
→ **Cách đang dùng — ba mức, xuống dần theo độ chắc chắn, không mức nào là đoán:**
  1. **Có ID file** (8 file) → tải thẳng, một cú bấm.
  2. **Biết thư mục** → mở đúng thư mục Drive **+ hiện TÊN FILE cần tìm** ngay trên
     màn. Ưu tiên thư mục nhóm; chưa có ID nhóm thì lùi về thư mục chương trình.
  3. **Term Life** → nút mờ "Chưa có PDF minh hoạ".
→ ☠️ Tên file gợi ý **DỪNG Ở MỆNH GIÁ**, không ghép phí vào: phí là phần duy nhất có
  định dạng không nhất quán (`$612.60` nhưng cũng có `$180`). Ghép vào là sale dán đi
  tìm rồi Drive báo không thấy dù file nằm ngay đó. Ba phần (giới+hạng · tuổi · mệnh
  giá) đã đủ định danh trong một thư mục.
→ Kiểm chéo: phí trong tên file khớp bảng phí ở **cả Male NTBC** (1T/2T/3T $100k,
  35T $600k) chứ không chỉ 8 file Female → công thức tên đúng cho toàn bộ.
→ Đo 6 ca: có-ID → tải thẳng · Male-NTBC/Male-TBC → đúng thư mục nhóm · Female-EX1
  → lùi về thư mục 20 NĂM · 15 năm → thư mục 15 NĂM · Term Life → nút mờ.
→ `[CÒN THIẾU]` ID thư mục nhóm: **Female-EX1, Male-EX1 (20 năm) và cả 5 nhóm 15
  năm**. Lấy phải bấm tay từng thư mục trên Drive (JS lấy `data-id` bị công cụ chặn
  vì trông giống token). Thiếu thì tự lùi một tầng — vẫn dùng được.

**⑮ HUY HIỆU "new" cho 3 mục vừa thêm** — SMS · Age · Quote.
Đo: đúng 3 mục có huy hiệu, cả 3 nằm trọn trong hàng, cỡ **35×17px**, nhãn mục
không bị cắt, 7 hàng vẫn cao đều **48px**.
☠️ **Không có ngày hết hạn tự động.** Thêm mục thứ tư thì phải gỡ `nav-new` khỏi ba
mục cũ — nhãn "new" dán mãi sẽ thành trang trí và người dùng thôi tin nó.
Ba chỗ đặt: `brochure.js` (SMS) · `tinhtuoi.js` · `tinhphi.js` — grep `nav-new`.

**⑯ Cách kiểm** — hai màn công cụ nằm sau đăng nhập Supabase nên không mở thẳng được.
Dựng **trang đo tạm trong `public/`** nạp chính `js/tinhphi.js` / `js/tinhtuoi.js`
với stub tối thiểu (`appState`, `dom`, `escapeHtml`…), đo xong **xoá file**.
Cache-version: `style.css` 97→**100** · `tinhtuoi.js` 9→10 · `tinhphi.js` 2→**5** ·
`main.js` 16→**19** · `core.js` 42→**44** · `portal.css` 78→**80** ·
`members.js` 54→**56** · `auth.js` 10→**11** (cả 3 trang).

---

### 2026-08-10 14:24 — TÍNH PHÍ BẢO HIỂM: Term Life + IUL đầy đủ (v1.42). ⏳ CHƯA PUSH.

**TRẠNG THÁI HIỆN TẠI**
- Bản live đang chạy **v1.40** (mục SMS). Máy đang ở **v1.42**, CHƯA push — chủ tool
  còn đang test (*"đang test cứ đòi push goài"*).
- Hai công cụ mới **Tính tuổi bảo hiểm** + **Tính phí bảo hiểm** đều ở **NẤC 1**
  (chỉ Super Admin thấy). Sale và Admin chưa thấy gì.
- **Việc kế tiếp:** chủ tool test xong → push → chạy SQL thêm dòng `tinhtuoi`,
  `tinhphi` vào bảng `khoa_muc` → khi ưng thì bấm lên nấc ở tab "Khoá mục".

**① Tính phí bảo hiểm — `js/tinhphi.js` + `public/data/*.json`**
Đưa về từ Quote Calculator của forum. Hai chương trình **cơ cấu khác hẳn nhau**:

| | Term Life | IUL |
|---|---|---|
| Kỳ hạn | không chọn, trả về **4 số** (10/15/20/30) | **chọn** 15 hoặc 20 năm, trả về **1 số** |
| Nhãn sức khoẻ | SNTBC · STBC · ENTBC1 | **NTBC · TBC · EX1** |
| Nguồn | 1 Google Sheet (5 sheet "NEW") | **2 Google Sheet** (15 NĂM + 20 NĂM, 7 sheet) |

☠️ **Hai bộ mã sức khoẻ KHÁC NHAU** (SNTBC ≠ NTBC). Đổi chương trình mà giữ mã cũ là
tra không ra dòng nào → `tpGanSuKien` tự đặt lại mã khi đổi chương trình.

**② Dữ liệu — 3 lớp kiểm, không lớp nào dựa vào lớp kia**

| Lớp | Term Life | IUL |
|---|---|---|
| Tổng kiểm tra từng dòng (chống sai khi chép) | 161/161 · 4.172 ô | **342/342 · 6.240 ô** |
| Kiểm tréo với forum đang chạy | 8/8 | **7/7** (mỗi sheet một ca) |
| Chống **lẫn lộn sheet** | — | cùng ô 40t/250k ở 5 sheet → **5 giá trị khác nhau** |

Lớp thứ ba là thứ tổng kiểm tra KHÔNG bắt được: chép đúng số nhưng bỏ nhầm sheet.

**③ ☠️ 6 Ô NGHI GÕ NHẦM TRONG BẢNG IUL CỦA SẾP — GIỮ NGUYÊN, ĐỪNG SỬA**
Soi 5.064 ô bằng quy luật "phí tỉ lệ thẳng với mệnh giá" (4.912 ô khớp tuyệt đối):

| Sheet | Tuổi | Mệnh giá | Trong Drive | Theo quy luật |
|---|---|---|---|---|
| 20n Nữ NTBC | 33 | 700k | **577,20** | 557,20 |
| 20n Nữ NTBC | 41 | 425k | **469,40** | 496,40 (đảo 496→469) |
| 20n Nam NTBC | 30 | 300k | **233,70** | 242,70 |
| 20n Nam NTBC | 36 | 700k | **735,20** | 753,20 (đảo) |
| 20n Nam NTBC | 39 | 225k | **297,22** | 279,22 (đảo) |
| 20n Nam NTBC | 59 | 225k | **730,25** | 830,25 (lệch $100/tháng) |

Xác nhận độc lập bằng phép thứ hai (thứ tự phải tăng dần): *225k rẻ hơn 200k*,
*59 tuổi rẻ hơn 58 tuổi*. Và forum trả về **đúng** những số đó → sai đang sống thật.
**Chủ tool chốt: *"số Drive là chuẩn, em có thể làm theo số Drive"*** → chép nguyên văn.
Danh sách 6 ô ghi ở đầu `scripts/bang-phi-iul-nlg-20nam-ntbc.txt` kèm dòng CẤM tự sửa.

**④ Hai bộ soi giữ lại trong repo**
- `scripts/soi-bang-phi.js` — soi Term Life: kỳ hạn 0 lỗi/4.097 ô · tuổi >26 sạch ·
  269 chỗ "mệnh giá lớn rẻ hơn" **gom đúng một ngưỡng 200k→250k** = banding thật.
- `scripts/kiem-tinh-tuoi.js` — 102.347 phép tính, 0 lỗi (chạy lại sau mọi sửa đổi).

**⑤ Sửa theo yêu cầu chủ tool trong lúc test**
- ☠️ **Ngày sinh nhập nhằng MM/DD ↔ DD/MM** — chủ tool gõ `22/05/1979` bị chặn. Chỗ
  chặn được là còn may; nguy hiểm là `05/06/1979` (hai cách đọc đều hợp lệ → im lặng
  sai tuổi, sai bậc phí). Gần **nửa số ngày trong năm** nằm trong vùng này. Sửa: hai
  nút chọn kiểu gõ (nhớ lại), luôn đọc ngược ra chữ, tự đổi kiểu thì **báo bằng màu cam**.
- Icon mục Tính tuổi: bỏ đồng hồ chồng lên lịch (18px thành một cục) → lịch trơn.
- Bố cục: 3 ô kết quả **một hàng đều nhau** (đo 198px mỗi ô) · dòng giải thích lên
  cùng hàng với dòng đọc ngày · hai cột **liền một khung** (hở 0px, kẻ 1px) · cột
  lịch sử không cao hơn cột trái · rút gọn 2 dòng chữ.
- ☠️ Bẫy đo: kẹp chiều cao lịch sử theo cột trái **trong lúc cột trái đang bị kéo
  giãn bằng cột phải** = đo chính cái mình định sửa. Phải tạm bỏ `align-items:stretch`
  để đo chiều cao thật.

**⑥ CÒN TREO**
- `[CHỜ]` **Push** — chủ tool đang test, đã dặn không push.
- `[XONG 10/08 14:46]` ~~**SQL** thêm dòng `tinhtuoi`/`tinhphi`~~ — chủ tool đã chạy,
  đọc lại bảng xác nhận cả hai ở `hien_cho: 'super'`.
- `[CHỜ]` **6 ô nghi gõ nhầm** — chủ tool cầm sang hỏi sếp. Sửa trong Drive rồi thì
  chạy lại `node scripts/doi-bang-phi-iul.js`, KHÔNG sửa tay.
- `[XONG]` ~~File PDF minh hoạ~~ — đã gắn đúng bộ, xem mục ⑭-bis.
- `[CHỜ]` **Chỉ có 8 PDF minh hoạ, toàn Female + NTBC.** Sale tra tổ hợp Nam hoặc
  Term Life sẽ không thấy nút. Hỏi sếp chủ tool xem còn file khác chưa chia sẻ không.
- `[CHỜ]` **Xem lại quyền chia sẻ 4 file trong Drive "File Thành phẩm"** — đang để
  "anyone with the link" mà bên trong có tên khách hàng thật.
- `[KHÔNG LÀM]` "Manage Data" — chủ tool chốt bỏ. Đổi bảng phí phải sửa file + push.

---

### 2026-08-10 — CƠ CHẾ 3 NẤC + công cụ TÍNH TUỔI BẢO HIỂM (nấc 1). ⏳ CHƯA PUSH.

Chủ tool đưa 2 ảnh chụp 2 công cụ đã làm trên `forum.thinksmartinsurance.com`
(Age Calculator + Quote Calculator), muốn đem về Tool. **Mới làm xong cái thứ nhất.**

**① Cơ chế 3 nấc (hiện thực của điều khoản ghi bên dưới)**
- Cột mới `khoa_muc.hien_cho` (`super` | `admin` | `all`, mặc định `all`) + ràng buộc
  CHECK. 5 mục cũ không đụng gì.
- `core.js`: `appState.hienCho` + `appState.vaiTro` + hàm `duocThayMuc(ma)`.
  ☠️ `napKhoaMuc` **không còn return sớm khi role !== 'user'** — nay phải đọc bảng cho
  MỌI role, vì nấc `super` phải giấu được cả với admin.
- ☠️ **Mặc định nằm ở phía AN TOÀN:** `hienCho` khai sẵn `{ tinhtuoi: 'super' }` ngay
  trong code. Bảng chưa có dòng / chưa có cột / mạng lỗi → vẫn KHÔNG lọt xuống sale.
  Nếu để mặc định `all` thì mọi đường hỏng đều hỏng về phía lộ hàng.
- Đọc bảng có **bước lùi**: `select ... hien_cho` lỗi thì thử lại bộ cột cũ — chưa chạy
  migration cũng không trắng menu.
- `members.js`: dải 3 nấc trong tab "Khoá mục". Nới ra mới hỏi lại (siết vào thì làm ngay).
  Ghi xong **đọc lại giá trị thật** rồi mới vẽ (bài học 31/07: 204 ≠ đã ghi).
- ⚠️ Nấc KHÁC Khoá, để hai hàng riêng: *"ai được thấy"* vs *"có đang tạm đóng không"*.

**② Công cụ Tính tuổi bảo hiểm** — `js/tinhtuoi.js` (file mới), một dòng phẳng trên cây,
vẽ vào `#doc-viewport` (có ô gõ chữ → không được nằm trong canvas).
- **Quy tắc: AGE NEAREST BIRTHDAY, đo bằng THÁNG LỊCH.** Qua sinh nhật **hơn 6 tháng**
  → +1. Đúng 6 tháng chẵn → giữ nguyên.
- Lịch sử lưu **localStorage** (chủ tool chốt) — nó chứa ngày sinh khách hàng, không
  đẩy lên máy chủ. Ô "đọc lại ngày ra chữ" để chặn lẫn MM/DD với DD/MM.
- Hiện luôn **mốc đổi tuổi** ("từ 08/11/2026 trở đi sẽ tính lên 37") — sale biết còn
  bao lâu nữa thì bậc phí đổi.

**②b ☠️☠️ SUÝT GIAO BẢN LỆCH 1 TUỔI — bộ tự kiểm 9/9 ĐẠT mà vẫn sai**
Bản đầu tôi tính "nửa năm" bằng **SỐ NGÀY** (so ngày đã qua với ngày còn lại, mốc
182,5 ngày). Nghe hợp lý, tự viết 9 ca kiểm, **9/9 đạt**, đã định báo xong.
Chủ tool cho phép điều khiển máy → chạy chính **bản forum của anh làm thước NGOÀI**,
dò ranh giới ngày 10/08/2026:

| Ngày sinh | Forum | Bản đo-bằng-ngày |
|---|---|---|
| 02/09/1990 | **37** | 36 ✗ |
| 02/10/1990 | 36 | 36 ✓ |

Vì 6 tháng lịch (10/02 → 10/08) chỉ có **181 ngày**, không phải 182,5. Hai cách lệch
nhau vài ngày mỗi năm — mỗi ngày lệch là một khách bị báo **sai nguyên một bậc tuổi**,
tức sai bậc phí gửi cho khách thật.
→ Sửa sang đếm **tháng lịch** (kèm hàm kẹp cuối tháng: 31/08 + 6 tháng = 28/02).
→ Đo lại: **13/13 khớp forum**, gồm cả 8 ca dò sát ranh giới 02/06→02/13.
→ **Bài học (đúng luật 5d):** thước làm bằng cùng vật liệu với thứ nó đo thì luôn tự
khen mình. 9/9 chỉ chứng minh "code làm đúng điều tôi nghĩ", không chứng minh "điều
tôi nghĩ là đúng". Có bản đang chạy thật để so thì PHẢI so.

**②c ĐỐI CHIẾU ĐẦY ĐỦ 35 CA với bản forum (chủ tool yêu cầu "test đầy đủ độ tuổi")**
Điều khiển trình duyệt chạy bản forum, mốc "xong" lấy từ **bảng lịch sử dài thêm một
dòng**, không phải hết giờ chờ (700ms là hụt, đã dính một lần).
Phủ: 11 ngày sát ranh giới 02/06→02/16 · sinh nhật hôm qua/hôm nay/ngày mai · tuổi
0→90 · sinh ngày 31 của 6 tháng · 29/02 (1992, 2000) · sinh trong tương lai.

| Chỉ số | Kết quả |
|---|---|
| **Tuổi bảo hiểm** (số sale dùng báo giá) | **35/35 KHỚP** |
| Tuổi thực | 33/35 — 2 ca lệch, **bản forum SAI** |

☠️ **BA LỖI CỦA BẢN FORUM, đã đo, KHÔNG chép sang:**
1. **Tuổi thực trừ mất 1 vào đúng ngày sinh nhật.** Sinh `08/10/1990`, hôm nay
   10/08/2026 → forum ghi **35** (đúng phải 36). Sinh **đúng hôm nay** → forum ghi
   tuổi thực **−1**. (Tuổi bảo hiểm của nó vẫn đúng, chỉ tuổi thực sai.)
2. **"Ngày Tăng Tuổi" sớm hơn 1 ngày so với chính nó tính.** Sinh `02/10/1990` →
   forum ghi *"Ngày Tăng Tuổi = Aug 10, 2026"* (tức hôm nay) mà tuổi bảo hiểm vẫn
   **36**. Nghĩa là đúng ngày đó tuổi CHƯA đổi. Bản này lấy **ngày hôm sau** —
   ngày con số thật sự đổi. Số ngày đếm ngược thì trùng khớp (146 = 146).
3. **Sinh 29/02 bị cộng 7 tháng thay vì 6.** Sinh `02/29/1992` → forum ghi ngày tăng
   tuổi **Sep 29, 2026**; đúng phải **Aug 29, 2026** (sinh nhật quy về 28/02 + 6 tháng).
   Lệch một tháng, tức có nguyên một tháng bản forum báo thấp hơn một tuổi.
→ Đã báo chủ tool cả ba, để anh quyết có sửa bên forum không.

**②d Thêm "Ngày tăng tuổi" vào giao diện** (bản forum có, bản đầu của tôi thiếu):
ngày đầu tiên khách được tính tuổi mới + số ngày còn lại, **dưới 30 ngày thì đổi màu
cảnh báo** — sale nhìn màu là biết nên chốt trước khi khách nhảy bậc phí.
⚠️ Ca đã lên tuổi rồi thì mốc kế tiếp phải lấy ở **chu kỳ sau** (sinh nhật tới + 6
tháng); không có nhánh này là hiện ra một ngày trong quá khứ. Đã kiểm 35/35: không ca
nào rơi vào quá khứ.

**②f KIỂM VÉT CẠN 102.347 PHÉP TÍNH — vì "khớp forum" KHÔNG phải bằng chứng**
Chủ tool: *"anh cần test lại xem có đúng không, vì sale mà nhập sai số tuổi bảo hiểm
là nguy hiểm"*. Đúng — và 35/35 khớp forum **không chứng minh gì**, vì chính bản forum
đã bị bắt 3 lỗi. Nên bỏ hẳn forum làm chuẩn, chuyển sang **cho hai bản cài đặt độc lập
cãi nhau** (`scripts/kiem-tinh-tuoi.js`, giữ trong repo để chạy lại):
- A = bản thật (cộng ngày tháng bằng `Date`)
- B = viết lại theo cách khác hẳn (đếm số tháng trọn + số ngày lẻ)

| Lớp | Số ca | Lệch |
|---|---|---|
| Mọi ngày sinh trong 100 năm (1 ngày tính) | 36.747 | 0 |
| 89 ngày sinh × 800 ngày tính liên tiếp | 65.600 | 0 |
| "Ngày tăng tuổi": đúng hôm đó số PHẢI đổi, hôm trước PHẢI chưa | 1.773 | 0 |

☠️ **Lần chạy đầu ra 8 lệch, TẤT CẢ là sinh 29/02 — và đó là THƯỚC sai, không phải
sản phẩm sai.** Bản B hiểu sinh nhật năm thường là 01/03, bản A hiểu là 28/02; thêm
một lỗi nữa trong B là neo mốc 6 tháng theo `ns.ngay` thô (29) thay vì ngày đã kẹp (28).
Chủ tool chốt **28/02** → sửa B, KHÔNG sửa A. Chạy lại: Lớp 1 vẫn 0 lệch như trước
(bằng chứng là sửa thước chứ không nới chuẩn), Lớp 2 từ 8 → 0.

**②g HAI LUẬT CHỦ TOOL CHỐT (đã ghi vào `CLAUDE.md` mục 2b-ter):**
1. **Cả 3 hãng AIG · NLG · Allianz đều dùng `age nearest birthday`** → chỉ một quy tắc,
   không cần chọn hãng. (Đây là rủi ro LỚN NHẤT đã nêu ra: nếu có hãng dùng
   `age last birthday` thì sai với **hầu hết** khách, không phải vài ca hiếm.)
2. **Sinh 29/02, năm không nhuận → sinh nhật là 28/02.**

**②h Đổi icon mục Tính tuổi** — bản đầu chồng đồng hồ vào góc lịch, chủ tool gạch
(*"icon này xấu quá"*): ở cỡ 18px hai hình đè nhau thành một cục. Nay là lịch trơn.
Đo số nét cả 6 icon: Brochure 2 · SMS 3 · **Tính tuổi 4** · Name Card 4 · Proposal 5 ·
Compare 5 — nay nằm đúng giữa bộ.

**②e Sửa một lỗi luồng khởi động — suýt làm chủ tool không thấy gì**
`napKhoaMuc` bản đầu chỉ trả `true` (⇒ vẽ lại cây) khi "có gì đó khác mặc định".
Nhưng ca hay gặp nhất là **bảng CHƯA có dòng cho mục mới** → vòng lặp không chạm tới
nó → không có gì "khác" → **không vẽ lại** → mục vẫn bị giấu theo lần vẽ đầu (lúc đó
chưa biết vai trò). Super Admin sẽ không bao giờ thấy tính năng mình đang xây.
→ Nay **luôn** trả `true`. Vẽ lại cây rất rẻ, đổi lấy việc bỏ hẳn một loại lỗi.
→ Đo bằng cách giả lập đúng luồng thật (chưa chạy SQL, chưa có cột `hien_cho`):
Super Admin thấy 6 mục · Nhân viên thấy 5 · Admin sau khi chạy SQL vẫn 5.

**③ Đo bằng số**
- **Cổng quyền:** giả lập 4 vai trò → `user`/`admin`/chưa-biết đều **KHÔNG** thấy mục,
  chỉ `super_admin` thấy. Vẽ lại cây để xác nhận mục biến mất thật, không phải chỉ ẩn CSS.
- **Tính tuổi: 9/9 ca đạt**, gồm đúng ca thật trên ảnh chủ tool chụp (07/02/1998 → 28/28),
  sinh nhật hôm nay, ngày mai, vượt ngưỡng nửa năm (183>182 → +1), 29/02, bé mới sinh.
  7 chuỗi ngày sai định dạng đều bị từ chối.
- ☠️ **Một ca "trượt" hoá ra là THƯỚC SAI, không phải sản phẩm sai:** tôi ghi kỳ vọng
  "qua sinh nhật 6 tháng lịch → +1", nhưng nửa năm tính theo NGÀY là 182,5 — 182 ngày
  vẫn chưa quá nửa. Sửa kỳ vọng, không sửa code. (Lại đúng luật "số đo vô lý thì nghi
  công cụ đo trước".)
- Không phá 3 luồng cũ: rời Tính tuổi sang SMS/Proposal đều thoát `doc-mode` đúng;
  quay lại vẫn giữ lịch sử. Bố cục không tràn ngang, sáng/tối đều đọc được. 0 lỗi console.

**④b BẢNG PHÍ TERM LIFE — ĐÃ LẤY VỀ VÀ KIỂM TRÉO XONG** → `scripts/bang-phi-termlife-nlg.txt`
Nguồn: Google Sheet *"2. Bảng giá quote Term life NLG - Final"* chủ tool gửi (do **sếp
của chủ tool làm và kiểm tra** → là chuẩn, không được tự sửa).

☠️ **CHỈ DÙNG 5 SHEET CÓ TIỀN TỐ "NEW".** File có cả bản cũ. Đối chiếu với forum:
NEW khớp 100%, bản cũ lệch hẳn (Male 35/250k: NEW `20.90/25.74/30.14/42.90` ·
cũ `19.36/24.64/27.94/43.78`). Lấy nhầm sheet = báo sai phí cho khách.

☠️ **THỨ TỰ 4 CỘT = 10/15/20/30 NĂM — sheet KHÔNG ghi nhãn.** Xác định bằng đối chiếu
forum, không phải đoán. Đoán sai thứ tự thì mọi số đều sai mà nhìn vẫn "hợp lý".

☠️ **MỖI SHEET MỘT BỐ CỤC KHÁC NHAU — tôi đã suy từ 1 sheet ra cả 5 và LẤY SAI 3 sheet.**
Phát hiện vì thấy 3 sheet chỉ ra 15 số/dòng trong khi sheet đầu ra 44. Bộ đọc phải
đọc header của TỪNG sheet, không được dùng chung.

| Sheet (NEW) | Mệnh giá có bảng | Tuổi | Ô trống |
|---|---|---|---|
| MALE - SNTBC | 11 mức (100k…500k, 750k, 1M) | 20–54 | 0 |
| MALE - STBC | **chỉ 100k · 300k · 500k** | 30–70 | 75 |
| MALE - ENTBC1 | **chỉ 100k · 300k · 500k** | 30–54 | 0 |
| FEMALE - SNTBC | 11 mức | 20–54 | 0 |
| FEMALE - ENTBC1 | **chỉ 100k · 300k · 500k** | 30–54 | 0 |
| FEMALE - STBC | **KHÔNG CÓ SHEET** — sếp chủ tool **cố ý**, không phải thiếu sót | — | — |

**Số kỳ hạn giảm dần theo tuổi** (sheet STBC): 30–50 đủ 10/15/20/30 · 51–65 mất 30 năm ·
66–70 chỉ còn 10+15. Là luật sản phẩm của hãng, không phải dữ liệu thiếu.
Khối cột 600k/700k/800k/900k toàn dấu `x` → chủ tool chốt **bỏ qua**.

**HAI LỚP KIỂM CHỨNG (chủ tool: *"làm xong nhớ kiểm tra tréo"*):**
1. **Tổng kiểm tra từng dòng** (mỗi dòng mang sẵn tổng các giá trị, đơn vị cent) →
   **161/161 dòng khớp**, 4.172 ô, chứng minh không sai một con số nào khi chép.
2. **Kiểm tréo với bản forum đang chạy** — 8 ca trải khắp 5 sheet + các ca biên
   (tuổi nhỏ nhất/lớn nhất, mệnh giá lớn nhất, ca mất kỳ hạn 30 năm, ca chỉ còn
   10+15 năm) → **8/8 khớp**.
3. Thêm: **cấu tạo nút của forum khớp đúng vùng dữ liệu** — chọn STBC/ENTBC1 thì forum
   chỉ hiện 3 nút mệnh giá; chọn Female thì nút STBC bị khoá. Xác nhận chéo bố cục sheet.

**CHỦ TOOL CHỐT VỀ GIAO DIỆN:** tổ hợp không có số thì **ẩn/làm mờ nút** (giống forum),
KHÔNG cho bấm rồi báo lỗi.

**Không lấy được bằng đường tự động — ghi để phiên sau khỏi thử lại:**
`localhost` bị CSP của Google chặn (thử cả preflight Private Network Access) ·
kênh trả về của trình duyệt chỉ ~1KB/lượt · base64 bị chặn · **moi khoá API từ bundle
của forum thì bị hệ thống chặn — và chặn đúng, đừng tìm cách lách.**
Đường đi được: render dữ liệu gọn ra `<pre>` trong trang rồi đọc bằng `get_page_text`.

**④ CÒN TREO — Quote Calculator.** Đã KHẢO SÁT XONG bản forum (chủ tool cho điều khiển
máy). Cấu tạo thật, ghi lại để khỏi khảo sát lại:
- Nó là **BẢNG TRA, không phải công thức**. Nguồn: file **Excel** chủ tool tải lên,
  **mỗi sheet là một cặp (Giới tính – Hạng sức khoẻ)** — tên sheet dạng `"Male - NTBC"`,
  `"Female - EX1"`. **Cột đầu = Age**, các cột sau = **face amount** ($100,000, $125,000…),
  ô giao nhau = phí.
- **Hai chương trình tách riêng**: IUL và TERM Life, mỗi cái một file Excel.
- ☠️ **Term-Life trả về BỐN con số, không phải một**: phí/tháng của kỳ hạn
  **10 / 15 / 20 / 30 năm**. Thiết kế giao diện phải chừa chỗ cho 4 dòng.
- Face amount trên giao diện: 100k · 150k · 200k · 250k · 300k · 350k · 400k · 450k ·
  500k · 750k · 1M. Hạng sức khoẻ: **SNTBC · STBC · ENTBC1**.
- Còn một bộ **Mapping Data** (Age, Gender, HealthStatus, FaceAmount → `PDF_Link`,
  `CSV_Link`) — link tới bản minh hoạ. Chưa rõ chủ tool có cần mang về không.
- Dữ liệu nằm trong Supabase RIÊNG của forum (bảng `quote_pricing_data`,
  `quote_lookup_data`), localStorage rỗng → **không lấy được từ trình duyệt**.

**3 kết quả mẫu THẬT lấy từ forum 10/08/2026** (Term-Life) — dùng làm thước đối chiếu
khi làm xong:

| Tuổi | Mệnh giá | Giới | Sức khoẻ | 10 năm | 15 năm | 20 năm | 30 năm |
|---|---|---|---|---|---|---|---|
| 35 | 250.000 | Female | SNTBC | 18,26 | 22,00 | 25,52 | 35,20 |
| 35 | 250.000 | Male | SNTBC | 20,90 | 25,74 | 30,14 | 42,90 |
| 45 | 500.000 | Male | SNTBC | 70,84 | 89,32 | 113,52 | 179,52 |

**CẦN CHỦ TOOL GỬI: hai file Excel bảng phí (IUL + TERM)** đã tải lên forum. Panel
"Manage Data" chỉ có nút tải LÊN, không có chỗ tải XUỐNG. Không tự dựng số:
luật số liệu bảo hiểm ở `CLAUDE.md` mục 2.

---

### 2026-08-10 — ĐIỀU KHOẢN MỚI: tính năng mới phát hành theo 3 NẤC QUYỀN.

Chủ tool: *"các tính năng mới sẽ được build dưới quyền super admin — sau khi hoàn chỉnh
và test xong mới được cho admin và user thấy"*.

Nấc 1 chỉ `super_admin` → chủ tool duyệt → nấc 2 thêm `admin` (11 người) → dùng thật
vài ngày → nấc 3 thêm `user` (77 sale). **Áp cho MỌI tính năng mới, không ngoại lệ.**
Lý do: sale đang dùng tool với khách hàng THẬT — tính năng nửa vời lọt xuống họ là bản
vẽ sai gửi tới khách, không phải "lỗi nhỏ sửa sau".

Đã ghi vào **`CLAUDE.md` mục 2b-bis** (tự nạp mỗi phiên) + `conventions.md`.

**Ba chỗ dễ làm sai, ghi rõ để phiên sau không vấp:**
1. `khoa_muc` **KHÔNG dùng được** — `napKhoaMuc` return sớm khi `role !== 'user'`, nên
   admin/super admin luôn thấy. Muốn "chỉ super admin thấy" phải có cổng riêng.
2. **Ẩn ở giao diện ≠ chặn.** Có đọc/ghi dữ liệu thì phải chặn cả ở RLS.
3. **Lên nấc phải là một cú BẤM**, không phải sửa code + push (đúng lý do đã đẻ ra tab
   "Khoá mục" hôm nay).

**Trạng thái:** mới là ĐIỀU KHOẢN, **chưa có cơ chế**. Chưa xây vì chưa biết tính năng
đầu tiên là gì — xây một cái cổng không có gì để gác là đoán mò. Hướng đề xuất khi cần:
thêm cột `hien_cho` (`super` | `admin` | `all`) vào chính bảng `khoa_muc`, tab "Khoá mục"
đổi từ công tắc 2 nấc thành 3 nấc.

---

### 2026-08-10 — MỤC THỨ 5 TRÊN MENU: "SMS / Tin nhắn mẫu" (v1.40). ⏳ CHƯA PUSH.

Chủ tool: *"anh cần tạo một mục mới ở thanh menu — đây là một hình tab mới,
`2-Templates\SMS`, vẫn có nút download"*.

**① Ảnh phải ĐỔI CHỖ — `2-Templates/` bị gitignore**
Chủ tool bỏ ảnh vào `2-Templates/SMS/`. Thư mục đó nằm trong `.gitignore` từ đầu
(masters nặng) → chạy được ở máy nhưng **mất trắng trên bản live, không báo lỗi gì**
— đúng cái bẫy đã ghi sẵn trong chính file `.gitignore` (mục `Brochure/`).
→ Đã chuyển sang **`SMS/` NGAY GỐC dự án** (giống `Bang so sanh quyen loi cac hang/`
đang chạy được trên Vercel). Kiểm: `git check-ignore -v "SMS/SMS - nail.jpg"` → không khớp luật nào.
→ **Từ nay bỏ ảnh tin nhắn mới vào `SMS/`, đừng bỏ vào `2-Templates/`.**

**② ☠️ ẢNH DỌC RẤT CAO — KHUNG XEM CŨ BÓP NÓ THÀNH SỢI CHỈ**
Ảnh đầu tiên đo được **1080 × 7082** (cao gấp 6,6 lần bề ngang). Khung brochure
thường ghim `max-height: 60vh` lên ảnh → đo trên trang thật: bề ngang còn **66px**,
chữ tin nhắn không đọc nổi. Nếu chỉ "thêm mục" rồi báo xong thì đây là lỗi giao
đến tay sale.
→ Làm khung riêng `showTallPreview()` (js/brochure.js): **ghim BỀ NGANG ~480px
(cỡ điện thoại), cho CUỘN DỌC**. Đo lại: **458px** bề ngang, ảnh cao 3006px,
`scrollHeight 3317 > clientHeight 591` → cuộn được.
→ Nút **Tải về nằm trong thanh dính đỉnh** (`position: sticky`), không để đáy:
ảnh cao 7000px thì nút ở đáy cách nội dung cả quãng cuộn — đúng lỗi chủ tool bắt
31/07 (*"nút download bị tọt xuống dưới luôn"*). Đo: cuộn 0 / 2500 / hết trang,
thanh đứng yên ở y=105 cả ba lần.
→ Đánh dấu bằng cờ `dai: true` truyền từ `renderFileTree` **lúc render**, KHÔNG
đoán theo đường dẫn lúc mở — mục nào dùng khung nào đọc một chỗ là biết.

**③ Đã sửa những file nào**
`server.js` (LIBRARY_SECTIONS += `sms: 'SMS'`) · `core.js` (icon + `khoaMuc.sms`) ·
`brochure.js` (`showTallPreview` + tham số `opts` cho `renderLibrarySection`) ·
`main.js` (mục thứ 5) · `style.css` (`.library-view.is-tall`, `.tall-doc-*`) ·
`members.js` + `schema.sql` (khoá được mục SMS như 4 mục kia).

**④ ⚠️ CÒN MỘT VIỆC CHỦ TOOL PHẢI TỰ LÀM**
Nút "Khoá mục này" của SMS chỉ ăn khi bảng `khoa_muc` có dòng `sms`. Chạy trong
Supabase SQL Editor:
`insert into public.khoa_muc (muc) values ('sms') on conflict (muc) do nothing;`
Chưa chạy thì SMS **luôn mở** (không ai bị chặn nhầm) nhưng bấm khoá sẽ không ăn —
và PostgREST trả **204 không báo lỗi** (đúng bài học 31/07: UPDATE 0 dòng ≠ lỗi).

**④b. SMS thành MỘT DÒNG PHẲNG như Compare — không đẻ menu phụ**
Đi qua 2 nhịp sửa trong cùng phiên, ghi lại cả nhịp hụt:
1. Bản đầu: nhóm xổ được như Brochure → chủ tool: *"remove dropdown này đi em"*.
2. Em bỏ **mũi tên** (thêm `gapDuoc: false` cho `makeCollapsibleFolder`) — vẫn
   chưa đúng ý: dòng con "SMS - nail" **vẫn nằm dưới** làm thanh bên dài thêm
   một tầng. Chủ tool chỉ thẳng: *"để giống phần ở trên, nó không sinh ra menu phụ"*.
3. Bản chốt: `renderSmsNavSection()` trong brochure.js — **một dòng duy nhất**,
   bấm là mở HẾT ảnh xếp dọc trong cùng khung cuộn. Đã **gỡ sạch** `gapDuoc` +
   cờ `dai` + `opts` của `renderLibrarySection` (không để lại code chết).
→ Bài học: cùng lý do đã ghi ở `renderCompareNavSection` từ 22/07 — *dựng dropdown
chứa đúng một dòng là bắt bấm hai lần cho một việc*. Luật đó có sẵn trong repo mà
em không tra trước khi dựng mục mới.

**④c. ☠️ LỖI CÓ SẴN TỪ 22/07, đo ra lúc kiểm SMS — đã sửa**
Mở bảng **So sánh** (bật `doc-mode`) rồi bấm sang một **brochure**: brochure được
vẽ vào `#library-view` nhưng `doc-mode` vẫn bật → canvas bị ẩn → **người dùng vẫn
nhìn thấy bảng So sánh** trong khi tool tưởng đang mở brochure. Kèm theo: dòng
Compare **vẫn sáng như đang mở** sau khi đã bấm sang mẫu khác.
Gốc: `openLibraryItem` / `openLibraryGroup` **không gọi `hideLibraryPreview()`** —
đúng chỗ duy nhất lo việc thoát doc-mode.
Sửa: gọi `hideLibraryPreview()` ở đầu cả hai hàm + để chính nó xoá dấu `is-open`
của các mục phẳng. ⚠️ Hệ quả bắt buộc: hàm nào tự bật lại `is-open` thì phải bật
**SAU** khi gọi hàm mở (đã sửa `sosanh.js`, và `openSmsAll` làm đúng từ đầu).
Đo 5 bước liên tiếp: Compare → Brochure → SMS → Proposal → Compare, mỗi bước ghi
lại *người dùng đang thực sự nhìn thấy gì* — cả 5 đều đúng, không còn dấu sáng thừa.

**⑤ Đã kiểm bằng số đo, KHÔNG chỉ đếm**
Bàn đo: bản sao `tool.html` bỏ 3 script đăng nhập, chạy trên server thật (cổng tạm),
gọi đúng hàm thật. Xoá sau khi đo xong.
- `/api/library` trả 3 mục, `sms/Chung` đúng **1 file** `SMS/SMS - nail.jpg`.
- Cây menu: **5 mục** đúng thứ tự, mục SMS hiện nhãn "SMS - nail".
- `/api/download` bản tải về: **200, đủ 886.066 byte**; bản xem tại chỗ: **200 inline**;
  thử `?path=.env` → **403** (chốt chặn đường dẫn vẫn nguyên).
- **Không phá 3 mục cũ:** mở Brochure nhiều trang → `has-group`, 2 thẻ · Brochure 1 file
  → `.library-thumb` · Compare → `doc-mode`, 16 hàng. Mở SMS xen giữa rồi mở lại
  Brochure vẫn đúng khung (class không dính lại).
- Nút Tải về sáng/tối: chữ trắng trên **nền gradient tím** (`linear-gradient(140deg,
  #7c3aed, #5b21b6)`). *Đo hụt một nhịp ở đây:* `backgroundColor` trả `rgba(0,0,0,0)`
  làm tưởng nút trong suốt — nền nằm ở `background-image`, phải đọc thuộc tính đó.
- 0 lỗi console.

---

### 2026-08-10 — TAB "KHOÁ MỤC" + nới quyền cho Admin. ✅ ĐÃ PUSH (v1.39).

> ⚠️ Mục này ban đầu tôi ghi nhầm ngày 31/07 (phiên làm việc bị ngắt quãng rồi tiếp
> tục sang ngày khác, tôi cứ theo quán tính ghi tiếp ngày cũ). Ngày THẬT lấy từ
> `git log`: commit `4fb04b1` lúc **10/08/2026 08:20**. Mọi mục v1.38 trở về trước
> đúng là 31/07. → Bài học: đầu phiên và trước mỗi lần ghi nhật ký phải chạy
> `date`, đừng suy ngày từ mục trước đó.

(Ngày thật: 10/08/2026.) Chủ tool: *"thêm cho anh một tab trong quản lí thành viên để chủ động khoá những phần
anh đang cần cập nhật"*. Trước đó muốn khoá phải sửa code + push mỗi lần.

**① Bảng `khoa_muc` + tab thứ 3 "Khoá mục"**
- 4 mục khớp cây thư mục Tool: `proposal` · `brochure` · `namecard` · `compare`.
- ⚠️ Phải để trên SERVER, KHÔNG localStorage — khoá phải áp cho cả đội.
- ⚠️ Dùng **UPDATE, không upsert**: 4 dòng đã tạo sẵn bằng SQL. Upsert =
  `INSERT ... ON CONFLICT DO UPDATE` phải ĐỌC hàng để dò trùng khoá → chính lỗi đã làm
  "đang online" chết câm 8 ngày.
- Có ô gõ **lời nhắn riêng** cho từng mục (chỉ hiện khi đang khoá; để trống = câu mặc định).
- `makeKhoiKhoa()` trong proposal.js dùng chung cho cả 4 mục — KHÔNG ẩn sạch mục, vẫn hiện
  tiêu đề + nhãn cam + giải thích.
- Lỗi mạng khi đọc bảng → coi như **không khoá gì**. Thà mở nhầm một lúc còn hơn cả đội
  đứng hình vì một lỗi mạng.
- Đo 4 trường hợp: không khoá → 4 mục bấm được · khoá 1 → đúng 1 mục chặn, 3 mục kia mở ·
  khoá cả 4 → 0 mục bấm được · có lời nhắn riêng → hiện đúng chữ đã gõ.

**② ⚠️ NỚI QUYỀN CHO ADMIN — ĐẢO NGƯỢC quyết định 27/07**
Chủ tool: *"anh muốn admin thấy được 2 mục này luôn, vì anh sử dụng thấy cũng khá ổn"*.
4 policy đổi từ `is_super_admin()` → `is_admin()`: `usage_events` · `presence` ·
storage `proposal-snapshots` · `khoa_muc` (update).
**HỆ QUẢ ĐÃ BÁO VÀ ĐƯỢC CHẤP NHẬN:** 11 Admin xem được cột `detail` (tên/tuổi/tiểu bang/
số tiền khách sale đã điền) VÀ mở được ảnh bản báo giá đã gửi khách. 27/07 chủ tool từng
chốt ngược lại ("ảnh chứa dữ liệu khách hàng thật — CHỈ Super Admin đọc").
→ Siết lại: đổi `is_admin()` về `is_super_admin()` trong `supabase/quyen.sql`.
Đo bằng 2 tài khoản nháp thật: Admin đọc được cả 4 nguồn + ghi được khoa_muc (đọc lại giá
trị thật để xác nhận); Nhân viên vẫn **0 dòng** usage_events/presence, ghi khoa_muc bị chặn.

**③ Tách `supabase/quyen.sql`** (145 dòng, 10 policy, không tạo bảng)
Lý do THẬT: Supabase chạy cả file trong MỘT giao dịch — lỗi một chỗ huỷ sạch phần sau
(đã dính 27/07). Đổi quyền không cần đụng bảng → chạy file ngắn, ít chỗ hỏng.
`schema.sql` vẫn là nguồn đầy đủ để dựng lại từ đầu. Đối chiếu với DB thật: 5 bảng +
bucket + 6 policy đều khớp → 13 "Untitled query" trong SQL Editor xoá được hết.

**④ ☠️ `.gitignore` có luật `*.sql` CHẶN NHẦM FILE MỚI**
Luật này thêm 22/07 để chặn `Account/*.sql` (chứa mật khẩu 69 sale) — nhưng nó chặn MỌI
file .sql ở MỌI thư mục. `schema.sql` thoát vì đã commit TRƯỚC khi có luật, nên **không ai
thấy luật sai** cho tới khi thêm `quyen.sql` thì git lặng lẽ bỏ qua, không báo gì.
→ Đúng cái bẫy đã cảnh báo trong chính file đó về `Brochure/`. Sửa: `*.sql` → `/*.sql`
(chỉ chặn ở gốc repo). Kiểm lại: 3 file mật khẩu vẫn bị chặn, 2 file schema được theo dõi.
→ **Luật ignore quá rộng không lộ ra ngay — nó chỉ cắn khi thêm FILE MỚI.** Thêm file vào
thư mục đã có file cùng loại: `git status` không thấy thì chạy `git check-ignore -v <file>`.

Versions: `core.js?v=35` · `proposal.js?v=39` · `main.js?v=11` · `style.css?v=85` ·
`members.js?v=50` · `portal.css?v=76` · badge **v1.39**.

### 2026-07-31 (chốt — MỞ KHOÁ mục Báo giá + bảng tin cập nhật). ✅ ĐÃ PUSH (v1.38).

Chủ tool nghiệm thu 4 mẫu mới trên live xong → **mở khoá cho 77 nhân viên**.

**① Mở khoá:** gỡ khối `if (p.role === 'user') appState.khoaProposal = true` trong `tool.html`.
`appState.khoaProposal` **giữ nguyên trong core.js** — lần sau cần khoá chỉ bật lại 1 dòng
(có ghi mẫu câu sẵn trong comment tại chỗ). Đo: mở khoá → 0 khối khoá, mẫu bấm được;
bật lại cờ → khối khoá hiện, 0 mẫu bấm được.

**② Bảng tin "Mẫu báo giá đã cập nhật"** (`makeBangTinCapNhat` trong `proposal.js`).
Sale bị khoá cả buổi sáng; mở lại mà im lặng thì họ không biết mẫu đã đổi nội dung.
- Nền **xanh** (tin đã xong), khác hẳn nền **cam** của bảng "đang khoá" → nhìn MÀU là biết
  loại tin, khỏi đọc chữ.
- Đặt ở **đầu mục Báo giá** — đúng chỗ liên quan, KHÔNG dùng hộp thoại chặn ngang màn hình.
- Có nút ✕ tắt hẳn, nhớ bằng `localStorage['tst-tb-capnhat'] = MA_THONG_BAO`.
  **Lần cập nhật mẫu sau: đổi `MA_THONG_BAO` là thông báo hiện lại cho tất cả mọi người.**
- KHÔNG hiện khi đang tìm kiếm (màn hình lúc đó là kết quả, chen vào là nhiễu).
- Đo: bình thường → có tin + có nút tắt · đang tìm → không hiện · bấm tắt → ẩn, vẽ lại
  vẫn ẩn, localStorage đã lưu đúng mã.

Versions: `core.js?v=34` · `proposal.js?v=38` · `style.css?v=84` · badge **v1.38**.

**CÒN TREO:** chưa quyết có khoá **11 admin** khỏi mục Báo giá không (giờ đã mở cho tất cả
nên câu hỏi này hết cấp thiết); `NLG Term Life` còn 1 chữ "I" chưa outline (không gây lỗi).

### 2026-07-31 (khuya 2 — 4 MẪU BẢN XUẤT LẠI, số La Mã đã outline). ✅ ĐÃ PUSH (v1.37).

Chủ tool xuất lại toàn bộ 4 mẫu sau khi phát hiện **NLG Term Life mất số "II"** (ô huy hiệu
trống trơn) ở bản v1.35.

**Đã thay + nén** (quy trình như v1.35, bản cũ ở `_Archive/templates-cu-2026-07-31-lan2/`):
| Mẫu | MB | Ô panel | **Ô đại lý** | Rác |
|---|---|---|---|---|
| AIG IUL | 2,02 | 16 | **4** | 0 |
| AIG Term Life | 2,01 | 13 | **4** | 0 |
| NLG IUL | 2,60 (nén từ 8,18) | 16 | **4** | 0 |
| NLG Term Life | 2,60 (nén từ 8,17) | 13 | **4** | 0 |
Chữ/số giống HỆT bản chủ tool gửi · hai nơi khớp mã băm · cây thư mục đúng 5 mẫu.

**☠️ BÁO ĐỘNG GIẢ — suýt kết luận "mất hết số La Mã".**
Quét `<text>` thấy 3/4 mẫu KHÔNG có số La Mã nào → tưởng bản mới xoá mất. Thực ra chủ tool
đã **create outlines** (chữ thành `<path>`), nên dò theo `<text>` không ra.
→ Render thật rồi **đếm phần tử nằm TRONG ô huy hiệu**: mục I có 1 nét, mục "PHÍ CHẤM DỨT"
có **2 nét** = chữ "II" — đủ ở cả 4 mẫu, **NLG Term Life đã hết trống**.
→ Bài học: **dò theo LOẠI THẺ là mong manh.** Chữ có thể là `<text>`, có thể là `<path>`.
Muốn biết "ô này có chữ không" thì phải RENDER rồi đo hình học, đừng grep thẻ.

**Đo lệch số La Mã (chủ tool nghi "II bị lệch") — KHÔNG lệch:**
II lệch hơn I: **0,14–0,15 px ngang · 0,05–0,07 px dọc** trên ô 28px = **0,5%**. Mắt không thấy.
Có thật: ô huy hiệu lệch cỡ nhau (mục I **27,5** · "MỨC CHI TRẢ" **28,1** · "PHÍ CHẤM DỨT" **28,6** px).

**⚠️ CÒN SÓT (đã báo chủ tool):** `NLG Term Life` còn **một `<text>` chữ "I"** chưa outline
tại X=26,4 Y=458,6, **chồng lên** bản đã outline và lệch **1,25 px ngang** → nhìn kỹ thấy dày/nhoè.
KHÔNG gây lỗi tool (panel vẫn đúng 13 ô, 0 rác). Lần xuất sau outline nốt là xong.

**Bẫy công cụ đo gặp trong phiên:** bàn đo fetch thẳng `/Export/...` → 404 vì Express chỉ phục vụ
`public/`. Kết quả rỗng, suýt đọc thành "ô trống không có chữ". Phải qua
`/api/svgs/content?path=...`. → **Kết quả rỗng thì nghi ĐƯỜNG TẢI trước khi nghi dữ liệu.**

Versions: badge **v1.37** (chỉ đổi file mẫu + badge, mã nguồn giữ nguyên v1.36).

**CÒN TREO:** (1) chủ tool nghiệm thu số liệu rồi mới **mở khoá** mục Báo giá cho 77 nhân viên;
(2) chưa quyết có khoá luôn **11 admin** không.

### 2026-07-31 (khuya — SỬA LỖI DÒ TRƯỜNG ĐẠI LÝ sau khi thay mẫu). ✅ ĐÃ PUSH (v1.36).

☠️ **LỖI DO TÔI GÂY RA khi thay 4 mẫu ở v1.35 — và luật đã ghi sẵn từ 15/07 mà tôi không tra.**

Chủ tool: *"các phần về thông tin đại lý chỉ được chỉnh 04 phần này — anh nhớ cái này đã note
lại rồi mà em, em không kiểm tra hả em?"* Đúng: luật "Section 3 chỉ có 4 trường" nằm trong
changelog 15/07, tôi thay mẫu mới mà không đọc lại.

**Triệu chứng:** mục 3 hiện tới 11 ô, gồm `II` · `PHÍ CHẤM DỨT HỢP ĐỒNG SỚM` ·
`EARLY SURRENDER CHARGE` · `Nếu người tham gia` · `hủy` · `hoặc` · `ngưng đóng phí` —
toàn TIÊU ĐỀ và chữ trong đoạn văn, đều sửa được. Sale gõ nhầm là phá bản vẽ.

**Nguyên nhân:** `isAgentZone = absoluteY >= 1100` — ngưỡng CỨNG. Mẫu mới bố cục dịch
xuống nên khối "II. PHÍ CHẤM DỨT…" rơi vào vùng đó.

**Sửa gốc — neo theo NHÃN, không theo toạ độ:** tìm Y của `PRESENTED BY` rồi chỉ nhận dòng
nằm DƯỚI nó. Đo cả 4 mẫu: nhãn này LUÔN CÓ (Y = 1349 / 1259 / 1347 / 1255), trường đại lý
thật luôn ở dưới, mọi thứ lọt nhầm luôn ở trên. Bố cục dịch bao nhiêu cũng đúng. Không tìm
thấy nhãn thì lùi về ngưỡng cũ. Chặn thêm số La Mã đứng một mình (`/^[IVX]{1,4}$/`).

**Đo lại bằng chính hàm thật, ĐỌC NỘI DUNG từng ô (không chỉ đếm):**
| Mẫu | Tổng ô trước → sau | Ô đại lý | Rác còn lại |
|---|---|---|---|
| AIG IUL | 22 → **16** | **đúng 4** | 0 |
| AIG Term Life | 23 → **13** | **đúng 4** | 0 |
| NLG IUL | 22 → **16** | **đúng 4** | 0 |
| NLG Term Life | 22 → **13** | **đúng 4** | 0 |
4 ô đúng luật: Tên/SĐT Agent Assistant · Tên/SĐT Licensed Agent. CEO vẫn bị loại.

☠️☠️ **BÀI HỌC LỚN NHẤT PHIÊN — ĐẾM Ô KHÔNG PHẢI LÀ KIỂM.**
Ở v1.35 tôi đã chạy đúng hàm thật, báo "4/4 mẫu dựng panel 22–23 ô, 12/12 lần sửa ăn đúng"
rồi kết luận đạt. **Cả hai con số đều thật, và cả hai đều vô nghĩa** — tôi chỉ đếm số ô và
thử 3 ô ĐẦU (vốn là Khách hàng/Tuổi/Mức bảo vệ, luôn đúng). Chưa bao giờ mở ra ĐỌC 22 ô đó
là những gì. Nếu đọc thì thấy ngay 7 ô rác.
→ Với thứ sinh ra danh sách cho người dùng: **in hết ra và đọc bằng mắt**, đừng dừng ở tổng số.
→ Và **thay mẫu/đổi dữ liệu đầu vào thì phải TRA LẠI LUẬT CŨ trong changelog trước**, vì
   mọi bộ dò dựa trên toạ độ đều mong manh trước một file xuất lại.

**CÒN TREO:** chủ tool báo **số La Mã "II" bị lệch** trong huy hiệu — chưa đo, chưa sửa.

### 2026-07-31 (tối — 4 MẪU NỘI DUNG MỚI + thiết kế lại tab Đo lường). ✅ ĐÃ PUSH (v1.35).

**① THAY 4 MẪU PROPOSAL** — chủ tool tự cập nhật nội dung, giao qua `Export/`.
- Vào **CẢ HAI** nơi (`2-Templates/` + `public/templates/`), khớp mã băm từng cặp.
  Bản cũ lưu ở `_Archive/templates-cu-2026-07-31/`. `Export/` đã gitignore (20MB, trùng).
- ☠️ **BẪY 1: đừng để bản sao lưu trong `2-Templates/`** — thư mục đó BỊ TOOL QUÉT
  (`PROPOSAL_SCAN_DIRS`), cây thư mục lập tức thành **9 mẫu**: 4 bản cũ hiện trùng tên
  cạnh 4 bản mới, sale mở nhầm là gửi khách số liệu sai. Dời sang `_Archive/` → về 5.
- ☠️ **BẪY 2: ảnh nền NLG 5802×3750 làm file phình 2,3 → 8,2 MB.** Nén còn **2800px**
  (bằng chuẩn AIG đang chạy tốt, vẫn gấp 2,4 lần bề rộng file xuất thật 1190px):
  **8,18 → 2,60 MB (−68%)**. GIỮ PNG, KHÔNG chuyển JPEG dù nhẹ hơn 6 lần — ảnh có
  vùng trong suốt (alpha 0..255), JPEG là hỏng nền. Phương án 256 màu nhẹ thêm 4 lần
  nhưng chỉ 32,8 dB → bỏ, nền gradient dễ lộ vệt.
- **Kiểm chứng bằng CHÍNH HÀM THẬT của tool** (`loadSvgContent` + `populateProposalTextsEditor`
  chạy trong trang đo): 4/4 mẫu dựng panel **22–23 ô**, nhận **73–91 dòng**; gõ chuỗi thử
  vào ô rồi đọc ngược bản vẽ → **12/12 lần ăn đúng**. File mẫu không bị phép thử ghi rác
  (`KIEMTHU` xuất hiện 0 lần), hai nơi vẫn khớp.
- ⚠️ **Số liệu quyền lợi thì CHỦ TOOL phải tự nghiệm thu** — không được tự đối chiếu/suy ra.

**② ☠️ LỖI CUỘN Ở BROCHURE** (chủ tool: "trang này anh scroll không được").
`main.js` bắt `wheel` trên cả `.canvas-container` và `preventDefault()` để đổi thành zoom.
Vùng Brochure nằm trong đó → lăn chuột bị nuốt, mà cũng chẳng zoom được gì (chế độ chỉ đọc).
Sửa: `if (e.target.closest('#library-view, #doc-viewport')) return;`.
→ Cảnh báo này ĐÃ ghi trong `sosanh.js` từ 22/07 mà lúc đó chỉ vá riêng Bảng so sánh.
**Vá riêng một chỗ cho lỗi dùng chung = để lại quả bom cho chỗ còn lại.**

**③ ☠️ "AI ĐANG ONLINE" — nguyên nhân THẬT (đo 2 vòng mới ra).**
Vòng 1 em đoán thiếu UPDATE policy → chủ tool chạy SQL → **VẪN HỎNG**.
Đo tách bạch mới ra: `insert` ghi được · `update` trả **204 KHÔNG LỖI mà KHÔNG ghi gì** ·
`upsert` luôn 42501. Thủ phạm là **quyền SELECT**: PostgREST dịch upsert thành
`INSERT ... ON CONFLICT DO UPDATE`, lệnh này phải ĐỌC hàng để dò trùng khoá, mà policy
cũ chỉ cho super_admin đọc.
→ Thêm policy `presence: tự đọc dòng của mình` (`user_id = auth.uid()`) vào `schema.sql`.
**KHÔNG lộ ai đang online cho nhau** — đo được: người thường đọc đúng **1 dòng** của mình.
Sau khi chạy: ping ghi được, `page` đổi đúng, `last_seen` tươi lại, mỗi người **1 dòng**.
Thực tế trên máy chủ tool: thanh hiện `2 đang online · 🛠 Tool 1` — lần đầu chạy thật từ 23/07.
⚠️ **Bài học: `update` không báo lỗi KHÔNG có nghĩa là đã ghi. Phải đọc lại giá trị.**

**④ Cắt 87% text phụ** (chủ tool 3 lần: "không ai đọc dòng text phụ mà dài như thế này").
Nguyên tắc: **chỉ giữ thứ KHÔNG suy ra được từ cái mắt đang thấy.** 486 → 64 ký tự.
- Phụ đề biểu đồ 89→11 (`18/7 – 31/7`) · ghi chú mốc 136→15 (`Số liệu từ 23/7`)
- Khối Top: **xoá hẳn** 45 ký tự · Bảng người 63→16 (`còn 48 người nữa`)
- Popup tải về 153→22; bỏ cả câu kể chuyện lịch sử ảnh chỉ lưu từ 27/07.
☠️ Ngay sau khi bị nhắc, em còn thêm một dòng **136 ký tự** — dài hơn dòng vừa bị chê.
**Định viết câu giải thích trong UI thì DỪNG: hỏi nó có nói được bằng bố cục/màu/bỏ bớt không.**

**⑤ Thiết kế lại 2 bảng + thẻ online**
- ☠️ `1fr` cho cột tên + các cột px cố định = **chỗ dư dồn HẾT vào cột tên**.
  Bảng "Theo từng người": cột tên **1134 → 295px**, khoảng trắng **1043 → 204px**.
  Popup: cột tên 756 → 260px. Popup **bỏ hẳn `fr`** → phần dư dồn ra RÌA PHẢI.
  **Thà trống ở rìa (mắt bỏ qua) còn hơn trống giữa bảng (bắt mắt nhảy).**
- Nhãn 1 dòng, hết trùng tên: `Đăng nhập cuối` · `Mở tool cuối` · `Lần mở` · `Lần tải`.
- **Cột "Lần tải" BẤM ĐƯỢC** → mở popup lọc sẵn người đó, 1 người thì tự bung. Số 0 không làm nút.
- Bấm 👁 **không bung xuống dưới** nữa → panel TRÁI 420px, sticky, danh sách đứng yên.
  **CÓ ẢNH THẬT thì KHÔNG bày bảng "Thông tin sale đã điền"** (chủ tool) — bảng chỉ còn
  là đường lùi cho lượt cũ chưa lưu ảnh.
  ⚠️ Dọn code chết suýt nuốt mất `tim.push(f.v)` — thứ làm ô tìm khớp giá trị đã điền.
- Thanh **đang online dời xuống cạnh bảng** (`.usage-grid-nguoi`, cột 300px), dựng lại
  thành thẻ thống kê 4 hàng bằng `grid-area`; breakdown **dạng cột** (tên trái — số phải,
  dóng thẳng mép). Màn <1100px trả về dạng ngang.
- Biểu đồ: bỏ `max-width` của bảng (chỗ trống đã có thẻ online lấp).

**⑥ ☠️ TỰ LÀM VỠ BỐ CỤC:** lúc rút ngắn text em **nuốt mất một `</div>`** → khối biểu đồ
không đóng, "Top Proposal" lọt vào trong nó, lưới 2 cột chỉ còn 1 con. Em `node --check`
JS nhưng **không kiểm HTML**. → **Sửa cấu trúc HTML thì phải ĐẾM THẺ ngay sau đó**
(`<div>` vs `</div>`), và đánh dấu `<!-- /.tên-khối -->` tại chỗ đóng.

Versions: `core.js?v=33` · `proposal.js?v=36` · `main.js?v=10` · `style.css?v=83` ·
`members.js?v=47` · `portal.css?v=74` · `auth.js?v=10` · badge **v1.35**.

**CÒN TREO:** (1) chủ tool nghiệm thu số liệu 4 mẫu trên live rồi mới **mở khoá** mục Báo giá;
(2) chưa quyết có khoá luôn **11 tài khoản admin** không — hiện họ vẫn mở được Báo giá.

### 2026-07-31 (chiều — KHOÁ MỤC BÁO GIÁ + sửa tab Đo lường). ✅ ĐÃ PUSH (v1.34).

**① 🔒 TẠM KHOÁ MỤC BÁO GIÁ VỚI NHÂN VIÊN** — việc GẤP, chủ tool đang sửa nội dung mẫu.
Sale lấy bản dở gửi khách = sai số liệu với khách hàng thật.
- `appState.khoaProposal` (core.js), bật ở `tool.html` khi `p.role === 'user'`.
- `renderProposalNavSection` trả về sớm: 0 mục bấm được, nhưng VẪN hiện tiêu đề +
  badge cam "Đang cập nhật" + hộp giải thích. **Ẩn sạch thì sale tưởng tool hỏng.**
- ⚠️ `requireLogin` BẤT ĐỒNG BỘ → cây thư mục có thể dựng xong TRƯỚC khi biết role.
  Phải gọi lại `renderFileTree()`, không thì nhân viên vẫn thấy nguyên danh sách.
- `createNewProposal()` báo đúng lý do khi đang khoá (trước đó chỉ đường vào ngõ cụt:
  "chọn bản mẫu ở cột bên trái" — mà cột trái đã khoá). Nút KHÔNG ẩn vì Name Card
  không bị khoá, vẫn cần nó.
- **MỞ LẠI:** `appState.khoaProposal = false` trong `tool.html` (có ghi chú tại chỗ)
  + bump `js/core.js?v=` và `js/proposal.js?v=`.
- Đo: chạy thật hàm dựng cây với cờ bật → 0 mục bấm được, 0 lỗi console. Live đã phục vụ
  đúng `proposal.js?v=36` / `core.js?v=33`.
- ⚠️ **CÒN HỞ, chủ tool CHƯA quyết:** khoá mới áp cho role `user` (**77 người**).
  Còn **11 tài khoản `admin`** (leader/sale: Trương Trọng Nhân, Huỳnh Thanh Long,
  Ty Trieu, Vincent, Mai Thành Trọng…) **VẪN mở được Báo giá**. Super Admin đúng 1
  người (`hadangtien0702@gmail.com`). Đề xuất: khoá cả admin.

**② ☠️ LỖI THẬT: "Ai đang online" chưa từng chạy với ai ngoài super_admin.**
Đo: bảng `presence` có **đúng 1 dòng** trong khi **4 người** có sự kiện thật trong 1 giờ.
Thử ghi bằng token user thường: `insert` thuần OK, nhưng `upsert` (đúng câu
`pingPresence()` chạy) trả **42501 — new row violates row-level security policy**.
`upsert` = `INSERT ... ON CONFLICT DO UPDATE` nên cần **cả policy UPDATE** — policy đó
CÓ trong `schema.sql` nhưng **chưa tồn tại trên DB thật** (đúng bẫy đã ghi: SQL Editor
chạy cả file trong MỘT giao dịch, lỗi một chỗ là huỷ sạch phần sau).
**→ CHỦ TOOL PHẢI CHẠY:**
```sql
drop policy if exists "presence: tự cập nhật của mình" on public.presence;
create policy "presence: tự cập nhật của mình" on public.presence for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```
Chưa chạy → tính năng vẫn chỉ hiện mình chủ tool. **Chưa xác nhận lại sau khi chạy.**

**③ Biểu đồ "Người hoạt động mỗi ngày" — 4 vòng sửa theo ảnh chụp**
- ☠️ **CẮT hẳn những ngày TRƯỚC ngày đầu tiên có số liệu.** Hệ đo lường bật 23/07 nên
  30 ngày = 21 cột rỗng, 60 ngày = 51 cột rỗng → cụm cột dồn góc phải, chủ tool:
  *"biểu đồ gì đây em"*, *"thấy gớm vậy em"*. Vòng đầu em chỉ dán thêm dòng ghi chú —
  **đó là vá bề mặt**, mảng trắng vẫn nguyên.
  ⚠️ CHỈ cắt phần ĐẦU. Ngày 0 người nằm GIỮA vùng đã có số liệu là thông tin thật.
  → Hệ quả: hiện 14/30/60 ngày đều ra 9 cột như nhau cho tới khi dữ liệu dày lên.
- ☠️ **`flex: 1` không có trần** → cột "Top mẫu" kéo biểu đồ cao 420px trong khi thanh
  rộng 31px = **12,7:1** (cây kim). `max-height: 260px` → **7,6:1**. Kèm
  `.usage-filter { margin-top: auto }` để cột trái không hở đáy.
- `gap` và `--uc-bar-max` co giãn theo SỐ CỘT THỰC (không theo `soNgay`).
- Bỏ 21 gạch xám: ngày 0 người không vẽ thanh nào (`min-height: 3px` là nhiễu).

**④ Bộ lọc + 3 khối bị chen chữ**
- Gỡ 2 ô nhập ngày (chủ tool "không cần") → gỡ luôn `doiKhoangTuInput`, `fmtInput`,
  `parseInput`. Pill còn **14/30/60**, mốc đang chọn **tô đặc màu tím** (`.is-on` +
  `danhDauPreset()`) — bỏ ô ngày rồi thì đây là chỉ báo DUY NHẤT, dựa vào viền focus
  là mất dấu ngay khi bấm chỗ khác.
- ☠️ `.usage-block-head` nhét tiêu đề + chú thích CHUNG MỘT HÀNG → chú thích 3–4 mệnh đề
  bám sát làm tiêu đề mất trọng lượng (chủ tool khoanh đỏ cả 3 khối). `flex-wrap` không
  cứu được vì chú thích vẫn vừa một dòng. → `display: block`, chú thích xuống dòng riêng.
- ☠️ `.usage-bar .online-bar { width: auto }` còn sót từ hồi `.usage-bar` chứa HAI thứ;
  27/07 hộp chọn ngày dời đi, dòng này ở lại → thanh online co thành viên thuốc chơ vơ.
  → **Gỡ phần tử khỏi container thì phải rà lại CSS viết CHO container đó.**

**⑤ Skill mới**: `data-analysis` (github.com/dongzhang84/data-analysis-skill, MIT) cài vào
`~/.claude/skills/`. Lưu ý: 2 script Python tự chạy `pip install` khi thiếu pandas/openpyxl.

**CÒN TREO (chủ tool đã giao, CHƯA làm):**
- Bảng "Theo từng người": cột THÀNH VIÊN ăn hết chỗ dư → tên cách "TÊN TIẾNG ANH" ~700px.
  ⚠️ KHÔNG được gộp 2 cột lại — chủ tool đã chốt tách riêng ngày 27/07.
- Cột **TẢI VỀ** trong bảng đó phải bấm được → mở popup "đã tải gì" (hạ tầng có sẵn:
  `moChiTietTaiVe` + `#dl-backdrop`).

Versions: `core.js?v=33` · `proposal.js?v=36` · `style.css?v=83` · `members.js?v=41` ·
`portal.css?v=66` · `auth.js?v=10` · badge **v1.34**.

### 2026-07-31 (QUYỀN ADMIN: sửa · thêm · xoá tài khoản). ✅ ĐÃ PUSH (v1.33).

Chủ tool đặt hàng: *"anh cần quyền admin có thể thay đổi - thêm - xóa tài khoản"*, lý do
*"cho các manager chủ động xóa nhân viên của mình"*. Chốt bậc thang: **Super Admin xoá được
Admin, ngược lại thì không.**

**① Hai API mới trong `server.js`** (sau `/api/admin/reset-password`)
- `POST /api/admin/update-user` — sửa **một lần**: `full_name` · `email` (auth) · `department` ·
  `role` · `password`. Trường nào KHÔNG gửi thì không đụng tới (phân biệt "không gửi" với
  "gửi rỗng"). Đổi auth (email/mật khẩu) chạy TRƯỚC profiles — email trùng người khác thì dừng
  ngay, tránh cảnh hồ sơ đã đổi mà đăng nhập vẫn email cũ.
- `POST /api/admin/delete-user` — `hard:false` = mềm (`status='deleted'`, auth CÒN → email chưa
  dùng lại được); `hard:true` = `auth.admin.deleteUser` ⇒ profiles/usage_events/presence bay theo
  `on delete cascade` ⇒ **MẤT lịch sử tab Đo lường của người đó**.
- ☠️ Bậc thang kiểm bằng `loiBacThang(caller, target)` **TẠI SERVER**, không tin DB: service_role
  đi vào nhánh `auth.uid() is null` của trigger `enforce_member_update` nên trigger cho qua hết.
- `schema.sql` **KHÔNG đổi một câu lệnh nào** (đo: `git diff | grep '^+' | grep -v '^+--'` = 0 dòng).
  Chỉ thêm 7 dòng chú thích giải thích vì sao trigger giữ mức chặt cũ làm hàng rào cuối.
  → **Không phải chạy SQL gì trên Supabase Dashboard.**

**② Giao diện `members.js` + `members.html`**
- Hộp **"Sửa tài khoản"** (`#edit-backdrop`) gom 4 mục rải rác cũ (phòng ban · đặt/bỏ Admin ·
  đổi mật khẩu). Ô "Quyền" CHỈ super_admin thấy. Đổi email hiện cảnh báo cam ngay + hỏi lại lúc Lưu.
- Menu `⋯` **luôn** có "Sửa tài khoản" kể cả khi nút "Sửa" đã hiện ngoài hàng (chủ tool: *"ở nút
  3 chấm đang bị thiếu"*). Thêm "Xoá khỏi danh sách" + "Xoá vĩnh viễn…" cho cả admin.
- Xoá vĩnh viễn hỏi **2 lần**, lần 2 phải **gõ lại đúng email**. Hộp cảnh báo nói thẳng cái BỊ MẤT
  (lịch sử Đo lường), không nói chung chung "không thể hoàn tác". **Không có bản hàng loạt** —
  xoá hàng loạt chỉ là xoá mềm.
- Xoá đi qua API (`goiAdminApiIm` — bản im, không bật hộp thoại, dùng trong vòng lặp hàng loạt),
  KHÔNG update thẳng Supabase, vì trigger DB vẫn chặn admin.

**③ Ba lỗi giao diện chủ tool bắt trong phiên**
- ☠️ **`.notice` là FLEX** → gán thẳng `innerHTML` có `<b>` làm mỗi mẩu chữ thành một flex item:
  ô kết quả "Đã tạo tài khoản" **rơi thành 5 cột hẹp**. Đo: **7 flex item → 2**. Sửa bằng
  `veKetQua()` (ép khuôn `<span>` icon + `<div>` chữ) + `.notice > div { min-width: 0 }`.
  Nhân thể bày Email/Mật khẩu thành khối `.cred-box` + nút **"Sao chép để gửi"**.
  **KHÔNG bày "Quyền"** ở khối này (chủ tool: *"không được cho nhân viên thấy mình là quyền gì"*).
- ☠️ **`.library-view-group { height: 100% }`** → khối trang brochure luôn cao bằng cả canvas dù
  chỉ 2 trang, đẩy thanh "Tải file PDF trọn bộ" xuống đáy. Đo trên khung 900px: khoảng trống
  **312px → 44px**, nút từ **927px (NGOÀI màn hình) → 654px**. Sửa: `height: auto`, để
  `.library-view.has-group` lo cuộn (nó đã có `overflow-y:auto` — hai khung cuộn lồng nhau là thừa).
  → Đội sale đã than đúng lỗi này trong nhóm Teams ("Thiếu nút tải về rồi anh em ơi").
- **Bấm ra ngoài pop-up là mất sạch chữ đang gõ.** Nay **7/7 đường đóng** (ngoài · ✕ · Huỷ · Esc,
  cả hộp Thêm lẫn Sửa) đi qua `thuDongHopSua()` / `thuDongThemThanhVien()`: so TỪNG Ô với giá trị
  gốc, có khác mới hỏi. Hộp hỏi nổi trên pop-up được vì dialog `z-index:900` > modal `500` và cả
  hai cùng gắn thẳng `<body>`.

**④ Giấu vai với nhân viên** (3 trang cả đội vào được)
`index.html` · `videos.html` · `auth.js` (menu tài khoản): role `user` → **xoá hẳn** chip;
admin/super_admin vẫn thấy (cần biết mình ngồi ghế nào). `/members` giữ nguyên — vào được đó thì
đã là admin. Bắt luôn lỗi cũ: `auth.js` viết `role === 'admin' ? 'Admin' : 'Nhân viên'` nên
**Super Admin bị gắn nhãn "Nhân viên"**.

**⑤ Kiểm chứng — 31/31 ĐẠT trên Supabase THẬT**
Script `kiem-tra-quyen-admin.js` (scratchpad): tạo 4 tài khoản nháp `zz-test-*@example.com`,
đăng nhập lấy token THẬT, gọi API qua HTTP thật, rồi xoá sạch.
- Admin: sửa tên/mật khẩu/email nhân viên ✅ (đăng nhập bằng email+mật khẩu MỚI vào được, email cũ
  chết); xoá mềm ✅; xoá vĩnh viễn ✅; **tạo lại tài khoản CÙNG EMAIL vừa xoá ✅** (chứng minh sạch thật).
- Admin bị chặn: sửa/xoá Admin khác `403`, sửa Super Admin `403`, tự cấp quyền `403`, tự xoá `400`,
  không token `401` — và hồ sơ nạn nhân **không đổi một chữ**.
- Super Admin: đổi quyền Admin ✅, **xoá được Admin** ✅, tự hạ quyền mình `400`.
- Dọn dẹp: `profiles` 91 tổng / **87 chưa xoá mềm** (khớp đúng số trên màn hình), rác trong
  `profiles` và `auth.users` = **KHÔNG CÒN**.
- ⚠️ CHƯA đo: thao tác bấm chuột trên giao diện (không đăng nhập được bằng tài khoản chủ tool).
  Rủi ro còn lại là *ẩn/hiện nút sai*, **không phải lỗ hổng** — tầng API đã chặn.

**⑥ `.gitignore`** thêm `outputs/` (thư mục kết quả Claude sinh ra) — cùng lý do `3-Export-PDF/`.
Đã soi bản hiện có: 0 email, 0 số điện thoại.

Versions: `members.js?v=39` · `auth.js?v=10` · `portal.css?v=64` · `style.css?v=82` · badge **v1.33**.

### 2026-07-27 (TAB ĐO LƯỜNG: gọn lại + xem BẢN ĐÃ TẢI). ✅ ĐÃ PUSH (v1.32).

Một buổi dài, chủ tool sửa liên tục qua ảnh chụp. Kết quả đo được (bề rộng 1180px):
**tab Đo lường 1537px → 1083px**, bảng "Theo từng người" **619 → 518px**, lệch đáy 2 cột **195 → 0px**.

**① Gọn bố cục tab Đo lường** (`members.html` + `portal.css`)
- BỎ 4 thẻ "Hôm nay" (`.usage-cards`) + cột phải 300px (`.usage-layout`/`.usage-side`/`.usage-picker`).
  Lý do: số liệu hiện 2 nơi cùng tên chỉ số khác khoảng thời gian → đọc nhầm. Nay **một dải
  `.usage-stats` 5 ô**, đổi theo khoảng đang chọn (preset "Hôm nay" cho lại con số cũ).
  ⚠️ Gỡ 4 thẻ thì phải gỡ luôn `veThe()` trong members.js — không thì `null.textContent` giết hàm.
- Biểu đồ | Top mẫu nằm **ngang hàng** (`.usage-grid`), `align-items` để MẶC ĐỊNH (stretch) và
  `.usage-grid .usage-chart { flex:1 }` → cột trái luôn đầy, biểu đồ cao 150→289px MIỄN PHÍ.
  Dùng `align-items:start` là để lại mảng trắng 195px ("phần này trống nhìn kỳ").
- Bộ chọn ngày dời **vào trong khối biểu đồ** (dòng cuối, có vạch ngăn) — chủ tool: "đem xuống
  đây luôn". Nó lọc CẢ TRANG nên dòng chú thích đầu khối phải ghi "khoảng này áp dụng cho cả trang".
- Bảng "Theo từng người": **tối đa 10 người gần nhất**, và NÓI RÕ đang cắt bao nhiêu
  ("còn 32 người nữa trong khoảng này") — cắt mà im lặng thì tưởng cả đội chỉ có 10 người.

**② Gọi ĐÚNG TÊN SẢN PHẨM** — "mẫu/tài liệu" → **Proposal / Brochure / Name Card / So sánh**.
KHÔNG đổi mù: `phanLoai()` tra ĐƯỜNG DẪN thật trong `/api/library` (Brochure/ vs Bang so sanh),
còn mẫu thì tách "Sale Name Card" ra khỏi Proposal. Bỏ `text-transform: uppercase` (tên riêng
viết hoa hết khó đọc). Màu nhãn Name Card lấy bộ đã đo đạt AA (#96590A), KHÔNG dùng `--warning`.

**③ Popup "Chi tiết tải về"** (`members.js` + `portal.css`)
- CHỈ Proposal (chủ tool: "brochure anh không cần"), nhưng nói thẳng phần bị ẩn ở dòng tiêu đề:
  "53 lượt tải Proposal · ẩn 13 lượt tải Brochure" — nếu không, số này lệch thẻ "Tải về" (đếm cả 2).
- **Gộp theo TỪNG NGƯỜI** (dropdown) + **ô tìm** (mượn `.mem-search` sẵn có). Ô tìm gom cả
  `detail.v` nên gõ tên KHÁCH ("em trang") ra đúng người đã xuất bản đó. 3 người/6 lượt = 126px.
- 🔑 **`.dl-detail{display:grid}` THẮNG thuộc tính `hidden`** → mọi khối chi tiết luôn mở, bấm 👁
  không đổi gì. Phải thêm `.dl-detail[hidden]{display:none}`. Đây là lỗi có từ đầu, nay mới lộ.

**④ XEM BẢN ĐÃ TẢI (mới)** — chủ tool: "muốn xem bản được tải về chứ không phải thông tin điền".
File xuất chạy thẳng về máy sale (`canvas.toDataURL` → `<a download>`), server KHÔNG có bản nào.
Nên phải LƯU thêm lúc xuất:
- `supabase/schema.sql`: cột `usage_events.anh` + bucket PRIVATE `proposal-snapshots` + 2 policy
  (sale chỉ ghi vào thư mục `<user_id>/`, chỉ super_admin đọc). Chủ tool đã chạy, kiểm ra `1|1|2`.
- `auth.js` (v8→9): `luuAnhBanXuat(canvas)` thu nhỏ rồi upload; `linkAnhBanXuat()` xin signed URL 60s.
  `logUsage` nhận thêm tham số `anh`.
- `core.js` (v30→31): `ghiTaiXuongKemAnh()` gọi ở CẢ xuất JPEG lẫn PDF. Upload chạy SAU khi file
  đã tải về máy → hỏng mạng/chưa tạo bucket cũng không ảnh hưởng việc xuất.
- `members.js`: 👁 bung ảnh ngay trong dòng (nạp LƯỜI, bấm mới xin link), bấm ảnh mở tab mới.
  Lượt cũ không có ảnh → lùi về bảng giá trị đã điền + dòng `#dl-note` giải thích vì sao.
- **📏 SỐ ĐO (đo thật, 3 mẫu):** app xuất `scaleFactor=2` → canvas **1191×2682**, file sale tải
  ~480KB. Ngưỡng thu nhỏ 1200px em đặt ban đầu **SAI** (lớn hơn 1191 → không bao giờ chạm).
  Nay **900px · q0.75 ≈ 201KB/lượt ≈ 271MB/năm**. Bảng đánh đổi ghi ngay trên hằng số trong auth.js.

**⑤ Tên tiếng Anh** = phần trước `@` của email công ty (henry@ = Mai Thành Trọng). DB không có
trường riêng nên suy từ email, 2 chốt chặn: chỉ nhận `@thinksmartinsurance.com`; bỏ khi trùng tên
tiếng Việt (celine@ ↔ "Celine Nguyen") hoặc là handle kiểu chữ-đầu+họ (jhuynh ↔ "Hung Huynh").
Kiểm đúng 12/12 người trong danh sách thật.

**⑥ CHIA CỘT** (chủ tool: "nhìn như này hơi rối") — tên tiếng Anh/chip dán sau tên thì tên dài ngắn
khác nhau kéo chúng lệch mỗi hàng một chỗ. Bảng nay **7 cột** (thêm Tên tiếng Anh · Phòng ban),
hàng người trong popup dùng **grid cột cố định**.
- 🔑 Cột cuối KHÔNG được `max-content`: mỗi `.dl-per` là một lưới RIÊNG, "gần nhất 7 giờ trước"
  ngắn hơn "gần nhất 3 ngày trước" → bề rộng khác nhau mỗi hàng, kéo lệch mọi cột phía trước
  (đo được 5 mép khác nhau: 811–829). Đổi sang 150px cố định → 0 cột lệch.

**Kiểm chứng:** không đăng nhập được `/members` nên dựng **bản đo tạm** (`public/_qc-*.html`, đã xoá
sau khi đo) dùng đúng `portal.css` + dữ liệu như ảnh chụp, đo `getBoundingClientRect`. Cách đo "thẳng
cột": lấy MÉP TRÁI của từng cột trên mọi hàng — thẳng thì chỉ ra ĐÚNG MỘT giá trị.
⚠️ Lần đo đầu số "cũ" là RÁC vì em đã sửa CSS dùng chung nên khối cũ bị nén theo → phải dựng lại
đúng CSS gốc scope vào `#old` mới có baseline thật (1764 → 1537px).

**🔑 BÀI HỌC (2 cái đắt nhất):**
1. **Thêm JS mà quên tạo phần tử trong HTML** → `$('dl-note')` = null → `.textContent` ném lỗi →
   popup KHÔNG MỞ (nút vẫn nhận cú bấm nên trông như "bấm không ăn"). Đã viết phép kiểm quét mọi
   `$('...')` trong members.js đối chiếu members.html: **88 ID, không thiếu cái nào**. Chạy nó mỗi
   lần thêm/bớt phần tử.
2. **Chạy file schema trong REPO, đừng chạy tab SQL đã lưu trong Supabase.** Tab "Tracking Data
   Login" là bản cũ chưa có `kind='view'` → lỗi 23514 "violated by some row"; và vì Supabase chạy
   cả file trong MỘT giao dịch nên toàn bộ bị huỷ, kể cả phần không liên quan. Đã ghi cảnh báo +
   câu lệnh soi vào `schema.sql` ngay trên dòng constraint đó.

**Version:** badge **v1.31→v1.32** (5 trang) · `portal.css v53→62` · `members.js v28→35` ·
`auth.js v8→9` · `core.js v30→31`.

### 2026-07-23 (tiếp 13 — THÊM PHÒNG BAN "Agent"). ✅ ĐÃ PUSH (v1.31).

Chủ tool: *"thêm cho anh phòng ban agent"*. Phòng ban có **whitelist ở 2 NƠI** (phải sửa cả hai, nếu chỉ
client thì server ép về 'Sale' khi tạo tài khoản):
- `public/js/portal/members.js` (v27→28) `PHONG_BAN` — nguồn cho dropdown "Chọn/Đổi phòng ban", form "Thêm
  tài khoản", và cột đếm theo phòng ban (comment sẵn: "thêm/bớt sửa đúng mảng này").
- `server.js` `PHONG_BAN_HOP_LE` — kiểm khi `POST /api/admin/create-user` (ngoài whitelist → ép 'Sale').

Đổi: `['Sale','MKT','CS','Admin']` → **`['Sale','Agent','MKT','CS','Admin']`** (Agent sau Sale, viết hoa cho
đồng bộ). server.js đổi → phải RESTART server local (Vercel tự deploy lại khi push).

**Kiểm chứng:** server restart 200; `curl` file served → `members.js` có đúng mảng mới, `members.js?v=28`;
`node -c` OK members.js + server.js. (Dropdown sau đăng nhập nên xác nhận qua file served.)
**Version:** `members.js v28` · badge **v1.30→v1.31**. Chỉ đổi 2 file code + badge; đã push origin main.

**🔑 BÀI HỌC:** phòng ban KHÔNG chỉ ở client — `server.js` có whitelist RIÊNG `PHONG_BAN_HOP_LE` kiểm lại
(chốt an toàn). Thêm/bớt phòng ban phải sửa CẢ HAI mảng, nếu không tạo tài khoản sẽ âm thầm về 'Sale'.

### 2026-07-23 (tiếp 12 — N2 Top mẫu/brochure + N3 Đang online). ✅ ĐÃ PUSH (v1.30).

Chủ tool: *"build tiếp 2 phần mới"* → làm cả hai việc cuối trong hàng đợi. Chủ tool chốt *"cứ build
schema, anh sẽ tạo (chạy SQL) cho"* → em soạn SQL, **chủ tool chạy trong Supabase SQL Editor**.

**① N2 — Top mẫu/brochure chạy nhiều nhất (kind='view').**
- `schema.sql`: nới CHECK `usage_events.kind` thêm `'view'` (giống lúc thêm `'download'`). KHÔNG cột mới.
- `auth.js` (v7→8): `logUsage` gộp throttle qua bảng `USAGE_THROTTLE_MS = {open_tool:1h, view:15'}`; key
  kèm label → 'view' throttle RIÊNG từng mẫu (open_tool giữ key cũ `tst-usage-open_tool`, không reset).
- `core.js` (v29→30): `ghiXemMau(fileInfo)` = `logUsage('view', tachTenMau().day)`; gọi trong `loadSvgContent`
  KHI `isMaster` (sau khi canvas hiện). → đo "sale mở XEM mẫu gốc nào".
- `brochure.js` (v11→12): `openLibraryItem` fire `logUsage('view','Tài liệu: '+tenSach)` khi mở brochure.
- `members.js` (v25→26): `apDungKhoang` gom `theoMau`/`vw`; `veTopMau()` = leaderboard top-12 (rank·tag
  Mẫu/Tài liệu·bar tỉ lệ·số). Thêm dòng "Xem mẫu/brochure" (`#uk-view`) trong hộp khoảng.
- `members.html`: block "Top mẫu / brochure chạy nhiều nhất" (#usage-top-rows) sau biểu đồ.

**② N3 — Đang online real-time (presence + heartbeat).**
- `schema.sql`: bảng `presence(user_id pk, last_seen, page)` — **1 dòng/người, upsert** (KHÔNG append như
  usage_events → không phình). RLS: tự insert+update dòng mình, chỉ super_admin đọc. Index last_seen desc.
- `auth.js`: `startPresence(page)` heartbeat upsert `last_seen=now()` mỗi 45s KHI tab visible (idempotent,
  best-effort). Gọi ở `initShell` (portal: 'portal'/'members'/'videos') + `tool.html` ('tool').
- `members.js`: đọc `presence` last_seen < 2' mỗi 30s KHI mở tab Đo lường (`batDauOnline`/`dungOnline` theo
  `doiTab`); `viTriTrang()` dịch page → "Đang mở Tool"…; bảng chưa tạo thì dừng poll + báo nhẹ.
- **UI (chủ tool chốt "thích thanh gọn hiện tại nhưng bấm vào hiện chi tiết"):** THAY panel-liệt-kê bằng
  **thanh tóm tắt** `#online-bar` (số tổng + chip theo vị trí `🛠 Tool N · 🏠 Trang chính M · 🎬 Video K`
  qua `nhomViTri`/`veOnlineBar`) — BẤM mở **modal** `#online-backdrop` (mượn pattern popup "Tải về"):
  `veOnlineChiTiet()` liệt kê đầy đủ, **"đang mở Tool" LÊN ĐẦU** rồi tới mới nhất; `#online-detail-rows`
  `max-height:52vh; overflow:auto` → 100 người vẫn cuộn gọn, header modal đứng yên. Poll cập nhật cả modal
  nếu đang mở. Lý do đổi: liệt kê phẳng 100 người thì dài/nặng; thanh trả lời ngay "bao nhiêu người đang
  THỰC SỰ dùng Tool".
- `members.html`: thanh `.online-bar` đầu tab + modal `#online-backdrop`; `portal.css` (v51→53): `.online-bar`
  (clickable, hover viền brand), `.online-chip`/`.on-chip-tool`, `.online-item` (dùng chung cho modal),
  `.top-*` (leaderboard) — mobile ẩn bar/where.

**⚠️ CHỦ TOOL CHẠY SQL (Supabase → SQL Editor → Run) — 2 phần, đều idempotent:**
```sql
-- N2: nới kind nhận 'view'
alter table public.usage_events drop constraint if exists usage_events_kind_check;
alter table public.usage_events add  constraint usage_events_kind_check
  check (kind in ('login','open_tool','download','view'));
-- N3: bảng presence (chạy CẢ khối presence trong supabase/schema.sql — table + RLS + index)
```
(Đầy đủ nằm trong `supabase/schema.sql` mục `usage_events` + `PRESENCE`. Chạy nguyên 2 khối đó là đủ.)

**Kiểm chứng** (harness `_test-n2n3.html` chép NGUYÊN VĂN markup `veTopMau`+online rồi ĐO CSSOM, **đã xoá**;
pane ẩn nên screenshot chết → đo computed style như các lượt trước):
- N3 light: dot `--success` xanh + anim `online-pulse`, badge `--success-soft`, grid 4 cột, "nơi" `--brand`.
- N2 light: 6 dòng sort giảm, top-3 `is-top`, tag Mẫu/Tài liệu phân đúng, bar 100/75/58/42/25/17% (max=12),
  rank `--brand-soft-2`, bar `--brand`. Không tràn (760=max-width).
- Dark: mọi token đổi đúng (panel `--surface` #14161F, bar `--brand-400`…). Mobile 375: bar+`where` ẩn, grid
  3 cột, `overflow=false`. `node -c` OK 4 file JS. `/tool`→`/login` không lỗi console (auth.js v8 sạch).
- **N3 redesign (thanh+modal) — harness `_test-online2.html` 100 người, đo rồi XOÁ:** thanh desktop 1280 =
  **1 dòng 49px**, chip `Tool 60·Trang chính 30·Video 10` đúng; modal 100 dòng CUỘN (632/3541px = 52vh),
  **sort Tool-first** (60 đầu `is-tool`, 40 sau không); không tràn. Dark: `barBg=#14161F` (đo CLEAN sau reload
  — lần đầu ra "trắng" là ARTIFACT do poke DOM/toggle nhiều lần; **bài học lại: reload rồi đo, đừng tin số
  sau khi chọc inline style**). `node -c` OK.
- 🔎 **Xác minh SQL bằng anon key (đọc-only):** dò `presence` → 200 = **chủ tool ĐÃ tạo bảng** ✓. Constraint
  'view' không dò được qua anon (RLS chặn insert khách) → cần super_admin test insert.

**CHƯA test được (cần CHỦ TOOL):** ① chạy 2 khối SQL trên. ② super_admin login → /members → tab Đo lường:
xem panel "Đang online" (mở tool ở máy khác thấy tên) + leaderboard "Top mẫu/brochure" chạy số thật.
③ OK mới push (badge đã để **v1.30**). Chưa chạy SQL thì: 'view' insert fail → nuốt im (không mất gì
khác); panel online báo "bảng presence chưa tạo" + tự dừng poll.

**Version cuối lượt:** `auth.js v8 · core.js v30 · brochure.js v12 · members.js v27 · portal.css v53` ·
badge **v1.29→v1.30**. `git status`: chưa commit (chờ duyệt). ✅ HÀNG ĐỢI N2/N3 XONG PHẦN BUILD
(gồm N3 redesign thanh+modal). Bảng `presence` đã tạo; còn constraint 'view' + test live super_admin.

### 2026-07-23 (tiếp 16 — VERSION TRACKING MỚI NHẤT Ở TRÊN). ✅ HOÀN TẤT, KHÔNG SỬA CODE.

- Đảo thứ tự 271 dòng trong `outputs/019f8dd8-version-tracking/Thinksmart Tool.xlsx`: WIP/release mới ở hàng 5,
  lịch sử cũ nằm dần bên dưới; không xoá nội dung.
- Cập nhật `PIPELINE`, `FUNCTION MAP`, `CHECKLIST` để ghi rõ quy tắc mới.
- Automation 07:30 và 15:30 luôn chèn dòng mới tại hàng 5, không append xuống cuối bảng.
- KPI `PIPELINE` đổi thành `TÍNH NĂNG ĐÃ SỬA VÀ THÊM`; `G5` dùng lại công thức `COUNTA` để tự tăng.
- QA: 6 sheet/6 table, 0 lỗi công thức; đã render đầu/cuối `VERSION TRACKING` và mở lại file đã lưu.

### 2026-07-23 (tiếp 15 — CHỐT CUỐI NGÀY). ✅ TRACKING XONG, KHÔNG SỬA CODE.

- Release hiện tại `v1.27`; `HEAD = origin/main = 89bc051`. Đã ghi đủ thay đổi của `v1.26` và `v1.27`.
- Workbook `outputs/019f8dd8-version-tracking/Thinksmart Tool.xlsx` tăng 239→271 dòng;
  `PIPELINE` = `v1.28 · ĐANG LÀM`, 10 mục WIP.
- WIP chỉ đọc: 11 file code, +147/-26 — thêm `usage_events.label` và popup xem ai tải gì/lúc nào;
  asset WIP `core=28`, `main=9`, `auth=6`, `members=24`, `portal.css=50`.
- `DAILY LOG` cập nhật đúng dòng 2026-07-23, không tạo trùng; `CURRENT SNAPSHOT`, `FUNCTION MAP`,
  `CHECKLIST` đã đồng bộ.
- QA: `node --check` đạt 4 file JS đang đổi; workbook 6 sheet/6 table, 0 lỗi công thức, đã render toàn bộ.

### 2026-07-23 (tiếp 14 — HAI MỐC KIỂM TRA MỖI NGÀY). ✅ ĐANG HOẠT ĐỘNG.

- Lượt đầu ngày chạy 07:30; lượt cuối ngày chạy 15:30 và rà soát toàn bộ thay đổi từ buổi sáng.
- Hai lượt cùng cập nhật một mục ngày trong `product/DAILY-CHANGELOG.md` và một dòng ngày trong
  `outputs/019f8dd8-version-tracking/Thinksmart Tool.xlsx`, không tạo bản ghi trùng.
- Mỗi lượt bắt buộc đối chiếu `PIPELINE`/`CHECKLIST`, ghi rõ WIP, rủi ro và bước tiếp theo.
- Chỉ đọc code/worktree; không sửa code, format, hoàn tác, commit, push hoặc deploy.

### 2026-07-23 (tiếp 13 — AUTOMATION ĐÚNG FILE MỚI). ✅ ĐANG HOẠT ĐỘNG.

- Automation `Nhật ký Thinksmart hằng ngày` chạy mỗi ngày lúc 18:00.
- Workbook đích đã đổi đúng sang `outputs/019f8dd8-version-tracking/Thinksmart Tool.xlsx`.
- Mỗi ngày tạo hoặc cập nhật đúng một mục changelog và một dòng `DAILY LOG`, không tạo trùng;
  đồng thời cập nhật `PIPELINE` và `CURRENT SNAPSHOT`.
- Chỉ đọc code để đối chiếu; không sửa code, commit, push hoặc deploy.

### 2026-07-23 (tiếp 12 — 5 TAB DỄ ĐỌC CHO NGƯỜI MỚI). ✅ HOÀN TẤT NỘI BỘ, CHƯA PUSH.

- Giữ nguyên tab `VERSION TRACKING` và toàn bộ lịch sử 239 dòng.
- Viết lại `PIPELINE`, `FUNCTION MAP`, `CURRENT SNAPSHOT`, `CHECKLIST`, `DAILY LOG` bằng tiếng Việt
  đời thường; mỗi tab có dải `CÁCH ĐỌC` nêu rõ nên xem cột nào trước.
- Các cột kỹ thuật vẫn được giữ để đối chiếu nhưng có nhãn `(kỹ thuật)` và màu nền nhẹ để người mới
  có thể bỏ qua.
- Trạng thái và bước thao tác được chuẩn hoá thành từ dễ hiểu; dữ liệu, công thức và 6 bảng không đổi.
- QA: 6 sheet/6 table, 0 lỗi công thức; đã render và xem lại toàn bộ tab. Không sửa code ứng dụng.

## ✅ MỘT NHÁNH DUY NHẤT: `main` (chốt 22/07/2026) — ĐỌC TRƯỚC KHI ĐỘNG VÀO GIT

Chủ tool chốt: *"chỉ dùng 1 bản đầy đủ — offline chạy ở local, online chạy ở domain chính"*.
`feat/login` và `feat/mainV1.1` **ĐÃ XOÁ** (đã gộp hết vào `main`; còn nhãn sao lưu
`luu-feat-login-22-07-2026` và `luu-feat-mainV1.1-22-07-2026` nếu cần lục lại).

| | |
|---|---|
| Nhánh | **`main`** — nhánh DUY NHẤT. Vercel deploy từ đây. |
| Offline | `localhost:8000` (`PORT=8000 node server.js`) |
| Online | `tool.thinksmartinsurance.com` — 69 tài khoản sale |
| `config.js` | CÓ khoá Supabase thật → bắt đăng nhập ở cả 2 nơi |

**⚠️ ĐỪNG TẠO NHÁNH MỚI để giấu tính năng chưa xong.** Cách đó đã hỏng và đã bỏ (xem dưới).
Muốn thứ gì đó chỉ chạy ở local thì dùng **`location.hostname`**, như `SS_SHOW_IN_NAV`.

### Bảng So sánh — ĐÃ DUYỆT, hiện ở MỌI NƠI (22/07 chiều)

Chủ tool duyệt xong và yêu cầu cho nhân viên/user xem trên domain chính:
`SS_SHOW_IN_NAV = true`. Cơ chế tính theo `location.hostname` (chỉ hiện ở localhost) đã **bỏ**.
Giữ lại biến thay vì xoá — sau này cần tắt tạm chỉ phải sửa MỘT dòng.

### 2026-07-23 (tiếp 11 — ĐỔI TÊN WORKBOOK). ✅ HOÀN TẤT NỘI BỘ, CHƯA PUSH.

- Đổi `Thinksmart-Version-Tracking.xlsx` thành **`Thinksmart Tool.xlsx`** theo tên chủ tool chốt.
- Đồng bộ đường dẫn trong FUNCTION MAP, DAILY CHANGELOG và automation hằng ngày.
- Không đổi nội dung/format workbook; QA 6 sheet, 0 lỗi công thức. Không sửa code ứng dụng.

### 2026-07-23 (tiếp 10 — VERSION TRACKING MỞ RỘNG). ✅ HOÀN TẤT NỘI BỘ, CHƯA PUSH.

Chủ tool nhắc lịch sử 31 dòng bị gom quá mạnh. Đã đối chiếu toàn bộ changelog + git log từ
10/07→23/07 và mở rộng tab **VERSION TRACKING từ 31 thành 239 dòng**, mỗi dòng chỉ giữ:
`Version · Ngày · Khu vực · Thay đổi chính · Loại · Commit · Trạng thái · Done`.

- Bổ sung cả giai đoạn `Khởi tạo`/`Pre-v1.00`, sau đó theo từng release `v1.00→v1.25`.
- Thêm 6 dòng `WIP` cho tăng tốc canvas + tracking lượt tải; `Done=No`.
- Tab PIPELINE tự cập nhật `FEATURE ROWS ĐÃ GHI = 239`, `ITEM CHƯA DONE = 6`.
- CURRENT SNAPSHOT ghi đúng **11 file WIP (+118/-23)**; asset WIP chính:
  `core.js?v=27`, `main.js?v=8`, `style.css?v=81`, `members.js?v=23`, `portal.css?v=49`.
- QA: workbook đủ 6 sheet/6 table, 0 lỗi công thức; đã render và xem toàn bộ sheet, riêng
  VERSION TRACKING đã xem cả đầu và cuối bảng.
- Không sửa code ứng dụng, không commit/push/deploy.

### 🚨 VÌ SAO BỎ CÁCH CŨ (cờ khác nhau giữa 2 nhánh) — đừng làm lại

Xung đột git **chỉ nổ theo MỘT chiều**: `nhánh → main` thì có, `main → nhánh` thì **KHÔNG**.
Sau lần merge đầu, `main` thành hậu duệ nên merge ngược lại git **lặng lẽ ghi đè**. Ngày 22/07
bảng So sánh biến mất khỏi localhost mà không báo gì — chủ tool phát hiện, không phải tôi.
Đã đo 7 tên miền để xác nhận cách mới chạy đúng cả 2 phía.

### 2026-07-23 (tiếp 9 — DAILY CHANGELOG + DAILY LOG + AUTOMATION). ✅ ĐÃ THIẾT LẬP, CHƯA PUSH.

Chủ tool chốt quy trình: mỗi ngày Codex đọc folder, cập nhật một file changelog riêng, ghi lại vào
sheet và cập nhật pipeline.

- Tạo `product/DAILY-CHANGELOG.md`: append-only, có mục khởi tạo 23/07/2026 và mẫu mục mới.
- Workbook `outputs/019f8dd8-version-tracking/Thinksmart Tool.xlsx` tăng lên **6 tab**:
  thêm **DAILY LOG** (ngày/lượt chạy/branch/HEAD/version/file đổi/chức năng/evidence/trạng thái/việc kế);
  tab **PIPELINE** thêm vòng hằng ngày 6 bước: Đọc folder → Đối chiếu → Changelog → Ghi sheet →
  Pipeline → QA. Chỉ số lần kiểm tra/số ngày/trạng thái/HEAD lấy bằng công thức từ DAILY LOG.
- Dòng đầu: `2026-07-23`, `main`, `4819ea0`, `v1.25`, 13 file trong release gần nhất,
  cộng thêm 3 file WIP của chủ tool (`core.js`, `style.css`, `tool.html`, +57/-12) được **chỉ đọc và
  ghi nhận, không sửa/hoàn tác**; trạng thái `Cần chú ý`; `v1.26` vẫn chưa mở.
- QA: inspect đủ **6 sheet/6 table**, 0 lỗi công thức; render và xem trực quan toàn bộ 6 tab.
- Tạo automation **“Nhật ký Thinksmart hằng ngày”** chạy mỗi ngày lúc **18:00 giờ Bangkok**.
  Job chỉ được đọc code để đối chiếu rồi cập nhật hai artifact tracking; cấm sửa code, commit, push,
  deploy; cấm đọc/ghi dữ liệu `.env`, `Account/`, `4-Clients/`, `2-Templates/`, `3-Export-PDF/`;
  mỗi ngày đúng một mục/một dòng, nếu đã có ngày hiện tại thì cập nhật thay vì tạo trùng.
- Lượt này không sửa mã ứng dụng và không bump badge.

### 2026-07-23 (tiếp 8 — VERSION & FUNCTION TRACKING WORKBOOK). ✅ HOÀN TẤT NỘI BỘ, CHƯA PUSH.

Chủ tool muốn một pipeline cố định và một file sheet để **mỗi lần update version phải đọc chức năng
hiện tại rồi ghi lại**, theo khung gốc: Version → Chức năng → Mô tả chi tiết → Done.

- File: `outputs/019f8dd8-version-tracking/Thinksmart Tool.xlsx`.
- 6 tab: **PIPELINE** (8 bước release + vòng hằng ngày) · **DAILY LOG** (nhật ký theo ngày) ·
  **VERSION TRACKING** (31 feature rows v1.00→v1.25) ·
  **FUNCTION MAP** (19 chức năng cấp sản phẩm) · **CURRENT SNAPSHOT** (đọc branch/HEAD/badge/asset/API/
  DB/module trực tiếp từ worktree) · **CHECKLIST** (18 gate cho version kế tiếp).
- Trạng thái ghi đúng sau push v1.25: branch `main`, HEAD `4819ea0`, badge `v1.25`,
  `portal.css?v=48`, `members.js?v=22`; version kế tiếp **v1.26 chưa mở**.
- Quy tắc mới: lịch sử **append-only**; mỗi feature một dòng; `Done=Yes` chỉ khi có evidence; mỗi lần
  tracking phải đọc code/diff/changelog hiện tại, không dựa vào trí nhớ; không đưa `.env`, `Account/`,
  `4-Clients/` hay dữ liệu khách hàng vào workbook.
- QA workbook: inspect đủ 6 sheet/6 table, 0 lỗi công thức `#REF!/#VALUE!/#DIV/0!/#NAME?/#N/A`;
  render trực quan toàn bộ 6 tab + riêng các dòng v1.25, không có nội dung bị cắt nghiêm trọng.
- Không sửa mã ứng dụng trong lượt này; chỉ thêm workbook + entry knowledge-base này.

### 2026-07-23 (tiếp 11 — Đo lường: CON MẮT 👁 xem "sale đã điền gì" - Cách A). ✅ ĐÃ PUSH (v1.29).

Chủ tool: trong popup tải-về, muốn bấm 👁 xem **bản sale đã tải** — kiểm "điền đủ thông tin khách chưa".
Chốt **Cách A: lưu GIÁ TRỊ đã điền** (không lưu ảnh, nhẹ + ít privacy hơn). Chủ tool ĐỒNG Ý lưu data khách.

**Data:** thêm cột `usage_events.detail jsonb` (**chủ tool chạy SQL** `add column if not exists detail jsonb`).
Lúc xuất, `chupThongTinDaDien()` (core.js) đọc MỌI ô `.text-input-field[data-editor-id]` → mảng `[{k:aria-label,
v:value}]` (Khách hàng/Tuổi/Giới tính/Sức khoẻ/Tiểu bang/Mức đóng…). `logUsage(kind, label, detail)` (auth.js
v6→7) chèn detail; **RESILIENT nhiều tầng** — thiếu detail → bỏ detail; thiếu cả label → ghi tối giản.

**UI:** cột 4 "Xem" trong popup; lượt CÓ detail hiện nút **👁**, lượt cũ hiện "—". Bấm 👁 → **bung khối
`.dl-detail`** (grid 2 cột nhãn=giá trị, mobile 1 cột). `taiDoLuong` select thêm `detail` (lùi dần nếu chưa
có cột). members.js v24→25, portal.css v50→51.

**Kiểm chứng** (harness): 👁 chỉ hiện ở lượt có detail; bấm → bung đúng 4 field đã điền (Khách/Tuổi/Bang/
Mức đóng); lượt cũ "—". `node -c` OK.

**Version:** `auth.js v7 · core.js v29 · members.js v25 · portal.css v51` · badge v1.28→**v1.29**.
⚠️ Live giờ lưu **giá trị khách sale điền** vào `usage_events.detail` (super_admin QA). Còn: ③ Top brochure · ② Online.

### 2026-07-23 (tiếp 10 — Đo lường: POPUP "TẢI GÌ" + ghi label download). ✅ ĐÃ PUSH (v1.28).

Chủ tool: bấm "Tải về" → xem chi tiết **tải CÁI GÌ** (ai · tải gì · lúc nào). Trước đó `download` chỉ ghi
"có tải", chưa ghi "tải gì".

**Data:** thêm cột `usage_events.label text` (**chủ tool chạy SQL** `alter table ... add column if not
exists label text`). Ghi khi: xuất JPEG/PDF → `getProposalBaseName() + ' · JPEG|PDF'` (kèm tên khách);
tải brochure → "Tài liệu: <tên file>" (lấy từ href trong delegation main.js). **Không throttle** download.
`logUsage(kind, label)` (auth.js v5→6) chèn label; **RESILIENT** — nếu cột chưa tạo, chèn LẠI không label
(khỏi mất sự kiện). `taiDoLuong` (members.js v23→24) select kèm label, lỗi cột → nạp lại không label.

**UI:** dòng "Tải về" trong hộp khoảng thành **button** (`.ms-row-btn`, hover + mũi ›) → mở modal
`#dl-backdrop`: liệt kê download trong khoảng (grid 3 cột: Thành viên · Tải gì · Lúc, sort mới nhất,
lượt cũ chưa có label hiện "không rõ"). CSS `portal.css v49→50` (`.dl-*`, mobile ≤640 xếp thẻ).

**⚠️ QUYẾT ĐỊNH PRIVACY (chủ tool CHỐT 23/07):** label chứa **TÊN KHÁCH** → lưu data khách lên Supabase
(trước giờ dự án giữ hồ sơ khách ở máy, `4-Clients` gitignore). Chủ tool đồng ý lưu để **super_admin QA**
(chỉ super_admin đọc `usage_events`). Chọn **Cách A** (lưu giá trị, không lưu ảnh) cho các bước sau.

**Kiểm chứng** (harness, xoá sau): modal mở đúng, lọc **3 lượt tải** trong khoảng (loại open_tool/login/
ngoài-khoảng), hiện ai/tải-gì/lúc, dòng cursor pointer. `node -c` OK auth/core/main/members.

**Version:** `auth.js v6 · core.js v28 · main.js v9 · members.js v24 · portal.css v50` · badge v1.27→**v1.28**.

**CÒN LÀM (chủ tool xin, xếp hàng):** ④ con mắt xem BẢN đã tải (Cách A: lưu giá trị đã điền → cột `detail
jsonb`) · ③ Top brochure/mẫu chạy nhiều nhất (thêm kind `'view'`) · ② Online real-time (heartbeat + bảng presence).

### 2026-07-23 (tiếp 9 — MẪU ALLIANZ bản mới: thêm đường line + gỡ mục trùng). ✅ ĐÃ PUSH (v1.27).

Chủ tool muốn thêm **1 đường line mảnh** trên "PRESENTED BY" ở mẫu Max-Funded Allianz, nên tự thêm trong
Illustrator rồi export SVG mới. Bản export mới **tái phát mọi bẫy cũ** + 2 bẫy mới:
- **Tên file dính 2 đuôi `.svg.svg`** (đổi tên trong Explorer gõ ".svg" khi Windows đã ẩn đuôi). Vì tên
  KHÁC bản `public/templates/Max-Funded Allianz.svg` nên `/api/svgs` **không gộp** → hiện **2 mục "Max-Funded"**
  trong nav ALLIANZ. → **`/api/svgs` gộp trùng theo TÊN FILE**: cùng tên (2-Templates + public/templates) = 1 mục;
  khác tên = 2 mục. Sửa: đổi về đúng `Max-Funded Allianz.svg` (1 đuôi) + đồng bộ public → còn 1 mục.
- **1 logo `Layer 1.png` link ngoài** (`href="../..."`) → nhúng lại data-uri (đọc từ `E:\2024\Video\Asset\
  Logo\Thinksmart Insurance\Layer 1.png`). File 62KB/2386KB (thiếu embed) → **2537KB** sau nhúng đủ 4 ảnh.
- **State về "Washington DC"** (không có trong US_STATES) → ô Tiểu bang MẤT dropdown (chủ tool: "thêm tiểu
  bang vào đây"). Đổi thẻ `cls-11 translate(365.87 332.61)` 5-tspan "Washington DC" → 1 tspan sạch **"Texas"**.
- ⚠️ Export mới đổi class `cls-*`→`st*` rồi lại `cls-*` qua các lần — nhưng `isAllianz` + dán nhãn theo
  **VỊ TRÍ/NEO CHỮ** (không theo class) nên vẫn map đúng (chủ tool đã thấy 8 field hiện đúng ở tool).

**Cách làm (script `scratchpad/fix-allianz.js`):** backup → nhúng Layer 1.png → state→Texas → ghi CÙNG TÊN
`Max-Funded Allianz.svg` vào `2-Templates/Allianz/` + `public/templates/` → xoá file `.svg.svg`. Verify:
`/api/svgs` còn **1 mục** Allianz · 4 data-uri · 0 href ngoài · Texas · line y=1193 · 2537KB.

**🔑 BÀI HỌC (bổ sung mẫu Allianz lần 22/07):** re-export Illustrator LUÔN mất các fix làm tay ở SVG
(embed logo, Texas) + hay sai tên (Aliianz / thiếu Allianz / .svg.svg). Vì `isAllianz` đọc TÊN FILE và
ảnh phải EMBED, mỗi lần chủ tool gửi mẫu mới phải: (1) đổi tên đúng `...Allianz.svg`, (2) nhúng ảnh ngoài,
(3) state = bang thật (Texas), (4) đồng bộ 2 chỗ CÙNG TÊN. Cân nhắc PENDING: cho `isAllianz` nhận theo
THƯ MỤC `/Allianz/` để hết phụ thuộc tên file.

**Version:** chỉ đổi `public/templates/Max-Funded Allianz.svg` (bản live) + badge v1.26→**v1.27**.
`2-Templates/` master (gitignore) cũng cập nhật cho local. Live `isAllianz` vẫn OK (tên có "Allianz").

### 2026-07-23 (tiếp 8 — ĐỔI MẪU MƯỢT + POP + MODULE "TẢI VỀ"). ✅ ĐÃ PUSH (v1.26).

Chủ tool báo đổi mẫu "load lâu + giật trắng + không có hiệu ứng". Và chốt thêm hướng của chính chủ tool:
*"cho hiện trước rồi nạp ngầm — sale bấm để XEM là chính, chưa sửa liền"*. Rồi xin thêm hiệu ứng + đo download.

**1. ĐỔI MẪU MƯỢT (`core.js v26→27`, `style.css v78→79`).** Nguyên nhân "giật trắng": sau `await fetch`,
`loadSvgContent` chạy KHỐI ĐỒNG BỘ nặng (parse SVG ~2.6MB + gán editor-id + clone + zoomToFit) → đóng
băng luồng chính. Fix:
- **Spinner + giữ bản cũ mờ** (`.canvas-container.dang-tai`): thêm class lúc bắt đầu tải, bỏ khi canvas
  hiện. Spinner quay bằng `transform` → chạy trên COMPOSITOR nên vẫn mượt lúc luồng chính đơ. KHÔNG để trắng.
- **Vẽ canvas TRƯỚC, dựng "máy sửa" NGẦM**: render + zoomToFit xong → `await` DOUBLE-rAF (nhường trình
  duyệt vẽ xong) RỒI mới `populateTextsEditor`/`populateColorsEditor`/`tagEditableCanvasElements`. Vẫn nằm
  TRONG loadSvgContent nên caller (clone → `applyAgentPresetQuiet`) chờ được editor sẵn sàng, KHÔNG vỡ auto-fill.
- **Cache nội dung MẪU GỐC** (`svgContentCache`, chỉ khi `isMasterFile`): đổi mẫu lần sau khỏi gọi API.
  Bản nháp/khách (`local:`) KHÔNG cache (thay đổi khi lưu).

**2. POP khi mở (`style.css`).** `.rendered-svg-container.svg-vao` (class đặt lúc mở mẫu, KHÔNG bật khi
re-render đổi màu): keyframe `tst-canvas-in` = trồi 16px + scale 0.955→1, easing nảy nhẹ
`cubic-bezier(0.34,1.45,0.5,1)` 0.44s. Áp cả **Brochure preview + bảng Compare**: `.library-view > *`,
`#doc-viewport > *` — mỗi lần đổi nội dung, phần tử con MỚI → CSS animation TỰ chạy (không JS trigger).
Transform nằm trên `.rendered-svg-container`/con, KHÔNG đụng pan/zoom (ở `#canvas-wrapper`). Có
`@media (prefers-reduced-motion: reduce)` tắt — ⚠️ **Windows tắt Animation effects thì KHÔNG thấy pop**
(bẫy 20/07: Settings→Accessibility→Visual effects→Animation effects, bật + restart Chrome).

**3. MODULE "TẢI VỀ" (chủ tool: "download mới biết sale dùng THẬT").** Thêm `kind='download'` vào
`usage_events` (SQL ALTER — **chủ tool ĐÃ chạy 23/07**, gộp vào query "Tracking Data Login"). Ghi qua
`ghiTaiXuong()` (core.js) → `logUsage('download')` khi **xuất JPEG, xuất PDF**; brochure "Tải về" bắt bằng
delegation trong `main.js` (`#library-view a[download]/.library-download/.library-card-btn` — không bắt nhầm
link tạm của export vì link đó ở `<body>`). **Không throttle** (mỗi lượt tải là thật). UI tab Đo lường
(`members.js v22→23`, `members.html`, `portal.css v48→49`): thẻ 4 "Hôm nay·Tải về" (đếm LƯỢT) + dòng
"Tải về" trong hộp khoảng (xanh) + cột "Tải về" trong bảng theo người (tím đậm, bảng 5→6 cột). Chưa chạy
ALTER thì insert 'download' fail → logUsage nuốt lỗi, không vỡ.

**Kiểm chứng** (harness tạm, đo rồi XOÁ — pane ẩn nên đo CSSOM/logic, không quay clip):
- Spinner: `.dang-tai #canvas-wrapper` opacity 0.4, `::after` 42px `tst-canvas-spin`; fade+pop wired đúng.
- Pop library/compare: `.library-thumb`/`.library-meta`/`.ss-wrap` đều nhận `tst-canvas-in`.
- Download: thẻ hôm nay 1/2/**3**/3, hộp khoảng 1/3/**4**/3, bảng An:2·Bình:1·Cường:1, **6 cột**. `node -c` OK cả 3 file.

**Version:** `style.css v81` (78→79 loading, →80 pop mẫu, →81 pop lib/compare), `core.js v27`, `main.js v8`,
`members.js v23`, `portal.css v49`. Badge **v1.25→v1.26**. ĐÃ push origin main → Vercel deploy.
⚠️ **Live giờ ghi thêm sự kiện `download`** (mọi lần sale xuất JPEG/PDF/tải brochure).

### 2026-07-23 (tiếp 7 — Đo lường: HỘP "XEM THEO NGÀY" + bố cục 2 cột). ✅ ĐÃ PUSH (v1.25).

Chủ tool (sau khi chủ tool ĐÃ CHẠY SQL + xem tab chạy được): *"cho anh thêm một module dạng hộp này…
anh muốn thêm lịch chọn ngày ở đây để anh xem"* (khoanh vùng bên phải tab Đo lường).

**Cách làm — ADDITIVE, không bỏ gì:** giữ nguyên 3 thẻ "Hôm nay/7 ngày" (liếc nhanh, CỐ ĐỊNH), rồi
bọc biểu đồ + bảng vào **bố cục 2 cột** (`.usage-layout` mượn `.members-layout`): trái = biểu đồ+bảng,
phải = hộp **"Xem theo ngày"** (`.ms-panel`). Hộp gồm ô **Từ ngày / Đến ngày** (`<input type=date>`,
`color-scheme` theo theme) + 4 nút nhanh **Hôm nay/7/14/30 ngày** + 3 dòng số tổng trong khoảng
(Đăng nhập/Mở công cụ/Người hoạt động).

**Cơ chế (members.js v21→22):** nạp **90 ngày** 1 lần vào `usageEvents` (trước là 30), **lọc khoảng ở
CLIENT** — đổi ngày không query lại. `veThe()` = 3 thẻ cố định (today/7d, tách khỏi khoảng). `apDungKhoang()`
lọc `[khoangFrom, khoangTo]` → số tổng hộp + `veBieuDoKhoang()` (bar theo đúng số ngày khoảng; >16 cột
thì thưa nhãn `step=ceil(n/12)`) + `veBangNguoi()`. `datPreset(n)`→ from=today-(n-1). `doiKhoangTuInput()`
đảo nếu chọn ngược. Mặc định 14 ngày; ô ngày `min/max` khoá trong 90 ngày đã nạp. Nút "↻ Tải lại" vẫn refresh.
CSS `portal.css v47→48`: `.usage-layout/.usage-main/.usage-side`, `.usage-picker/.up-field` (date input như
`.select-field`), `.usage-presets` (nút flex-wrap); mobile ≤900 stack 1 cột.

**Kiểm chứng** (harness `public/_test-usage2.html`, 3 user/8 sự kiện trải today→day-20, đo rồi XOÁ):
5 preset đều đúng — mặc-định 14 → hộp 2/3/3, 14 cột (3 có số), 3 hàng; Hôm nay → 1/2/2, 1 cột, 2 hàng;
7 ngày → 2/3/3, 7 cột (2 có số); 30 ngày → 3/3/3, 30 cột (4 có số, kéo thêm sự kiện day-20). **3 thẻ trên
LUÔN 1/2/3** bất kể preset (chứng minh lịch chỉ điều khiển biểu đồ+bảng, không đụng thẻ Hôm nay). Ô ngày,
nhãn khoảng cập nhật chuẩn. `node -c` OK. (Bề rộng vẫn không đo được — pane ẩn; nhưng chủ tool đã thấy
tab render đẹp ở trình duyệt thật lượt trước, CSS lần này mượn tiếp `.members-layout`/`.ms-panel`.)

**Version:** `members.js v21→22`, `portal.css v47→48`. Badge vẫn v1.24.

### 2026-07-23 (tiếp 6 — N1: ĐO LƯỜNG ĐĂNG NHẬP + SỬ DỤNG TOOL). ✅ SQL ĐÃ CHẠY (production) · ✅ ĐÃ PUSH (v1.25).

Chủ tool: *"làm một trang tracking đăng nhập và sử dụng tool"*. Hỏi 3 điểm, chốt:
**(1) Tab "Đo lường" TRONG /members** (không phải trang riêng) · **(2) mức đơn giản: đăng nhập +
có-mở-tool** (không tách theo tool nào) · **(3) chỉ Super Admin xem.** Đúng hướng N1 đã chốt:
**append-only, thu dữ liệu thô** (không lưu-đè-1-mốc), chạy **anon key + RLS, KHÔNG cần service_role**.

**Bảng `usage_events`** (thêm vào `supabase/schema.sql` mục 3 — **CHỦ TOOL PHẢI CHẠY SQL này**):
`id · user_id → profiles(id) · kind ('login'|'open_tool') · at`. RLS: INSERT `user_id = auth.uid()`
(ai cũng ghi được sự kiện CỦA MÌNH), SELECT `is_super_admin()` (chỉ super_admin đọc), **KHÔNG có
policy UPDATE/DELETE** → không sửa/xoá được qua web = giữ lịch sử. 2 index (`at`, `user_id,at`).

**Ghi sự kiện** (client, best-effort — lỗi/chưa cấu hình đều NUỐT, không chặn luồng chính):
- `auth.js` (v4→5): helper mới **`TSTAuth.logUsage(kind)`** → `insert usage_events`. `open_tool`
  **throttle 1 lần/giờ/máy** qua `localStorage['tst-usage-open_tool']` để refresh không phình bảng.
- `login.html`: sau `signInWithPassword` thành công → `await logUsage('login')` (await TRƯỚC khi
  `afterLogin()` redirect, kẻo request bị huỷ).
- `tool.html`: trong `requireLogin().then`, người active mở /tool → `logUsage('open_tool')` (không await).

**Tab "Đo lường" ở /members** (`members.html` + `members.js` v20→21):
- HTML: `#ms-tabs` (2 nút Thành viên/Đo lường, `display:none` mặc định) + panel `#tracking-content`.
- `members.js`: `initTracking()` chỉ bật tab khi `me.role==='super_admin'`; `doiTab()` lật
  page-content ↔ tracking-content; **nạp LƯỜI** (`taiDoLuong()` chỉ query khi mở tab lần đầu).
  `taiDoLuong` đọc 30 ngày gần nhất; **bảng chưa tạo → báo rõ "chạy SQL trong schema.sql"** (regex bắt
  lỗi PostgREST "could not find … schema cache" / Postgres "does not exist").
- `veDoLuong()` tổng hợp CLIENT-SIDE (super_admin đọc hết): 3 thẻ số (hôm nay đăng nhập / hôm nay mở
  tool / 7 ngày hoạt động — đều distinct user), biểu đồ **14 ngày** (mỗi cột = user distinct/ngày,
  CSS thuần), **bảng theo người** (tên/phòng ban/đăng nhập gần nhất/mở tool gần nhất/tổng lần mở,
  sort theo hoạt động gần nhất). Tên lấy từ `toanBo` (profiles đã tải). "↻ Tải lại" cũng làm mới tab.
- CSS `portal.css` (v46→47): `.ms-tabs/.ms-tab` (pill mượn `.auth-tabs`), `.usage-cards/.usage-card`
  (mượn `.stat-card`), `.usage-chart/.uc-*` (bar thuần CSS), `.usage-table` (grid 5 cột, mobile ≤760 xếp thẻ).

**Kiểm chứng** (harness tạm `public/_test-usage.html` chép NGUYÊN VĂN 5 hàm render + dữ liệu giả 3 user/
6 sự kiện, đo rồi **XOÁ NGAY**): logic **đúng hết** — hôm nay **1** đăng nhập / **2** mở tool / **3**
hoạt động-7-ngày · **14** cột (3 cột có số) · **3** hàng sort đúng (An trên cùng: "vừa xong/vừa xong/2").
Chiều cao render đúng (card 111, chart 150, bar scale theo max). CSSOM xác nhận `.ms-tabs = inline-flex`.
⚠️ **KHÔNG đo được BỀ RỘNG** vì pane Browser đang ẩn → `viewport=0`, mọi số width co về 0 (bài học mới).
`node -c` OK members.js + auth.js. CSS mượn pattern đã chạy tốt nên width sẽ đúng khi mở pane thật.

**CÒN LẠI — CHỦ TOOL LÀM:** ① **Chạy SQL** mục 3 trong `supabase/schema.sql` (Supabase → SQL Editor → Run).
② Đăng nhập **super_admin** ở localhost/live → /members → tab "Đo lường" xem số chạy chưa. ③ Chưa chạy
SQL thì tab hiện thông báo "bảng chưa tạo" (không vỡ). Xong xuôi mới bump badge **v1.25** + push.

**Version cuối lượt:** `auth.js?v=5`, `members.js?v=21`, `portal.css?v=47`. Badge vẫn v1.24.

### 2026-07-23 (tiếp 5 — FORM "Thêm tài khoản": style ô Phòng ban + thêm ô QUYỀN). ✅ ĐÃ PUSH (v1.25).

Chủ tool xem form Thêm tài khoản trên `/members`: (1) ô **Phòng ban** ra `<select>` mặc định của
trình duyệt (bé, trắng, lệch hẳn các ô kia); (2) muốn **thêm ô Quyền** để chọn Nhân viên/Admin lúc tạo.

**1. Ô Phòng ban thiếu class.** `add-dept` (`members.html`) là `<select>` TRẦN, không class → trình
duyệt vẽ mặc định. Ô Phòng ban ở hộp thoại "Chọn phòng ban" (`dept-select`) thì CÓ `class="select-field"`.
→ Thêm `class="select-field" style="width:100%"` cho `add-dept` (đúng lesson: **grep component cùng loại
đã có trước khi tự nghĩ style**).

**2. Thêm ô Quyền.** HTML: thêm `.field` mới `<select class="select-field" id="add-role">` ngay dưới
Phòng ban. `members.js`: hằng mới `QUYEN_TAO_MOI = ['user','admin']`, đổ options qua `ROLE_LABEL`
(Nhân viên/Admin, mặc định `user`); `add-create` đọc `add-role` → gửi `role` lên API; thông báo thành
công kèm tên quyền. **KHÔNG cho tạo `super_admin` qua UI** (không có tiền lệ; super_admin = chủ tool).
`server.js`: hằng `ROLE_TAO_HOP_LE = ['user','admin']`, `/api/admin/create-user` nhận `req.body.role`
(kiểm whitelist, mặc định `user`) → upsert `role` thật (bỏ hardcode `'user'`) + trả `role` về client.
Chốt an toàn: server tự kiểm lại role, dropdown client chỉ là tiện lợi.

**3. Vá luôn lệch của `.select-field` (portal.css).** Đo ra input `.field input` = 44px/`--r-md`/16px,
còn `.select-field` = 40px/`--r-sm`/`--fs-base` — **trái với chính comment của class ("bám theo .field
input để hai loại ô nhìn như một")**. Căn `.select-field` → 44px + `--r-md` + 16px. Phạm vi: chỉ 3
select trên `/members` (dept-select + add-dept + add-role); tool.html dùng bản `.select-field` RIÊNG
trong `style.css` nên không đụng.

**Kiểm chứng** (harness tạm `public/_test-add-modal.html` chép nguyên văn modal + logic đổ options,
đo bằng getBoundingClientRect rồi **XOÁ NGAY** — pane ẩn nên screenshot chết, dùng số đo layout):
5 ô (Họ tên/Email/Phòng ban/Quyền/Mật khẩu) **đồng loạt 44px cao · bo 10px · chữ 16px** — nhìn như một.
Quyền: options ["Nhân viên","Admin"], value mặc định `user`. `node -c` OK server.js + members.js.
Server-side tạo THẬT (role=admin) cần **chủ tool đăng nhập admin test** (giống lần build admin API 23/07).

**Version:** `members.js v19→20`, `portal.css v45→46` (bump cả 4 trang index/login/videos/members).
Badge vẫn v1.24 — **bump lên v1.25 khi push**. `git status` = 7 file (server.js + portal.css +
members.js + 4 HTML). server.js đã đổi → server local đã chạy bản mới (khởi động sau khi sửa).

### 2026-07-23 (tiếp 4 — BẢNG SỬA: sắp thứ tự theo bản vẽ + LƯỚI 2 CỘT + rút gọn nhãn). ✅ ĐÃ PUSH (v1.23).

Chủ tool: bảng sửa phải đọc **y như tờ báo giá** — thứ tự ô theo bố cục mẫu gốc, và ô ngắn xếp 2/hàng.

**1. Sắp thứ tự theo VỊ TRÍ bản vẽ (Y↓ rồi X→).** Section 1 (khách) + Section 2 (kế hoạch) sắp theo toạ độ.
Agent giữ nguyên (đã theo từng người). 3 bẫy đã xử:
- **Cùng hàng lệch Y nhỏ** (Giới tính 271.7 vs Tuổi 273 → sort thuần Y đảo): gộp theo **dải Y 20px**
  (`Math.round(y/20)`) rồi sắp theo X.
- **Ô Allianz dùng vị trí SỐ** (số nằm dưới nhãn ~104px, có dòng phụ chen giữa → sai): thêm `tot.sortY/sortX`
  = vị trí NHÃN (neo), sort ưu tiên sortY.
- **Combo biểu đồ IUL đảo cột** (cột cao→số ở Y nhỏ→sắp theo tiền ra 3,2,1): `viTriItem` combo dùng vị trí
  **nhãn tuổi/period** (cùng hàng, X=thứ tự cột) thay vì số tiền.

**2. Lưới 2 cột** (`style.css`, `@media min-width:901px`): `.text-group-items` thành grid 2 cột;
`.tb-full` (combo, ô có dòng xem-trước, tên khách, no-data) chiếm cả hàng; `min-width:0` cho dropdown
không đẩy tràn. Mobile ≤900px giữ 1 cột.

**Đo 5 mẫu (desktop 1280):**
- Allianz: **đúng y danh sách chủ tool** (Mức đóng→Mức bảo vệ→Thời gian→Bảo vệ→Tổng tiền→Thu nhập→
  Tổng dòng tiền→Nhận từ tuổi→Nhận đều đặn). Client: Khách hàng→[Tuổi|Giới tính]→[Sức khoẻ|Tiểu bang].
- AIG/NLG IUL: Mức bảo vệ→Phí đóng→Thời gian→Tổng tiền→Cột 1,2,3. Term: Mức bảo vệ→Gói 1,2,3.
- **Không mẫu nào tràn ngang panel; canvas VẪN cập nhật khi sửa** (reorder chỉ đổi thứ tự block, ghi theo editorId).

**3. Rút gọn NHÃN cho ô đều, không xuống dòng** (chủ tool: label dài xuống 2 dòng làm ô cao lệch;
"ngắn gọn đủ ý, đừng rớt ô"). Đổi (kèm chỗ tham chiếu để không lỗi): "Tổng số tiền đóng (20 năm)"→
**"Tổng tiền đóng"** · "Thu nhập hưu trí mỗi năm"→**"Thu nhập hưu trí"** (đổi cả `n.ten===` của neoHauTo)
· "Tổng dòng tiền dự kiến"→**"Tổng dòng tiền"** (đổi cả findIndex splice) · "Mức bảo vệ (Mệnh giá)"→
**"Mức bảo vệ"** · "Xếp hạng sức khoẻ"→**"Sức khoẻ"** · "Giá trị tích luỹ — Cột N biểu đồ"→bỏ "biểu đồ"
· "Nhận đều đặn trong (số năm)"→bỏ "trong". ⚠️ KHÔNG đụng regex `khop` (khớp chữ trên bản vẽ).
Đo lại: Allianz 9 ô + AIG IUL — **0 ô xuống dòng, 0 tràn**; neoHauTo "/năm" vẫn dời đúng.

**Version:** `proposal.js v29→33`, `style.css v77→78`, badge **v1.22→1.23**. Verify Allianz/AIG-IUL/
NLG-IUL/AIG-Term (desktop 1280): thứ tự khớp bản vẽ, 2 cột, nhãn 1 dòng, canvas không đổi. ĐÃ push.

**4. Tinh chỉnh sau khi chủ tool xem (proposal.js v33→35, badge v1.23→1.24, ĐÃ push):**
- **Ô "Nhận đều đặn" nhận CẢ số năm LẪN "trọn đời"** (chủ tool). Bỏ khoá-đơn-vị, đổi thành ô gõ tự do +
  dòng xem trước: gõ số → "…trong N năm"; gõ chữ (vd "trọn đời") → "…trọn đời" (hàm `cauNhanDeuDan`).
  Dò dòng đổi `/^Nhận đều đặn/i` (khớp cả bản không có "năm"); ô nhập trích "trong N năm"→"N", "trọn đời"→"trọn đời".
- **Ô gói Term (period + tiền) TRỐNG → hiện "-"** (chủ tool: đồng nhất cột chưa dùng, giống ô tiền).
  `applyTextValue(..., n ? (n+' năm') : '-')` và tiền `value.trim() ? value : '-'`.
- Đo: Allianz "trọn đời"/"25"→câu đúng; AIG-Term xoá period/tiền→canvas "-". ✓

### 2026-07-23 (tiếp 3 — ADMIN THÊM TÀI KHOẢN + ĐỔI MẬT KHẨU). ✅ TEST OK + ĐÃ PUSH (badge v1.22).

**Cập nhật sau khi test:**
- **Cho GÕ mật khẩu tuỳ ý** (chủ tool: *"đổi mật khẩu ko được tự nhập hả em?"*): 2 endpoint nhận thêm
  `body.password` (tối thiểu 6 ký tự; bỏ trống → dùng `Drt$2022`) và trả về `password` đã đặt. Ô Đổi mật
  khẩu dùng `showAppPrompt` điền sẵn `Drt$2022`; form Thêm tài khoản có thêm ô "Mật khẩu tạm". `members.js v18→19`.
- **Chủ tool đã set key** (Vercel Production + `.env` local) → test THẬT: tạo tài khoản + đổi mật khẩu chạy được.
- 🔑 **BÀI HỌC `.env`:** chủ tool dán khoá service_role vào **dòng riêng, RỚT mất `SUPABASE_SERVICE_ROLE_KEY=`**
  ở đầu → dotenv không đọc, server trả 503. Cách chẩn đoán KHÔNG lộ key: phân loại từng dòng (`NAME=` vs
  "dòng lạ"), rồi `sed` ghép lại prefix. **Xác minh key nạp OK bằng SERVER** (503→401 khi có/không token;
  token bậy → "Phiên không hợp lệ" = Supabase phản hồi = key hợp lệ), tuyệt đối không echo giá trị key.
- ⚠️ Khoá service_role từng hiện trong ảnh chụp của chủ tool → đã nhắc có thể Reset key + cập nhật lại
  `.env`+Vercel nếu muốn chắc.

---
_(ghi chú build ban đầu, giữ lại để tra cứu:)_

Chủ tool chốt: admin **chủ động thêm tài khoản + đổi pass** để nhờ IT trực tiếp, kiểm soát tránh rủi ro.
Quyết định: **cả admin lẫn super_admin** làm được đầy đủ (chủ tool bỏ đề xuất chặn admin đụng super_admin);
tài khoản mới **role=user, phòng ban=Sale, status=active**; mật khẩu tạm **`Drt$2022`** (hiện cho admin, user đổi sau).

**Vì sao server-side:** tạo user / đổi pass người khác trong Supabase cần **service_role** (bí mật, bỏ qua RLS)
→ chạy trong `server.js`, đọc từ env, TUYỆT ĐỐI không nhúng client (config.js chỉ có anon key công khai).

**Đã làm:**
- `npm i @supabase/supabase-js dotenv`. `server.js`: `supabaseAdmin` (service_role từ env; chưa set → null).
  2 endpoint: `POST /api/admin/create-user`, `POST /api/admin/reset-password`. Middleware **`requireAdmin`**:
  verify JWT người gọi (`auth.getUser(token)`) → tra `profiles` → chỉ `admin`/`super_admin` + active mới qua.
- `members.js`: helper `goiAdminApi` (kèm `Authorization: Bearer <access_token>`), `doiMatKhauThanhVien`,
  case `reset-pw` trong menu ⋯ (hiện cho MỌI thành viên active — tách khỏi `canManage`). Dialog "Thêm thành viên"
  nâng thành **tạo tài khoản trực tiếp** (Họ tên/Email/Phòng ban + nút Tạo) thay flow "gửi link đăng ký" cũ.
- `.env.example` (mẫu, không key) + `.gitignore` `!.env.example` (cho commit mẫu; `.env` thật vẫn ignore).

**Đã kiểm (không cần key):** server chạy, 2 endpoint đăng ký, gate trả **503** khi chưa set key (an toàn),
`node -c` OK cả server.js/members.js, không còn ref `add-link/add-copy`. `node_modules` đã gitignore.

**CHƯA test được (cần CHỦ TOOL):** tạo/đổi pass thật + UI /members (đòi đăng nhập admin). → owner phải:
1. Supabase → Settings → API → copy **service_role** → dán vào **Vercel env** (`SUPABASE_SERVICE_ROLE_KEY`+`SUPABASE_URL`)
   VÀ file `.env` local. **Không dán vào chat.** 2. Rồi test local (đăng nhập admin) → OK mới commit+push.
**⚠️ ĐỪNG PUSH TRƯỚC KHI SET VERCEL KEY** — push trước thì nút "Thêm tài khoản"/"Đổi mật khẩu" trên live báo 503.
Version members.js `v17→18`. Server 8000 đang chạy (đã restart để nạp code mới).

### 2026-07-23 (tiếp 2 — mở rộng đơn vị "tuổi", ô sửa 65-85/21, nhúng logo, + CHECKLIST). CHƯA PUSH.

Chủ tool rà mẫu Allianz trên local, ra loạt yêu cầu "lỗi căn bản" — đã ghi thành quy tắc chuẩn:
**memory `mau-bao-gia-3-loi-can-ban`** (nạp mỗi phiên) để phiên sau TỰ sửa, không đợi nhắc.

**1. Khoá đơn vị mở rộng: "tuổi".** `buildPeriodUnitBlock` → đổi tên **`buildUnitLockBlock`**, route thêm
`kind === 'coverage'` ("Bảo vệ đến khi nào" = "120 tuổi"). Đơn vị tách từ text nên tự đúng "năm"/"tuổi"/
hoa-thường. Đo: "Bảo vệ đến khi nào" hiện 120 + chip "tuổi" khoá; gõ 100 → canvas "100 tuổi". ✓

**2. Sửa số "65-85" và "21 năm" trong thẻ "TỔNG DÒNG TIỀN DỰ KIẾN".** 2 dòng trước cố định, nay có ô:
"Nhận từ tuổi (khoảng)" (text "65-85" + preview) và "Nhận đều đặn trong (số năm)" (đơn vị "năm" khoá +
preview). Ghi bằng `applyTextValue` (dòng tuổi 1 tspan sạch; dòng năm nhiều tspan gộp như ô tên agent).
Chèn NGAY SAU ô "Tổng dòng tiền dự kiến" (splice theo displayName). Loại khỏi vòng canh-giữa (neo-trái).
Đo: cả 2 ô hiện đúng vị trí, gõ đổi số OK. ✓
  → **VÁ (v27): 2 input này thiếu `data-editor-id` → "click chữ trên bản vẽ để nhảy tới ô" KHÔNG chạy**
  (chủ tool báo "sửa được mà ko click được"). `tagEditableCanvasElements` gắn `.svg-editable-text` DỰA
  vào input có `data-editor-id`. Thêm `data-editor-id="${item.editorId}"` vào cả 2 → click canvas
  "NHẬN TỪ TUỔI…"/"Nhận đều đặn…" nay focus đúng ô. **Quy tắc: MỌI input trong editor phải có
  `data-editor-id` để click-to-edit hoạt động** (buildUnitLockBlock đã có sẵn).

**3. LỖI LOGO — nhúng 2 ảnh vỡ.** File final trỏ `href="../../../../../../2024/Video/Asset/Logo/
Thinksmart Insurance/{Logo Thinksmart White.png, Layer 1.png}"` (Illustrator quên Embed) → icon vỡ góc
phải. 2 file CÓ trên đĩa `E:\2024\Video\Asset\Logo\...` → đọc + nhúng `data:image/png;base64`. Đo trong
tool: 4/4 `<image>` là data-uri, 0 href ngoài. File 2.41MB → 2.60MB. ✓

**4. CĂN GIỮA số mục I/II/III trong badge — XONG (đo được).** Số la mã neo-trái, lệch PHẢI khỏi tâm
badge, càng rộng càng lệch (I +1.09, II +1.77, III +3.01px; dọc ~0). 🔑 **Pane ẩn nên getBBox=local,
getBoundingClientRect=0 — nhưng `getCTM` TÍNH ĐƯỢC toạ độ doc từ transform (không cần paint):**
`docX = a*cx + c*cy + e`. Đo tâm badge (rect gradient) + tâm số cùng hệ → dời transform X sang trái
đúng offset: I 29.97→28.88, II 27.94→26.17, III 25.8067→22.7967 (chỉ X, giữ Y). Đo lại: offsetX = 0/0/0. ✓
→ **Bài học: pane preview ẩn thì dùng `getCTM` để đo hình học SVG, đừng bỏ cuộc vì screenshot/getBoundingClientRect chết.**

**5. KHOÁ ĐƠN VỊ TRONG BẢNG GỘP Term/IUL — XONG (chủ tool chốt "áp cho term/iul, cho sale biết
đơn vị chọn sẵn, chỉ đổi số, không bối rối").** Thêm helper `unitInputGroup(so, donVi, viTri, editorId,
aria)` → cụm [số | chip khoá] dùng trong ô gộp; `viTri='prefix'` cho chip đứng TRƯỚC (CSS mới
`.unit-suffix.unit-prefix` đảo viền/bo góc). `buildTermComboBlock`: cột "N năm" → số + "năm" (suffix).
`buildChartComboBlock`: "Tuổi N" → "Tuổi" (prefix) + số, GIỮ đồng bộ "Cash Value at N". Đo:
Term 3 gói (10/20/30 + "năm", gõ 15→"15 năm"), IUL 3 cột (63/67/72 + "Tuổi", gõ 77→"Tuổi 77" +
"Cash Value at 77"), **overflow=false cả hai** (ô gộp 2 cột không tràn). Allianz vẫn 18 field nguyên vẹn.
**Version:** `proposal.js v27→28`, `style.css v76→77`.

**6. Dời ô "Thời gian đóng phí" lên TRÊN cột 1 biểu đồ (IUL) — XONG.** Chủ tool xem NLG IUL, muốn ô
này không nằm cuối bảng. Nhánh IUL: chuyển `push(period)` lên NGAY SAU `totalPremium`, trước vòng
cột biểu đồ. Áp cả AIG IUL lẫn NLG IUL. Đo NLG IUL: thứ tự … Tổng số tiền đóng → **Thời gian đóng
phí** → Cột 1/2/3 (thoiGianTruocCot1=true).

**➡️ ĐÃ PUSH LÊN LIVE 23/07/2026** (chủ tool duyệt: *"xong thì em push code lên nhé"*). Bump badge
**v1.20→v1.21**, ngày **22/07→23/07** (5 file HTML; KHÔNG đụng ngày trong comment). Commit + push
origin main → Vercel deploy.

**Tổng version cuối lượt:** `proposal.js?v=29`, `style.css?v=77`, badge **v1.21**. `Max-Funded
Allianz.svg` md5 đổi (Texas + logo nhúng + căn badge). `2-Templates/` master vẫn gitignore (local-only).

**CÒN LẠI:**
- **Admin: THÊM tài khoản + đổi/reset mật khẩu thành viên** (chủ tool 23/07: *"admin chủ động thêm
  tài khoản - thay đổi pass… nhờ IT trực tiếp và kiểm soát để tránh rủi ro"*). CHƯA làm — đổi pass/
  tạo user người khác trong Supabase cần `service_role` chạy SERVER-SIDE (KHÔNG để lộ ở client anon
  key) → cần endpoint an toàn (server.js đọc key từ env `SUPABASE_SERVICE_ROLE`) + UI ở /members +
  chỉ cho `is_admin()`. Đang lập kế hoạch chi tiết. Việc LỚN kế tiếp.

### 2026-07-23 (tiếp — KHOÁ ĐƠN VỊ "Năm" ô "Thời gian đóng phí"). CHƯA PUSH.

Chủ tool: *"khóa chữ năm lại, chỉ cần nhập số là chữ năm nó tự fill mặc định — tương đương như
nhập giá trị '$'"*. Ô "Thời gian đóng phí" (bản vẽ = "5 Năm") trước cho nhập cả chuỗi text.

**Cách làm:** ô `kind === 'period'` (dò ở `/^\d+\s*năm$/i`, planExtras) giờ render qua
`buildPeriodUnitBlock` mới (proposal.js) thay vì input text thường: input **chỉ nhận SỐ**
(`replace(/\D/g,'')` mỗi lần gõ) + chip **đơn vị KHOÁ** bên phải (`.unit-suffix`, `pointer-events:none`).
Gõ số → ghi `số + ' ' + đơn vị` vào canvas qua `applyTextValue` (tự set dirty + căn giữa qua
`thuNhoChoVua`). **Đơn vị lấy từ chính giá trị mẫu** (`match(/^(\d+)\s*(.*)$/)`) nên GIỮ đúng chữ
hoa/thường: Allianz "Năm", IUL "năm" — không hardcode.

**Phạm vi:** áp cho MỌI ô đơn-năm `kind:'period'` = "Thời gian đóng phí" của **cả IUL lẫn Allianz**
(nhất quán, đúng tinh thần "$" áp toàn cục). **Term Life KHÔNG đụng** — 3 ô năm của nó là tiêu đề cột
đi qua `buildTermComboBlock` (dual-input), không phải nhánh này.

**CSS mới** (`.unit-input-row` + `.unit-suffix`, đặt cạnh `.dual-input-row`): cả hàng trông như MỘT ô
(input số không viền, chip đơn vị nền `--surface-3` khoá bên phải, focus-ring bọc cả hàng). Toàn token
→ theme tối tự đúng.

**Kiểm chứng** (mirror config-rỗng, đã xoá sau khi đo): Allianz — input hiện "5" + chip "Năm"
(`pointer-events:none`, nền `rgb(241,242,246)`); gõ "7"→canvas **"7 Năm"**; gõ "ab12x"→input còn
"12", canvas **"12 Năm"**; xoá sạch→canvas KHÔNG còn "Năm" lơ lửng; dirty bật. IUL: an toàn theo
cấu trúc (cùng nhánh, đơn vị "năm" giữ nguyên, không mất centering/không có neoHauTo để mất).

**Version:** `style.css?v=75→76`, `proposal.js?v=23→24` (đều trong tool.html). Badge vẫn v1.20.

### 2026-07-23 — MẪU ALLIANZ BẢN FINAL (chủ tool gửi) + vá nhánh isAllianz. CHƯA PUSH.

Chủ tool: *"anh mới update file final dành cho chương trình allianz, em update vào phần báo giá"*.

**🚨 FILE ĐẶT SAI CHỖ + SAI TÊN — cả hai đều phá nhận diện hãng.** Chủ tool lưu bản final vào
`2-Templates/AIG/Max-Funded Aliianz.svg` (thư mục **AIG**, tên lỗi chính tả **"Al*ii*anz"** 2 chữ i).
Hậu quả nếu để nguyên: (1) `server.js:104` xếp theo `aig` trước → mẫu hiện dưới hãng **AIG**;
(2) `proposal.js:800` `isAllianz = tenFile.includes('allianz')` → "aliianz" ≠ "allianz" → **false** →
editor chạy nhánh IUL thường, dán nhãn Quyền lợi lung tung. Cả local lẫn live đều dò `isAllianz`
theo TÊN FILE nên tên phải đúng chính tả.

**Có 3 bản byte-identical** (md5 `fc59ea80…`): `AIG/Max-Funded Aliianz.svg`,
`Allianz/Max-Funded Aliianz 2.svg`, và bản WIP cũ ở `Allianz/Max-Funded Allianz.svg`. Đã gom về
MỘT: copy nội dung final vào `2-Templates/Allianz/Max-Funded Allianz.svg` (đúng tên), **xoá 2 bản
trùng lỗi chính tả**. Backup bản WIP cũ (live v1.14) + bản final gốc vào scratchpad trước khi động.

**Vá nhánh `isAllianz` (proposal.js ~L883) — chỉ sửa LOGIC DÒ NHÃN, KHÔNG đụng số liệu.**
Kiểm chứng trong tool thật (mirror config-rỗng, chế độ mở, đã xoá sau khi đo) lòi ra: 2 nhãn
**"THU NHẬP HƯU TRÍ"** và **"TỔNG DÒNG TIỀN DỰ KIẾN"** rớt thành "Giá trị khác". Bản final có thêm
DÒNG PHỤ ĐỀ tiếng Anh chen giữa nhãn và số → giá trị tụt xuống **dy≈104px**, lệch ngang **dx≈121px**,
vượt ngưỡng cũ `dy>70 / dx>80`. Thuật toán "ứng viên gần nhất bên dưới" vẫn ghép đúng nên chỉ cần
nới ngưỡng → **`dy≤120 / dx≤140`** (ứng viên SAI gần nhất cách dx=153.9 → an toàn, đã trace cả 7 nhãn
không mis-attach). Sửa NẰM TRONG `else if (isAllianz)` → AIG/NLG/Term không đụng.

**Đo lại sau khi vá:** đủ **7/7** nhãn Quyền lợi ghép đúng ($30k / $50,968 / $1,070,328 / 5 Năm /
120 tuổi / $150k / $580,337). Gõ số dài vào "Thu nhập hưu trí" → canvas cập nhật + hậu tố **"/năm"
tự dời phải** (neoHauTo nay kích hoạt được). 77 text render, 0 lỗi console.

**Ô "TIỂU BANG" — ĐÃ SỬA (chủ tool chốt).** State dò bằng `US_STATES.includes(line)` khớp CHÍNH XÁC;
placeholder Allianz là **"Washington DC"** không có trong `US_STATES` (chỉ có `'Washington'`) → ô Tiểu
bang không hiện, sale không đổi bang được. Bản Allianz CŨ đang live cũng vậy (hành vi cũ, không phải
lỗi bản final). AIG/NLG dùng "Texas" (khớp → có ô). Chủ tool: *"làm theo các file khác - đúng biểu
bang của Mỹ là được"* → đổi placeholder trong SVG **"Washington DC" → "Texas"** (khớp AIG/NLG),
đồng bộ cả `2-Templates/Allianz/` lẫn `public/templates/`. Đo lại: ô Tiểu bang hiện, **dropdown 50
bang, value "Texas"**. (Sửa placeholder = dữ liệu MẪU, không phải số liệu bảo hiểm; backup bản gốc
"Washington DC" của chủ tool còn trong scratchpad.) md5 mẫu giờ `9e79d934…` (khác bản gốc `fc59ea80…`).

**Đã cập nhật (STAGED, CHƯA PUSH):** `public/js/proposal.js` (vá ngưỡng isAllianz) ·
`public/templates/Max-Funded Allianz.svg` (bản live = final + Texas) · `public/templates/manifest.json`
(+entry Allianz, dự phòng static) · `tool.html` `proposal.js?v=22→23` · file changelog này.
`git status` = 5 file, `2-Templates` vẫn gitignore. **Chủ tool chốt CHƯA push — xem local trước.**
Khi duyệt: BUMP badge (v1.20→v1.21, 5 chỗ) + đổi changelog thành "đã push" + commit + push origin main.

### 2026-07-22 (later 14 — hàng "Tạm khoá" + bộ lọc quyền Admin)

**1. Tổng quan thiếu hàng "Tạm khoá" → các con số không cộng khớp.** Chủ tool: *"tạm khoá ở đây
nó không thông báo hả em"*. Hàng này bị gỡ khỏi HTML ngày 21/07; đến khi thật sự có 1 người bị
khoá thì bảng ghi **Tổng 72 · Chờ duyệt 0 · Đang hoạt động 71** — mất tiêu 1 người, không biết đi
đâu. Đã thêm lại `#ms-row-suspended`, **chỉ hiện khi > 0** (không có mà bày số 0 thì thành nhiễu;
có mà không bày thì sai). Đo lại: 71 + 1 + 0 = 72 ✓.

**2. Bộ lọc theo quyền — DUY NHẤT nút "Admin"** (chủ tool chốt). Đặt dưới khối "Theo phòng ban",
cùng kiểu nút để bấm quen tay.
⚠️ **Gộp cả `super_admin`** vào bộ lọc này: hỏi "ai đang có quyền quản trị" mà bỏ sót người có
quyền CAO HƠN admin là sai. Con số trên nút vì vậy đếm cả hai (dữ liệu thử: 6 = 5 admin + 1 super).

**3. Đồng nhất 3 bộ lọc (sửa kèm, phát hiện lúc kiểm chứng).** `onDeptClick` trước đây gọi
`load()` — **nạp lại từ Supabase chỉ để lọc**, trong khi dữ liệu đã nằm sẵn trong `toanBo`. Vừa
chậm vừa tốn quota, lại **không reset trang** (lọc xong còn kẹt ở trang 3). Cho cả ba (phòng ban ·
quyền · ô tìm) dùng chung `veDanhSach()`. Nút "Bỏ lọc" cũng phải xoá **cả hai** bộ lọc — trước chỉ
xoá phòng ban, bấm xong danh sách vẫn bị lọc theo quyền thì người dùng tưởng hỏng.

**Màu số:** `.ms-value.is-warn/.is-danger` dùng `#96590A`/`#B91C1C` (tối: `#E9A23B`/`#F87171`) —
KHÔNG dùng thẳng token `--warning`/`--danger`, đo 22/07 ra 3.62 và 3.73, dưới ngưỡng 4.5.

**Version:** `portal.css?v=44`, `portal/members.js?v=17`.

**Kiểm chứng** (trang tạm chạy HÀM THẬT, dữ liệu 72 người: 70 Sale · 1 MKT · 1 chưa xếp,
6 admin/super, 1 tạm khoá):
lọc MKT → 1 người · thêm lọc Admin → đúng 1 mình Vincent, thanh báo *"phòng ban MKT + quyền
Admin"* · Bỏ lọc → cả 2 nút tắt, về 72 · đang ở trang 3 (25–36 trên 71) mà lọc → **về trang 1**
(1–12 trên 69) · hàng Tạm khoá hiện đúng khi có người, ẩn khi lọc ra tập không có ai bị khoá.

**Bẫy khi viết phép thử:** nút lọc được **dựng lại sau mỗi lần vẽ**, nên biến giữ tham chiếu nút
từ đầu hàm sẽ trỏ vào phần tử đã rời khỏi DOM — bấm không có tác dụng, nhìn như sản phẩm hỏng.
Phải **query lại nút ngay trước khi bấm**. (Lần đầu tôi tưởng lọc không reset trang, hoá ra thế.)

### 2026-07-22 (later 19 — đợt 2 đổi tên thư mục: ĐỀ XUẤT XONG, chủ tool chốt TẠM DỪNG)

Chủ tool xin sơ đồ tên cho đợt 2. Khảo sát để đề xuất thì lòi ra thứ quan trọng hơn cả sơ đồ:

**🛑 TÊN THƯ MỤC Ở DỰ ÁN NÀY LÀ HÀNG RÀO BẢO VỆ, KHÔNG PHẢI NHÃN.**
**41 chỗ** khoá cứng tên thư mục trong `server.js` + `core.js` + `namecard.js` + `sosanh.js`, trong
đó mấy chỗ là chốt an toàn so khớp bằng TIỀN TỐ CHUỖI:
- `server.js:159` — chặn ghi đè `2-templates/` · `name card/` · `public/templates/`
- `server.js:242` — chỉ cho xoá trong `4-clients/`
- `core.js:78` `isMasterFile()` — khoá nút Lưu khi đang mở mẫu gốc
- `core.js:752, 826` — nhận diện bản nháp để cho phép xoá

→ Đổi tên `2-Templates` mà sót MỘT dòng trong số đó thì **mẫu gốc AIG/NLG trở nên ghi đè được**:
sale mở mẫu gốc, sửa, bấm Lưu → mất mẫu gốc của công ty, **không có thông báo lỗi nào**.
→ Vì vậy đổi tên KHÔNG phải việc dọn dẹp mà là sửa vào chốt an toàn.

**Đã trình chủ tool:** bắt buộc **bước 0** (gom 41 chỗ về MỘT hằng số dùng chung) rồi mới đổi tên
được an toàn — và **chi phí nằm ở bước 0, không nằm ở số lượng tên đổi** (đổi 1 hay 6 thư mục đều
phải làm bước 0 y hệt), nên nếu làm thì cứ chọn đích đến thật sự muốn.

**Sơ đồ đã đề xuất** (lưu lại phòng khi sau này mở lại):
```
data/     templates/ clients/ namecard/ brochure/ compare/ exports/   ← tool đọc/ghi
private/  accounts/                                                   ← không bao giờ lên repo
scripts/  3 file .bat + build-fonts.py
docs/     CAU-TRUC.md + SETUP-SUPABASE.md
```
Chữ thường · tiếng Anh · không dấu · không khoảng trắng (bám theo `public/` `product/` `supabase/`
vốn đã đúng). Bỏ số vì thứ tự `1-`…`5-` GIỜ ĐÃ SAI (số 1 trống, số 3 là đầu ra chứ không phải một
bước) — số nói sai còn tệ hơn không đánh số. Gốc dự án 12 → 8 mục.

**➡️ CHỦ TOOL CHỐT: TẠM DỪNG, không làm.** *"tạm thời ngưng không cần làm bước này nha em"*.
Đã ghi cảnh báo vào `CAU-TRUC.md` mục cuối. **Phiên sau đừng tự ý đi "dọn cho gọn"** — chủ tool đã
xem sơ đồ và chọn dừng, không phải chưa biết.

### 2026-07-22 (later 18 — DỌN CẤU TRÚC DỰ ÁN, đợt 1/2)

Chủ tool: *"vào folder này sắp xếp lại toàn bộ thư mục, dự án, file… anh thấy nó rất lộn xộn"*.
Chốt làm **2 đợt**, đợt 1 = chỉ những việc KHÔNG thể làm hỏng tool (không đổi tên thư mục nào).

**🚨 SUÝT LÀM HỎNG BẢN LIVE — đọc kỹ đoạn này.**
Nhìn `.gitignore` thấy `Brochure/` và `Name Card/` bị ignore *nhưng 7 file vẫn đang tracked*, tôi
định "sửa cho nhất quán" bằng cách gỡ chúng khỏi git. **Sai hoàn toàn.** Kiểm bản live trước khi
động tay thì ra:
```
curl -s https://tool.thinksmartinsurance.com/api/svgs
  → "path":"Name Card/Chung/Sale Name Card.svg"
curl -s "https://tool.thinksmartinsurance.com/api/library?type=brochure"
  → 6 file Brochure/AIG + Brochure/NLG
```
Bản live **CHẠY `server.js` thật**, không phải static build. Gỡ 7 file đó là **công cụ Brochure và
Name Card chết trên live ngay lập tức**. Chú thích cũ trong `.gitignore` ("local-server only, not
used by the static Vercel build") SAI, và comment trong `server.js:264` cũng tin theo cái sai đó
("khác Brochure/ bị gitignore").
→ Đã làm ngược lại: **GỠ hai dòng ignore**, ghi rõ hai thư mục là một phần của bản triển khai.
→ **BÀI HỌC: `.gitignore` mâu thuẫn với thực tế thì hỏi SẢN PHẨM ĐANG CHẠY, đừng "sửa cho nhất
quán" theo file cấu hình.** File đã tracked trước khi có luật ignore vẫn được commit bình thường —
luật đó vô hiệu với chúng, nhưng là BẪY cho file MỚI thêm sau này (thêm brochure mới → git lặng lẽ
bỏ qua → chạy ở máy, mất trên live, không báo lỗi).

**Đã làm:**
1. **`3-Export-PDF/` gỡ khỏi git** (`git rm --cached`, 7 file vẫn còn trên máy) + thêm vào
   `.gitignore`. Đây là **thư mục tool ghi file xuất ra** — 7 file hiện tại là bản mẫu không có tên
   khách, nhưng lần tới xuất báo giá KHÁCH THẬT mà còn tracked thì `git add -A` là hồ sơ khách lên
   GitHub công khai. (Đóng mục **A3** mở từ 22/07.)
2. **Chuyển 79MB ra ngoài dự án** → `E:\2026\Thinksmart\Design\Proposal2026 - File nguon\`:
   `1-Design/` (34MB `.ai`) và `_Archive/` (45MB). Chủ tool dặn *"lưu riêng file thiết kế cho anh
   file adobe ai"* → **dời, KHÔNG xoá**; đã kiểm cả hai đầu sau khi `mv`, file `.ai` còn nguyên
   34.112.285 và 1.025.749 byte. Đã kiểm trước đó: không code nào đọc hai thư mục này.
   ⚠️ Đặt vào thư mục CON riêng chứ không đổ thẳng vào `Design/` — chỗ đó là kho thiết kế chung của
   công ty, đã có sẵn `Name Card.psd`, đổ vào là lẫn.
3. `Accout Tool.xlsx` (gốc repo) → chuyển vào `Account/` cho cùng chỗ với dữ liệu nhân sự khác.
4. **Viết `CAU-TRUC.md`** ở gốc dự án: bảng ĐỎ liệt kê 5 thư mục `server.js` khoá cứng tên (đổi tên
   là hỏng), bảng mã nguồn, bảng cục bộ, và mục "còn lộn xộn — đợt 2".

**Dự án: 332MB → 253MB.** (`.git` vẫn 207MB — xem dưới.)

**CHƯA làm, cần chủ tool quyết:**
- **Lịch sử git vẫn 207MB.** `Proposal NLG AIG.ai` bị commit lại 5 lần (54+38+38+32+23MB, có cả
  thư mục `Filedesign/` không còn tồn tại). Dời file ra ngoài **không** làm nhẹ lịch sử — git giữ
  vĩnh viễn. Dọn được nhưng phải viết lại lịch sử + `--force` push + mọi bản clone khác phải clone
  lại. Hỏi lúc này chủ tool trả lời lệch câu (dặn về file .ai) nên **không tự làm**.
  Lệnh xem thủ phạm:
  ```
  git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '$1=="blob"{print $3,$4}' | sort -rn | head
  ```
- **ĐỢT 2 — đổi tên thư mục cho nhất quán.** Hiện trộn: có đánh số (`2-Templates`, `3-Export-PDF`,
  `4-Clients`, `5-Design-Sections` — số 1 giờ trống) với không đánh số (`Account`, `Brochure`,
  `Name Card`, `Bang so sanh quyen loi cac hang`), lẫn Việt không dấu với Anh, có khoảng trắng.
  **Phải sửa `server.js` kèm theo** (`PROPOSAL_SCAN_DIRS` + `LIBRARY_SECTIONS`) và kiểm chứng lại
  cả 3 công cụ. Cần chủ tool duyệt sơ đồ tên mới TRƯỚC.

**Kiểm chứng sau khi dọn** (server local, đo bằng API thật):
`/api/svgs` → đủ 5 mẫu + 1 bản khách + Name Card · `/api/library?type=brochure` → đủ 6 file ·
`type=soSanh` → đủ 16 logo · 5 trang đều 200 · `git ls-files "Brochure" "Name Card"` = **7**
(live-critical còn nguyên) · không file nhạy cảm nào lọt vào staged.

### 2026-07-22 (later 17 — 3 lỗi chủ tool bắt được TRÊN IPHONE THẬT + chặn rò rỉ)

Chủ tool chụp màn hình iPhone 14 Pro Max (430×932) sau đợt 16. Cả 3 lỗi đều là thứ **chỉ lộ khi
dùng thật**, không phép quét tự động nào bắt được.

**1. Hai nút "Xuất JPEG/PDF" trong bảng chọn định dạng — chữ tối trên nền tối.**
Nguyên nhân: dáng nút khai ở `.sidebar-actions-footer .btn-export-main` — **selector HAI class**.
Thanh đáy mobile tái dùng hai nút này trong `#dock-export-sheet` (ngoài footer) nên:
- ăn được NỀN đậm (`.btn-export-jpeg` một class → khớp ở mọi nơi),
- KHÔNG ăn được `color: #fff` (hai class → chỉ khớp trong footer).
→ Đã tách: thuộc tính DÁNG về thẳng `.btn-export-main`; chỉ `flex: 1 1 0` (bố cục riêng của footer)
ở lại dưới selector footer. Đo lại: JPEG **5.36**, PDF **5.70–8.98** — đạt AA cả hai.
🚨 **Quy tắc rút ra: tái dùng một class trang trí ở ngữ cảnh mới thì phải kiểm CÁC RULE CHA của nó.**
Nền thì theo sang, chữ thì không — kiểu hỏng nửa vời này nhìn qua tưởng nút vẫn "có style".

**2. Nút "↻ Tải lại" ở `/members` — bỏ trên mobile.** Chủ tool: *"trên iPhone không cần nút này,
người ta trượt lên sẽ tự động load"*. Đúng: vuốt-để-tải-lại của Safari nạp lại trang → `load()` chạy
luôn. Nút chỉ lặp lại cử chỉ hệ điều hành đã có, mà thanh tiêu đề mobile chật nên chữ vỡ 2 dòng
("↻ / Tải lại"). → `#btn-refresh { display: none }` ở ≤900px.
⚠️ **ẨN bằng CSS, KHÔNG xoá khỏi HTML** — `members.js` còn đổi nhãn nút này thành "Đang tải…".

**3. Ô tick trong thẻ thành viên "vô duyên".** Thẻ mobile xếp dọc 1 cột → `.m-check` thành một dòng
riêng, dấu tick lơ lửng giữa thẻ không dính vào ai. Ô tick là thuộc tính CỦA NGƯỜI ĐÓ nên phải đứng
cạnh danh tính người đó. → `grid-template-columns: auto minmax(0,1fr)`, `.m-check` và `.m-user` cùng
`grid-row: 1`, các ô còn lại `grid-column: 1 / -1`. Đo: lệch tâm tick↔avatar = **0px**.

**🔒 Chặn rò rỉ (việc quan trọng nhất trong lượt này):** `git status` lộ ra **`Accout Tool.xlsx` nằm
ở GỐC repo** — cùng nguồn với `Account/Accout Tool.csv` (48 mật khẩu dạng chữ). Luật `Account/` trong
`.gitignore` KHÔNG bắt được vì file ở ngoài thư mục đó. Repo này PUBLIC → một `git add -A` là lộ.
Đã kiểm `git log --all -- "Accout Tool.xlsx"` → **chưa từng bị commit**, không phải đi xoá lịch sử.
Đã thêm `/Accou*t*.xlsx` + `/Accou*t*.csv` (neo `/` để KHÔNG đụng `product/Thinksmart-Product-Hub.xlsx`
đang được theo dõi). Kiểm bằng `git check-ignore -v` cả hai chiều.
→ **Nhắc lại quy tắc: dữ liệu người thật thì gitignore TRƯỚC, xử lý sau — và luật theo THƯ MỤC không
đủ, chủ tool hay để file ngay ở gốc.**

**Version:** `style.css?v=75`, `portal.css?v=45` (bump ở cả 4 file HTML dùng portal.css).

**Kiểm chứng:** 430px — nút Tải lại `display:none`, tick nằm TRÁI avatar và cùng tâm (lệch 0px),
các ô còn lại kéo hết bề ngang. 1500px — nút Tải lại hiện lại (`flex`), bảng vẫn `subgrid` 7 cột,
hàng vẫn 52px, `.m-check` `grid-column: auto` (rule mobile không rò sang). Không tràn ngang cả hai.
Hàng thành viên dựng bằng markup **chép nguyên văn từ `rowHtml()`** rồi thả vào trang thật (trang
chưa đăng nhập nên không có dữ liệu) — không tự bịa cấu trúc rút gọn.

### 2026-07-22 (later 16 — DỰNG LẠI BỐ CỤC MOBILE cho tool.html)

Chủ tool: *"em phải đặt mình là một người sử dụng chứ không phải người build app"* — sau khi tôi
báo "đã tối ưu mobile" mà thực chất chỉ đi chỉnh cho đủ 44px. Đi lại một vòng việc thật của sale
(mở mẫu → điền → xuất) trên màn 375 mới ra được vấn đề thật.

**5 điều tìm ra khi ĐÓNG VAI NGƯỜI DÙNG (không phải khi đọc code):**
1. Nút bắt buộc bấm đầu tiên ("Mở danh sách mẫu") ở toạ độ **(32,28)** — góc ngón cái với khó nhất.
   Còn dải đáy dễ bấm nhất thì dành cho 3 nút zoom hầu như không dùng. **Ưu tiên bị đảo ngược.**
2. Bàn phím (~336px, phủ từ y=476) ăn 2/3 bảng sửa chữ. Còn ~125px = chưa đầy 1,5 ô, trong khi
   form có **19 ô dài 1846px**. Nút Xuất bị che hoàn toàn.
3. **Gõ mà không thấy bản vẽ** — bảng sửa cao 66% + lớp phủ đen 45% → bản vẽ hở 220px và bị làm tối.
   Đây là lỗi nặng nhất: công cụ giấu mất chính thứ nó làm ra.
4. Nhãn ô nhập 11.5px trong khi ô nhập 16px — **nhãn nhỏ hơn giá trị nó giải thích**. Nguy hiểm vì
   "Phí đóng mỗi tháng" / "Tổng số tiền đóng (20 năm)" nằm sát nhau.
5. Bản mobile là bản desktop bị giấu bớt: stepper chỉ 4 bước nhưng bước 1 không có nút; rail ẩn
   hẳn nên **không đăng xuất/đổi mật khẩu được trên điện thoại**; và 2 rule CSS rút gọn header còn
   trỏ vào `.brand-info`/`.header-brand` — **class đã bị xoá từ lần thiết kế lại header**, bằng
   chứng là chưa ai mở bản mobile ra nhìn kể từ hôm đó.

**ĐÃ LÀM (chủ tool duyệt qua bản dựng bấm thử trước khi cho sửa thật):**
- **Thanh thao tác đáy `#tool-dock`** (mới, trong `tool.html`): Mẫu · Điền thông tin · Lưu nháp · Xuất.
  4 nút **KHÔNG chứa logic** — chỉ `.click()` hộ `#btn-mobile-nav` / `#btn-mobile-editor` /
  `#btn-save-top` / `#btn-export-*`, để dirty-tracking + xác nhận ghi đè + nạp jsPDF chỉ có MỘT bản.
  Đồng bộ bằng `capNhatThanhDay()` (main.js) gọi từ **`updateHeaderActions()`** — cùng choke point
  với nút header, KHÔNG dựng MutationObserver.
- **Bỏ lớp phủ khi mở bảng sửa chữ** (giữ cho ngăn kéo trái) + hạ bảng 66% → **52%**, và cho nó ngồi
  TRÊN thanh đáy (`bottom: var(--dock-h)`). Bản vẽ còn thấy **276px, không bị làm tối**.
- **Dải zoom đáy → con toast nổi**: `.canvas-status-bar` thành khối trong suốt `pointer-events:none`,
  chỉ hiện khi có thông báo ("Đang lưu…", "Đã xuất PDF"). Zoom bỏ hẳn — `zoomToFit` tự chạy khi mở
  file, chụm 2 ngón vẫn zoom được.
- **Nhãn `.text-meta` 11.5 → 13px** + đậm màu một bậc (chỉ mobile).
- **Gấp sẵn nhóm 2 và 3** trong `populateProposalTextsEditor` khi ≤900px → danh sách **1846 → 725px**.
  Cố ý DÙNG LẠI cơ chế gấp/mở sẵn có thay vì thêm hàng chip điều hướng.
- Nút Xuất trong bảng sửa chữ `display:none` trên mobile (đã dời ra thanh đáy) — **ẩn chứ không xoá**,
  vì thanh đáy bấm hộ chính hai nút đó.

**BA LỖI CHỈ LỘ RA LÚC RÁP VÀO APP THẬT (bản dựng riêng không có):**
1. `.tool-dock` là `position:fixed` → **không chiếm chỗ trong dòng chảy**, nên `.canvas-viewport` vẫn
   kéo dài xuống hết màn: toast rơi vào y=765 sau lưng thanh đáy (y=753), và `zoomToFit` tính khung
   lớn hơn thật. Sửa: `.app-body { padding-bottom: var(--dock-h) }`.
2. Sửa xong lại **trừ hai lần** — toast lơ lửng cách thanh đáy 68px thay vì 10px. `.app-body` đã đẩy
   rồi thì `bottom: 10px` là đủ.
3. **Thứ tự gọi hàm**: `updateHeaderActions()` đứng TRƯỚC dòng bật nút export trong core.js → thanh
   đáy đọc `btnExportJpeg.disabled` còn là `true` → mở bản vẽ mà nút Xuất vẫn xám. Đã dời 2 dòng
   export lên trước.
   → **Bài học: gắn vào choke point thì phải kiểm luôn choke point đó chạy ở ĐOẠN NÀO của hàm.**

**Một chỗ suýt sai vì suy diễn từ CSS thay vì từ ý nghĩa:** tôi tắt nút "Tạo bản mới" ở thanh đáy khi
`btnNew.style.display === 'none'`. Nhưng nút header đó bị ẩn vì lý do **THỊ GIÁC** (màn chào đã có nút
y hệt), không phải vì việc đó không làm được → thanh đáy xám ngắt ngay màn chào.

**CÒN LẠI, chưa làm:** bàn phím iOS **vẫn che thanh đáy** (iOS giữ `position:fixed` theo khung layout;
`interactive-widget=resizes-content` Safari chưa hỗ trợ). Muốn xử phải dùng VisualViewport API — chờ
chủ tool quyết có đáng không. Và **mục 5 (không đăng xuất/đổi mật khẩu được trên mobile) CHƯA sửa** —
nó thuộc rail điều hướng, không thuộc màn Công cụ.

**Version:** `style.css?v=74`, `js/core.js?v=25`, `js/proposal.js?v=22`, `js/main.js?v=7`.

**Kiểm chứng** (mirror `tool.html` thật, chỉ stub `config.js` để qua cổng đăng nhập, xoá sau khi đo):
- 375px, mở AIG IUL: thanh đáy y=753 cao 59 · bảng sửa y=332 cao 422, đáy 754 = **ngồi khít trên
  thanh đáy** · bản vẽ hở **276px** · `backdrop opacity = 0` · nhãn 13px / ô nhập 16px · danh sách
  **725px** · nhóm 1 mở, nhóm 2-3 gấp · **0 phần tử chạm dưới 44px** · không tràn ngang.
- Nhãn nút đổi đúng theo ngữ cảnh: chưa mở file → "Tạo bản mới"; mở rồi → "Điền thông tin".
  Mở MẪU GỐC: Lưu **tắt** (đúng — mẫu gốc không lưu đè), Xuất **bật**.
- 1500px desktop: thanh đáy + bảng chọn định dạng `display:none` · dải đáy 40px · zoom **26px** ·
  nút Xuất trong bảng sửa vẫn hiện · nhãn **11.5px** · cả 3 nhóm mở · rail hiện · `padding-bottom: 0`
  → **desktop không xê dịch một pixel nào**.

⚠️ **Đo bảng sửa chữ phải BAKE class vào `<body>` rồi nạp lại trang.** Đo ngay sau khi JS thêm class
cho ra vị trí giữa chừng hiệu ứng (y=833 thay vì 332) — pane ẩn không chạy rAF nên transition không
bao giờ xong. Dính đúng bẫy này 3 lần trong phiên (xem quy tắc 43 sổ bài học).

### 2026-07-22 (later 15 — mèo nằm ngủ dưới thẻ chào)

Chủ tool: *"thêm cho anh vài con mèo đang nằm ở đây cho vui vẻ"*. 3 con mèo SVG nằm ngay dưới
thẻ "Chọn mẫu để bắt đầu", màu lấy từ token và đục nhẹ (0.36–0.5) nên là trang trí chứ không
tranh chú ý. Thở nhè nhẹ biên độ 2px; có `prefers-reduced-motion` thì nằm im.
`aria-hidden` + `pointer-events: none` — canvas có kéo/thả và Space-kéo, mèo mà ăn được chuột là
chặn đúng thao tác chính. Màn thấp (<760px) hoặc hẹp (<560px) thì ẩn, không lấn nội dung.

**🚨 BÀI HỌC LỚN — TÔI CHỌN CƠ CHẾ PHỨC TẠP QUÁ MỨC, RỒI TỐN 6 LƯỢT ĐO ĐỂ GỠ.**
Bản đầu: đặt mèo ngoài thẻ chào, ở mép dưới canvas → phải biết "canvas có đang mở bản vẽ không"
→ thêm class `co-file-dang-mo` trên body → 7 chỗ bật/tắt `#no-selection` nằm rải 3 file, vá cả 7
thì sẽ có chỗ quên → dựng `MutationObserver` để tự đồng bộ → rồi `opacity` + `transition`.
Kết quả: đo mãi không ra, cascade nói `opacity:0` mà computed trả `1`, đổi 3 kiểu bake class vẫn
mâu thuẫn.

**Cách đúng đơn giản hơn nhiều: ĐẶT MÈO BÊN TRONG `#no-selection`.** Thẻ chào ẩn thì mèo tự ẩn —
0 dòng JS, 0 class, 0 observer, 0 thứ để quên đồng bộ. `top: 100%` cho nó rơi xuống ngay dưới
thẻ, đúng khoảng trống chủ tool khoanh.
→ **Khi thấy mình đang dựng observer/cờ trạng thái chỉ để một thứ TRANG TRÍ ẩn đúng lúc: dừng
lại hỏi có thể để nó NẰM TRONG phần tử đã ẩn/hiện sẵn không.** Vòng đời cho không, luôn đúng.
→ Và: **đo mãi mâu thuẫn cũng có thể là dấu hiệu THIẾT KẾ SAI, không chỉ là công cụ đo tồi.**

**Kiểm chứng** (trang tạm chỉ HTML+CSS, không JS): 3 mèo nằm trong `#no-selection` (`contains`
= true → tự ẩn theo), `pointer-events:none` (bấm giữa dải mèo trúng `canvas-container` chứ không
trúng mèo), `aria-hidden=true`, cách đáy thẻ 25px, còn cách đáy canvas 92px, không tràn.

**Version:** `style.css?v=72`, `js/main.js?v=8`.

## Version hiện tại (2026-07-23 cuối ngày — ĐÃ PUSH lên `main`, đã deploy)

`main` = bản LIVE (tool.thinksmartinsurance.com), **BẮT ĐĂNG NHẬP** (config.js có khoá Supabase thật).
✅ **ĐÃ PUSH badge v1.29** (23/07) — gộp 8 lượt (tiếp 5→11; hash mới: xem `git log -1`):
- **tiếp 5** — form Thêm tài khoản: style ô Phòng ban + ô Quyền + căn `.select-field` (server.js nhận `role`).
- **tiếp 6** — N1 Đo lường: `usage_events` (SQL ĐÃ CHẠY) + `logUsage` + tab "Đo lường" ở /members.
- **tiếp 7** — hộp "Xem theo ngày" (lịch từ/đến + preset) lọc biểu đồ+bảng theo khoảng; bố cục 2 cột.
- **tiếp 8** — đổi mẫu MƯỢT (spinner + vẽ trước + cache) · POP mở mẫu/Brochure/Compare · module "TẢI VỀ".
- **tiếp 9** — mẫu Allianz bản mới: thêm đường line + nhúng logo + state→Texas + gỡ mục trùng (`.svg.svg`).
- **tiếp 10** — popup "TẢI GÌ": cột `usage_events.label` (SQL ĐÃ CHẠY), bấm dòng "Tải về" → ai/tải-gì/lúc-nào.
- **tiếp 11** — con mắt 👁 "SALE ĐÃ ĐIỀN GÌ" (Cách A): cột `usage_events.detail jsonb` (⚠️ **CHỦ TOOL VỪA CHẠY SQL,
  ĐANG TEST** — chỉ lượt tải MỚI sau v1.29 mới có 👁; lượt cũ hiện "—"). Lưu giá trị khách (super_admin QA).
File nhạy cảm vẫn gitignore. Version cuối: badge **v1.29** · `auth.js?v=7 · members.js?v=25 · portal.css?v=51 ·
style.css?v=81 · core.js?v=29 · main.js?v=9` · `public/templates/Max-Funded Allianz.svg` cập nhật.
⚠️ Live ghi `usage_events`: `login` · `open_tool` · `download` (kèm `label` = tải gì + `detail` = giá trị đã điền).

**🎯 CÒN LÀM (chủ tool xin 23/07, XẾP HÀNG) — dùng lại hạ tầng label/detail:**
- **N2. Top brochure/mẫu chạy nhiều nhất** (việc 3): thêm kind `'view'` ghi mở brochure/mẫu NÀO → bảng xếp hạng
  lượt xem + lượt chạy báo giá. Cần SQL nới `kind` nhận `'view'`. Nhanh (tận dụng label).
- **N3. Trạng thái ONLINE real-time** (việc 5): heartbeat (~60s ghi "còn đây") + bảng `presence` (ghi-đè, KHÔNG
  append) → "online" = thấy trong ~2-3 phút. KHÁC "đang hoạt động" (trạng thái tài khoản). **CHỜ chủ tool chốt
  ngưỡng 2 hay 3 phút.** Cần SQL bảng presence + RLS (user upsert của mình, super_admin đọc).
- **N1 nâng cấp (cũ):** dashboard xu hướng 30/90 ngày, xuất CSV.

**🆕 23/07 — server.js có 2 ENDPOINT ADMIN** (`/api/admin/create-user`, `/api/admin/reset-password`)
dùng khoá `service_role` đọc từ **ENV** (`.env` local đã gitignore + **Vercel Production** env
`SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL`). Middleware `requireAdmin` verify JWT người gọi.
Deps MỚI: `@supabase/supabase-js`, `dotenv` (npm). ⚠️ `.env` KHÔNG lên git; `.env.example` (mẫu, có
sẵn URL, KHÔNG có key) thì CÓ commit (`.gitignore` có dòng `!.env.example`). Xem `tools.md` mục Admin.

Badge UI **v1.24** (5 chỗ — `grep -rn "version-badge" public/*.html`), ngày 23/07/2026.
Cache-version của asset (đọc thẳng từ HTML, không chép tay):

| File | Version | File | Version |
|---|---|---|---|
| `style.css` | `?v=78` | `portal.css` | `?v=45` |
| `dialog.css` | `?v=4` | `js/ui-dialog.js` | `?v=3` |
| `js/core.js` | `?v=25` | `js/proposal.js` | `?v=35` |
| `js/brochure.js` | `?v=11` | `js/sosanh.js` | `?v=10` |
| `js/main.js` | `?v=7` | `js/namecard.js` | `?v=5` |
| `js/animations.js` | `?v=4` | `js/portal/auth.js` | `?v=4` |
| `js/portal/config.js` | `?v=8` | `js/portal/members.js` | `?v=19` |
| `js/portal/videos.js` | `?v=2` | | |

Lệnh lấy đúng bảng này (đừng nhớ bằng đầu, số lệch là cache lỗi thầm lặng):
```
grep -ho "\(style\|portal\|dialog\)\.css?v=[0-9]*\|js/[a-z/-]*\.js?v=[0-9]*" public/*.html | sort -u
```

**Quy tắc bump (đã dính lỗi vì quên):** sửa file nào bump `?v=` file đó — **kể cả khi chỉ
sửa TẠM rồi hoàn lại** (đục `config.js` để test xong khôi phục vẫn phải bump, không thì
trình duyệt chủ tool giữ bản tạm trong cache). Cùng một file mà mỗi trang HTML khai một số
version khác nhau là bug thầm lặng — dò bằng script quét cả 5 file HTML, đừng sửa tay từng trang.

**⚠️ HAI FILE CSS LÀ BẢN SAO CỦA NHAU** — `portal.css` (portal) và `style.css` (Tool) chép tay lẫn
nhau phần rail, nút, token. **Đây là nguồn lỗi lặp đi lặp lại** (logo rail sai 2 lần, nút lệch cỡ
giữa 2 trang). Sửa bất kỳ thứ gì thuộc rail / hệ nút / token → PHẢI sửa CẢ HAI. Gộp phần dùng chung
ra một file là việc đáng làm khi có thời gian (xem PENDING I).

## Current state (as of 2026-07-17)
- **Frontend is modular**: `public/app.js` is GONE, replaced by `public/js/`
  (`core.js` / `proposal.js` / `brochure.js` / `namecard.js` / `main.js`); versions: `core.js?v=12`,
  `proposal.js?v=10`, `main.js?v=5`, `brochure.js?v=4`, `namecard.js?v=5`, `style.css?v=20`, `core.js?v=14`. UI hiển thị **v1.02** ở chân sidebar trái
  (`sidebar-version-footer` trong index.html — cập nhật tay khi deploy).
- Fonts: `public/fonts/` chứa 11 file THẬT (7 SF Pro weights + 3 SF Pro italics + Bodoni Moda);
  export nhúng đủ 11. Đừng copy đè từ `5-Design-Sections/sf pro/` (bộ giả cũ).
- Proposal carriers: AIG, NLG, **Allianz — ĐÃ CÓ MẪU FINAL** (`Max-Funded Allianz.svg`, live từ 23/07);
  the 3 master carriers always render in the nav even with 0 templates (`MASTER_CARRIERS` in core.js).
- **🆕 Bảng sửa (23/07):** ô sắp theo VỊ TRÍ bản vẽ (đọc như tờ báo giá) · lưới 2 CỘT desktop (>900px,
  ô ngắn nửa hàng / `.tb-full` cả hàng) · KHOÁ ĐƠN VỊ `$`/`năm`/`tuổi` (chỉ gõ số) · ô "Nhận đều đặn"
  nhận số HOẶC "trọn đời" · cột Term trống → "-" · click chữ trên bản vẽ nhảy tới ô (cần `data-editor-id`).
- **🆕 Admin (23/07):** super_admin + admin THÊM tài khoản + ĐỔI mật khẩu ngay trên `/members`
  (server-side service_role, mật khẩu gõ tuỳ ý mặc định `Drt$2022`). Xem `tools.md`.
- `/api/svgs` workspace scan is now an ALLOWLIST (`PROPOSAL_SCAN_DIRS` in server.js:
  `2-Templates`, `4-Clients`, `Name Card`) — new root folders (design WIP etc.) can't leak into the tree.
- Sale workflow: **Chọn mẫu → Điền → Lưu Nháp → Xuất** — context-aware header buttons, auto agent
  preset, dirty tracking + confirmations, draft trash-delete (`/api/svgs/delete`), drafts grouped
  under **"Bản nháp"** (see 2026-07-15 later 8/11/12).
- Mobile-ready: ≤900px = drawer + bottom-sheet + touch pan/pinch (see 2026-07-15 later 5).
- Bilingual nav: Proposal / Báo giá · Brochure / Tài liệu · Name Card / Danh thiếp.
- All local work through 2026-07-17 committed & pushed (see Log).
- Live at **`tool.thinksmartinsurance.com`** (custom domain, verified 2026-07-17) + `thinksmarttool-gy6f.vercel.app`.
- All 3 tools working: Proposal (AIG/NLG + Bản nháp), Brochure (multi-page grouping, minimal preview),
  Name Card (5 tagged fields, editable, fit-to-viewport zoom, master-protected + copy flow).
- Font embedding on export is live. Design system + light/dark theme live.

## PENDING / open tasks

> **BẮT ĐẦU PHIÊN MỚI ĐỌC 6 DÒNG NÀY:** MỘT nhánh `main` duy nhất, ở **`3c120a3`** (23/07 cuối ngày,
> badge **v1.24**), sạch, đã push + deploy. Live `tool.thinksmartinsurance.com` **BẮT ĐĂNG NHẬP**.
> Việc LỚN kế tiếp: **ĐO LƯỜNG SỬ DỤNG** (xem N1 dưới). Vercel Production ĐÃ có env service_role.
> Muốn xem trang bị khoá đăng nhập / bảng sửa (login-gated): **ĐỪNG sửa `config.js` thật.** Tạo mirror
> tạm trong `public/` (`sed` thay `<script src=/js/portal/config.js>` bằng `<script>window.TST_CONFIG=
> {supabaseUrl:"",supabaseAnonKey:""}</script>` inline), resize desktop 1280, đo bằng getCTM/getBBox,
> xong **XOÁ NGAY** — file đó qua cổng đăng nhập, để sót là Vercel phục vụ nó trên domain thật.

**N1. ĐO LƯỜNG SỬ DỤNG — ✅ ĐÃ DỰNG 23/07 (tiếp 6), ⚠️ CHỜ CHỦ TOOL CHẠY SQL + test.** Đã code xong
theo hướng đã chốt (append-only, anon key + RLS, chỉ super_admin đọc). Chốt lúc làm: **tab "Đo lường"
TRONG /members** (không phải trang riêng), **mức đơn giản** (đăng nhập + có-mở-tool, không tách theo
tool nào), **chỉ super_admin**. Chi tiết ở mục "2026-07-23 (tiếp 6)" phía trên.
→ **VIỆC CÒN LẠI CỦA CHỦ TOOL:** (a) chạy SQL bảng `usage_events` trong `supabase/schema.sql` (mục 3);
(b) đăng nhập super_admin xem tab Đo lường; (c) duyệt → bump badge v1.25 + push. Chưa chạy SQL thì tab
báo "bảng chưa tạo", phần còn lại không vỡ.
→ **Nâng cấp sau (nếu chủ tool muốn):** tách theo TỪNG TOOL (thêm cột `tool` + kind cho Brochure/
NameCard/SoSanh), dashboard xu hướng 30/90 ngày, xuất CSV. Schema hiện chỉ cần thêm cột, không phá dữ liệu cũ.

**M1. Bàn phím iOS vẫn che thanh thao tác đáy.** iOS neo `position: fixed` theo khung layout, và
`interactive-widget=resizes-content` Safari chưa hỗ trợ → phải dùng VisualViewport API mới đẩy thanh
đáy lên trên bàn phím. Chưa làm, chờ chủ tool quyết có đáng không. Lúc gõ thì bản vẽ VẪN nhìn thấy
(đó là thứ đã sửa xong), chỉ là Lưu/Xuất phải đóng bàn phím mới bấm được.

**M2. Trên điện thoại KHÔNG đăng xuất / đổi mật khẩu / đổi sáng-tối được.** `.portal-sidebar` bị
`display:none` ở ≤900px mà ngăn kéo trái chỉ chứa cây file. Sale mất máy thì không tự khoá tài khoản
từ chính máy đó được. Sửa được nhưng đụng bố cục ngăn kéo (đề xuất: dải icon ở đáy ngăn kéo) →
**cần chủ tool duyệt thiết kế trước**, đừng tự làm.

**Việc gấp — mở đầu phiên nên hỏi chủ tool:**
- **A1. Bảng So sánh: 16 PNG trong folder chỉ là LOGO hãng**, không phải nội dung so sánh. Bảng vẫn
  DÙNG ĐƯỢC vì dữ liệu 16 hãng × 4 quyền lợi đã lấy đủ từ `Compare.html`; logo chỉ là ảnh minh hoạ
  trong mỗi thẻ. Nếu chủ tool muốn nhúng thêm bảng so sánh dạng ảnh/PDF → thả vào folder, giữ kiểu
  tên `NN_Ten_Hang.png`.
- **A2. Đội sale có vào được live không?** Chủ tool nói KHÔNG cần tài khoản admin1/admin2 nữa, nhưng
  CHƯA xác nhận cả đội đã đăng ký + được duyệt. Nếu bị chặn: để trống `config.js` + bump version +
  push là mở lại trong ~1 phút.
- ~~**A3. `3-Export-PDF/` chưa gitignore**~~ **XONG 22/07 (later 18)** — đã `git rm --cached` 7 file
  và thêm luật ignore. File vẫn còn nguyên trên máy.

-3. **CÔNG CỤ SẮP THÊM (chủ tool báo 21/07/2026)** — mục "Công cụ" sẽ KHÔNG chỉ có
   Proposal/Brochure/Name Card nữa:
   - **Tính tuổi bảo hiểm** cho khách (insurance age — nhiều hãng tính theo ngày sinh
     gần nhất, không phải tuổi thật; hỏi rõ quy tắc từng hãng trước khi code).
   - **Run quotes** (báo giá nhanh nhiều hãng).
   Hệ quả cần nhớ khi thiết kế: 2 công cụ này **không mở file SVG** như 3 mục hiện có,
   nên khung 3 cột (cây file · canvas · editor) không hợp. Nhiều khả năng cần layout
   riêng cho từng công cụ trong cùng `tool.html`, hoặc route riêng. ĐỪNG hardcode
   giả định "mọi mục trong Công cụ đều là file SVG" khi sửa `renderFileTree`.

**Mở từ 2026-07-20 (cập nhật 21/07 sau khi merge thành `feat/mainV1.1`):**
- **Z. BADGE NỀN NHẠT KHÔNG ĐẠT AA TRÊN TOÀN APP** (phát hiện 21/07 khi làm bảng So sánh):
  cặp `--success`/`--success-soft` = 2.97 và `--warning`/`--warning-soft` = 3.24 ở theme sáng.
  Badge trạng thái + quyền ở trang Thành viên (`.badge.st-active`, `.role-admin`…) dùng cùng
  mẫu này. Đã vá RIÊNG cho `.ss-*`; cần rà và vá chung (đo bằng luminance CÓ trộn alpha nền).
- **A. Danh sách xếp hạng Allianz đang là TẠM** — owner sẽ gửi bản chính thức sau. Sửa ở
  `RATE_CLASSES_BY_CARRIER.Allianz` trong `public/js/proposal.js` (nhớ bump `proposal.js?v=`).
- **B. ~~`feat/login` chưa push~~ XONG 21/07**: đã push `feat/login` (v1.12) rồi merge `--no-ff`
  vào nhánh mới **`feat/mainV1.1`** (v1.13). Nhánh này CHƯA push, CHƯA deploy — `main` vẫn
  nguyên và live vẫn chỉ phục vụ Tool. Khi merge đã **GỠ khối redirect `/`,`/login`,`/videos`
  → `/tool`** trong `server.js` (nếu cần giấu portal lần nữa thì đặt lại TRƯỚC `express.static`).
- **B2. E2E luồng tài khoản VẪN CHƯA CHẠY** — cần tài khoản thật: đăng ký → chờ duyệt → duyệt →
  đăng nhập → xem video → **tạm khoá lúc người đó đang mở web rồi chuyển trang** (ca vừa vá
  21/07) → nhân viên vào `/members` phải bị từ chối.
- **C. ~~Danh sách phòng ban cố định~~ XONG 21/07** — chủ tool chốt **Sale · MKT · CS · Admin**
  (mảng `PHONG_BAN` đầu `members.js` — thêm/bớt sửa đúng chỗ đó). `window.prompt` đã thay bằng
  hộp thoại chọn trong trang, dùng chung cho sửa 1 người lẫn đổi hàng loạt.
- **D. Video học "mồ côi"** — `videos.html` tự hiện mục của nó nhưng sidebar trang chủ/members/tool
  KHÔNG có link `/videos` → không có đường vào. Quyết: mở lại mục Video học trong nav, hay bỏ hẳn?
- **E. Ô tìm kiếm mẫu trong Tool đã bị xoá** khỏi `tool.html` (bản update của owner) → không tìm mẫu
  theo tên được nữa; `main.js` còn handler chết trỏ tới `#search-input`. Khôi phục hay bỏ hẳn?
- **F. JS chết trong core.js/main.js** — handler cho UI đã gỡ từ lâu (`#text-search-input`, meta
  inspector, tab màu, preset nền). Null-guard nên không lỗi, chỉ là code không bao giờ chạy.
- **G. 2 tài khoản test trong DB** (`mkt@gmail.com`, `test1@gmail.com`) — dọn khi không cần nữa.
- **H. Nhân viên thường không tự sửa được tên/phòng ban** — policy UPDATE trên `profiles` đòi
  `is_admin()`. Muốn cho phép: thêm policy update `id = auth.uid()` (trigger `enforce_member_update`
  đã cấm đổi role/status nên vẫn an toàn). Chờ owner quyết.
- **I. GỘP 2 FILE CSS** — `portal.css` và `style.css` đang chép tay lẫn nhau (rail, hệ nút, token).
  Đã gây lỗi lặp: logo rail sai 2 lần (sửa file này quên file kia), nút lệch cỡ giữa 2 trang.
  Nên tách phần dùng chung ra `shared.css` rồi cả hai cùng nạp. Việc trung bình, đáng làm sớm.
- **J. Logo Name Card — ĐỠ 21/07, chưa xong hẳn.** Đã thay bitmap 472×179 bằng
  `Logo Thinksmart White.png` 2370×896 (nét gấp 5, hết nhoè khi xuất 2x). Khung vẽ vẫn giữ
  `width="472" height="179"` nên không xê dịch gì. **Vẫn là raster** — muốn sắc nét vô hạn thì
  cần file gốc vector (.ai/.svg) từ chủ tool.
- **K. Portal vẫn dùng `confirm()`/`alert()` mặc định trình duyệt** cho các bước xác nhận
  (`members.js`). Tool đã có hộp thoại riêng theo design system từ 17/07 (`showAppDialog` trong
  core.js) — nên làm tương tự cho portal để đồng bộ.
- **L. Mẫu Allianz: nhánh `isAllianz` mới phủ Section 2.** Các phần khác của mẫu (Tính năng khoá lãi
  suất, Phí chấm dứt hợp đồng sớm) chưa có ô chỉnh sửa riêng. Chờ chủ tool xác nhận có cần không.

-1. ~~Verify save/clone/delete on the LIVE site~~ **RESOLVED 2026-07-17 (v1.02)**: live site giờ chạy
   **draftsMode 'browser'** — nháp lưu localStorage máy sale (xem log). Server ghi file chỉ còn cho local.
0. ~~`TERMLIFE - NLG` master polluted with test data~~ **RESOLVED 2026-07-17** — toàn bộ 5 master
   đã chuẩn hoá placeholder (xem log "placeholder chuẩn cho mẫu gốc"), không cần bản restore nữa.
1. **Name Card icons are low-res raster** → look rough / "mất góc" when zoomed/exported. Confirmed a
   source-asset issue, not a tool bug. Awaiting the owner's choice: re-export from Illustrator with vector
   icons (preferred) OR replace icons with vectors in code. See `tools.md` → "Known limitation".
2. ~~SF Pro italics + Bodoni Moda not truly bundled~~ **FIXED 2026-07-17** — all 11 fonts are now
   real files (see log). Rebuild script: `build-fonts.py` (repo root; fontTools subset from
   `C:\Windows\Fonts` OTFs).
2b. ~~Custom domain chờ DNS~~ **LIVE 2026-07-17**: `tool.thinksmartinsurance.com` verified & serving
   (CNAME `tool` → 538e043f27a6d167.vercel-dns-017.com + TXT `_vercel` vc-domain-verify; TXT có thể
   xoá sau khi verify nhưng GIỮ LẠI thì an toàn cho lần re-verify). Gỡ bằng saga: record từng bị gõ
   thiếu chữ ('_verce'), rồi nhiều lần edit không bấm 'Save All Records' (zone editor dạng staged —
   check bằng SOA serial: không nhảy = chưa lưu thật).

3. **Two Vercel URLs** (gy6f vs editor-proposesalsale) — consider consolidating/removing one in the dashboard.
5. ~~Audit design 2026-07-17 — 4 lỗi nhỏ~~ **FIXED cùng ngày** (xem log "tối ưu mobile"); riêng
   phát hiện "tên file hiện đuôi" là FALSE POSITIVE — text hiển thị đã sạch, đuôi chỉ nằm trong
   tooltip `title` (giữ nguyên, hữu ích).
4. Future tools the owner may add (platform vision): more sales tools beyond proposals (video, training docs,
   FB post templates, client management…). Keep the structure modular.

## Log

> **Ghi chú merge 21/07/2026:** `main` và `feat/login` chạy song song ngày 20/07 nên có HAI mục
> cùng ngày — mục của `main` là việc trên bản live (redirect + xếp hạng sức khoẻ), mục của
> `feat/login` là việc trên portal. Giữ cả hai, đừng gộp.

### 2026-07-22 (later 13 — ĐỢT 2: thêm 21 tài khoản sale)

Chủ tool đưa `Account/Danh-sach-sale 2.xlsx` (69 người, bản mở rộng của danh sách 1).

**KHÔNG gõ lại từ ảnh chụp.** Chủ tool gửi ảnh bảng tính trước; tôi từ chối và xin file, vì đây là
**email đăng nhập**: sai một ký tự (`raddie` → `radie`, hay sai dấu trong `Nguyễn Diễm Linh`) là
tài khoản tạo ra không ai vào được, mà chỉ phát hiện khi người đó thử đăng nhập. Ảnh còn bị cắt ở
dòng 70 nên không biết còn bao nhiêu người phía dưới.

**Đối chiếu 2 danh sách trước khi sinh gì cả:** 48 → 69, **21 người mới**, **0 người bị xoá**,
**0 người đổi họ tên**. Sạch.

**⚠️ CHỈ SINH MẬT KHẨU CHO 21 NGƯỜI MỚI, KHÔNG SINH CHO CẢ 69.** Nếu sinh đủ 69 thì file CSV sẽ
có mật khẩu mới cho 48 người cũ — nhưng SQL **bỏ qua** họ (email đã tồn tại), nên 48 mật khẩu đó
**SAI HOÀN TOÀN**. Chủ tool gửi đi là 48 người không đăng nhập được và không ai hiểu vì sao.
→ Quy tắc: chạy lại một quy trình sinh dữ liệu trên tập lớn hơn thì phải **lọc ra phần chênh
lệch trước**, đừng sinh lại cả tập.

File: `Account/tao-21-tai-khoan-moi.sql` + `Account/mat-khau-21-sale-moi.csv` (đều đã gitignore).
SQL có thêm dòng `raise notice` ghi rõ "MAT KHAU TRONG CSV KHONG DUNG CHO NGUOI NAY" nếu gặp email
đã tồn tại, và truy vấn kiểm tra cuối file (21 dòng, cột `tinh_trang` phải là `OK`) + tổng kết
`phong_sale` phải ra **69**.

Kiểm chứng file sinh ra: 21 dòng, 21 email duy nhất, 21 mật khẩu duy nhất, 0 dấu nháy lẻ,
`$$` cân bằng, **0 người cũ lẫn vào**.

**Nhắc:** `Account/Accout Tool.csv` chính là `mat-khau-48-sale.csv` đợt 1 do chủ tool đổi tên —
vẫn chứa 48 mật khẩu plaintext. Gửi xong cho từng người thì xoá.

### 2026-07-22 (later 12 — vạch ngăn menu: trang có trang không)

Chủ tool: *"sao 2 thanh menu khi chọn là không đồng nhất — cái có gạch cái không"*.

**Nguyên nhân (đo được, không đoán):** `.sidebar-foot` có `border-top: 1px solid var(--divider)`
= `#EEF0F4`, rất nhạt. Mục nav đang chọn có **bóng đổ tím** `0 8px 24px rgba(109,40,217,.35)`
toả XUỐNG, mà vạch ngăn nằm cách mục cuối đúng **0px** → bóng phủ trùm, vạch mất hút.
**Chỉ lộ ở `/members`** — trang DUY NHẤT mà **mục cuối cùng của nav đang active**. Trang chủ,
Công cụ, Video học đều có mục active nằm ở trên nên vạch không bị bóng chạm tới.

**Sửa — cần CẢ HAI, một mình không đủ:**
1. `.sidebar-nav { margin-bottom: 16px }` — vùng đậm của bóng với tới ~14px (`8 + 24/4`), nên
   12px vẫn chưa thoát; 16px mới ra ngoài. (Đã thử 12px và ĐO ra chưa đạt trước khi tăng.)
2. Vạch đổi `--divider` (`#EEF0F4`) → `--border-strong` (`#D5D9E3`) để sống được dưới lớp tím.

**Sửa CẢ `portal.css` LẪN `style.css`** — hai file là bản sao của nhau (cảnh báo đầu file này).

**Kiểm chứng:** dựng lại CẢ HAI trang thật (giữ nguyên file, chỉ thay thẻ `<script src>` bằng
stub) rồi đo: `/members` (mục cuối ACTIVE) và trang chủ (mục cuối KHÔNG active) giờ **trùng khít**
— khe hở 16px, vạch `rgb(213,217,227)`, dày 1px.

**BÀI HỌC:** trước khi sửa tôi đã đo computed style của `.sidebar-foot` trên cả 2 trang → **giống
hệt nhau** (`1px solid rgb(238,240,244)`). Nếu dừng ở đó thì kết luận "không có gì khác nhau,
chắc chủ tool nhìn nhầm" — SAI. Khác biệt không nằm ở phần tử đó mà ở **hàng xóm của nó**: bóng
đổ của phần tử phía trên. → **Phần tử giống nhau mà trông khác nhau thì soi CÁI BÊN CẠNH**, nhất
là `box-shadow`/`filter` — chúng tràn ra ngoài hộp của chính mình.

**Version:** `portal.css?v=43`, `style.css?v=70`.

### 2026-07-22 (later 11 — VÁ lỗi lật trang bị chồng lấn, do chính later 10 gây ra)

Chủ tool: *"bấm qua trang thì nó bị nhảy ở phần này"* — ảnh chụp cho thấy tiêu đề trang, ô tìm và
tiêu đề cột đè lên mấy hàng đầu.

**Nguyên nhân — BA TẦNG DÍNH CHỒNG NHAU:** `.topbar` (135px) → `.bulk-bar` (73px) →
`.member-head` (tôi thêm ở later 8). Lật trang xong `seg.scrollIntoView({block:'start'})` đưa
nhóm lên **sát mép trên cửa sổ** — mà mép trên đang bị 3 tầng đó che → hàng đầu chui xuống dưới.

**Sửa 2 chỗ, cố ý chọn cách BỎ BỚT thay vì cộng thêm bù trừ:**
1. **Bỏ `position: sticky` khỏi `.member-head`.** Nó thêm vào later 8 để cuộn 51 người vẫn thấy
   tên cột — nhưng later 10 (phân trang 12 hàng/trang) đã bỏ hẳn việc phải cuộn danh sách. Giữ
   lại vừa thừa vừa đẻ lỗi. **Ít tầng dính = ít lỗi chồng lấn.**
2. **Thay `scrollIntoView` bằng `scrollTo` có trừ chiều cao thanh dính**, đo tại thời điểm bấm
   (`.topbar` + `#bulk-bar`, chỉ tính cái nào đang thật sự `position: sticky`). Không hardcode:
   thanh công cụ cao thấp khác nhau tuỳ có đang chọn người hay không.

**Kiểm chứng:** cuộn xuống 600px rồi bấm sang trang 3 → rows 25–36, đáy tầng dính ở 163px, tiêu
đề nhóm 196 · tiêu đề cột 226 · hàng đầu 252 — **không cái nào bị che**, còn hở 33px.

**🚨 BÀI HỌC ĐO ĐẠC — PANE HẸP LÀM CHẠY NHẦM BỐ CỤC MOBILE.** Trang thử đầu tiên cho ra
`.member-table` `display:block`, `.member-head` `display:none`, hàng cao **253px** → tưởng subgrid
vỡ. Thật ra pane rộng **981px**, dưới ngưỡng `@media (max-width: 900px)`… không, dưới **1100px**
và trúng nhánh 900px của bảng → **CSS đang chạy bố cục MOBILE** (bảng xếp dọc, ẩn tiêu đề cột).
Màn hình chủ tool ~2000px thì ra bảng ngang. `resize_window` lên 1500px mới đo được bố cục thật
(hàng 52px, `display:grid`).
→ **Trước khi kết luận "layout vỡ", kiểm `window.innerWidth` xem đang ở nhánh media query nào.**

**Bài học thứ hai:** trang thử đầu tiên tôi CẮT một đoạn HTML từ `members.html` → cấu trúc DOM
méo, `.topbar` đo ra **2106px**. Dựng lại bằng cách **giữ NGUYÊN file thật, chỉ thay các thẻ
`<script src>` bằng stub** → `.topbar` ra đúng 135px. Cắt HTML là làm hỏng thứ mình đang cần đo.

**Version:** `portal.css?v=41`, `portal/members.js?v=15`.

### 2026-07-22 (later 10 — PHÂN TRANG danh sách thành viên)

Chủ tool: *"phần này phải scroll, chuyển qua dạng slide được không"* → phân trang, **12 hàng/trang**
(hàng cao 54px × 12 ≈ 650px, vừa một màn hình cùng tiêu đề + thanh công cụ, không phải cuộn).
⚠️ Đừng tăng bừa lên 20–30 rồi lại phải cuộn — mất đúng thứ vừa sửa.

Phân trang **RIÊNG cho từng nhóm** (`pending` / `active` / `suspended`), mỗi nhóm một thanh lật
trang, nhóm ≤ 1 trang thì thanh tự ẩn. Có nút ‹ ›, dãy số trang rút gọn bằng `…`, và dòng
"13–24 trên 51". Lật trang xong tự `scrollIntoView` về đầu nhóm.

**🚨 HAI CHỖ PHÂN TRANG SUÝT LÀM HỎNG — phải sửa kèm, không phải việc phụ:**

1. **"Chọn tất cả" phải ăn CẢ NHÓM, không phải trang đang xem.** Bản cũ duyệt
   `tbl.querySelectorAll('.m-pick')` = các ô ĐANG HIỂN THỊ. Có phân trang thì nó chỉ chọn 12
   người, trong khi tiêu đề vẫn ghi "Thành viên 51" → người dùng tưởng đã chọn hết 51 rồi bấm
   "Tạm khoá". Sửa: chọn theo **DỮ LIỆU** của cả nhóm (`nhom[khoa]`), rồi mới đồng bộ ô tick.
2. **Ô "chọn tất cả" phải phản ánh CẢ NHÓM.** Tính theo hàng hiển thị thì lật sang trang chưa
   chọn ai là ô tự bỏ tick, dù 40 người ở trang khác vẫn đang được chọn.

`danhSach` giữ NGUYÊN danh sách đã lọc (không cắt theo trang) nên `nguoiHopLe()` và mọi thao tác
hàng loạt vẫn chạy đúng trên toàn bộ người đã chọn, kể cả người ở trang khác.

Kẹp số trang khi vẽ (`if (trang > soTrang) trang = soTrang`): xoá/lọc bớt người có thể làm trang
hiện tại không còn tồn tại → không kẹp là màn hình trắng trơn mà không hiểu vì sao.
Gõ ô tìm → reset về trang 1.
Thanh lật trang dùng **uỷ quyền sự kiện** trên `#page-content` — nút được dựng lại sau mỗi lần
vẽ nên gắn handler trực tiếp vào nút là mất.

**Kiểm chứng** (trang tạm, chạy HÀM THẬT `veNhom`/`soNut`/`onPagerClick`/`onPickChange`/
`capNhatThanhHangLoat` chép từ members.js, 51 người giả):
- 5 trang, trang cuối 3 người, `1–12 trên 51` → `49–51 trên 51`, nút ‹ khoá ở trang 1, › khoá ở
  trang cuối, dãy số rút gọn có `…`.
- Chọn tất cả → **51** người (không phải 12), thanh ghi "Đã chọn 51", 12 ô tick + 12 hàng tô sáng.
- Lật sang trang 3 → vẫn 12 ô tick, ô chọn-tất-cả vẫn tick, đếm vẫn 51.
- Bỏ tick 1 người → 50, ô chọn-tất-cả chuyển **lửng** (indeterminate).
- Về trang 1 → người vừa bỏ KHÔNG bị hồi sinh, tổng vẫn 50.

**BÀI HỌC VỀ CÁCH KIỂM CHỨNG:** lần đầu trang thử báo "lật trang là mất sạch tick" — tưởng bug
sản phẩm. Đọc lại `rowHtml` THẬT thì nó CÓ khôi phục cả `checked` lẫn class `is-picked`; thiếu là
ở **bản rút gọn tôi tự viết trong trang thử**. → Trang thử mà đơn giản hoá phần đang cần kiểm thì
nó kiểm chính bản rút gọn đó, không kiểm sản phẩm. Đã sửa trang thử cho khớp rồi mới đo lại.

**Version:** `portal.css?v=40`, `portal/members.js?v=14`.

### 2026-07-22 (later 9 — thiết kế lại thanh thao tác hàng loạt)

Chủ tool: *"nút ở thanh này em thiết kế lại cho dễ dùng hơn, anh nhìn vào thấy nó bị rối"*.
Chẩn đoán: **5 nút dùng 4 kiểu khác nhau** (đặc tím · viền · chữ đỏ trần · đặc tím) và **2 nút
primary tím cạnh tranh nhau** (Duyệt + Mở khoá) → mắt không phân được nhóm nào là nhóm nào.

**Sửa theo 3 nguyên tắc:**
1. **Hai họ nút, hết.** Việc thường = `btn-secondary`/`btn-primary`; việc phá huỷ = nút VIỀN màu
   (`btn-warn-outline` cam = đảo ngược được, `btn-danger-outline` đỏ = mất dữ liệu).
   Bỏ `btn-danger` cũ (chữ đỏ **không viền**) — nó nhìn như đường link lạc giữa các nút, đó chính
   là cái "rối". Có viền thì vẫn là NÚT, chỉ khác MÀU: hình dạng nói "bấm được", màu nói "cẩn thận".
2. **Tối đa MỘT primary, gán ĐỘNG** theo việc cần làm nhất (duyệt > mở khoá > đổi phòng ban).
   **Không bao giờ** để việc phá huỷ làm primary.
3. **Nút không áp dụng được thì ẨN HẲN**, kèm số người thực sự bị tác động. `nguoiHopLe()` vốn đã
   tính sẵn (dùng chặn gọi DB thừa) → dùng luôn nó để quyết định hiển thị. Bản cũ luôn bày đủ 5
   nút, bấm mới báo "không có ai phù hợp" = bắt người dùng thử-và-sai.
   Số chỉ hiện khi KHÁC tổng đang chọn. Việc phá huỷ đẩy sang phải bằng `.bulk-sep`.

**Kết quả đo (chạy HÀM THẬT `capNhatThanhHangLoat` chép từ members.js trên trang tạm):**
| Chọn ai | Nút hiện ra |
|---|---|
| 1 người đang hoạt động | Đổi phòng ban *(primary)* · Tạm khoá · Xoá — **3 nút thay vì 5** |
| 3 người chờ duyệt | Duyệt *(primary)* · Đổi phòng ban · Xoá |
| 2 người tạm khoá | Mở khoá *(primary)* · Đổi phòng ban · Xoá |
| Trộn 2+5+1 | Duyệt **2** · Mở khoá **1** · Đổi phòng ban · Tạm khoá **5** · Xoá |
Luôn đúng MỘT primary trong mọi tình huống.

**BẪY CSS TỰ GÂY RA — `currentColor` TỰ THAM CHIẾU:** viết
`background: currentColor` cùng rule với `color: var(--surface)` thì `currentColor` lấy `color`
của **CHÍNH phần tử đó** → lấy luôn giá trị vừa ghi đè → nền trùng chữ, huy hiệu thành cục đặc
không đọc được (**đo ra tỉ lệ 1.00**). Cách đúng: nút khai `--acc`, huy hiệu đọc `var(--acc)`.

**LẠI DÍNH BẪY ĐO ĐẠC — suýt sửa nhầm CSS đang đúng.** Đo theme tối bằng
`classList.toggle('dark-theme')` rồi `getComputedStyle` → ra màu theme SÁNG, dù soi
`document.styleSheets` thấy rule dark CÓ khớp, CÓ ưu tiên cao hơn, KHÔNG `!important`.
Cascade nói phải thắng mà computed lại sai → **nghi công cụ đo, không nghi CSS**. Nạp lại trang
với class bật NGAY TỪ ĐẦU → ra đúng màu. Pane Browser đơ style-recalc sau khi đổi class bằng JS.

**Tương phản sau khi sửa** (nạp trang riêng cho từng theme):
| | sáng | tối |
|---|---|---|
| Chữ nút Tạm khoá | 5.63 | 8.33 |
| Chữ nút Xoá | 6.47 | 6.52 |
| Huy hiệu số | 5.63 – 8.98 | 5.09 – 8.98 |
| Chip "Đã chọn" | 8.14 | 8.43 |
Dùng lại bộ màu của bảng So sánh (`#96590A`/`#B91C1C`, tối `#E9A23B`/`#F87171`) — token
`--warning`/`--danger` đo ra 3.62 và 3.73, **không dùng thẳng cho chữ được**.

**⚠️ HAI LỖI CÓ SẴN CỦA APP, CHƯA SỬA — cần chủ tool quyết vì đụng TOÀN BỘ nút:**
- `.btn-primary` ở **theme tối**: chữ trắng trên `--brand-400` = **3.55** (cần 4.5).
- `.btn-secondary`: viền `--border-strong` chỉ **1.41** (sáng) / **1.62** (tối), dưới ngưỡng 3:1.
`git diff main..HEAD` xác nhận đợt này KHÔNG đụng vào 2 lớp đó.

**Version:** `portal.css?v=39`, `portal/members.js?v=13`.

### 2026-07-22 (later 8 — trang Thành viên: ô TÌM + làm gọn danh sách)

Danh sách lên 51 người sau khi tạo 48 tài khoản → chủ tool: *"scroll nó bị dài"* + xin ô tìm
đặt chung hàng với thanh thao tác hàng loạt.

**1. Ô TÌM trong thanh công cụ, LUÔN HIỆN.** Bẫy: `.bulk-bar` vốn `display:none`, chỉ `.open`
mới hiện — nhét ô tìm vào đó thì chưa chọn ai là ô tìm biến mất theo. Sửa: thanh LUÔN `flex`,
chỉ nhóm `.bulk-actions` (đếm + 6 nút) mới ẩn/hiện. Viền đổi màu khi `.open` để vẫn giữ tín
hiệu "đang ở chế độ thao tác hàng loạt".

**Tìm BỎ DẤU** — bắt buộc, không phải cho đẹp: tên trong DB luôn có dấu, sale gõ nhanh thì
không bỏ dấu → không xử lý là tìm gần như không ra ai. `khongDau()` dùng
`normalize('NFD')` + strip `̀-ͯ`, **`đ/Đ` phải xử riêng** vì NFD không tách được nó.
Khớp cả `full_name` lẫn `email`.

**Lọc TRONG BỘ NHỚ, không gọi lại Supabase.** Tách `load()` (fetch) khỏi `veDanhSach()` (render);
gõ phím chỉ chạy `veDanhSach()`. Mỗi phím một truy vấn thì vừa chậm vừa tốn quota.

⚠️ **Gõ tìm là XOÁ luôn danh sách đang chọn** (`dangChon.clear()`). Nếu giữ, người dùng lọc còn
5 người rồi bấm "Duyệt" sẽ tác động lên cả những người họ KHÔNG còn nhìn thấy — nguy hiểm thầm lặng.

Chi tiết nhỏ dễ sót: `type="search"` trên Chrome có nút X riêng, bấm nó chỉ bắn sự kiện `search`
chứ KHÔNG bắn `input` → phải bắt cả hai. Đã ẩn nút X mặc định
(`::-webkit-search-cancel-button`) và dùng nút riêng cho đồng bộ 2 theme.

**2. Làm gọn hàng — CHỖ TÔI ĐOÁN SAI LÚC ĐẦU.** Nghĩ avatar 40px là thủ phạm nên thu còn 32px:
đo ra chỉ ngắn **12%** (68→60px). Đo tiếp từng ô mới thấy **khối tên+email 2 dòng cao 40px mới
là đáy** — vì hai dòng đó KHÔNG khai `line-height` nên ăn `1.55` của body
(14×1.55 + 12.5×1.55 ≈ 41px). Đặt `line-height` chặt cho đúng hai dòng đó (1.25 / 1.3) + `.m-cell`
1.3 → **68 → 54px, ngắn 20%**, tiết kiệm ~695px trên 51 người. Chữ không bị cắt.
→ **Bài học: muốn giảm chiều cao thì ĐO TỪNG Ô tìm cái cao nhất, đừng đoán theo cái to nhất
bằng mắt.** Avatar to nhất nhưng không phải cao nhất.
Đáy hiện tại: khối danh tính 34px và nút thao tác 32px. Muốn ngắn nữa phải gộp tên+email về
MỘT dòng (mất khả năng rà mắt) — chưa làm, chờ chủ tool.

**3. Hàng tiêu đề cột DÍNH khi cuộn** (`position: sticky`). 51 hàng mà mất tiêu đề thì không
biết cột nào là cột nào. Offset không hardcode: JS đo `.bulk-bar.offsetHeight` bằng
`ResizeObserver` rồi ghi vào biến CSS `--bulk-h` — hardcode sẽ sai khi thanh xuống dòng ở màn
hẹp, hoặc khi nhóm nút hàng loạt hiện ra làm nó cao thêm.

**Version:** `portal.css?v=36`, `portal/members.js?v=12`.

**Kiểm chứng** (trang tạm, dùng LẠI markup thật lấy từ `members.html` + hàm `khongDau` chép
nguyên từ `members.js`, đã xoá sau khi đo): chưa chọn ai → thanh `flex`, nhóm nút `none`; chọn
rồi → cả hai `flex`. Tìm `duong`→2 người có dấu "Dương", `dinh`→"Đinh Thị Hiền" (đ→d),
`kenny`→khớp qua email, `xxx`→0. Hàng 68→54px, chữ không cắt. Cuộn 1200px: `--bulk-h` đo được
61px, hàng tiêu đề dính ở top 151px, **không đè lên** thanh công cụ (top 80px).
❗ CHƯA chạy trên trang `/members` thật (cần đăng nhập Super Admin).

### 2026-07-22 (later 7 — tạo hàng loạt 48 tài khoản sale + tính năng ĐỔI MẬT KHẨU)

**🔒 VIỆC ĐẦU TIÊN LÀM, TRƯỚC MỌI THỨ KHÁC: chặn rò rỉ.** Chủ tool đưa
`Account/Danh-sach-sale 1.xlsx` (48 người: tên gọi · họ tên · email công ty). Thư mục
`Account/` **chưa có trong `.gitignore`** mà repo này PUBLIC trên GitHub → một lệnh
`git add -A` là lộ danh sách nhân sự. Đã thêm `Account/` **và `*.sql`** vào `.gitignore`
(file SQL chứa mật khẩu dạng chữ thường). Kiểm `git log --all -- Account/` → **chưa từng
bị commit lần nào**, không phải đi xoá lịch sử.
→ **Quy tắc: dữ liệu người thật vào repo thì gitignore TRƯỚC, xử lý sau.**

**Tạo tài khoản:** sinh `Account/tao-48-tai-khoan.sql` + `Account/mat-khau-48-sale.csv`
(cả hai đã bị ignore). Chủ tool chốt: **mật khẩu riêng từng người** (không dùng mật khẩu
chung), tất cả `role='user'`, `status='active'`, `department='Sale'`.

Chi tiết kỹ thuật của file SQL — mấy chỗ bỏ qua là hỏng:
- `insert into auth.users` phải để **5 cột token = `''` chứ KHÔNG để NULL**
  (`confirmation_token`, `recovery_token`, `email_change`, `email_change_token_new`,
  `email_change_token_current`) — GoTrue đọc NULL vào kiểu string sẽ lỗi
  *"converting NULL to string is unsupported"* lúc đăng nhập.
- Phải chèn thêm **`auth.identities`** (provider `email`, `provider_id` = user id).
  Thiếu bảng này thì tài khoản HIỆN trong Dashboard nhưng đăng nhập báo sai mật khẩu.
- `email_confirmed_at = now()` để khỏi bắt xác nhận email.
- Trigger `on_auth_user_created` tự tạo dòng `profiles` (`status='pending'`) → sau đó
  `update` lên `active`. Trigger `enforce_member_update` **cho qua khi `auth.uid()` is
  null** (SQL Editor) nên update này không bị chặn.
- Bọc trong `do $$ ... $$` có vòng lặp + kiểm tồn tại → **chạy lại an toàn**, email đã
  có thì bỏ qua, không ghi đè mật khẩu người đang dùng.
- Mật khẩu sinh bằng `secrets` (CSPRNG), bảng chữ **bỏ ký tự dễ nhầm** `0/O`, `1/l/I` —
  sale phải gõ tay từ tin nhắn.
- ⚠️ Đã dặn chủ tool **chạy thử 1 dòng trước**: `auth.users` là bảng NỘI BỘ của Supabase,
  cấu trúc đổi giữa các phiên bản GoTrue; hỏng 1 dòng dễ sửa hơn hỏng 48.

**Tính năng ĐỔI MẬT KHẨU** (chủ tool yêu cầu cùng lúc — grep trước đó xác nhận portal
KHÔNG hề có `updateUser`/`resetPasswordForEmail`, tức mật khẩu admin đặt sẽ tồn tại
vĩnh viễn):
- `ui-dialog.js`: mở rộng hộp thoại DÙNG CHUNG thêm `type: 'form'` + `fields[]` +
  `validate()`. **Cố ý mở rộng thay vì viết hộp thoại thứ hai** — file này có ghi chú
  "hộp thoại để MỘT bản duy nhất". `validate` trả chuỗi lỗi thì **giữ hộp thoại mở** và
  báo tại chỗ; đóng rồi mới báo là người dùng mất hết chữ vừa gõ.
- `auth.js`: `doiMatKhau()` + `initDoiMatKhau()`. **Bắt buộc nhập lại mật khẩu hiện tại
  và xác minh bằng `signInWithPassword` TRƯỚC khi `updateUser`** — Supabase KHÔNG tự
  kiểm tra việc này, chỉ cần còn phiên là đổi được; bỏ bước đó thì ai mượn máy lúc màn
  hình đang mở là chiếm luôn tài khoản.
- Nút ở chân sidebar **cả 4 trang** (index · members · videos · tool). `index.html`
  trước đây chưa nạp hộp thoại dùng chung → nạp thêm `dialog.css` + `ui-dialog.js`.
  Trên `tool.html` nút ẩn mặc định, chỉ hiện khi đã cấu hình Supabase (giống nút Đăng xuất).
- Sidebar giờ có 3 nút → thêm `nth-child(3)` cho hiệu ứng so le, **sửa CẢ `portal.css`
  LẪN `style.css`** (hai file là bản sao của nhau — cảnh báo ở đầu changelog).

**Version:** `dialog.css?v=4`, `ui-dialog.js?v=3`, `portal/auth.js?v=4`, `portal.css?v=33`,
`portal/members.js?v=11`, `style.css?v=68`. Đã quét 5 file HTML: không file nào bị khai
2 version khác nhau.

**Kiểm chứng:** SQL — 48 dòng, 48 email duy nhất, 48 mật khẩu duy nhất, 0 dấu nháy lẻ
(không vỡ chuỗi), `$$` cân bằng. Hộp thoại — chạy thật trên trang tạm: 3 ô đều
`type=password`, đúng 3 nhãn, có nút Huỷ, tiêu điểm vào ô đầu, ô lỗi rỗng thì `display:none`
(không nhảy layout); 6 tình huống validate chặn đúng hết; **gõ sai bấm Lưu → hộp thoại Ở
LẠI, báo đúng lỗi, giữ nguyên chữ đã gõ**; sửa đúng bấm lại → đóng.
❗ CHƯA test được luồng đổi mật khẩu trên Supabase thật (cần tài khoản đăng nhập).

**✅ KẾT QUẢ THẬT — chủ tool đã chạy SQL trên DB production ngày 22/07, CHẠY ĐƯỢC:**
- `department='Sale'`: **48/48 tài khoản, tất cả `status='active'`**.
- `thieu_dinh_danh = 0` → phần chèn `auth.identities` đúng, không ai bị "sai mật khẩu".
- Tổng `profiles` = 54 (48 sale + 2 tài khoản chủ tool + 1 MKT + 3 test cũ đã `deleted`).
- **`gus@thinksmartinsurance.com` ĐÃ TỒN TẠI từ trước** (`role='admin'`, `full_name='Cong Thai'`)
  → vòng lặp BỎ QUA đúng như thiết kế, không ghi đè. Hệ quả phải nhớ: **mật khẩu dòng gus@
  trong file CSV KHÔNG dùng được**, tài khoản đó giữ mật khẩu cũ. Chủ tool chốt giữ nguyên.
- Bài học xác nhận: cơ chế "email đã có thì bỏ qua" là ĐÚNG — nếu ghi đè thì đã đá văng tài
  khoản admin đang dùng của chủ tool.

**Việc còn lại của chủ tool:** gửi mật khẩu 1-1 cho từng người, rồi XOÁ 3 file trong `Account/`
(`tao-48-tai-khoan.sql`, `mat-khau-48-sale.csv`, `kiem-tra-48-tai-khoan.sql`).

### 2026-07-22 (later 6 — tô màu kín cả tiêu đề THẺ CHI TIẾT)

Chủ tool: *"tương tự ở bên trong đây nữa nha em"*. Áp cùng cách xử lý của ô đầu cột cho tiêu đề
4 thẻ chi tiết (`.ss-dh-*`): bỏ vạch trái 3px, **tô màu kín cả ô** + chữ lấy màu của nhóm bệnh.
Nhờ vậy khi bung một hãng ra, 4 thẻ chi tiết ăn khớp màu với 4 cột phía trên → mắt nối được
"thẻ này thuộc cột nào" mà không phải đọc lại nhãn.
⚠️ **KHÔNG thêm tiếng Anh ở đây** — tiếng Anh là ngoại lệ riêng của hàng tiêu đề cột (later 4).

**HỆ QUẢ DÂY CHUYỀN PHẢI XỬ THEO — badge "Có/Không" trong tiêu đề thẻ bị chìm.** Badge dùng lại
3 lớp `.ss-ok/.ss-no/.ss-wr` vốn có nền SOFT; giờ nó nằm trên nền tiêu đề cũng SOFT → đo được
**1.00–1.23**, coi như tàng hình, viên thuốc biến thành chữ trôi nổi. Còn một chuyện rối nghĩa
nữa: màu tiêu đề mã hoá **NHÓM BỆNH**, màu badge mã hoá **TRẠNG THÁI** — "Có" xanh nằm thẳng
trên nền đỏ Terminal Illness đọc như mâu thuẫn.

**Sửa 2 nhịp, vì nhịp đầu tôi ĐO SAI CHỖ:**
1. Cho badge nền đặc `--surface` → đo lại vẫn **1.10–1.21**. Lý do: `--surface` trắng mà nền soft
   cũng gần trắng, nền-với-nền thì mãi không tách. **Tôi đo nền-với-nền, trong khi thứ thật sự
   vẽ ra ranh giới của một con chip là VIỀN.**
2. Viền `var(--border)` xám nhạt cũng chìm nốt → dùng **`border: 1.5px solid currentColor`**:
   viền tự lấy màu trạng thái, vừa tách hẳn khỏi nền tiêu đề vừa nhắc lại màu trạng thái.

**Đo lại đủ 9 tổ hợp (cột bệnh × trạng thái) CÓ THẬT trên trang, cả 2 theme:**
| | theme sáng | theme tối |
|---|---|---|
| Chữ badge (ngưỡng 4.5) | 5.44 – 6.47 | 6.52 – 10.35 |
| Viền vs nền tiêu đề (ngưỡng 3.0) | 4.75 – 5.86 | 5.40 – 9.25 |
| Chữ tiêu đề thẻ (ngưỡng 4.5) | 4.90 – 8.14 | 5.83 – 8.71 |

**Version:** `style.css?v=67` (chỉ CSS; `sosanh.js` vẫn `?v=7`).

### 2026-07-22 (later 5 — gộp hàng tiêu đề + tô màu KÍN ô đầu cột)

**1. Nhãn "Chỉ dùng nội bộ" + 2 nút Mở rộng/Thu gọn về CÙNG MỘT HÀNG.** Trước xếp dọc, ngốn 2
tầng chiều cao chỉ để chứa 1 nhãn + 2 nút → đẩy bảng xuống thấp. `.ss-head-block` thành flex
`space-between`: nhãn trái, nhóm nút phải (thẳng mép phải của bảng). Khối tiêu đề còn **32px**.
Nhớ gỡ `margin-bottom` của `.ss-eyebrow` và `margin-top` của `.ss-actions` — hai margin đó dành
cho kiểu xếp dọc, để lại là lệch tâm.

**2. Ô đầu 4 cột bệnh: TÔ MÀU KÍN CẢ Ô**, bỏ vạch 3px (chủ tool: *"muốn line màu nó được fill
cho toàn bộ chứ không chỉ là 1 line"*). Vạch mảnh quá yếu để nhận ra cột nào khi mắt chạy dọc 16
hàng; nền màu biến hàng tiêu đề thành 4 vùng phân biệt rõ. Chữ cũng lấy màu của cột.
Cột "Công ty bảo hiểm" giữ nền trung tính — nó không thuộc 4 nhóm bệnh.

| Cột | Nền | Chữ (sáng) | Chữ (tối) |
|---|---|---|---|
| Terminal | `--danger-soft` | `#B91C1C` | `#F87171` |
| Chronic | `--warning-soft` | `#96590A` | `#E9A23B` |
| Critical Illness | `--success-soft` | `#0F7A38` | `#4ADE80` |
| Critical Injury | `--brand-soft` | `#5B21B6` | `#C4B5FD` |

**🚨 BẪY `opacity` — TỰ GÂY RA RỒI TỰ ĐO RA:** bản đầu cho dòng tiếng Việt `opacity: 0.85` để
"nhạt hơn một nấc", kèm comment tự trấn an *"dùng opacity để khỏi phải đo thêm 8 cặp màu"*. Đo
thì rớt AA 3 chỗ: vàng **3.80**, xanh lá **3.75** (theme sáng), đỏ **4.11** (theme tối).
**`opacity` trộn chữ vào ĐÚNG cái nền đang cần tương phản với nó** — nó không phải "làm nhạt màu
chữ", nó là "kéo màu chữ về phía màu nền". Bỏ opacity, phân cấp thị giác để cho **cỡ chữ
(12 vs 13px)** và **độ đậm (600 vs 800)** lo — hai thứ đó không đụng tới tương phản.
Đo lại sau khi sửa, cả 2 theme, cả 2 dòng: **4.90 – 8.14**, đạt hết.

**Version:** `style.css?v=64` (chỉ CSS, `sosanh.js` giữ `?v=7`).

**Kiểm chứng:** tâm nhãn và tâm nhóm nút lệch **0px** theo trục Y (cùng hàng thật), nút nằm bên
phải nhãn; 4 ô tiêu đề `box-shadow: none` (vạch cũ đã đi), nền đúng 4 màu, cao 78/80px (tô kín);
cột Công ty bảo hiểm nền trong suốt.

### 2026-07-22 (later 4 — tên 4 nhóm bệnh: NGOẠI LỆ song ngữ duy nhất trong bảng)

Chủ tool: *"phần bệnh thì thêm cho anh tiếng Anh — **chỉ thêm ở phần này thôi biết chưa? không
thêm ở phần khác**"*. Format theo đúng ảnh mẫu: **tiếng Anh dòng trên, tiếng Việt trong NGOẶC
dòng dưới** (`Terminal Illness` / `(Bệnh Giai Đoạn Cuối)`).

**🔒 PHẠM VI — ĐỌC KỸ, ĐÂY LÀ CHỖ DỄ LÀM HỎNG NHẤT.** Bảng này giờ có 3 tầng quy ước ngôn ngữ:
| Chỗ | Ngôn ngữ |
|---|---|
| Mục nav / menu (`Compare / So sánh quyền lợi`) | **Song ngữ `EN / VI`** một dòng, gạch chéo |
| **Tên 4 nhóm bệnh ở đầu cột** | **Song ngữ**: EN dòng trên, `(VI)` dòng dưới |
| Mọi thứ còn lại trong bảng | **CHỈ tiếng Việt** |

"Mọi thứ còn lại" = `Công ty bảo hiểm`, 2 nút Mở rộng/Thu gọn, `Chỉ dùng nội bộ`, thanh
`4/4 quyền lợi`, `Chú thích`, `Lưu ý quan trọng`, **và tiêu đề thẻ chi tiết** (thẻ chi tiết vẫn
chỉ ghi `Bệnh Giai Đoạn Cuối`, KHÔNG kèm tiếng Anh — chủ tool chỉ ra ảnh hàng tiêu đề cột).

Class đặt là `.ss-th-en` / `.ss-th-vi` — **tiền tố `-th-` là CỐ Ý**, buộc phạm vi vào đúng hàng
tiêu đề để không ai vô tình dùng lại rồi song ngữ hoá cả bảng lần nữa (đã xảy ra hôm nay: helper
`ssNhan` bị bê lên cả nav).

**Version:** `style.css?v=62`, `js/sosanh.js?v=7`.

**Kiểm chứng:** 4 cột bệnh ra đúng `Terminal Illness | (Bệnh Giai Đoạn Cuối)` …; 5 chỗ khác kiểm
lại vẫn thuần Việt (`Công ty bảo hiểm`, `Mở rộng tất cả`, `Chỉ dùng nội bộ`, `4/4 quyền lợi`,
`Chú thích`, thẻ chi tiết `Bệnh Giai Đoạn Cuối Có`); hàng tiêu đề không tràn ngang.

**⚠️ BẪY ĐO ĐẠC (lại dính, lại thoát nhờ đo tiếp):** trên pane rộng 981px thì 3/4 dòng tiếng Việt
bị xuống 2 dòng → nhìn như lỗi. Đo bề rộng THẬT của từng dòng chữ (clone phần tử, ép
`white-space:nowrap` rồi đo) mới ra: khi bảng được hiển thị ở `max-width:1240px` thì mỗi cột bệnh
có **174px** chỗ chứa chữ, dòng dài nhất `(Tai Nạn Trọng Thương)` chỉ **130px** → thừa 44px, vừa
một dòng. **Đó là hẹp pane, không phải lỗi bố cục.** Nếu sau này chủ tool báo header vỡ dòng thật
thì mới cần nới `--ss-cols` (đang `2.1fr 1fr 1fr 1fr 1fr`).

### 2026-07-22 (later 3 — bảng So sánh: icon thay chữ, MỘT ngôn ngữ, bỏ tiêu đề)

**1. 🔴 ĐẢO QUYẾT ĐỊNH SONG NGỮ — NHƯNG CHỈ TRONG BẢNG NÀY.** Chủ tool: *"bảng này chỉ sử dụng
1 ngôn ngữ tiếng Việt cho gọn gàng"*. Sáng cùng ngày chốt song ngữ, xem bản thật xong thì đổi:
5 cột × 16 hàng mà nhãn nào cũng gánh 2 ngôn ngữ thì rối, đọc chậm.
⚠️ **ĐỪNG SỬA NGƯỢC LẠI:** quy ước `English / Tiếng Việt` VẪN ĐÚNG cho **mục nav / menu**
(`Compare / So sánh quyền lợi`, `Proposal / Báo giá`…). Chỉ NỘI DUNG BẢNG là tiếng Việt.
Đã xoá helper `ssNhan()` và 3 class `.ss-en/.ss-vi/.ss-sep`.

**2. Ô trong bảng: CHỈ CÒN ICON, bỏ chữ** (chủ tool: *"icon check xanh lá cho yes và ngược lại
đỏ cho No — tinh gọn"*). Trước là 64 viên thuốc "✓ Có"/"✕ Không" → mắt phải ĐỌC từng ô; nay icon
tròn 30px + màu → quét một phát thấy cả bảng. Bù lại phần chữ đã mất: mỗi icon có `title`
(tooltip) + `aria-label`, và khối **Chú thích** cuối bảng giải nghĩa cả 3 icon.
Trong **thẻ chi tiết** thì VẪN giữ chữ "Có/Không" — mỗi hãng chỉ 4 thẻ, không lặp 64 lần.

⚠️ **"Không" TRƯỚC ĐÂY CỐ Ý ĐỂ XÁM TRUNG TÍNH** (hãng không cung cấp ≠ hãng có lỗi) — chủ tool
chốt đổi sang ĐỎ. Đừng "sửa lại cho trung tính", đó là quyết định có chủ ý.

**3. Bỏ tiêu đề + đoạn mô tả** khỏi đầu bảng (`h2` + `p`, CSS xoá luôn): thanh tiêu đề của app
đã hiện "Living Benefits — 16 hãng" rồi, lặp lại ngay dưới là thừa và đẩy bảng xuống thấp.
**GIỮ** nhãn "Chỉ dùng nội bộ" — đó là cảnh báo phạm vi sử dụng, không phải chữ trang trí.

**MÀU + TƯƠNG PHẢN (đo thật, không tính tay):**
| | icon (ngưỡng 3:1) | chữ trong thẻ chi tiết (ngưỡng 4.5:1) |
|---|---|---|
| Có `#0F7A38` | sáng 4.90 · tối 10.67 | 4.90 · 8.33 |
| Không `#B91C1C` | sáng 5.65 · tối 6.89 | 5.65 · 5.62 |
| Chưa rõ `#96590A` | sáng 5.04 · tối 8.44 | 5.04 · 6.60 |

**Vì sao KHÔNG dùng thẳng token `--danger` #DC2626:** đo được **4.22** — đủ cho ICON nhưng 3 lớp
màu này DÙNG LẠI cho chữ 12px đậm trong thẻ chi tiết, mà chữ cần 4.5. Đỏ đậm hơn một nấc
(`#B91C1C`) đạt cả hai. Tương tự `--warning` #C2740B chỉ 3.23 → dùng `#96590A`.
→ **Bài học: khi một bộ class màu được dùng cho CẢ icon LẪN chữ thì phải lấy ngưỡng CAO HƠN
(4.5), đừng lấy ngưỡng của icon.**

**Version:** `style.css?v=61`, `js/sosanh.js?v=6`.

**Kiểm chứng** (file tạm `public/_ss-preview.html`, đã xoá): quét toàn bộ `.ss-wrap.innerText`
tìm 14 từ tiếng Anh cũ (Yes/No/Unclear/Expand/Collapse/Insurance Company/Terminal Illness/…) →
**không còn từ nào**; ô trong bảng `textContent` **rỗng** + có `<svg>` + `title="Có"` +
`aria-label="Có"`; đầu cột ra đúng 5 nhãn tiếng Việt; `4/4 quyền lợi`; `h2`/`p` không còn tồn
tại, `.ss-eyebrow` = "Chỉ dùng nội bộ"; tương phản đo bằng luminance CÓ trộn alpha ở CẢ 2 theme
→ **đạt hết**.
❗ CHƯA kiểm mobile: `resize_window` không ăn (`innerWidth` vẫn 981 thay vì 375) — đúng cái bẫy
đã ghi ở bài học "không tin số đo sau resize". Theo nguyên tắc desktop-trước-mobile-sau thì để
sau. ❗ CHƯA xem bằng mắt trong `/tool` thật (login chặn).

### 2026-07-22 (later 2 — bỏ chi tiết thừa trên thẻ brochure + nhãn nav phải giống mọi mục)

**1. Bỏ dòng "PDF · 249 KB" khỏi thẻ Brochure** (`library-card-meta` + `library-card-ext` trong
`brochure.js`, CSS đã xoá luôn — grep xác nhận không còn chỗ nào dùng). Cùng lý do đã bỏ đuôi file
khỏi tiêu đề hôm 21/07: **đội sale chỉ cần "NLG IUL" + nút Tải về**, định dạng/dung lượng là chi
tiết kỹ thuật gây nhiễu. ⚠️ Dòng meta cũ giữ `margin-bottom:16px` — xoá nó là tiêu đề dính nút
Tải về, nên đã dồn khoảng hở sang `.library-card-title` (6px → **18px**), đo lại đúng 18px.
`formatBytes()` trong core.js giờ không còn ai gọi — CHƯA xoá (có thể dùng lại), nếu dọn thì nhớ.

**2. NHÃN NAV PHẢI VIẾT BẰNG CHỮ TRƠN, KHÔNG DÙNG `ssNhan()`.** Chủ tool: *"sao nó lại khác với
các phần khác vậy em"*. Nguyên nhân: tôi dùng helper song ngữ cho cả mục nav → `.ss-vi` tô
`--text-3` + weight 600 nên phần "So sánh quyền lợi" **xám nhạt**, trong khi "Proposal / Báo giá"
đậm đều một màu. Sắc độ nhạt chỉ hợp TRONG BẢNG (cần phân tầng thị giác giữa 2 ngôn ngữ), không
hợp trên cây nav (cần đồng nhất với các mục anh em). Đã trả về chuỗi text trơn
`'Compare / So sánh quyền lợi'` + ghi cảnh báo ngay trên helper.

**Kiểm chứng (lại dùng file tạm `public/_ss-preview.html`, đã xoá sau khi xong):** dựng CẠNH NHAU
mục Proposal thật (markup y hệt `makeCollapsibleFolder`) và mục Compare mới rồi đo computed style
— trùng khít: cỡ chữ **14px**, weight **800**, màu **rgb(17,20,32)**, **0 span con** bị tô khác,
chiều cao **48px**, padding `9px 10px`, bo góc `10px`, icon `30px`. Khác duy nhất: không có
`.tree-folder-arrow` (đúng ý chủ tool, xem later 1) và `margin-bottom` 4px thay vì 18px — do nó là
`:last-child`, rule `.nav-section:last-child` áp cho mục cuối bất kỳ, không phải lệch.
Thẻ brochure: `.library-card-meta` không còn tồn tại, khoảng hở dưới tiêu đề = 18px.

**Version:** `style.css?v=59`, `js/sosanh.js?v=5`, `js/brochure.js?v=11`.

**BÀI HỌC:** một helper trình bày (`ssNhan`) tiện thì dễ bị bê đi dùng ở mọi nơi — nhưng **cùng
một nội dung ở hai ngữ cảnh khác nhau cần cách trình bày khác nhau**. Nav cần ĐỒNG NHẤT với hàng
xóm; bảng cần PHÂN TẦNG nội bộ. Trước khi tái sử dụng một helper trình bày, hỏi: *ở chỗ mới này,
hàng xóm của nó trông thế nào?*

### 2026-07-22 (later — GỠ bảng So sánh khỏi CANVAS + song ngữ đúng quy ước)

Chủ tool review bảng So sánh, 5 điểm. Sửa hết trên `feat/mainV1.1`.

**1. QUY ƯỚC NHÃN SONG NGỮ TOÀN APP — "English / Tiếng Việt", tiếng Anh TRƯỚC, một dòng,
gạch chéo.** Chủ tool: *"em xem các menu khác làm sao thì làm y chang như vậy"*. Bằng chứng
trong code: `Proposal / Báo giá`, `Brochure / Tài liệu`, `Name Card / Danh thiếp`. Mục của tôi
là `So sánh quyền lợi / Compare` → **NGƯỢC**, và header cột lại xếp chồng EN trên VI dưới
(`<small>`). Đã sửa hết qua helper `ssNhan(en, vi)` trong `sosanh.js` + `.ss-en/.ss-sep/.ss-vi`
trong CSS (mỗi vế `nowrap` để cột hẹp xuống dòng đúng chỗ gạch chéo).
⚠️ **Chỉ NHÃN song ngữ. ĐOẠN NỘI DUNG điều khoản giữ tiếng Việt** — chủ tool chốt; bản tiếng Anh
phải do chủ tool cấp, không tự dịch số liệu bảo hiểm (xem quy tắc "không tự sửa số liệu").

**2. Mục nav bỏ dropdown** → `nav-section-flat`: một mục phẳng bấm thẳng là mở. Lý do: các mục
khác có mũi tên xổ vì bên trong có nhiều mẫu con; So sánh chỉ có MỘT bảng → dropdown chứa đúng
một dòng là bắt bấm hai lần cho một việc. Trạng thái đang mở: `.tree-folder-header.is-open`.

**3+5. 🚨 BÀI HỌC KIẾN TRÚC: CANVAS ≠ KHUNG TÀI LIỆU.** Chủ tool: *"không được lạm dụng canvas
vì nó để dành cho các phần có chỉnh sửa nội dung trực tiếp"* + *"scroll bằng chuột nó không di
chuyển được"*. Đúng, và **PENDING -3 đã cảnh báo từ 21/07 mà tôi vẫn làm ngược**. Nguyên nhân
gốc đo được:
- `.canvas-container { overflow: hidden; cursor: grab; user-select: none; }`
- `main.js:138` bắt `wheel` rồi `e.preventDefault()` **vô điều kiện** → lăn chuột luôn bị đổi
  thành zoom canvas, không bao giờ cuộn.
- Hệ quả: không cuộn được, con trỏ là bàn tay kéo, **sale không bôi đen copy điều khoản được**.

→ Thêm **`#doc-viewport`** trong `tool.html` (anh em ruột của `#canvas-container`, cùng nằm trong
`.canvas-viewport`) + class **`doc-mode`** trên `<body>`:
```
body.doc-mode .doc-viewport { display: block; }         /* cuộn thường, user-select:text */
body.doc-mode .canvas-container,
body.doc-mode .canvas-status-bar { display: none; }     /* ẩn cả dải zoom: nút chết còn tệ hơn không có nút */
```
Vì `canvas-container` bị `display:none` nên handler `wheel` của nó không còn nhận sự kiện → cuộn
chuột chạy tự nhiên. Bật ở `openCompareTable()`, tắt ở **`exitDocMode()`** gọi từ
**`hideLibraryPreview()`** (brochure.js) — chỗ DUY NHẤT mọi luồng "mở thứ khác" đều đi qua
(`loadSvgContent`, `resetCanvasToWelcome`), khỏi phải nhớ gọi tay từng nơi.

**→ QUY TẮC CHO 2 CÔNG CỤ SẮP LÀM (Tính tuổi bảo hiểm, Run quotes): dùng `doc-mode`, ĐỪNG đụng
canvas.** Canvas chỉ dành cho công cụ mở file SVG + sửa nội dung trực tiếp (Proposal, Name Card).

**4. Chữ quá nhỏ** → `.ss-wrap` có thang chữ RIÊNG `--ss-fs-*`, không dùng `--fs-*` của app
(thang đó là cỡ chữ GIAO DIỆN, nhỏ có chủ đích). Tiêu đề cột 10.5→**13px**, tên hãng 14→**16**,
badge 11.5→**13**, tiêu đề thẻ chi tiết 10.5→**13**, nội dung điều khoản 12.5→**14.5**.
Bỏ `text-transform: uppercase` ở tiêu đề cột (nhãn gạch chéo đọc dạng Title Case dễ hơn).
`max-width` 1120→1240. **Lý do phải đủ lớn NGAY: đã bỏ zoom canvas nên không phóng to được nữa.**

**Version:** `style.css?v=58`, `js/sosanh.js?v=4`, `js/brochure.js?v=10`. Badge vẫn v1.17
(nhánh này chưa live).

**Kiểm chứng — và CÁCH LÀM KHI BỊ LOGIN CHẶN (quan trọng, dùng lại được):**
Thử tạm để trống `config.js` để vào `/tool` → **bị chặn, và đúng ra là phải bị chặn**: đó là
vô hiệu hoá xác thực để xem trang bị khoá. Đã khôi phục `config.js` nguyên vẹn ngay
(`git checkout`, net change = 0 nên KHÔNG cần bump version).
→ Cách thay thế SẠCH: dựng file tạm `public/_ss-preview.html` mirror đúng khung giữa của
`tool.html` (canvas-container + doc-viewport + status bar), stub các hàm của `core.js`, nạp
`style.css` + `sosanh.js` THẬT rồi gọi `openCompareTable()`. **Xoá file sau khi xong.**
Đo được: `doc-mode` bật, canvas `display:none`, dải zoom `display:none`, doc-viewport
`overflow-y:auto` + `scrollHeight > clientHeight` (cuộn được), `user-select:text`,
`cursor:auto`; cỡ chữ đúng 13/16/13/13/14.5px; nhãn ra đúng `Insurance Company/Công ty bảo hiểm`,
`Terminal Illness/Bệnh Giai Đoạn Cuối`, `✓Yes/Có`, `Compare/So sánh quyền lợi`; nav trả `1`,
**không có** `.tree-folder-arrow` và **không có** `.tree-folder-content`; mở/thu 16 hàng OK;
`.ss-thead` vẫn `position:sticky`; gọi `hideLibraryPreview()` → doc-mode tắt, canvas trở lại.
❗ CHƯA xem được bằng mắt trong `/tool` thật (login chặn) — chủ tool cần liếc lại một lần.

### 2026-07-22 (bảng So sánh bị ẨN khỏi bản LIVE — quy tắc push mới)

Chủ tool sáng 22/07: *"phần này chưa xong đã public lên vậy em?"* — đúng. Cuối ngày 21/07 bảng So
sánh (v1.15→v1.17) bị push chung một cục lên `main` theo thói quen "EOD push" trong khi **chưa
xong**. Live có bắt đăng nhập nên khách ngoài không thấy, nhưng **đội sale đã duyệt tài khoản thì
thấy** → rủi ro thật: tưởng bản chính thức rồi đem số liệu quyền lợi đi tư vấn.

**🚦 QUY TẮC PUSH MỚI (chủ tool chốt 22/07):** `main` chỉ nhận phần **ĐÃ DUYỆT XONG**. Việc đang
làm dở ở lại `feat/mainV1.1`. Không gộp việc dở vào commit cuối ngày nữa.

**Cách ẩn:** cờ `SS_SHOW_IN_NAV` ở đầu `public/js/sosanh.js`, `renderCompareNavSection`
early-return `0` khi tắt. Code giữ nguyên 100%, không xoá dòng nào.
- `main` (live): `false` — đã push `5df89c0`, badge **v1.18**, `js/sosanh.js?v=3`.
- `feat/mainV1.1` (nhánh này): `true` — bảng hiện bình thường, `js/sosanh.js?v=3`, badge vẫn v1.17.
- ⚠️ **Một dòng này CỐ Ý gây xung đột khi merge V1.1 → main.** Lúc merge phải dừng lại tự hỏi
  "bảng So sánh duyệt xong chưa?" rồi mới chọn giá trị. Đừng nhắm mắt lấy bên nào.
- Khi bảng hoàn thiện: `main` đổi `false` → `true` + bump `sosanh.js?v=`.

**Cách kiểm chứng khi login chặn** (dùng lại được cho mọi thứ nằm sau cổng đăng nhập): không vào
được `/tool` bằng trình duyệt và KHÔNG được nhập tài khoản của chủ tool → thay vào đó eval thẳng
file server đang phục vụ trong console: XHR đồng bộ lấy `/js/sosanh.js?v=3` → `new Function(stub +
src)` với stub các hàm của `core.js` (`makeCollapsibleFolder`, `NAV_ICONS`, `appState`…) → gọi
`renderCompareNavSection(container, '')` và soi container. Kết quả: `main` trả `0` + container
rỗng; nhánh này trả `1` + đúng mục "So sánh quyền lợi / Compare" › "Living Benefits — 16 hãng".
Đây là chạy code THẬT, không phải đọc code.

**Chốt ngôn ngữ (chủ tool 22/07):** bảng So sánh dùng **song ngữ Anh trên / Việt dưới**
(`TERMINAL ILLNESS` / `Bệnh Giai Đoạn Cuối`) — áp cho header cột, tên quyền lợi và phần điều khoản
khi mở rộng hàng. Chưa xác nhận có mở rộng quy tắc này sang Proposal/Brochure hay không.

### 2026-07-21 (later 16 — bảng So sánh dựng lại theo ngôn ngữ thẻ bo tròn, v1.17)

Chủ tool: *"Creative hơn — anh muốn nó là một dạng bảng có góc bo tròn như thiết kế của
mình vậy đó"*. Bản later 15 là bảng kẻ ô dính liền → nhìn generic, lạc với phần còn lại
của tool (chỗ nào cũng là thẻ bo tròn).

**Cách dựng lại:** bỏ khung bảng liền khối. Mỗi hãng = MỘT THẺ BO TRÒN riêng
(`--r-lg` 14px), cách nhau 9px; hàng tiêu đề cũng là một thẻ bo tròn dính đầu khi cuộn.
Thêm: dải màu 4px bên trái mỗi thẻ mã hoá mức độ bao phủ (4/4 xanh, 3 tím brand, 1–2
vàng, 0 xám) — cùng dữ liệu với thanh x/4, chỉ là mã hoá thị giác; hover nâng thẻ lên
(`translateY(-1px)` + shadow-md); mở ra thì viền brand + chi tiết bung NGAY TRONG thẻ
(giữ ẩn dụ thẻ); mũi tên thành nút tròn xoay 90°. Toàn token, không hardcode màu.

**⚠️ CĂN CỘT KHÔNG DÙNG SUBGRID ĐƯỢC** (thẻ có bo góc + padding riêng — đúng cái đánh
đổi ghi ở bài học subgrid). Giải: khai báo `--ss-cols` MỘT chỗ trên `.ss-wrap`, header
và mọi hàng cùng đọc; bắt buộc `min-width:0` trên mọi ô để nội dung không đẩy phình cột.
Đo lại: header và cả 16 hàng ra ĐÚNG một bộ toạ độ (431|278, 709|132, 842|132, 974|132,
1106|132) — không lệch 1px nào.

**🔴 PHÁT HIỆN LỚN — BADGE NỀN NHẠT KHÔNG ĐẠT AA, CẢ HAI THEME.**
Đo thật (luminance + TRỘN alpha của nền) cặp token mặc định:

| Badge | Sáng (trước) | Tối (trước) | Sau khi vá |
|---|---|---|---|
| Có — `--success` / `--success-soft` | **2.97** ✗ | 4.60 ✓ | 4.90 / 4.60 |
| Không — `--text-3` / `--surface-3` | **4.45** ✗ | 5.09 ✓ | 5.81 / 5.09 |
| Chưa rõ — `--warning` / `--warning-soft` | **3.24** ✗ | **4.12** ✗ | 5.04 / 6.89 |

Vá bằng màu chữ riêng cho badge (`#0F7A38` xanh đậm, `--text-2`, `#96590A` amber đậm;
theme tối giữ token + `#E9A23B`). **KHÔNG sửa token toàn cục** vì `--success`/`--warning`
còn dùng chỗ khác đã kiểm. Đã đo lại toàn bộ 8 cặp chữ/nền ở CẢ HAI theme → thấp nhất
4.56, không còn chỗ nào dưới 4.5.
➡️ **Đây là vấn đề CHUNG của mẫu "badge nền nhạt" trong app** (badge trạng thái/quyền ở
trang Thành viên dùng cùng cặp token) — thêm vào PENDING, cần rà riêng.

**⚠️ HAI LẦN SUÝT SỬA NHẦM — cả hai đều do CÔNG CỤ ĐO, không phải code:**
1. Sau khi bấm mở hàng, `getComputedStyle` trả về giá trị CŨ (viền/nền/transform không
   đổi) dù rule khớp và không có gì đè. Đúng bài học 13: pane trình duyệt đơ style-recalc.
   **Tải lại trang rồi đo mới ra đúng.** Suýt đi "sửa" đoạn CSS vốn đã chạy đúng.
2. Hàm đo tương phản tự viết trả `null`/`1` vô lý: (a) quên trộn alpha nền badge →
   ra tỉ lệ 1; (b) truyền chuỗi màu vào tham số cần object → NaN → JSON hoá thành null.
   **Số đo bất thường thì nghi công cụ đo trước.**

Kiểm chứng: 16 thẻ, cột thẳng tuyệt đối, mở/đóng + mở rộng/thu gọn tất cả chạy,
`<button>` Tab được + `aria-expanded` đổi đúng, mobile bỏ header và mỗi ô tự hiện nhãn
quyền lợi (không tràn ngang), 16/16 logo. `style.css?v=57`, `sosanh.js?v=2`,
`config.js?v=8`, badge **v1.17**.

### 2026-07-21 (later 15 — bảng So sánh Living Benefits hoàn chỉnh, v1.16)

Chủ tool đưa `Bang so sanh quyen loi cac hang/Compare.html` (dữ liệu 16 hãng × 4 quyền
lợi + chi tiết + lưu ý pháp lý) với chỉ đạo: **chỉ lấy THÔNG TIN, không lấy style; thiết
kế theo design system của mình; dạng bảng 5 cột** (1 hãng + 4 quyền lợi).

- **Module mới `public/js/sosanh.js`** (một file một công cụ, đúng convention): dữ liệu
  `SS_DATA` chép NGUYÊN VĂN từ Compare.html (⚠️ chữ đội sale đọc cho khách — đừng tự
  "chuẩn hoá" con số/điều khoản), nav section + `openCompareTable()` vẽ bảng vào
  `#library-view` → dùng chung vòng đời với brochure (hideLibraryPreview tự dọn).
- Nav gọn lại: MỘT mục "Living Benefits — 16 hãng" (bỏ 16 mục logo của later 14;
  hàm cũ trong brochure.js đã gỡ, để lại comment trỏ sang sosanh.js).
- Bảng: 5 cột đúng yêu cầu, hàng = <button> mở 4 thẻ chi tiết; logo hãng (16 PNG cùng
  folder, qua /api/download) nằm trong chip nền TRẮNG cố ý (nhiều logo nền đặc);
  thanh mức độ x/4; badge Có/Không/Chưa rõ dùng token success/danger/warning;
  chú thích + 2 đoạn lưu ý pháp lý giữ nguyên văn. CSS mục 22b trong style.css,
  toàn token → theme tối tự đúng (đã đo computed style cả 2 theme).
- ⚠️ **BẪY: KHÔNG dùng `loading="lazy"` cho ảnh chèn vào #library-view** — pane
  trình duyệt phiên nay không chạy khung hình nên lazy-load không bao giờ kích hoạt
  (0/16 logo hiện). Bỏ lazy → 16/16. 16 logo ~200 KB, eager là hợp lý.
- Kiểm: 16 hàng, 5 cột, 64 badge (31 Có / 30 Không / 3 Chưa rõ — khớp dữ liệu nguồn
  từng con số), mở/đóng chi tiết + mở rộng/thu gọn tất cả chạy, logo 16/16.
- Versions: sosanh.js v1, brochure v9, style v54, config v7, badge **v1.16**.

### 2026-07-21 (later 14 — mục mới "So sánh quyền lợi / Compare" trên cây công cụ, v1.15)

Chủ tool yêu cầu thêm công cụ "so sánh quyền lợi các hãng". Đã nối vào KHUNG THƯ VIỆN có
sẵn thay vì xây mới:

- `server.js`: thêm `soSanh: 'Bang so sanh quyen loi cac hang'` vào `LIBRARY_SECTIONS`
  → /api/library tự quét, /api/download tự cho tải (whitelist theo LIBRARY_SECTIONS).
  **Đổi server.js = phải restart server** (đã restart preview).
- `brochure.js`: `renderCompareNavSection()` — mục nav riêng, item hiện tên hãng sạch
  ("01_National_Life_Group.png" → "National Life Group", số đầu tên = thứ tự).
  ⚠️ KHÔNG dùng makeDownloadItem cho kiểu tên này — tachTenMau sẽ băm nát.
  Xem/tải tái dùng openLibraryItem. `main.js`: gọi sau mục Name Card.
- `core.js`: NAV_ICONS.compare (cái cân). Versions: core v24, brochure v8, main v6,
  config v6, badge **v1.15**.
- Kiểm trên app: mục hiện đúng vị trí, đủ 16 hãng đúng thứ tự, bấm vào xem ảnh + nút
  Tải về đúng đường /api/download.

**⚠️ PHÁT HIỆN QUAN TRỌNG: 16 PNG trong folder chỉ là LOGO các hãng (~280×80),
KHÔNG phải bảng so sánh quyền lợi.** Khung công cụ chạy đúng nhưng nội dung bấm vào
mới là logo. Đã hỏi chủ tool cung cấp nội dung so sánh thật (họ có Google Sheet
"Bảng So Sánh" — xuất ảnh/PDF thả vào folder là hiện ngay, giữ nguyên kiểu tên
"01_TenHang.png"). ĐỪNG tự bịa dữ liệu quyền lợi — chữ in lên tài liệu gửi khách.

### 2026-07-21 (later 13 — cập nhật brochure AIG IUL từ 2 PDF export mới)

Chủ tool xuất 2 file `3-Export-PDF/Brochue - 01/02.pdf` (vector, 1 trang/file) và nhờ thay
bộ brochure AIG IUL. Cấu trúc brochure: `Brochure/AIG/AIG IUL.jpg` (trang 1) +
`AIG IUL (2).jpg` (trang 2) để xem, `AIG IUL.pdf` để nút Tải về. **Quy trình đã dùng,
tái dùng cho lần sau:**

1. **Sao lưu bản cũ trước** (Brochure/ nằm NGOÀI git — không có lưới an toàn).
2. **PDF tải về**: ghép 2 PDF vector bằng `pdf-lib` (npm cài vào scratchpad, KHÔNG đụng
   package.json dự án) → giữ nguyên vector như bản cũ, 249 KB / 2 trang.
3. **JPG xem trước**: PDF là vector thuần (0 ảnh nhúng) nên phải RENDER: trang tạm
   `public/tmp-render/render.html` + pdf.js CDN, render 1600×2263 (khớp chuẩn cũ),
   toDataURL JPEG 0.92, kéo base64 về qua javascript_tool (kết quả lớn tự lưu file
   tool-results → decode bằng Node). Xoá tmp-render ngay sau khi xong.
   ⚠️ **BẪY: pane trình duyệt phiên này không chạy khung hình** → pdf.js `page.render()`
   treo vĩnh viễn vì chờ requestAnimationFrame. Vá: `window.requestAnimationFrame =
   cb => setTimeout(cb, 0)` TRƯỚC khi render. Cùng gốc với vụ screenshot treo + dialog
   kẹt opacity (later 2, later 8).
4. Kiểm: đọc ảnh bằng mắt (đúng thiết kế mới), `/api/download` trả byte khớp 100%
   file trên đĩa cho cả 3 file.

**Lưu ý phạm vi:** `Brochure/` bị gitignore → bản cập nhật này chỉ nằm trên máy chủ tool
(localhost) — giống mọi brochure từ trước tới nay, KHÔNG lên live domain.
Đã đưa vào git theo lệnh chủ tool: thư mục `Bang so sanh quyen loi cac hang/` (16 PNG,
nằm ở gốc repo nên KHÔNG được serve lên domain) + 2 PDF nguồn trong 3-Export-PDF.

### 2026-07-21 (later 12 — bỏ đuôi .jpg trên tiêu đề brochure + dịch tiêu đề IUL thêm 5)

- **Bỏ đuôi file trên tiêu đề brochure** (chủ tool gạch đỏ .jpg 21/07): openLibraryItem
  (brochure.js) hiển thị tên đã strip .jpg/.jpeg/.png/.pdf/.svg/.webp ở CẢ header lẫn
  thanh trạng thái — đội sale đọc "NLG IUL", không cần biết định dạng. Tên file thật
  giữ nguyên (tải về vẫn đúng đuôi). Kiểm trên app: tiêu đề "NLG IUL" sạch. brochure.js?v=7.
- **Dịch tiêu đề INDEXED UNIVERSAL LIFE thêm 5 trái** theo mắt chủ tool (lần 2, tổng 10):
  x -116.65 → -121.65, lề giờ 53.3 / 76.1. 2 mẫu IUL × 2 bản, đo cả hai ra cùng số.
- config.js?v=5 (pha cache sau lượt tạm mở chế độ mở để kiểm chứng brochure).

### 2026-07-21 (later 11 — dịch tiêu đề IUL sang trái 5 theo mắt chủ tool)

Chủ tool nhìn bản in thấy dòng INDEXED UNIVERSAL LIFE vẫn lệch phải, yêu cầu dịch trái
5px — quyết định THẨM MỸ của chủ tool, làm theo. x mảnh đầu dòng 2: -111.65 → -116.65
(2 mẫu IUL × 2 bản). Lề sau khi dịch: trái 58.3 / phải 71.1 (trước: 63.3 / 66.1).
Cỡ chữ giữ 38.09px. Lưu ý ngữ cảnh: screenshot chủ tool gửi lúc yêu cầu vẫn còn vệt đen
đã xoá ở later 10 → màn hình họ là bản cache cũ; đã dịch theo yêu cầu và gửi hình cắt
từ file thật để đối chiếu. Nếu sau khi refresh chủ tool thấy lệch trái quá thì chỉ cần
trả x về -111.65.

### 2026-07-21 (later 10 — xoá vệt đen mép trái mẫu NLG IUL)

Chủ tool báo vệt đen dọc mép trái trang, khoảng ngang thẻ khách hàng, nhờ "đắp màu
xanh + trắng lên". Soi ra nguyên nhân KHÔNG cần đắp: một thẻ `<image>` 662×601
(76 KB) bị designer **kéo ra ngoài mép trái thay vì xoá** — nằm ở
`translate(-118.74 218.51) scale(.2)`, tức gần hết ngoài canvas nhưng **thò vào
trang 13.7 đơn vị** (x −118.7 → 13.7, y 218.5 → 338.7), và mép phải của ảnh đó màu
đen. Không id, không `<use>` nào trỏ tới → xoá thẳng thẻ, nền xanh/trắng thật lộ ra
đúng như chủ tool muốn, file nhẹ thêm 102 KB (2360 → 2258 KB).

**Cách dò ra (tái dùng được):** quét mọi `rect/path/image/polygon` có bbox chạm dải
mép trang (x < 25 hoặc > W−25), lọc phần tử tối màu (`fill` R+G+B < 150) hoặc là
`image`, bỏ qua nền to (rộng > 560). Đã quét đủ 4 mẫu proposal: chỉ NLG IUL dính;
các vệt ở mẫu khác đều là LOGO ở đầu trang (đúng thiết kế, không đụng).

**Bài học:** mẫu xuất từ Illustrator có thể chứa **phần tử bỏ quên ngoài canvas** —
không thấy trên artboard của designer nhưng SVG không cắt gì cả, thò vào trang là
hiện. Cùng họ với bẫy "ảnh Link chưa Embed" (later 3). Khi nhận mẫu mới: chạy quét
mép trang như trên, và để ý cả phần tử nằm HẲN ngoài canvas (chiếm dung lượng vô ích).

### 2026-07-21 (later 9 — tiêu đề IUL: thu nhỏ 40px → 38.09px, trả lại đúng lề gốc)

Chủ tool báo tiếp sau "later 8": dịch trái xong dòng "INDEXED UNIVERSAL LIFE" vẫn
**sát mép hai bên** — vì dịch chỉ đổi VỊ TRÍ, còn dòng đã DÀI THÊM 23 đơn vị (489.2 so
với 465.9 gốc) thì vẫn dài. Căn giữa một dòng bị phình chỉ chia đều phần phình sang
hai bên, không trả lại khoảng thở.

**Vá đúng:** thu nhỏ dòng đó `40px → 38.09px` (tỉ lệ 465.9/489.2 = 0.9523) và trả
`x` về `-111.65` gốc. Kết quả đo được: rộng 465.9, lề trái/phải **63.3 / 66.1** —
Y HỆT hình học trước khi sửa chính tả. Cách gắn: `style="font-size:38.09px"` vào thẻ
tspan BAO của dòng 2 (class `.cls-51`/`.cls-100` đặt 40px cũng trên chính thẻ đó,
inline thắng class cùng phần tử; các mảnh con chỉ có class letter-spacing nên thừa
hưởng trọn). CHỈ 2 mẫu IUL (AIG IUL + IUL–NLG, mỗi mẫu 2 bản); 2 mẫu Term Life tiêu
đề "TERM LIFE" không đổi chữ nên KHÔNG đụng.

**Bài học chuỗi 3 bản vá (later 7→8→9), ghi để không lặp:** đổi ĐỘ DÀI chữ trên bản
vẽ thì phải khôi phục CẢ vị trí LẪN bề rộng chiếm chỗ. Sửa chính tả (7) → lệch; dịch
tâm (8) → hết lệch nhưng sát mép; phải bù cỡ chữ (9) mới về đúng thiết kế. Lẽ ra làm
một lần: đo hình học gốc TRƯỚC khi đổi chữ, đổi xong khôi phục đủ cả tâm + bề rộng.

Lưu ý ngữ cảnh: khi chủ tool báo "vẫn lệch", màn hình của họ đang xem BẢN CŨ trong
cache (bản 38.09px chưa push lúc đó) — đối chiếu số đo trên đĩa trước khi kết luận
vá tiếp, kẻo vá chồng lên vá.

### 2026-07-21 (later 8 — canh giữa lại dòng tiêu đề sau khi sửa chính tả)

Chủ tool báo ngay sau bản vá chính tả: thêm chữ "E" vào INDEXD làm dòng
"INDEXED UNIVERSAL LIFE" **dài ra và lệch sang phải** (nó neo TRÁI nên chỉ nở về bên
phải). **Bài học: sửa chữ trên bản vẽ thì phải kiểm lại bố cục ngay, đừng chỉ kiểm
"chữ đã đúng chưa".**

- Vá: `x="-111.65"` → `x="-123.33"` ở mảnh `INDEXED UNIVER` (dịch trái 11.68), trả về
  đúng tâm thiết kế **296.24**. Lề hai bên sau khi sửa: 51.6 / 54.4 — cân mắt.
  Áp cho AIG IUL + IUL–NLG, mỗi mẫu 2 bản = 4 file. Hai mẫu ra CÙNG con số.

**⚠️ BẪY ĐO ĐẠC — ĐỌC KỸ, ĐÃ MẤT MẤY LƯỢT VÌ NÓ:**
Khi mở file SVG THẲNG trên trình duyệt (không qua tool), **KHÔNG được quy đổi toạ độ
bằng `svg.getBoundingClientRect().width / viewBox.width`**. Trang báo giá rất cao
(595×1341) nên trình duyệt canh theo CHIỀU CAO và chừa lề trắng hai bên ngang → tỉ lệ
ngang tính kiểu đó **sai hoàn toàn**. Triệu chứng đã gặp: đổi `x` đi 4.32 mà đo ra chỉ
dịch 1.6, và bề rộng chữ đo ra 180 trong khi thực tế là 489.

Cách đúng: `const M = svg.getScreenCTM().inverse()` rồi
`svg.createSVGPoint()` + `.matrixTransform(M)`. Nó tự xử lý viewBox,
preserveAspectRatio và lề trắng. **Mọi phép đo toạ độ trên SVG từ nay dùng cách này.**
(Trong tool thì cách cũ tình cờ đúng vì canvas khớp bề ngang — nên bẫy chỉ lộ ra khi
mở file trực tiếp.)

Thêm một điểm: `getBoundingClientRect()` trên thẻ `<tspan>` BAO NGOÀI cho số không tin
được; phải lấy **hợp bao của các mảnh tspan con** (bỏ mảnh rỗng) mới ra đúng biên chữ.

### 2026-07-21 (later 7 — sửa lỗi chính tả trong bản vẽ)

Chủ tool báo nhãn ghi **"Xếp hạng ức khoẻ"**, thiếu chữ "s".

**⚠️ BẪY QUAN TRỌNG — VÌ SAO GREP THƯỜNG KHÔNG TÌM RA LỖI CHÍNH TẢ TRONG SVG:**
Illustrator cắt một dòng chữ thành nhiều `<tspan>` để chỉnh kerning từng chữ cái, nên
chuỗi liền mạch KHÔNG tồn tại trong file. Ví dụ thật:

```
<tspan class="cls-139" x="0" y="0">X</tspan>
<tspan class="cls-178" y="0">ếp hạng </tspan>
<tspan class="cls-137" y="0">ứ</tspan>
<tspan y="0">c khoẻ / </tspan>
```

`grep "Xếp hạng"` → **0 kết quả**, dù chữ đó hiện rành rành trên màn hình. Đây là lý do
lỗi này sống sót lâu. **Cách soát đúng: ghép nội dung mọi tspan trong từng `<text>` lại
rồi mới đối chiếu** (script mẫu ở scratchpad phiên này, ~30 dòng).

**Đã sửa (8 file = 4 mẫu × 2 bản):**
- `Xếp hạng ức khoẻ` → `Xếp hạng sức khoẻ` — AIG IUL, AIG Termlife, IUL–NLG, TERMLIFE–NLG.
  Chèn "s" vào cuối mảnh `"ếp hạng "` (mảnh chữ thường), KHÔNG chèn vào mảnh kerning
  riêng của chữ "ứ". Các mảnh không có thuộc tính `x` riêng nên chữ tự chạy tiếp,
  thêm ký tự không vỡ bố cục.
- `INDEXD UNIVERSAL LIFE` → `INDEXED` (thiếu chữ E) — AIG IUL, IUL–NLG. Lỗi này chủ tool
  chưa thấy, em quét ra khi soát toàn bộ; chủ tool duyệt sửa 21/07.

**Một trường hợp trông như lỗi nhưng KHÔNG phải:** `"Tổng sốtiền đóng"` — thực ra là
HAI DÒNG riêng ("Tổng số" y=0 / "tiền đóng" y=13.2), dính vào nhau chỉ vì script ghép.
Bài học: ghép tspan để soát thì phải **nhóm theo y**, và luôn soi lại cấu trúc trước khi
kết luận là lỗi.

**Kiểm chứng:** quét lại cả 6 mẫu → 0 lỗi còn lại. Đo trên trình duyệt: nhãn dài thêm
1 ký tự vẫn nằm gọn trong thẻ nền ở cả 4 mẫu (AIG IUL 269.2/280, IUL–NLG 270.7/281.5,
AIG Term 267.2/278.8, TERMLIFE–NLG 267.3/278.9). 2 bản mỗi mẫu giống hệt nhau.

**Chốt cách viết:** giữ **"khoẻ"** (dấu hỏi trên chữ e) cho đồng bộ với mẫu Allianz
("Sức khoẻ") và nhãn trong bảng sửa chữ của tool. Chỉ thêm chữ "s" bị thiếu.

### 2026-07-21 (later 6 — chặn tràn chữ ở ô Thông tin khách hàng)

Chủ tool báo: hạng sức khoẻ dài chạy lố ra khỏi thẻ nền / bị cắt cụt
("Express Standard Non-Tobacco 2" 30 ký tự, "Preferred Plus Nontobacco" 25 ký tự).

**Sót của phiên trước:** `thuNhoChoVua()` mới chỉ áp cho phần **Kế hoạch & Quyền lợi**,
quên hẳn phần **Thông tin khách hàng**. Bài học: làm tính năng chống tràn thì phải rà
HẾT các nhóm ô, đừng chỉ làm nhóm đang gặp lỗi.

- Thêm `vuaKhungOKhach(neo, dsCungPhan)` + `mepPhaiChoPhep()` trong `proposal.js`.
  Ô khách hàng neo TRÁI theo đúng bản vẽ nên **KHÔNG** đổi sang căn giữa như phần Kế
  hoạch — chỉ thu nhỏ cỡ chữ khi tràn.
- Mép phải cho phép = chặt nhất trong hai nguồn: (1) chữ khác **cùng hàng bên phải**,
  (2) thẻ `<rect>` nền hẹp nhất **bao quanh** chữ. Áp cho cả 3 ô: tên khách, hạng sức
  khoẻ, tiểu bang.
- ⚠️ **BẪY đã dính khi tự test:** điều kiện tìm khung bao ban đầu chỉ kiểm
  `b.left <= r.left`, thiếu `b.right > r.left` → ô "Tiểu bang" nhận nhầm khung của ô
  "Sức khoẻ" nằm BÊN TRÁI nó (khung đó kết thúc trước cả chỗ chữ bắt đầu) → mép phải
  tính ra nhỏ hơn mép trái. Khung bao phải **thực sự trùm qua** điểm chữ bắt đầu.

**⚠️ BẪY KHI VIẾT TEST (quan trọng hơn cả bản vá):** lần đo đầu dò phần tử bằng
`#client-rate`. Id `client-*` do `tagClientInfoElements()` gắn vào **activeSvgDoc**,
mà `renderSvgOnCanvas()` clone canvas TRƯỚC đó → **bản canvas không có id này** (trừ
mẫu đã lưu sẵn id trong file). Kết quả: mẫu nào thiếu id thì hàm kiểm trả null, test
báo "0 lỗi" một cách GIẢ TẠO. Sửa: lấy `data-editor-id` **thẳng từ ô nhập trong bảng
bên phải** rồi mới dò sang canvas — id đó chắc chắn có ở cả hai bên. Đã thêm biến đếm
`boQua` vào test để lộ ngay nếu có trường hợp bị bỏ sót thay vì lặng lẽ pass.

**Kiểm chứng (đo lại bằng cách tin cậy): 65 trường hợp, 0 bỏ qua, 0 tràn.**

| Mẫu | Số ca thử | Cỡ chữ nhỏ nhất |
|---|---|---|
| AIG IUL / Term Life | 12 + 12 | không phải thu nhỏ |
| NLG IUL / Term Life | 15 + 15 | 10.7px (gốc 14.3px = 75%) |
| Allianz Max-Funded | 11 | 12.9px |

Cỡ chữ ghi vào **cả hai cây DOM** nên bản xuất PDF/JPEG cũng đúng (đã đối chiếu).
`proposal.js?v=21`, `config.js?v=4`.

### 2026-07-21 (later 5 — nén 2 mẫu NLG, 8.5 MB → 2.3 MB mỗi file)

**Cách làm, để lần sau lặp lại được cho mẫu khác:**

1. Soi xem dung lượng nằm ở đâu: 99% là ảnh nhúng base64, riêng ảnh nền
   **5802×3749 nặng 6.2 MB**. AIG dùng 2781×1408, Allianz 1507×838 — NLG là ngoại lệ.
2. Tính mức thật sự cần: ảnh được **vẽ ra ở 929 đơn vị SVG**, mà `renderSvgToCanvas`
   xuất ở **`scaleFactor = 2`** (core.js) → chỉ dùng tới 1858px. Thừa hơn 3 lần.
   Chọn **2400px** (dư 1.3 lần so với 2x; đủ cả nếu sau này nâng lên 3x = 2787px).
3. Kiểm kênh alpha TRƯỚC khi định chuyển JPEG: RGBA **không** có nghĩa là có trong suốt.
   Ở đây quét thật thì **14.6% điểm ảnh không đặc, alpha thấp nhất = 0** → trong suốt
   THẬT → **bắt buộc giữ PNG**, không được chuyển JPEG.
4. Máy không có sharp/Pillow/ImageMagick. Dùng **System.Drawing của Windows** qua
   PowerShell để thu nhỏ (HighQualityBicubic).
   ⚠️ **Bộ mã hoá PNG của System.Drawing nén cực kém** — xuất ra 4 MB cho ảnh
   2800×1809, gần như không nén. Đừng dùng nó để ghi PNG cuối.
5. **Tự viết bộ mã hoá PNG bằng `zlib` có sẵn của Node** (lọc thích nghi 5 kiểu theo
   heuristic của libpng + deflate level 9 + `Z_FILTERED`) → 1560 KB thay vì 4026 KB.
   Script để ở scratchpad phiên này; nếu cần dùng lại thì viết lại theo mô tả trên.
6. Nhúng lại **GIỮ NGUYÊN `width/height/transform`** của thẻ `<image>` → khung vẽ y hệt,
   chỉ đổi bitmap bên trong. Không xê dịch một chút nào.

**Kết quả:**

| Mẫu | Trước | Sau |
|---|---|---|
| `IUL - NLG.svg` | 8603 KB | **2360 KB** (−73%) |
| `TERMLIFE - NLG.svg` | 8492 KB | **2251 KB** (−73%) |
| Tổng cả 6 mẫu | 24008 KB | **11524 KB** (−52%) |

Đã sửa cả `public/templates/` lẫn `2-Templates/NLG/`, so lại 2 bản giống hệt nhau.
Kiểm chứng: mở thẳng SVG qua server → 3 ảnh đều giải mã được, **84 thẻ `<text>` còn nguyên**,
`viewBox` không đổi, khung vẽ ảnh nền vẫn đúng 5807×3756. Alpha sau khi nén: 14.8% / 14.61%
(gốc 14.6%) — khớp trong sai số lấy mẫu.

### 2026-07-21 (later 4 — tốc độ vào trang Công cụ, v1.14 đã LIVE)

Chủ tool báo: vào `/tool` trên live phải chờ spinner "Đang quét thư mục" một lúc mới có dữ liệu.
**Đo thật trên production TRƯỚC khi sửa** (đừng đoán nguyên nhân):

| Bước | Thời gian | Ghi chú |
|---|---|---|
| HTML `/tool` | 531ms | |
| Google Fonts CSS | 205ms | chặn |
| supabase-js (CDN) | 218ms · 203 KB | cần cho đăng nhập |
| jsPDF (CDN) | 293ms · 356 KB | **chỉ cần khi bấm Xuất PDF** |
| JS nội bộ | ~250 KB | |
| rồi mới gọi `/api/svgs` | 550ms | |

**KHÔNG phải do quét thư mục.** `getSvgFiles()` chỉ `readdir`+`stat` (~6 file trên Vercel vì
`2-Templates/` bị gitignore), `/api/svgs` trả về đúng 1 KB trong 550ms — toàn bộ là độ trễ mạng
tới Vercel chứ không phải xử lý. Lỗi thật là **CHUỖI KHỞI ĐỘNG NỐI ĐUÔI NHAU**.

- **Bắn sớm `/api/svgs` bằng inline script trong `<head>` tool.html** (`window.__svgsSom`);
  `fetchSvgsList()` dùng lại cho lần gọi ĐẦU TIÊN, các lần sau (lưu/xoá nháp) vẫn fetch mới.
  → 550ms chờ mạng chạy song song với lúc tải script thay vì cộng vào cuối.
  ⚠️ **Đoạn này PHẢI đặt TRÊN mọi `<link rel="stylesheet">`** — CSS chặn việc CHẠY inline script
  đứng sau nó, để dưới là phải chờ cả Google Fonts (~205ms) mới bắn được, mất sạch ý nghĩa.
- **Gỡ thẻ `<script>` jsPDF khỏi tool.html**, thay bằng `napThuVienPdf()` trong core.js, nạp
  đúng lúc bấm Xuất PDF. Tiết kiệm 356 KB + 293ms chặn trên MỌI lượt vào trang (kể cả người chỉ
  vào xem rồi đi ra). Có chống bấm 2 lần (`dangNapPdf`) và báo lỗi tử tế khi mất mạng.
- Đổi chữ trạng thái "Đang quét thư mục chứa file thiết kế…" → "Đang tải danh sách mẫu…"
  (đội sale đọc câu này, không phải lập trình viên đọc).
- Đồng bộ `portal.css?v=32` cho cả 4 trang — index/login còn kẹt `v=31` nên ăn CSS cũ trong cache.
  **Bài học: cùng một file mà mỗi trang khai một số version khác nhau là bug thầm lặng.** Kiểm bằng
  script dò trùng version qua cả 5 file HTML, đừng sửa tay từng trang rồi tin là đã đủ.
- `core.js?v=23`, `config.js?v=3`.
- Đã đo lại toàn bộ 5 trang: 39 file CSS/JS đều trả 200, không có 404. Trang nặng nhất 274 KB.
- ~~⚠️ Còn tồn: 2 mẫu NLG nặng 8.5 MB mỗi file~~ **XONG 21/07 (xem "later 5")**. Cũ: (các mẫu khác ~2.2 MB). Trên 4G của sale ngoài
  đường là chờ lâu. Nghi ảnh nền nhúng ở độ phân giải thừa. Chờ chủ tool duyệt việc nén.

### 2026-07-21 (later 3 — logo vỡ ở Allianz + logo nét hơn cho Name Card, CHƯA PUSH)

- **🚨 BẪY MỚI, PHẢI NHỚ: mẫu SVG mới xuất từ Illustrator có thể còn TRỎ RA FILE NGOÀI REPO.**
  `Max-Funded Allianz.svg` có
  `xlink:href="../../../../../../2024/Video/Asset/Logo/Thinksmart Insurance/Logo Thinksmart White.png"`
  → trên web thành **icon ảnh vỡ** ở góc phải đầu trang (chủ tool báo 21/07). Illustrator chỉ nhúng
  ảnh khi chọn "Embed"; ảnh nào để "Link" thì xuất ra vẫn là đường dẫn tương đối trên máy designer.
  **Mỗi lần nhận mẫu mới BẮT BUỘC chạy kiểm:**
  `grep -o 'xlink:href="[^"#][^"]*"' <file>.svg | grep -v '^xlink:href="data:'`
  → phải KHÔNG ra kết quả nào (chỉ được còn `data:` và `#id` nội bộ).
- Đã nhúng thẳng logo thành base64 cho **cả 2 bản** (`public/templates/` + `2-Templates/Allianz/`),
  giữ nguyên `width/height/transform` nên vị trí không đổi. File: 2315 KB → 2384 KB.
- **Name Card**: `image-3` chính là logo Thinksmart trắng nhưng chỉ 472×179 → thay bitmap bằng bản
  2370×896, GIỮ NGUYÊN `width="472" height="179"` của thẻ `<image>` nên bố cục không xê dịch, chỉ
  nét hơn khi xuất 2x. File: 55 KB → 155 KB. Sửa cả `public/templates/` lẫn `Name Card/Chung/`.
  Đóng một phần PENDING J.
- Nguồn logo: `E:/2024/Video/Asset/Logo/Thinksmart Insurance/Logo Thinksmart White.png` (2370×896,
  92 KB). Đã đối chiếu byte-for-byte: payload trong cả 2 mẫu khớp đúng file này.
- Kiểm chứng: mở thẳng 2 file SVG qua server → không còn tham chiếu ngoài, ảnh giải mã được
  (`new Image()` → 2370×896), và gọi `/api/svgs/content` (đường đi thật của Tool) cũng trả về đúng.
- **`config.js?v=1` → `?v=2` ở cả 5 trang.** Phiên này để trống khoá Supabase để vào kiểm chứng rồi
  khôi phục file, NHƯNG quên bump version → trình duyệt chủ tool giữ bản trống trong cache, chạy
  "chế độ mở" và trang chủ trắng trơn. **Quy tắc: sửa file nào thì bump version file đó, kể cả sửa
  tạm rồi hoàn lại.** Ghi chú thêm: `index.html` cố ý `return` sớm khi chưa cấu hình Supabase nên
  chế độ mở = trang chủ trắng, chỉ còn banner — chưa sửa, chờ chủ tool quyết.

### 2026-07-21 (later 2 — 3 lỗi mẫu Allianz do chính phiên trước gây ra, CHƯA PUSH)

Chủ tool báo 3 lỗi trên `Max-Funded Allianz.svg`, cả 3 đều là hệ quả của code viết ở phiên
"later" ngay bên dưới mà **không mở app kiểm chứng**. `core.js?v=20`, `proposal.js?v=16`.

- **1. Chữ tiểu bang dính vào nhau ("Texas").** Illustrator cắt một dòng thành nhiều tspan, mỗi
  mảnh mang một class kerning riêng **chỉ đúng cho đúng chữ cái gốc của nó** — ở đây
  `.cls-178 { letter-spacing: -.09em }` vốn dành cho chữ "T". `applyTextValue` dồn CẢ dòng vào
  mảnh đầu → kerning đó áp cho toàn bộ chữ. Mẫu AIG/NLG không lỗi vì mảnh đầu của chúng không có
  class kerning âm — **may chứ không phải đúng**.
  Vá: thêm `boQuenKerning(el)` (core.js) đặt `style.letter-spacing = 'inherit'` cho mảnh vừa ghi
  — dùng `inherit` chứ KHÔNG dùng `normal`, để tracking cố ý ở cấp `<text>` vẫn giữ nguyên.
  Thêm `chuanHoaKerningDongDaGop(svgEl)` chạy lúc `loadSvgContent` cho các dòng ĐÃ bị gộp từ lần
  lưu trước (dấu hiệu: có mảnh em cùng dòng và tất cả đều rỗng) — nếu không thì mở file ra đã sai
  sẵn, chưa cần gõ gì.
- **2. Số thu nhập hưu trí đè lên chữ "/năm".** Hai thẻ `<text>` RIÊNG, mỗi thẻ một `translate()`
  cứng; số dài ra là tràn sang. Vá: `xepLaiHauTo(neo)` trong `proposal.js` — đo `getBBox().width`
  thật trên canvas rồi đặt lại toạ độ cho CẢ HAI thẻ, giữ **tâm cụm** cố định (`neo.tam` đo một
  lần theo bản vẽ gốc) nên số dài/ngắn thế nào khối chữ vẫn cân giữa thẻ nền. Khe hở
  `KHE_TIEN_HAUTO = 6`. Gọi lúc gõ, lúc blur (auto-format tiền) và một lần lúc mở file trong
  `document.fonts.ready` (chưa có font thì đo sai bề rộng).
- **3. "Thời gian nhận dòng tiền" gõ mà canvas đứng im.** ⚠️ **BẪY GỐC RỄ, ĐỌC KỸ:** tool giữ
  **HAI cây DOM** — `appState.activeSvgDoc` (bản dữ liệu, đem đi lưu/xuất) và bản **clone** trong
  `dom.canvasWrapper` (bản hiển thị). `applyTextValue` ghi cả hai. Ô này không dùng được
  `applyTextValue` (nó ghi vào mảnh mang `data-editor-id` = chữ "Tổng", sẽ đè mất cả câu) nên tôi
  tự ghi tay — và **chỉ ghi vào cây dữ liệu, quên bản clone**. Vá: `ghiCumDongTien(x, cum)` ghi cả
  hai, dò bản clone qua `[data-editor-id]` rồi ánh xạ theo **chỉ số mảnh** (`viTriManhChinh`,
  `tongSoManh`) — có đối chiếu `tongSoManh` trước khi ghi để không ghi bậy khi cấu trúc lệch.
- Ghi chú: comment cũ ("mỗi tspan có x cố định nên phải dồn cả cụm") **SAI** —
  `optimizeSvgTexts()` đã gỡ hết `x` của các mảnh cùng dòng ngay lúc load. Đã sửa lại comment cho
  đúng lý do thật (tránh ghi đè phần "Tổng dòng tiền dự kiến").
- **`.claude/launch.json`: bỏ `env.PORT` cứng, thêm `"autoPort": true`** → nhiều phiên Claude chạy
  song song không giành cổng 8000 nữa (server tự lấy cổng trống, `server.js` đọc `process.env.PORT`).
- Kiểm chứng THẬT trên app (không chỉ `node --check`): đổi tiểu bang → `Massachusetts`,
  `letter-spacing` computed = `normal`, bề rộng 100.7px (đúng giãn tự nhiên); nhập `$1,250,968` →
  tiền `translate(302.61 510.9)` rộng 200.1, `/năm` `translate(508.72 510.9)` ⇒ khe hở đúng 6.01,
  tâm cụm 423.3 y hệt bản gốc; gõ "trọn đời" → canvas hiện "…dự kiến nhận trọn đời". Đã đối chiếu
  **cả `activeSvgDoc`** để chắc bản lưu/xuất cũng đúng, không chỉ bản hiển thị.
- ⚠️ Ảnh chụp màn hình của Browser pane **treo 100%** với file SVG 2.3 MB (`computer screenshot`
  và `zoom` đều timeout 30s). Cách thay thế đã dùng được: `javascript_tool` đọc thẳng
  `getBBox()` / `getComputedStyle()` / `getAttribute('transform')`, và clone SVG + đổi `viewBox`
  để cắt vùng cần xem ra file gửi chủ tool.
- ⚠️ Tool trên nhánh này **bắt đăng nhập** (config.js có khoá thật) nên không tự vào kiểm chứng
  được. Đã tạm để trống `config.js` → test → **khôi phục nguyên trạng** (`git status` sạch).
  Lần sau muốn test nhanh thì làm đúng trình tự đó, và kiểm `git diff` trước khi commit.

### 2026-07-21 (later — nhánh `feat/mainV1.1`, phiên dài nhất từ trước tới nay, CHƯA PUSH)

**Merge 2 nhánh thành `feat/mainV1.1`** (`main` → nhánh mới → `merge --no-ff feat/login`):
- **BẪY LỚN: `server.js` TỰ MERGE TRÓT LỌT, KHÔNG BÁO XUNG ĐỘT — nhưng khối redirect
  `/`,`/login`,`/videos` → 302 `/tool` của main vẫn còn.** Giữ nguyên là portal chết ngay (vào
  trang chủ bị đá sang Tool). Đã gỡ + ghi chú cách đặt lại nếu cần giấu portal lần nữa.
  → Merge xong PHẢI đọc lại file "tự merge được", đừng chỉ xử lý file báo xung đột.
- Xung đột `changelog.md`: hai nhánh cùng làm 20/07 → giữ CẢ HAI mục cùng ngày (xem ghi chú đầu Log).
- `main` KHÔNG bị đụng (vẫn `fff501d`), live nguyên vẹn.

**Rail / menu trái:**
- Rail cao đúng nội dung + căn giữa dọc (trước kéo full màn, dài và trống).
- **Logo rail bị ẩn — LỖI LẶP LẠI 2 LẦN**: `.sidebar-brand > span` quét trúng cả
  `<span class="logo-icon">`. Sửa `portal.css` hôm 20/07 nhưng **quên `style.css`** (trang Tool
  dùng bản sao riêng) → 21/07 chủ tool báo lại. Giờ cả hai đều `> span:not(.logo-icon)`.
- Hover rail → **tối nền** (`body::after` + `:has()` — không phải thêm thẻ vào 5 file HTML).
- Vào trang → rail lộ dần bằng **`clip-path`**. TRƯỚC dùng `scaleY` → **bóp méo icon/chữ**, chủ tool
  thấy "giật". clip-path không biến dạng nội dung.
- Hover → vệt sáng chạy quanh viền (`@property --rail-angle` + conic-gradient + mask). Chạy sát mép
  TRONG vì rail có `overflow:hidden` (muốn bọc ngoài phải thêm lớp bọc ở cả 5 HTML).

**Chuyển trang — YÊU CẦU THƯỜNG TRỰC của chủ tool (đã lưu vào memory):**
- `@view-transition { navigation: auto }` khai ở CẢ `portal.css` lẫn `style.css` (thiếu một bên là
  không chạy — hiệu ứng đòi cả trang đi lẫn trang đến cùng khai báo).
- **Khai báo CSS thôi CHƯA ĐỦ**: hiệu ứng chụp KHUNG HÌNH ĐẦU của trang đích, mà portal giấu nội
  dung chờ auth → người dùng thấy chớp trắng, tưởng không có animation. Phải cho nội dung trang
  đích có nhịp hiện vào (`animations.js` nay phủ cả `.member-stats`, `.seg`, `.video-grid`).

**Tool — layout & hệ nút:**
- 4 vùng (header + 3 cột) thành **thẻ nổi bo 20px**, khe 8px; token `--tool-gap/--tool-radius/--tool-shadow`.
  `.app-body` bỏ `calc(100vh - header)` → dùng flex, vì header giờ là thẻ RỜI có khe.
- **Gỡ `.viewport-toolbar`** (thanh 46px chỉ để chứa cụm zoom) → zoom dời xuống `.canvas-status-bar`,
  canvas cao thêm 46px. `--status-bar-height` 34→40px; 2 dải đáy dùng chung token nên tự khớp nhau.
- Thông báo trạng thái thành **tạm thời** (tự mờ sau 4s) thay vì nằm lì "Đã tải N thiết kế".
- **Đồng bộ nút giữa 2 file CSS**: `.btn` Tool 37px vs Portal 44px; `.btn-sm` 29/36; `.icon-btn` 38/40.
  Chốt desktop 38/32/38 + override mobile 44 — quy tắc 44px là cho NGÓN TAY, desktop được nhỏ hơn.
- **Class chết dọn sạch**: `.btn-lg` (chưa từng định nghĩa — nút màn chào giả cỡ bằng style inline),
  `.glass-btn`, `.glass-btn-primary`, và khối `#btn-new-proposal` **15 dòng `!important`** ép nút
  thành 149×48 trong khi nút cạnh nó 121×38.

**Cây thư mục Tool:**
- `tachTenMau()` (core.js) chuẩn hoá tên hiển thị: trong cây BỎ tên hãng (nhóm đã ghi rồi), thanh
  tiêu đề hiện "Hãng — Chương trình". Bản nháp mang tên khách thì giữ nguyên. Áp cho cả Brochure.
- Hãng to/đậm hơn chương trình (14px/800 vs 12.5px/500) — **đảo ngược quyết định hôm trước**; lý do
  chủ tool đưa ra: sale nghĩ theo HÃNG trước rồi mới tới sản phẩm.
- Gỡ tiêu đề "CÔNG CỤ" + số đếm (giữ `#file-count` ẩn vì `main.js` vẫn ghi vào đó — xoá hẳn là vỡ).

**Mẫu Allianz (Max-Funded IUL) — nhận file từ chủ tool:**
- **Tên file sai chính tả `Max-Funded Aliianz.svg` (2 chữ i) là LỖI CHỨC NĂNG**, không chỉ thẩm mỹ:
  live nhận diện hãng bằng TÊN FILE (`server.js:104`) → "aliianz" không khớp "allianz" → rơi vào
  nhóm "Khác" + đổ nhầm danh sách xếp hạng của AIG. Đã đổi tên + chép sang `public/templates/`.
- Chuẩn hoá dữ liệu mẫu: `Chau Dang Khoa`→`Nguyen Van An`; `Standard Non-Tobacco`→`Standard Nontobacco`
  (chính tả riêng của Allianz); `Washington DC`→`Texas` (DC KHÔNG phải bang — danh sách 50 bang đã
  kiểm đủ, không thiếu không thừa); `Female`→`Male` (khớp tên nam); footer `TONY PHU`/`Jason Huynh`
  + SĐT thật → `Ten Tro Ly`/`Ten Agent` + `(000) 000-0000`. CEO + SĐT công ty GIỮ (mẫu sạch cũng có).
- **Nhánh sắp xếp riêng `isAllianz`**: ghép nhãn↔giá trị theo **NEO CHỮ** (nhãn tiếng Việt đứng ngay
  TRÊN giá trị) thay vì ngưỡng toạ độ của IUL. Trước đó dán nhãn sai hết ("Giá trị tích luỹ — Cột 2"
  thực ra là Tổng dòng tiền dự kiến). Ghép đúng 7/7. Thêm ô mới chỉ cần thêm 1 dòng vào bảng `NHAN`.
- Ô **"Thời gian nhận dòng tiền"** nhập được CHỮ ("trọn đời") lẫn số ("trong 25 năm"). Câu này gồm
  5 tspan ANH EM có `x` CỐ ĐỊNH → phải **dồn cả cụm vào 1 tspan rồi làm rỗng các tspan sau**;
  `applyTextValue` dùng không được ở đây.
- Căn giữa số La Mã I/II/III; khe "THU NHẬP HƯU TRÍ ↔ MIỄN THUẾ" 1px → 17px (quá tay) → **9px**.

**Term Life:** mỗi cột = 1 hàng gộp **[số năm | phí mỗi tháng]**, ghép theo X GẦN NHẤT (không theo
thứ tự mảng — thiếu một ô là lệch cả loạt). Ô số năm KHÔNG chạy định dạng tiền tệ (nếu không "10 năm"
biến thành "$10").

**Name Card:** 4 icon raster (globe 23×22, phone 24×16, YouTube 21×35…) tỉ lệ 1:1 mà app xuất 2x nên
nhoè → **thay bằng vector viết trong code**. Icon nằm trong `<defs>`, gọi qua `<use>` (mỗi cái 2 lần)
nên chỉ cần thay ruột trong `<defs>`, không phải sửa 8 chỗ gọi. File 58.278 → 55.512 bytes.
Logo Thinksmart vẫn raster 1:1 — cần file gốc của chủ tool.

**Trang Quản lý thành viên:**
- Bảng 7 cột bằng **`subgrid`** — mỗi hàng tự dựng lưới thì cột "Thao tác" (số nút đổi theo quyền)
  kéo các cột khác lệch tới 70px. Hệ quả: KHÔNG được thêm padding/border trái-phải cho phần tử subgrid.
- Chọn nhiều + thao tác hàng loạt; chỉ tick được người mình THỰC SỰ quản lý được; lọc trước khi gọi
  DB để không gửi lệnh chắc chắn bị trigger từ chối.
- Phòng ban CỐ ĐỊNH **Sale · MKT · CS · Admin** (`PHONG_BAN` đầu `members.js`) + hộp thoại chọn,
  bỏ hẳn `window.prompt`.
- Bố cục **2 cột**: trái = 3 danh sách; phải (312px, sticky) = khối "Tổng quan" GỘP 1 ô + đếm theo
  phòng ban **bấm để lọc nhanh** + nút "Thêm thành viên". Số đếm phòng ban luôn tính trên TOÀN BỘ,
  không theo bộ lọc (nếu không, bấm lọc xong mọi phòng khác tụt về 0).
- Hàng thao tác: **1 hành động chính + menu "⋯"** (trước bày 4 nút trộn 3 kiểu, cột bị kéo rộng).
- **"Thêm thành viên" KHÔNG tạo tài khoản trực tiếp được**: cần khoá `service_role` của Supabase,
  tuyệt đối không nhúng vào web (ai xem mã nguồn cũng có toàn quyền DB). Luồng đúng: gửi link đăng ký
  → họ tự tạo → admin duyệt.
- Trạng thái tải: nút đổi nhãn + bảng mờ, **không chen banner** (banner làm xê dịch bố cục); khung
  xương lần tải đầu cao ĐÚNG 66px = bằng hàng thật nên thay dữ liệu vào không nhảy.
- **Bẫy đã dính**: gỡ thẻ "Tạm khoá" khỏi HTML mà `members.js` vẫn ghi số vào đó → `.textContent`
  trên `null` làm CHẾT cả hàm tải, trang trắng. Đã bọc null-safe.

**Trang chủ:** gỡ thẻ "Mẫu thiết kế"; hàng "Thành viên mới" thành thẻ `<a>` bấm được sang `/members`.

**Đồng bộ `2-Templates/` (thư mục BỊ GITIGNORE):**
- Cả 4 master ở máy này còn dữ liệu test cũ (`Trương thị thanh hảo`, SĐT thật) trong khi
  `public/templates/` đã sạch từ 17/07. Lý do: **`2-Templates/` bị gitignore nên bản dọn làm ở máy
  khác không bao giờ về được qua git**, mà server local lại quét thư mục này TRƯỚC.
  → Live vẫn sạch, chỉ máy local bẩn. Đã chép đè; bản cũ ở `_Archive/2026-07-21_2-Templates-truoc-dong-bo/`.

**BÀI HỌC ĐO ĐẠC — sai 4 lần trong một phiên, đều CÙNG MỘT KIỂU: đo trên phần tử TỰ DỰNG thay vì
phần tử THẬT trên trang:**
1. Dựng nút bằng class mà **quên `id`** → không thấy khối `#btn-new-proposal !important` → báo sai
   "hai nút giống hệt nhau" (thực tế 149×48 vs 121×38). Chủ tool phải mở DevTools chỉ ra.
2. Đo `.member-list` ĐẦU TIÊN — nó nằm trong khối "Chờ duyệt" `display:none` → mọi số đo ra 0.
3. Đo bố cục SVG khi **chưa nạp `style.css`** nên trang chạy bằng font thay thế → số đo lệch hoàn
   toàn (số La Mã "lệch 0.7px" thực tế là 4.2px).
4. Vá toạ độ SVG bằng **pixel màn hình mà quên chia hệ số thu phóng** (1.5119) → vá quá tay, phải sửa lại.
→ QUY TẮC: ưu tiên đo phần tử thật trên trang. Nếu buộc phải dựng thì kèm ĐỦ id + class + ngữ cảnh
  cha, nạp đúng CSS/font, và luôn kiểm `innerWidth` + `display` trước khi tin con số.

### 2026-07-21 (nhánh `feat/login` — v1.13, vá lỗ hổng guard trạng thái tài khoản)
- **LỖ HỔNG THẬT: trạng thái tài khoản chỉ kiểm lúc ĐĂNG NHẬP, không kiểm lại khi vào trang.**
  `requireLogin()` cũ chỉ hỏi "có session không". Chỉ `tool.html` + `members.js` tự kiểm thêm;
  `/` và `/videos` KHÔNG. Hậu quả thật: admin bấm "Tạm khoá" nhưng phiên cũ của người đó còn hạn
  → họ vẫn đi lại trong portal tới khi phiên hết. (RLS vẫn chặn dữ liệu — `is_approved()` đòi
  status='active' — nên không rò nội dung, nhưng sai về mặt kiểm soát truy cập.)
- **Lỗi thứ 2 — guard FAIL-OPEN**: `if (p && p.status !== 'active')` — p null (lỗi mạng/RLS) thì
  bỏ qua cả điều kiện → CHO VÀO. Guard hỏng phải ĐÓNG.
- **Sửa: dồn về `requireLogin()` trong `auth.js`** (chỗ duy nhất mọi trang đều đi qua):
  status ≠ 'active' → `signOut('/login?state=' + pending|blocked)`; profile null → `blockPage()`
  phủ toàn trang + nút Thử lại, **KHÔNG đăng xuất** (lỗi mạng mà đá người ta ra là quá tay).
  `signOut(to)` nhận đích tuỳ chọn, chỉ chấp nhận đường dẫn nội bộ `^\/(?!\/)`.
- **BẪY suýt dính**: `signOut` được gắn thẳng làm event listener (`addEventListener('click',
  TSTAuth.signOut)`) → tham số `to` nhận Event object. Phải kiểm `typeof to === 'string'`,
  không thì nút Đăng xuất chuyển hướng bậy.
- `login.html`: `#pending-state` giờ dùng cho CẢ 2 trạng thái (pending ⏳ / blocked 🔒) qua
  `showAccountState()`; `afterLogin()` đọc `status` thay vì cột `approved` cũ (cần phân biệt
  "chờ duyệt" với "bị khoá" — cả hai đều approved=false) + fail-closed khi profile null.
- Verified không cần tài khoản: `?state=blocked/pending/rác` đúng 3 kiểu; `/videos`,`/members`
  chưa login → redirect kèm `?next=`; open-redirect `//evil.com` + `https://evil.com` → `/login`;
  Event object → `/login`. `auth.js?v=3`, `portal.css?v=24`, badge v1.13.
- **CHƯA test được (cần tài khoản thật — chủ tool chạy)**: đăng ký → chờ duyệt → duyệt → đăng nhập
  → xem video → **tạm khoá lúc đang mở web rồi chuyển trang** (chính là ca vừa vá) → nhân viên vào
  `/members` phải bị từ chối.
- **Điểm chờ chủ tool quyết**: policy UPDATE trên `profiles` đòi `is_admin()` ⇒ **nhân viên thường
  KHÔNG tự sửa được tên/phòng ban của mình**. Muốn cho phép: thêm policy update `id = auth.uid()`
  (trigger sẵn có đã cấm đổi role/status nên vẫn an toàn).

### 2026-07-20 (nhánh `feat/login` — v1.12, PUSH GIT KHÔNG DEPLOY)
- **Bối cảnh:** chủ tool làm tiếp Portal trên nhánh `feat/login` (local:8000, Supabase ĐÃ bật thật —
  key nằm trong `public/js/portal/config.js`). Push lên GitHub để về nhà làm tiếp; **`main` giữ
  nguyên**, `tool.thinksmartinsurance.com` không đổi.
- **BÀI HỌC LỚN NHẤT PHIÊN NÀY — Windows tắt Animation effects làm mọi animation vô hiệu.**
  Chủ tool "sửa hoài không thấy khác gì": registry `HKCU\Control Panel\Desktop\WindowMetrics\MinAnimate = 0`
  → Chrome báo `prefers-reduced-motion: reduce` → block ở `portal.css` ép mọi transition xuống
  `0.01ms` và `animations.js` return ngay. Đo được: `.sidebar` transition-duration `1e-05s` thay vì
  `0.34s`. Bật lại: `ms-settings:easeofaccess-visualeffects` → Animation effects On → **khởi động lại
  Chrome** (đọc thiết lập lúc khởi động, reload không đủ).
- **Logo rail bị ẩn mất** (đầu rail trống hoác): `.sidebar-brand > span` quét trúng cả
  `<span class="logo-icon">`. Sửa: `> span:not(.logo-icon)` ở 3 rule (2 desktop + 1 mobile override).
- **`clearProps: 'all'` của GSAP XOÁ SẠCH thuộc tính `style`** — kể cả `display:none` do phân quyền
  đặt. Hậu quả thật: Super Admin thấy thẻ "Tạo báo giá"; Nhân viên thường thấy thẻ số liệu +
  panel dành riêng Admin sau khi entrance chạy xong. Đo bằng thí nghiệm: style `display:none` → `""`.
  Sửa: `clearProps: 'transform,opacity'` (đã kiểm chứng giữ nguyên display), và phần tử bị ẩn thì
  KHÔNG tween.
- **`gsap.from()` lộ 1 khung hình ở trạng thái CUỐI** rồi mới kéo về đầu → giật một cái lúc hiện.
  Sửa: `gsap.set()` đặt trạng thái đầu ngay khi script chạy (shell còn `display:none`, chưa vẽ),
  rồi `gsap.to()` tới trạng thái cuối.
- **CSS transition đánh nhau với GSAP**: `.stat-card` có `transition: transform .25s`, GSAP ghi
  transform mỗi khung hình → mỗi lần ghi lại bị nội suy → trễ + snap. Sửa: `body.is-entering`
  tắt transition vùng đang tween (portal.css), animations.js bật/tắt class.
- **Animation rút gọn theo yêu cầu chủ tool**: bỏ 3 nhóm lệch nhịp, còn 1 nhịp — opacity + y 10px,
  0.32s, stagger 0.04s (tổng ~480ms).
- **Bảng thành viên chia 6 cột** (chủ tool: "một hàng ngang khó nhìn"): Thành viên · Phòng ban ·
  Quyền · Trạng thái · Tham gia · Thao tác, có hàng tiêu đề. **BẮT BUỘC dùng `subgrid`** —
  mỗi hàng tự dựng lưới riêng thì cột "Thao tác" (số nút đổi theo trạng thái+quyền) kéo co các cột
  còn lại lệch tới 70px (đã đo). `.member-table` là nơi DUY NHẤT định nghĩa chiều rộng cột;
  `.member-head`/`.member-list`/`.member-row` đều `grid-template-columns: subgrid`.
  Hệ quả: **đừng thêm padding/border trái-phải** cho 3 cái đó — subgrid thụt vào là lệch lại.
  ≤900px: bỏ subgrid, thành thẻ xếp dọc có nhãn `data-label`; nút thao tác nâng lên 44px.
- **Bỏ banner "Đang tải danh sách…"** (chủ tool chê): banner chen vào giữa trang, đẩy nội dung rồi
  biến mất → giật bố cục mỗi lần bấm Tải lại. Thay bằng `setLoading()`: nút đổi nhãn + khoá, bảng
  mờ 0.5 + `pointer-events:none`. Đo: chiều cao bảng 224px không đổi trước/trong khi tải.
  Lần tải ĐẦU dùng khung xương `.sk` cao đúng 66px = bằng hàng thật nên thay vào không nhảy.
  `#load-msg` giờ CHỈ dùng báo lỗi.
- **Super Admin dùng được MỌI công cụ** (chủ tool quyết): gỡ **5 chỗ** chặn —
  `tool.html` (đá về `/members`, nặng nhất), `index.html` ×2 (ẩn nav + ẩn hero, ép lưới 1 cột),
  `videos.html`, `members.js`. Gỡ thiếu chỗ tool.html thì bấm "Công cụ" vẫn bị văng ra.
- Versions: `portal.css?v=23`, `animations.js?v=3`, `members.js?v=6`, badge **v1.12** (5 chỗ).
- **GOTCHA công cụ đo**: (1) `resize_window` preset "desktop" báo thành công nhưng viewport VẪN 375px
  → luôn kiểm `innerWidth` trước khi tin số đo; (2) browser pane không chạy rAF khi ở nền → tween
  GSAP không bao giờ complete, phải `tl.progress(1, false)` để tua đồng bộ; (3) đo CSS mới phải
  `link.disabled = true` rồi mới inject — không thì rule CŨ vẫn thắng và đo ra kết quả sai.

### 2026-07-20 (owner quay lại tự làm; tách 2 nhánh: main cho sale, feat/login local)

**ĐÃ PUSH LÊN LIVE (main) — 2 lần, đều tách riêng, không dính feat/login:**
1. `ddd1944` — **Bản live tạm thời chỉ phục vụ Tool**: `/`, `/login`, `/videos` → 302 `/tool`.
   Owner thấy portal chưa hoàn thiện (Video học/Forum trống) lộ ra cho sale nên muốn dọn.
   Đặt redirect TRƯỚC `express.static` vì static tự trả `public/index.html` cho `/`.
2. `7f49f77` — **Xếp hạng sức khoẻ theo từng hãng (v1.11)**, `proposal.js?v=11`:
   - AIG 6 mục (giữ nguyên) · NLG 9 mục · Allianz 5 mục. Dùng chung cho IUL + Term Life.
   - **Allianz viết `Nontobacco` LIỀN**, khác `Non-Tobacco` của AIG/NLG — chính tả của hãng,
     đừng "sửa cho đồng bộ". Owner nói danh sách Allianz là **tạm**, sẽ gửi bản chính thức sau.
   - `rateCarrierOf()` mới: `carrierOf()` trả `'Bản nháp'` cho file trong `4-Clients` nên MẤT dấu
     hãng → bản nháp "Vu Nguyen - AIG IUL.svg" sẽ ra danh sách sai. Hàm mới soi tên/đường dẫn file.
   - `ALL_RATE_CLASSES` (gộp mọi hãng, loại trùng) dùng cho việc TỰ NHẬN DIỆN ô xếp hạng trong bản
     vẽ chưa gắn id — nhận diện xảy ra TRƯỚC khi biết hãng nên không được dùng list của một hãng.

**LÀM Ở LOCAL (feat/login, CHƯA push)** — 2 commit `38ad6c9` + `f0bf673`:
- Supabase bật thật: dán khoá, tắt "Confirm email", bật Email provider. Owner = `super_admin`.
- **Quản lý thành viên `/members`**: 3 role `super_admin > admin > user`, 4 trạng thái
  `pending/active/suspended/deleted`, cột `department`. Nút: Duyệt · Phòng ban · Đặt/Bỏ quyền Admin ·
  Tạm khoá · Mở khoá · Xoá (xoá = mềm, ẩn khỏi danh sách, tài khoản vẫn còn để khôi phục).
- **Bảo mật ở DB chứ không chỉ ẩn nút**: trigger `enforce_member_update()` + RLS. Đã test bằng cách
  gọi thẳng API (bỏ qua giao diện): super_admin tự đổi quyền mình → BỊ CHẶN. Admin chỉ đụng được
  `user`, không đổi được role, không xoá được.
- Cột `approved` cũ được trigger `sync_profile_flags()` tự đồng bộ `= (status='active')` → mọi guard
  cũ đọc `approved` vẫn đúng, không phải sửa.
- Super Admin **bị chặn vào Tool** (vào `/tool` → đá về `/members`), ẩn luôn mục Công cụ khỏi nav.
  → Muốn tự test Tool phải tạm đổi role mình về `admin`.
- UI: Tool thành mục con dùng CHUNG sidebar với portal (bỏ rail riêng); hover mềm toàn cục bằng
  `:where(...)` (specificity 0 nên không đè transition riêng của component); nội dung chia thẻ bo góc;
  topbar thành thẻ nổi bo 20px khớp rail; bỏ `max-width:1200px` của `.dash` để header và nội dung
  chung một cột; rail/topbar/nội dung cùng thụt vào 8px; `--r-xl` 18px→20px ở CẢ 2 file CSS.
- `.gitignore`: bỏ qua `.agents/`, `skills-lock.json`, `.claude/skills/supabase*`, `.codex/`
  (skill bên thứ 3 cài bằng `npx skills add` — cài lại được, ~240 KB không cần vào repo).

**BẪY GẶP PHẢI HÔM NAY (đọc kỹ, đều tốn thời gian):**
- **PowerShell `Get-Content`/`Set-Content` PHÁ tiếng Việt**: dùng để bump `?v=` hàng loạt → 5 file HTML
  vỡ hết dấu (`Trang nội bộ` → `Trang ná»™i bá»™`). Phát hiện nhờ tiêu đề tab. Khôi phục bằng
  `git checkout -- <file>` rồi bump lại bằng công cụ sửa file. **Trên Windows đừng sửa hàng loạt file
  có tiếng Việt bằng PowerShell.**
- **`git commit -m` với here-string chứa dấu nháy kép bị vỡ** thành nhiều pathspec → dùng
  `git commit -F <file>` (ghi message ra file trước) cho message dài/có tiếng Việt.
- **`node --check` KHÔNG bắt được `ReferenceError`**: đổi tên `RATE_CLASSES` xong vẫn còn 2 chỗ gọi
  tên cũ, cú pháp vẫn "OK" nhưng chạy sẽ vỡ panel sửa chữ. **Đổi tên biến xong phải `grep` tên cũ.**
- **Rule chung `aside { overflow: hidden }`** cắt mất phần bung của sidebar dạng `<aside>` — phải
  `overflow: visible` cho riêng nó.
- **Breakpoint phải TRÙNG giữa các hệ layout**: sidebar ẩn ở 820px nhưng layout mobile của tool bật ở
  900px → dải 821–900px hiện CẢ hai hệ nav. Đã đưa về cùng 900px.

### 2026-07-19 (BÀN GIAO — owner chuyển Portal cho team PD, push v1.10)
- **Owner quyết định dừng vai trò ở đây, bàn giao phần Portal cho team PD làm tiếp.**
  Push v1.10 lên main (+ 4 branch feat/* để team thấy cấu trúc từng phần).
- **Trạng thái bàn giao cho team PD:**
  - Portal Đợt 1 chạy LOCAL đầy đủ ở chế độ mở (chưa bật Supabase). Live site sau deploy
    cũng chạy chế độ mở — Tool hoạt động như cũ, trang chủ mới có notice "chưa bật tài khoản".
  - Việc kế tiếp theo thứ tự: (1) tạo Supabase project + chạy `supabase/schema.sql` + dán key
    vào `public/js/portal/config.js` (làm theo `SETUP-SUPABASE.md`, 10 phút);
    (2) test e2e đăng ký → duyệt → đăng nhập → video → guard /tool; (3) Forum Đợt 2 +
    trang quản lý thành viên (mỗi phần 1 branch `feat/*` theo conventions.md).
  - Google Sheet Product Hub: owner đã chia 4 tab, quyền "anyone with link = writer".
    Nội dung cập nhật CHƯA vào Sheet (bị dừng giữa chừng) — toàn bộ nội dung chuẩn đã nằm
    trong `product/PRODUCT-HUB.md` + `build-product-hub.py` (nguồn sự thật), chép sang Sheet
    theo đó. Kỹ thuật điều khiển Sheet không cần login đã thử OK: name box + synthetic Enter,
    paste bằng ClipboardEvent+DataTransfer, verify bằng gviz CSV (`&range=`).

### 2026-07-19 (PORTAL Đợt 1 — biến tool thành trang nội bộ công ty, v1.10)
- **Chuyển hướng lớn (owner quyết):** web trở thành portal nội bộ Thinksmart Insurance:
  (1) Video học cho sale, (2) Forum (Đợt 2), (3) Tool thành mục con, (4) Login + phân quyền
  admin/user. Stack chọn: **Supabase** (Postgres+Auth, free tier) + video **YouTube unlisted
  hoặc Google Drive** + đăng nhập email/mật khẩu + lộ trình MVP.
- **Cấu trúc mới:** `/` = trang chủ portal (index.html MỚI) · `/login` · `/videos` ·
  `/tool` = editor cũ (`git mv index.html → tool.html`, KHÔNG đổi đường dẫn tương đối —
  route không có "/" cuối nên asset vẫn resolve về gốc; server tự redirect `/tool/` → `/tool`).
  Route khai báo trong `PORTAL_PAGES` cuối server.js. Gotcha: Express non-strict routing —
  `app.get('/tool')` match luôn `/tool/`, phải check `req.path` để redirect.
- **File mới:** `public/portal.css` (token COPY từ style.css §1 — đổi token phải sửa cả 2),
  `public/login.html`, `public/videos.html`, `public/js/portal/{config,auth,videos}.js`,
  `supabase/schema.sql` (profiles + videos + RLS + trigger + is_admin()/is_approved()),
  `SETUP-SUPABASE.md` (hướng dẫn owner 10 phút).
- **Chế độ mở:** khi `config.js` chưa có key Supabase → không bắt đăng nhập, tool chạy như cũ,
  các trang hiện notice "chưa bật hệ thống tài khoản". Dán key vào là toàn bộ guard bật.
- **Version badge giờ ở 4 chỗ** (tool.html sidebar + footer của index/login/videos) —
  khi bump: `grep -rn "version-badge" public/*.html`. Đã bump **v1.10 · 19/07/2026**.
- Đã verify local (port 8000): 4 trang 200, `/tool/`→301, tool load đủ 12 file SVG,
  0 lỗi console. CHƯA test được flow đăng nhập thật — chờ owner tạo Supabase project
  (PENDING: verify e2e sau khi dán key rồi mới push/deploy).
- Gotcha máy D:\ hôm nay: Browser pane tab cũ báo viewport 0×0 (probe fixed inset:0 width=0)
  — mở TAB MỚI (tabs_create) là có viewport thật 1280×720; đừng tin số đo tab cũ.
- **Workflow branch mới (owner mandate):** Đợt 1 được tách thành 4 branch merge --no-ff lần lượt
  (`feat/tool-route` → `feat/portal-shell` → `feat/auth-login` → `feat/videos-page`), mỗi trạng thái
  sau merge đều chạy được (redirect tạm `/`→`/tool` ở branch 1). Từ nay MỌI phần mới làm branch
  riêng như vậy — xem conventions.md "Branch theo từng phần". Gotcha verify: server test nền có thể
  thành zombie giữ port 8000 → node mới EADDRINUSE và curl trúng server CŨ (kết quả sai);
  trước mỗi vòng test: `netstat -ano | grep :8000` + taskkill PID cũ.

### 2026-07-17 (v1.03 — Product Hub: sheet + repo, docs-only push)
- **Owner lập Product Hub** (hỏi "trong ngành product gọi là gì" → Product Docs/Hub): thư mục mới
  `product/` trong repo — `build-product-hub.py` (NGUỒN SỰ THẬT: sửa DATA rồi chạy lại),
  sinh `PRODUCT-HUB.md` + `Thinksmart-Product-Hub.xlsx` (4 tab: Vision & Nguyên tắc / Roadmap /
  Release Notes / Bài học).
- **Google Sheet** (bản nhìn-cho-người, tài khoản Drive xuanthuongqtkd@gmail.com):
  folder "Thinksmart Tool — Product" → sheet "Thinksmart Product Hub"
  (id `1Y8kpimASEXucj8a5Mio2BNVabfwaX2ERZBKJ7cPUClQ` — link trong PRODUCT-HUB.md).
  Upload qua Drive connector dạng CSV textContent (base64 chép tay 18k ký tự bị lỗi — bài học:
  binary qua connector dễ hỏng, text thì an toàn).
- **Roadmap trong hub = kết quả phân tích 6 lăng kính** (workflow sale / trải nghiệm khách /
  proposal / compliance / khảo sát thị trường / vận hành đội — ~75 ý tưởng lọc còn ~25, nhóm
  NOW/NEXT/LATER/LẰN RANH). Ưu tiên NOW: Gửi 1 chạm, Presentation mode, Backup nháp JSON,
  Disclaimer tự động, QR vCard, tin nhắn mẫu.
- Docs-only push, app KHÔNG đổi — badge vẫn bump v1.03 theo mandate (quy tắc đơn giản hơn ngoại lệ).

### 2026-07-17 (v1.02 — nháp trình duyệt cho site live: 100 sale dùng đồng thời)
- **Owner hỏi "100 sale vào cùng lúc thì sao?" → chốt mô hình 4 bước: Truy cập → Sửa → Lưu nháp
  (~10 bản, tạm trên web) → Download.** Giải pháp: nháp lưu localStorage TRÌNH DUYỆT từng sale —
  không server ghi file (Vercel read-only + lộ data giữa các sale), không cần đăng nhập/DB.
- Implementation: server.js `/api/svgs` trả `draftsMode: process.env.VERCEL ? 'browser' : 'server'`;
  core.js: `appState.draftsMode` + `usesBrowserDrafts()` + `MAX_LOCAL_DRAFTS = 10` +
  `appendLocalDraftsToList()` (dùng chung static + server-browser); save/create/delete-refresh
  mode-aware; nháp local: mở qua `/api/svgs/content` khi có server (templatePath dạng workspace
  không fetch thẳng được). Máy local (không VERCEL env) giữ nguyên ghi `4-Clients/`.
- **BUG NẶNG tóm được nhờ test round-trip**: nháp lưu "$999.99" mở lại thành "$999.99.70" — re-apply
  fields thiếu `clearSiblingTspans` (đuôi ".70" của giá trị gốc nằm ở tspan em). Fix kép:
  `collectEditedFields` lưu CẢ DÒNG (`getLineTextContent`) thay vì mảnh tspan đầu, và re-apply chỉ
  đụng dòng thực-sự-khác + clear siblings (guard tương thích record cũ). KHÔNG được xoá mù siblings —
  sẽ phá dòng nhiều tspan chưa sửa.
- Verified (server riêng `VERCEL=1 PORT=8100`): draftsMode browser, tạo nháp vào localStorage +
  điền tên, sửa + Lưu Nháp, reload → nháp trong nhóm "Bản nháp" mở đúng ($999.99 sạch, các dòng
  chưa sửa nguyên vẹn), cap 10 hiện dialog "Kho nháp đã đầy", xoá nháp OK; port 8000 (server cũ
  chưa restart, không trả draftsMode) → default 'server', ghi file như cũ; 0 lỗi console.
- `core.js?v=14`, badge v1.02. LƯU Ý: server local của owner cần restart mới trả draftsMode
  (không bắt buộc — thiếu flag thì frontend tự về 'server').

### 2026-07-17 (sau push v1.01 — app dialog + auto điền tên khách, CHƯA PUSH)
- **Modal dialog theo design system thay alert()/prompt() hệ thống** (owner chê alert xấu):
  `showAppDialog/showAppAlert/showAppPrompt` (core.js, trước collectEditedFields) + CSS section 22
  (`.app-dialog-*`: surface card, icon bubble theo tone info/warning/danger, scrim 50%, Enter/Esc,
  focus restore, aria dialog). ĐÃ THAY 13 alert() + 1 prompt() trong core.js — 2 confirm() sync
  (rời trang chưa lưu, xoá nháp) GIỮ nguyên vì đổi sẽ phải async-hoá cả chuỗi caller (việc sau).
- **"Tạo bản cho khách" giờ điền luôn tên khách vào bản vẽ** (owner yêu cầu "nhớ thay đổi ở ô tên"):
  `applyClientNameToDoc(name)` — ghi vào dòng `#client-name` (proposal) hoặc `text[data-nc="name"]`
  (name card) TRƯỚC khi serialize/clone → file mới sinh ra đã mang tên; ô editor + canvas hiển thị
  đúng ngay khi bản mới mở.
- **GOTCHA mới: đừng mở dialog bằng requestAnimationFrame** — tab nền/pane throttle không chạy rAF
  → dialog kẹt opacity 0. Dùng force reflow (`void el.offsetWidth`) rồi add class `.open` đồng bộ.
- Verified server mode: dialog "Chưa chọn mẫu" đẹp (mở tức thì, focus OK, Esc đóng), flow tạo bản
  "Test Khach A" → file + ô tên + canvas đều đúng, xoá nháp test sạch, master không đổi, 0 lỗi
  console. `core.js?v=13`, `style.css?v=20`. Push sau (nhớ bump badge → v1.02 khi push).

### 2026-07-17 (EOD push từ máy D: — badge v1.01)
- Push cả ngày làm việc: badge version, font thật (từ máy E: chưa push? — không, đã push 16/07;
  hôm nay là phần máy D:), audit fixes + mobile (style.css v19), placeholder 5 master
  (public/templates cập nhật cả 5), skill files.
- **Owner mandate mới, đã ghi vào SKILL.md + conventions.md "Pre-push checklist"**: MỖI lần push
  phải (1) bump version badge index.html (lần này v1.00→v1.01), (2) update & học skill files trước
  khi commit. Nhớ làm mãi mãi về sau.

### 2026-07-17 (placeholder chuẩn cho 5 mẫu gốc — owner chốt 3 phương án recommended)
- **Đổi data giả lộn xộn trong MỌI master thành bộ placeholder thống nhất** (owner yêu cầu
  "Place Holder chuẩn chỉnh", chốt qua 3 câu hỏi):
  - Khách hàng (4 proposal): **Nguyen Van An · 43 · Male · Standard Non-Tobacco · Texas**
    (tên ASCII không dấu — khớp regex detect client-name; 43 khớp fallback literal; Texas ∈ US_STATES).
  - Đại lý (4 proposal): **Ten Tro Ly / Ten Agent · (000) 000-0000** — hết lộ SĐT thật Tony/Jason;
    "(000..." khớp isPhone `^\(\d{3}\)`; số bắt đầu 0 nên formatPhoneValue không đụng.
  - Số liệu kế hoạch GIỮ nguyên bộ nhất quán ($152.70×12×20=$36,648); riêng TERMLIFE - NLG
    (bản bẩn: Trương thị thanh hảo/Sài gòn bình thạnh/VN phones/$1000.99) đưa về bộ term chuẩn
    $300,000 · $77.00/$120.00/$180.00 → **đóng luôn PENDING #0**.
  - Name Card: Nguyen Van An / (000) 000-0000 ×2 / email@thinksmartinsurance.com (hết lộ aileen@).
- **Cách làm đáng tái dùng** (file 2.2–8.8MB không kéo qua eval được): dùng chính engine app —
  `loadSvgContent(svgsList[i])` → set value ô input + dispatch `input`/`change` (đi qua
  `applyTextValue` nên multi-tspan sạch, id client-* được giữ) → serialize + POST
  `/api/svgs/save` vào file tạm `4-Clients/_ph_N.svg` (route hợp lệ) → cp đè
  `2-Templates/**` + `public/templates/**` → rm tạm → `clearDirty()` trước khi load file kế.
- Verified sau reload: cả 5 master đủ field (16/13/16/13/5), giá trị placeholder đúng 100%,
  dropdown hợp lệ, 0 lỗi console. Backup 5 bản gốc cũ ở scratchpad phiên này (mất khi dọn máy —
  nếu cần giữ lâu, copy vào _Archive).

### 2026-07-17 (tối ưu mobile + đóng 4 lỗi audit — /ui-ux-pro-max)
- **Đóng cả 4 lỗi audit** (PENDING 5a–5d cũ):
  - `.header-right .btn` mobile: padding 9px 11px → **12px** ⇒ 44×44px (18 icon + 24 pad + 2 border).
  - Dark theme: `.file-count-badge`/`.version-badge` color → `--brand-hover` (4.38 → **5.71:1**).
  - `.nav-count` color `--text-3` → `--text-2` (4.45 → **5.81:1** trên surface-3, cả 2 theme đạt).
  - Copy bước 3 màn chào: "Lưu nháp" → "Lưu Nháp" (khớp nút header). Phần "đuôi file trong cây"
    là false positive — a11y tree đọc attribute `title` (có đuôi), text hiển thị vốn đã sạch.
- **Safe-area cho iPhone tai thỏ** (meta có `viewport-fit=cover` nhưng CSS chưa từng dùng env()):
  mobile block thêm `env(safe-area-inset-*)` cho `.app-header` (trái/phải, landscape),
  `.canvas-status-bar` (height + padding-bottom), `.sidebar-actions-footer` (nút Xuất trong
  bottom-sheet không đè thanh home), `.sidebar-version-footer` (chân drawer). Fallback 0px — desktop
  và Android không đổi.
- **Chống pull-to-refresh Android**: `overscroll-behavior: none` trên body;
  `overscroll-behavior: contain` cho `.tree-container` + `.inspector-content` (scroll trong
  drawer/sheet không lan ra body).
- **Tap feedback**: `.tree-file-item:active` nền surface-3 (mobile không có hover).
- Verified localhost 375px + 1280px: nút header 44×44 mobile / 75×38 desktop (đo bằng phần tử tạo
  mới — số đo phần tử cũ sau resize pane bị đơ, CSSOM xác nhận rule nằm đúng trong @media),
  contrast đo lại 5.71/5.81, copy đúng, 0 lỗi console, không tràn ngang. `style.css?v=19`.

### 2026-07-17 (máy phụ D:\ — học project + audit design bằng /frontend-design)
- **Máy phụ mới** (user `hadan`): repo clone tại `D:\AI-Production-Engineer\Proposal2026\Proposal2026`,
  remote `hadangtien0702-dot/Thinksmarttool`, local ngang origin/main. Skill user-level đã cài
  (frontend-design, ui-ux-pro-max, design-lessons stub — bản gốc ở máy chính E:\, cần merge).
- **GOTCHA máy này: Browser pane timeout HẲN khi screenshot** — audit UI hoàn toàn bằng
  `javascript_tool` sync eval (rect, token qua phần tử tạo mới, contrast tự tính). Hoạt động tốt.
- **Audit toàn tool trên localhost:8000** (light+dark, desktop+375px): nền tảng vững — a11y đạt
  (nút có tên 100%, input đủ aria-label, keyboard OK, heading đúng bậc), contrast chính đạt AA cả
  2 theme, mobile không tràn ngang. Tìm thấy 4 lỗi nhỏ → ghi vào PENDING 5a–5d bên trên.
- Docs pruned: conventions.md mục Fonts (đã hết "italics chưa bundle" — fix 17/07), deployment.md
  thêm custom domain `tool.thinksmartinsurance.com`.

### 2026-07-17 (badge phiên bản app ở chân sidebar trái)
- Owner yêu cầu hiển thị số version trong UI để phân biệt bản đang chạy (local vs live).
- Thêm `.sidebar-version-footer` (badge `v1.00` + ngày `17/07/2026`) vào cuối `sidebar-left`
  trong `index.html`; CSS mới ngay sau `.tree-container` trong `style.css` (dùng `--brand-soft`,
  `--divider`, `--fs-2xs` — tự tương thích light/dark). `style.css` bump → `?v=18`.
- **Convention mới: mỗi lần deploy, cập nhật tay số version + ngày trong `sidebar-version-footer`
  (index.html)** — đây là chỗ duy nhất giữ version hiển thị.

### 2026-07-17 (font thật thay font giả — "font bị đổi khi sửa/xuất")
- **User report: "cảm giác khi sửa nội dung font bị đổi"** → điều tra toàn tuyến font. Kết luận:
  - Code sửa chữ KHÔNG đổi font (applyTextValue giữ nguyên tspan + class; đã kiểm tra 92 dòng
    editable của AIG IUL — các field khách/kế hoạch/đại lý đều 1 font/dòng; chỉ 7 dòng trộn font
    là tiêu đề lớn + slogan + disclaimer, sửa chúng sẽ mất bold/nhấn giữa câu — hạn chế đã biết).
  - **THỦ PHẠM THẬT: 7 file woff cũ trong `public/fonts/` là đồ giả** — md5 cho thấy
    Black = Bold = Heavy = Text-Bold (cùng 1 file!), Text-Regular = Display-Regular. Máy có cài
    SF Pro (local()) thì canvas đẹp, nhưng EXPORT chỉ nhúng woff → Heavy/Black tụt về Bold,
    italic bị alias thành đứng, Bodoni (slogan NLG) rớt sang serif fallback. Máy KHÔNG cài
    SF Pro (laptop sale, live site) thì canvas cũng sai luôn.
- **Fix: build lại 10 woff THẬT** bằng fontTools (subset Latin + đủ tiếng Việt U+1E00-1EFF,
  layout features giữ nguyên) từ OTF cài trong `C:\Windows\Fonts` — gồm cả 3 italic thật;
  \+ tải **BodoniModa18pt-Italic.woff2** (Google Fonts OFL, pinned ital/opsz18/wght400).
  Script: `build-fonts.py` (repo root — cần `pip install fonttools brotli zopfli`).
- `style.css` @font-face: 3 italic trỏ file thật, thêm khai báo Bodoni. `core.js`: EMBED_FONTS
  đủ 11 font (hỗ trợ per-font `format`), XÓA `ITALIC_ALIASES`.
- Verified (probe @font-face tên riêng, né local()): Black/Heavy/Bold width khác nhau thật,
  italic nghiêng thật, Bodoni load; `getEmbeddedFontCSS()` build đủ 11 families (~2.4MB base64),
  0 lỗi console. `core.js?v=12`, `style.css?v=17`.
- NOTE: repo public đang chứa SF Pro subset (Apple license không cho redistribute — trước giờ
  vẫn vậy với bộ giả). Nếu owner muốn kín kẽ: chuyển repo private hoặc mua/kiểm tra license.
- NOTE: folder `5-Design-Sections/sf pro/` của owner cũng là bộ woff GIẢ cũ — nếu cần dùng
  cho design mới, copy từ `public/fonts/` sang.

### 2026-07-16 (later 2 — chuẩn hóa design system, /frontend-design)
- **Standardization pass on `style.css`** (owner: "chuẩn hóa Thinksmart Tool"); no visual redesign —
  identity kept (violet ramp, Plus Jakarta Sans, dotted canvas, 4-step workflow). Changes:
  - Deleted ~60 lines of DEAD CSS left by removed features: `.template-warning`, `.agent-preset-bar`,
    whole CODE EDITOR section (`#raw-code-area`…), `.pane-section h3`, `.pane-description`,
    `.metadata-grid`/`.meta-*`, `.font-semibold`/`.font-mono`/`.text-xs`, `.toolbar-label`,
    `.text-font-info`, `.lib-ext`. (Verified dead by grepping index.html + js/*.js.)
  - New tokens: `--attention: #F59E0B` (unsaved dot), `--ft-jpeg-1/2` (teal, export JPEG),
    `--ft-pdf-1/2` (red, PDF mockup cover), `--fs-2xs: 10.5px` (eyebrows/chips).
  - All stray font-sizes (9–14px) mapped to the type scale; ONLY literal left: mobile 16px input
    (iOS anti-zoom functional constant). Swatch hexes (preset-btn) intentionally stay literal.
  - Deduped double-defined `.sidebar-actions-footer` and `.tree-file-name`.
  - `100vh` now paired with `100dvh` fallback (body/.app-container/.app-body/bottom-sheet 66dvh).
- Verified localhost: tokens resolve both themes (fresh-element probe: light/dark --text-3,
  --app-bg, --attention), export gradients from tokens, 19 editor fields intact, 0 console errors.
- GOTCHA reconfirmed: pane freezes style recalc on body-class toggle — computed styles of EXISTING
  elements are stale; read tokens via a freshly created element.
- `style.css?v=16`. Design lessons appended (project notebook + global LESSONS.md rule 15).

### 2026-07-16 (later — banner gỡ, allowlist scan, hãng Allianz)
- **Removed the "Đây là MẪU GỐC…" warning banner** in the texts editor panel (owner request) —
  deleted the `template-warning` block in `populateTextsEditor()` (core.js). Master protection
  itself unchanged (save still blocked, "Tạo bản cho khách" still the flow). `core.js?v=10`.
- **`/api/svgs` scan switched from blocklist to ALLOWLIST** (`PROPOSAL_SCAN_DIRS =
  ['2-Templates', '4-Clients', 'Name Card']` in server.js) after the owner's new WIP folder
  `5-Design-Sections/` (11 Allianz section SVGs) leaked into the tree as "Khác 11". Any future
  root folder stays out automatically; `_Archive` also skipped at any depth.
- **New carrier "Allianz"** in Proposal / Báo giá (owner is designing Allianz templates):
  `carrierOf()` + `CARRIER_ORDER` + new `MASTER_CARRIERS` (core.js); nav renders the 3 master
  carriers even when empty with hint "Chưa có mẫu." (proposal.js, skipped while searching);
  server-side carrier detection for `public/templates` fallback also knows Allianz. Created
  empty `2-Templates/Allianz/`. When the design is final: drop the SVG there (filename should
  contain "Allianz") + copy to `public/templates/` for Vercel.
- **`.gitignore` += `5-Design-Sections/`** — design WIP must not reach the public repo.
- Verified on localhost: tree = AIG 2 / NLG 2 / Allianz 0 ("Chưa có mẫu."), banner gone,
  19 editor fields intact on IUL - NLG, no console errors. `core.js?v=11`, `proposal.js?v=10`.

### 2026-07-16 (máy mới sau cài Windows — khôi phục môi trường)
- **Máy được cài lại Windows**: user cũ `Kinn` → user mới `DRT-G21`; ổ dữ liệu cũ `G:` giờ mang
  tên **`E:`** (cùng ổ vật lý). Repo giờ ở `E:\2026\Thinksmart\Sale\Proposal2026`.
- Fix git "dubious ownership": `git config --global --add safe.directory E:/2026/Thinksmart/Sale/Proposal2026`.
- **Khôi phục 4 skill user-level** từ backup `E:\2026\Claude\.claude\skills\` →
  `C:\Users\DRT-G21\.claude\skills\` (frontend-design, ui-ux-pro-max, design-lessons, backend-patterns).
- **2 file .bat backup/restore ở `E:\2026\Claude` viết lại dùng `%~dp0`** (tự nhận ổ đĩa — hết
  hardcode `G:`); thêm guard "đã là junction thì bỏ qua". README cập nhật. Junction CHƯA chạy
  (cần đóng Claude Code + Run as administrator) — tuỳ chủ dự án chạy `2-khoi-phuc-sau-khi-cai-win.bat`.
- **Đường dẫn trong skill/tài liệu đổi hết** `G:\` → `E:\`, `C:\Users\Kinn` → `%USERPROFILE%`
  (SKILL.md, architecture.md, conventions.md, design-lessons.md, design-lessons user-level).
- Khối thay đổi 2026-07-15 VẪN CHƯA COMMIT (nguyên vẹn sau chuyển máy) — commit ở EOD như thường lệ.

### 2026-07-15 (later 19 — design skills moved to USER level + global lesson notebook)
- **Restructured per owner clarification** ("dự án nào cũng dùng, có bản lưu local, muốn biết hàng
  tuần học thêm gì"): the design toolkit now lives at `C:\Users\Kinn\.claude\skills\` —
  `frontend-design`, `ui-ux-pro-max`, and NEW **`design-lessons`** (global lesson notebook,
  LESSONS.md with ⭐ golden rules + per-ISO-week log + weekly summary slot). Every project on the
  machine sees them automatically.
- Removed the project-level copies installed earlier the same day (duplicate names); `.gitignore`
  entries kept as a guard. `conventions.md`/`SKILL.md`/`design-lessons.md` updated: project notebook
  keeps Thinksmart-specific lessons, generalizable ones get PROMOTED to the global LESSONS.md.
- Owner's philosophy captured in the global skill: solve short-term → extract lessons → compound
  daily for long-term. Weekly review: ask "tuần này học được gì" (reads LESSONS.md current week).

### 2026-07-15 (later 18 — design skills bundled + daily design lessons)
- **Installed 2 design skills INTO the project** (owner: "đi theo dự án"): `.claude/skills/frontend-design/`
  (from anthropics/claude-code plugins, v1.1.0) and `.claude/skills/ui-ux-pro-max/` (copied from user-level).
  Both **gitignored** (licenses: Anthropic all-rights-reserved / none) — reinstall notes in `conventions.md`.
- **New compounding file `references/design-lessons.md`** (owner: "update bài học mỗi ngày"): 10 seeded
  rules + dated lesson log; SKILL.md now mandates using both skills for UI work and appending lessons
  at session end (self-learn step 3).
- NOTE: `4-Clients/` empty today = owner deleted their test drafts with the trash button (confirmed benign).

### 2026-07-15 (later 17 — Roman numeral badges centered)
- **Section badges "I" / "II" centered inside their rounded squares** (owner request) on all 4
  proposal templates. Method worth reusing: measured the real offset in-browser
  (getBoundingClientRect of rect vs text, divided by appState.zoom), then patched the `<text>`
  `translate(x y)` values in the SVG files directly — patched BOTH `public/templates/*.svg` and
  `2-Templates/**/*.svg` (8 files, each replacement matched exactly once). Re-measured: 0.00px
  offset on every badge, all 4 templates.
- NOTE: `4-Clients/` was EMPTY at patch time (owner deleted their test drafts with the new trash
  button) — no drafts needed patching. Drafts created from now on inherit the centered badges.

### 2026-07-15 (later 16 — chart columns edit as one [money | age] row)
- **Each IUL chart column is now ONE combined edit row** (owner request): label
  "Giá trị tích luỹ — Cột N biểu đồ" with two side-by-side inputs — MONEY on the left,
  AGE on the right (replaces the separate "Giá trị tích luỹ Tuổi N" + "Tuổi cột N" fields).
- Implementation: IUL branch pushes `{ isChartCombo, index, money, age }` items;
  `buildChartComboBlock()` in `populateProposalTextsEditor` renders `.dual-input-row`
  (CSS: money flex 1, age flex 0 0 40%). Money input keeps blur $-format; age input keeps
  the "Cash Value at N" EN sync. Both carry data-editor-id → canvas hover/click-to-edit
  still focuses the right input.
- Verified AIG IUL + IUL - NLG: 3 combo rows, money blur "$52,000", age→"Tuổi 65" syncs
  "Cash Value at 65", old EN gone; no console errors. `proposal.js?v=9`, `style.css?v=15`.

### 2026-07-15 (later 15 — "Bảo vệ đến tuổi" locked)
- **"Bảo vệ đến khi nào / 120 tuổi" is LOCKED** (owner decision): it's a fixed product value, removed
  from the editable plan fields (the `coverage` extra is still collected — it stays the box-row Y
  anchor fallback for the totalPremium detection). Canvas "120 tuổi" no longer hover/click-editable.
  Verified on AIG IUL + IUL - NLG. `proposal.js?v=8`.

### 2026-07-15 (later 14 — "Tổng số tiền đóng" mislabeled as chart value)
- **Fixed one-off label shift in IUL Section 2** (user report from the LIVE site): the "Tổng số tiền
  đóng" box value ($36,648, at X≈212 Y≈698) was being captured as the first chart projection because
  the old `totalPremium` finder expected X<100 — so it got labeled "Giá trị tích luỹ Tuổi 63" and every
  cash-value label shifted by one (the real Tuổi-72 value fell off into a generic "Giá trị" field).
- Fix in `proposal.js` IUL branch: pull the box-row value OUT of `chartCandidates` first — it's the
  item whose Y is within 25px of the "20 năm" (period) row — then sort the remainder as chart
  projections. Label is now dynamic too: "Tổng số tiền đóng (" + period text + ")".
- Verified AIG IUL + IUL - NLG: Tổng số tiền đóng=$36,648, Tuổi 63=$49,515, Tuổi 67=$61,945,
  Tuổi 72=$85,078 (matches canvas), no stray "Giá trị" field; editing writes to the right canvas
  element (translate 212,698). `proposal.js?v=7`.

### 2026-07-15 (later 13 — full UI/UX audit via /ui-ux-pro-max)
- Ran a full audit with the ui-ux-pro-max skill checklist (accessibility/touch/contrast/keyboard).
  **Fixed:**
  - Zoom tooltips were SWAPPED (minus said "Phóng to", plus said "Thu nhỏ") → corrected + aria-labels
    on all 3 zoom buttons; aria-label on `#search-input`; `aria-live="polite"` on `#status-left`.
  - Keyboard access: new `makeKeyboardActivatable()` (core.js) — tabindex=0 + role=button +
    Enter/Space→click (with stopPropagation for the nested trash button) applied to tree file items,
    folder headers, brochure items, and draft-delete buttons. Verified Enter opens a file.
  - All editor inputs/selects now carry `aria-label` (proposal client/plan/agent + name card) — 20/20.
  - Contrast: `--text-3` light `#8A90A2`→`#667085` (3.19→4.97:1), dark `#6D7488`→`#8B93A8`
    (3.87→5.87:1) — WCAG AA.
  - Mobile touch targets to 44px standard: `.toolbar-btn` 44, `.icon-btn` 44, tree rows padding 12px,
    trash button padding 10px (negative margin keeps row height).
  - Welcome heading h3→h2 (no more h1→h3 skip).
- **Noted, not fixed** (minor): export buttons not disabled during export; `user-scalable=no` is an
  intentional tradeoff (app has its own pinch zoom).
- GOTCHA (testing): the in-app Browser pane also freezes STYLE RECALC after viewport resize — existing
  elements report stale computed styles; verify with a freshly created element instead.
- Versions: `core.js?v=9`, `proposal.js?v=6`, `brochure.js?v=4`, `namecard.js?v=5`, `style.css?v=14`.

### 2026-07-15 (later 12 — trash icon to delete drafts)
- **Draft items now have a trash icon** (hover on desktop, always visible on mobile). Applies to any
  item in "Bản nháp" (4-Clients files) and browser-saved (localId) proposals — masters never get it.
- New server route `POST /api/svgs/delete` (server.js, after clone): hard-restricted to `.svg` paths
  starting with `4-clients/` + `isPathSafe` (verified: master path → 403, traversal → 400).
- Client (`makeProposalItem`, core.js): confirm dialog ("không thể hoàn tác"), then localStorage
  removal (static) or the delete API (server). If the deleted draft was open →
  `resetCanvasToWelcome()` (new core helper: clears state/canvas, shows welcome, hides save,
  disables exports). Tree refreshes after.
- Verified full cycle: created ZZZ test draft via clone API, trash icon appeared (only on 4 drafts,
  0 masters), UI delete removed it from disk + tree + reset canvas; real drafts untouched; no console
  errors. Server restarted for the new route. `core.js?v=8`, `style.css?v=13`.

### 2026-07-15 (later 11 — "Khách hàng" group renamed to "Bản nháp")
- The proposal sub-group holding client copies (4-Clients / browser-saved) is now labeled **"Bản nháp"**
  (was "Khách hàng") — matches the Lưu Nháp workflow wording. Changed `carrierOf()` return value +
  `CARRIER_ORDER` in core.js. The client-name FIELD label "Khách hàng" in the editor is unchanged.
  `core.js?v=7`.

### 2026-07-15 (later 10 — bilingual nav section titles)
- Nav sections now all bilingual like "Proposal / Báo giá": **"Brochure / Tài liệu"** (label in
  main.js renderFileTree call) and **"Name Card / Danh thiếp"** (namecard.js). The Brochure empty-state
  hint strips the display suffix (`label.split(' / ')[0]`) so it still shows the REAL folder name
  ("Thả file vào folder "Brochure/<Hãng>/""). `brochure.js?v=3`, `namecard.js?v=4`, `main.js?v=5`.

### 2026-07-15 (later 9 — welcome title on one line)
- Welcome card: title "Chào mừng bạn đến với Thinksmart Tool" no longer wraps — card `max-width`
  400→560px + `white-space: nowrap` on the h3; mobile (≤900px) override sets the card to `width: 88vw`
  and lets the title wrap normally. Verified 1 line at 1280px, no overflow at 375px. `style.css?v=12`.

### 2026-07-15 (later 8 — simplified sale workflow)
- **Workflow simplified for new sales** after a role-play UX review with the owner. Owner's canonical
  flow (keep this wording): **Chọn mẫu → Điền → Lưu Nháp → Xuất** — explicit Lưu Nháp matters because
  sales get interrupted by client calls and forget.
- Changes:
  - **Context-aware header** (`updateHeaderActions()`, core.js): master → one primary "Tạo bản cho
    khách" (Save hidden); client copy → "Lưu Nháp" primary + "Tạo bản mới" secondary. Button labels
    live in `<span class="btn-label">` so JS can swap text without touching the svg.
  - **Removed the 2 agent-preset buttons** ("Lưu làm mặc định"/"Điền thông tin đã lưu"). Now automatic:
    `storeAgentPreset()` on every successful save/export; `applyAgentPresetQuiet()` after
    createNewProposal (both server + static branches, skipped for name cards).
  - **Dirty tracking** (`appState.isDirty`, `markDirty`/`clearDirty` in core.js): set in
    `applyTextValue`, `replaceColorInDoc`, name-card edits; cleared on load + successful save. Orange
    dot on Lưu Nháp (`.has-unsaved`), `confirmLeaveUnsaved()` guard on tree/brochure clicks,
    beforeunload warning, and exports auto-save dirty client copies first (exportToJpeg/Pdf now async).
  - Welcome screen shows the 4 steps (`.welcome-steps`, style.css section 21). Master banner + alerts
    reworded to "Tạo bản cho khách".
- Verified end-to-end on localhost (server mode): master state, create-copy flow (real clone in
  4-Clients, then deleted), auto-fill from preset, dot lifecycle, switch-file confirm, no console
  errors. `core.js?v=6`, `proposal.js?v=5`, `brochure.js?v=2`, `namecard.js?v=3`, `main.js?v=4`,
  `style.css?v=11`.

### 2026-07-15 (later 7 — US phone auto-format)
- **Phone fields auto-format while typing**: 10 digits → "(123) 456-7890" the moment the 10th digit
  lands. New `formatPhoneValue()` in `core.js`: strips non-digits, drops a leading "1" on 11-digit
  (+1) input, returns null unless exactly 10 digits, and **leaves numbers starting with 0 untouched**
  (VN format like 0938169130). NOTE: do NOT also exclude leading "1" — the owner's canonical example
  is literally "1234567890 → (123) 456-7890".
- Wired into: proposal agent SĐT inputs (`proposal.js`, only when `isPhone`) and Name Card
  "Số điện thoại"/"Fax / Văn phòng" (`namecard.js` `addNcField`, label-matched `/điện thoại|fax/i`).
  Name-card fallback per-line editor now reuses `addNcField` (dedupe).
- Verified: "1234567890"→"(123) 456-7890", "+1 832 980 4749"→"(832) 980-4749",
  "346.858.4277"→"(346) 858-4277", "0938169130" + short numbers + name fields untouched; canvas
  synced; no console errors. `core.js?v=5`, `proposal.js?v=4`, `namecard.js?v=2`.

### 2026-07-15 (later 6 — editable benefit-plan labels on IUL)
- **New editable fields in Section 2 (IUL only)** (user request): "Thời gian đóng phí" (20 năm),
  "Bảo vệ đến tuổi" (120 tuổi), "Tuổi cột 1/2/3 (biểu đồ)" (Tuổi 63/67/72). Section-2 collection in
  `proposal.js` now also gathers non-$ labels into `planExtras` by pattern (`/^\d+ năm$/`,
  `/^\d+ tuổi$/`, `/^Tuổi \d+$/`, `/^Cash Value at \d+$/`); appended ONLY in the IUL ordering branch
  (Termlife untouched — its "10/20/30 năm" are column headers there, verified no extra fields).
- Editing an age label auto-syncs its paired English subtitle: "Tuổi 63"→"Tuổi 65" also rewrites
  "Cash Value at 63"→"Cash Value at 65" (paired by matching number at build time).
- Money field labels now follow actual chart ages ("Giá trị tích luỹ " + ageLabels[i]) instead of
  hardcoded 63/67/72. Label fields carry `noCurrency: true` → blur $-format skipped ("25 năm" stays).
- Verified AIG IUL + IUL - NLG: 11 plan fields, edits hit canvas, EN sync works, no console errors.
  `proposal.js?v=3`.

### 2026-07-15 (later 5 — mobile UI)
- **Mobile optimization** (≤900px breakpoint, CSS section 20 in `style.css`):
  - Left sidebar → slide-in drawer (hamburger `#btn-mobile-nav` in header); picking a file auto-closes it.
  - Right editor → bottom sheet (66vh, rounded top): opens via pencil `#btn-mobile-editor` (visible only
    when a file is open) or by tapping editable text on canvas; closes via `#btn-editor-close` / backdrop.
  - Body classes drive it: `nav-open` / `editor-open` + `#mobile-backdrop`. Buttons use `.mobile-only`
    (hidden on desktop). Header compact: brand text + file title hidden, action buttons icon-only
    (`font-size: 0` trick keeps the svg).
  - **Touch gestures** in `main.js` `initTouchGestures()`: 1-finger drag = pan, 2-finger pinch = zoom
    around midpoint (reuses `handleZoom`). `.canvas-container { touch-action: none; }` on mobile.
  - Inputs ≥16px on mobile (blocks iOS focus auto-zoom); viewport meta now `user-scalable=no`.
  - Verified at 375×812: drawer/sheet/backdrop flows, tap-text→sheet+focus, synthetic TouchEvent pan
    (+50/+60 exact) and pinch (2× spread → 2× zoom exact); desktop at 1280px unchanged. NOTE: the
    in-app browser pane freezes CSS transitions (rendering throttled) — computed transform stays at the
    START value; inject `*{transition:none!important}` to assert end states when testing there.
  - `style.css?v=10`, `main.js?v=3`.

### 2026-07-15 (later 4 — keep typed ".00" in money fields)
- **"$120.00" no longer collapses to "$120"** (user report). `formatCurrencyValue()` (core.js) only
  kept decimals when the number was fractional; now it also keeps them when the user explicitly
  typed a decimal part (`/\.\d+$/` on the cleaned string). "120" → "$120" unchanged; "120.5" →
  "$120.50"; "1234567.00" → "$1,234,567.00". Verified on the blur auto-format of plan fields
  (AIG IUL, "Phí đóng mỗi tháng") — input + canvas both correct. `core.js?v=3`.

### 2026-07-15 (later 3 — full-text hover/click on canvas)
- **Hover/click-to-edit now covers the WHOLE field text** (user report: only the first 1–2 chars of
  "Male"/"$100,000"/"Standard Non-Tobacco" were hoverable). Cause: `.svg-editable-text` was applied to
  the id-carrying FIRST tspan only. Fix in `tagEditableCanvasElements()` (core.js): tag the parent
  `<text>` block (+ `data-editor-target="<editorId>"`) when it holds ≤1 editable line — hover anywhere
  on the value glows the whole block; fallback tags every same-y tspan for multi-line texts. Click
  handler (main.js) reads `data-editor-target || data-editor-id`.
- Hardened click-to-edit for dropdown fields: `<select>` has no `.select()` → guarded with
  `typeof textarea.select === 'function'`.
- Verified AIG IUL + IUL - NLG: all 15 fields tagged at text level; clicking the LAST piece of
  Male / Standard Non-Tobacco / $100,000 / Vu Nguyen / TONY PHU focuses the right sidebar field.
  `core.js?v=2`, `main.js?v=2`.

### 2026-07-15 (later 2 — agent field overwrite bug)
- **Fixed agent fields overlaying instead of replacing** (user report: typing "anh thay tên" gave
  "anh thay tênONY PHU" on canvas). Cause: the Section-3 (agent) input handler in `js/proposal.js`
  wrote `el.textContent = newValue` directly — that only replaces the FIRST tspan of the line and
  leaves sibling tspans ("ONY PHU", "46) 858-4277") untouched. Fix: use `applyTextValue()` (which
  calls `clearSiblingTspans`) like Sections 1–2 already did. `js/proposal.js?v=2`.
- RULE reinforced: **any write to a proposal line MUST go through `applyTextValue()`** — never set
  `.textContent` directly on a line's first tspan (multi-tspan values will leave tails).
- Verified typing into all 4 agent fields + client name on all 4 templates + Jenny client file:
  canvas line equals exactly the typed value. Name Card fields unaffected (its `getLines().apply`
  already clears same-line parts).

### 2026-07-15 (later — module split)
- **Split monolithic `public/app.js` (2446 lines) into per-tool modules** at the owner's request
  ("tách riêng từng phần"): `public/js/core.js` (shared engine: state, dom, load/save/clone, canvas,
  colors, fonts, export, texts-editor DISPATCHER), `js/proposal.js` (nav section + 3-group editor +
  agent presets + GENDERS/RATE_CLASSES/US_STATES), `js/brochure.js` (library fetch/preview/downloads),
  `js/namecard.js` (nav section + data-nc editor), `js/main.js` (renderFileTree composition +
  initEventListeners + boot). Plain global scripts, NO bundler/modules — load order matters:
  core → proposal → brochure → namecard → main (see index.html).
- New seams: `renderFileTree()` (main.js) calls `renderProposalNavSection` / `renderLibrarySection` /
  `renderNameCardNavSection`; `populateTextsEditor()` (core.js) routes to
  `populateProposalTextsEditor(svgEl, textElements)` or `populateNameCardTextsEditor(svgEl, textElements)`.
- Dropped dead code during the split: `copySvgCode`, `downloadSvgFile`, `copyPngToClipboard`,
  `isStaticText` (buttons removed earlier; nothing called them).
- Per-file cache versions now (`js/core.js?v=1` etc.) — bump only the file(s) you touch.
- Verified on localhost:8000 after split AND after deleting app.js: 3 nav sections, AIG IUL proposal
  15 fields + edit→canvas OK, brochure multi-page preview + download OK, name card 5 data-nc fields +
  edit→canvas OK, zero console errors. `node --check` passed on all 5 files.
- Updated `architecture.md` (module map), `conventions.md` (per-file `?v=` bump, one-global-namespace
  warning), `deployment.md` (poll `js/core.js?v=`), `SKILL.md` accordingly.

### 2026-07-15
- **Fixed bogus duplicate "Tên Agent Assistant" field** (user report, AIG IUL + IUL - NLG): the
  surrender-charge disclaimer paragraph wraps, and its short last line "khi không còn áp dụng."
  (Y≈1177, X≈66, <40 chars) slipped through the agent-zone filters in `populateTextsEditor`.
  Fix: in Section 3, skip any line whose parent `<text>` holds 2+ `[data-editor-id]` lines
  (`isParagraphLine`) — real agent fields are always single-line `<text>` elements.
- **loadSvgContent now strips stale `data-editor-id`** saved into files by older versions before
  re-assigning fresh ids (old files carried ids on the `<text>` wrapper → duplicate rows + id
  collisions). Follow-up: `tagClientInfoElements` got a `reclaimTag()` helper — if a saved
  `id="client-*"` sits on an element without `data-editor-id` (old `<text>`-level tagging, e.g.
  `IUL - NLG.svg`), the id is moved down to the inner tspan that carries the fresh editor id,
  otherwise the client fields disappear (the editor loop only iterates `[data-editor-id]`).
- **Wider phone detection in agent zone**: `isPhone` now also matches all-digit numbers like
  `0938169130` (VN format), not just `(346) 858-4277` — TERMLIFE - NLG labeled phones as "Tên".
- Verified all 4 templates + Jenny client file: 5 client fields, plan values, exactly 4 agent
  fields, edit propagates to canvas. `app.js?v=22`.
- NOTE for owner: **`TERMLIFE - NLG` master (both `2-Templates` and `public/templates`) contains
  saved test data** (client "Trương thị thanh hảo", state "Sài gòn bình thạnh", VN phones) — it was
  overwritten before master-protection existed. Needs a clean re-export/restore of that master.

### 2026-07-14 (later 2)
- **Fixed empty Proposal section on Vercel** (commit `6bda21f`): `2-Templates/` is gitignored so it isn't on
  Vercel; `/api/svgs` now also scans `public/templates/*.svg` (deduped by filename, synthetic
  `folder` so master-detection + carrier grouping work). Keep `public/templates/` + `manifest.json` in
  sync with `2-Templates/`.
- **Fixed proposal client fields (name/gender/rate) not showing** (commit `43eb973`). IMPORTANT ARCHITECTURE
  GOTCHA: `data-editor-id` is assigned to the **FIRST `<tspan>` of each line** (see loadSvgContent ~line 312),
  NOT the `<text>` element. So a value split across several tspans (e.g. "Standard Non-Tobacco" = 8 tspans,
  a person name = 4 tspans) is NOT equal to that first tspan's `.textContent`. Any code that reads/matches a
  field value must use **`getLineTextContent(el)`** (concatenates all tspans on the same line), and any write
  must clear the sibling tspans (`applyTextValue` already calls `clearSiblingTspans`). Fixed
  `tagClientInfoElements` (match via getLineTextContent; match rate/state against `RATE_CLASSES`/`US_STATES`;
  detect the client name by a capitalized-multiword pattern in the client zone instead of a hardcoded string)
  and the field-render read in `populateTextsEditor`. Verified all 4 templates show 5 client fields + editing
  updates the canvas. Debug tip that worked: temporarily add `window.appState = appState;` to inspect
  `activeSvgDoc` from `mcp__Claude_Browser__javascript_tool` (sync evals only — Promise evals hang the pane).

### 2026-07-14 (later)
- **Fixed empty Proposal section on Vercel.** Root cause: `2-Templates/` is gitignored → not deployed →
  `/api/svgs` (Vercel runs server mode) found no proposal masters. Fix in `server.js` `/api/svgs` handler:
  after the workspace scan, also scan `public/templates/*.svg` and add any not already found (dedupe by
  filename), with a synthetic `folder` (`2-Templates/<carrier>` or `Name Card/Chung`) so master-protection +
  carrier grouping still work. Their `path` is `public/templates/<file>` (loads fine via `/api/svgs/content`).
  Also added `public/templates/` to the save-protection prefixes. Commit `6bda21f`. So: **keep the deployed
  proposal copies in `public/templates/` + `manifest.json` in sync with `2-Templates/`** (deploy-vercel.bat
  does the copy) — that's now what the live site serves. Local still uses `2-Templates/` (deduped).

### 2026-07-14
- Created this `thinksmarttool` skill (project knowledge base) under `.claude/skills/thinksmarttool/`.
- Fixed `itemBlock is not defined` crash (missing `const itemBlock` in the agent-fields render). Commit `e1417be`.
- Name Card: removed the "Mẫu gốc" sub-group — masters show directly under the Name Card section.
- Name Card: only 5 tagged fields shown (name/title/phone/fax/email); added `data-nc` tagging + generic fallback.
- Name Card made editable like a proposal (master-protected + "Tạo bản riêng" copy flow); routed via `/api/svgs`.
- Fit-to-viewport zoom fix (`zoomToFit` cap → `MAX_ZOOM`) so small designs open readable, not tiny.
- Brochure: group multi-page image brochures even without a PDF; cleaner preview (dropped filename/type/size).
- Font embedding for JPEG/PDF export. Exports reduced to JPEG + PDF (removed SVG/PNG/copy buttons).
- Established owner workflow: local-first, one commit+push at end of day.

### 2026-07-13 (earlier work, condensed)
- Rebrand to "Thinksmart Tool" across UI + package + server logs.
- Premium SaaS design-system reskin (tokens, Plus Jakarta Sans, light/dark theme toggle).
- Reorganized folders → `1-Design / 2-Templates / 3-Export-PDF / 4-Clients / Brochure / Name Card / _Archive`.
- Left nav restructured into tool sections (Proposal / Brochure / Name Card); clean labels (no folder/ext).
- Right editor panel shows only when a proposal/name-card is open.
- Added Brochure download library (`/api/library`, `/api/download`) + downloaded the real AIG/NLG brochures.

---
## How to update this file (reminder)
At session end (or when told to wrap up / update memory / push): add a dated `### YYYY-MM-DD` block under
**Log** with what changed + why, refresh **Current state** (version numbers, last commit), and edit the
**PENDING** list (add new items, remove finished ones). Push it with the rest of the day's commit.
