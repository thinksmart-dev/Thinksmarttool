# Deployment

## GitHub
- Repo: **`thinksmart-dev/Thinksmarttool`** (org `thinksmart-dev`). Branch: `main`.
  Pushing to `main` triggers Vercel auto-deploy.
  Lịch sử tên: `EditorProposesalsale` → `hadangtien0702-dot/Thinksmarttool` → **chuyển vào org
  `thinksmart-dev` ngày 16/09/2026**. Tài liệu này từng ghi chủ cũ `hadangtien0702-dot` — đã sửa.

### ☠️ BA BẪY ĐẨY CODE — mất gần 1 tiếng ngày 16/09/2026, đọc TRƯỚC khi debug `git push`

Triệu chứng chung: `git push` báo **403 Permission denied to <tài khoản sai>**. Ba nguyên nhân
xếp chồng, gỡ cái này lộ cái kia. Đi đúng thứ tự dưới đây, đừng đoán:

**1. Remote bị ghi bằng CHUỖI GIỮ CHỖ.** `git remote -v` ra
`https://github.com/<tên-org>/Thinksmarttool.git` — literal `<tên-org>`, không ai điền. Push ra
lỗi **400**. Sửa: `git remote set-url origin https://github.com/thinksmart-dev/Thinksmarttool.git`

**2. Máy có HAI tài khoản GitHub và chúng đá nhau.**

| Thứ | Giá trị thực tế trên máy này |
|---|---|
| `git config user.email` | `hadangtien0702@gmail.com` (tài khoản ĐÚNG, có quyền) |
| Token `gh` đang giữ | **`Vincentnguyen1809`** (KHÔNG có quyền ghi vào org) |

→ Đăng nhập trình duyệt bằng tài khoản đúng **KHÔNG sửa được gì** — git không đọc phiên trình duyệt.
→ `gh auth login` chạy "Login with a web browser" sẽ cấp cho **tài khoản trình duyệt đang mở sẵn**.
   Trình duyệt đang là tài khoản sai ⇒ đăng nhập "thành công" mà vẫn 403 y hệt. Muốn đổi thật thì
   phải đăng xuất khỏi trình duyệt hoặc dùng **cửa sổ ẩn danh**.

**3. ☠️☠️ `gh auth login` TỰ CẮM MÌNH làm nguồn cấp quyền cho git — đây là bẫy sâu nhất.**
Bước hỏi *"Authenticate Git with your GitHub credentials?"* trả lời **Yes** sẽ ghi vào `--global`:

```
credential.https://github.com.helper = !'C:\Program Files\GitHub CLI\gh.exe' auth git-credential
```

Dòng theo-URL này **ĐÈ LÊN** `credential.helper = manager` ở tầng `--system`. Từ đó git **thôi hỏi
Windows Credential Manager** cho github.com và đi hỏi `gh` — mà `gh` cầm tài khoản sai.
→ **Hậu quả: xoá credential trong Windows Credential Manager KHÔNG có tác dụng gì** (đã mất một
vòng vì dọn đúng cái kho mà git đã không còn dùng). Nhãn `User:` trong Credential Manager cũng
**nói dối**: nó ghi `hadangtien0702-dot` trong khi token bên trong là của tài khoản kia — GitHub
nhận diện bằng **token**, không nhìn nhãn.

**Cách gỡ đã chạy đúng (16/09/2026):**
```bash
git config --global --unset-all credential.https://github.com.helper   # gỡ gh ra
cmdkey /delete:git:https://github.com                                   # xoá token cũ đã sai
git push origin main                                                    # bật cửa sổ đăng nhập mới
```
Kết quả: `8fd9318..19220f5  main -> main`.

**Chẩn đoán nhanh lần sau — chạy 3 lệnh này TRƯỚC khi sửa gì:**
```bash
git remote -v                                    # remote có phải chuỗi giữ chỗ không
git config --get-regexp credential               # gh có cắm vào không (dòng theo-URL đè helper chung)
gh auth status                                   # gh đang cầm tài khoản nào
```

☠️ **Claude KHÔNG tự push được** nếu trong phiên đã đổi `git remote set-url`: lớp bảo vệ của
Claude Code khoá cả `git push` lẫn đọc terminal (lý do *Remote Repoint / Data Exfiltration*). Đúng
và nên như vậy. Lúc đó **đưa lệnh cho chủ tool tự chạy**, rồi kiểm chứng bằng
`git ls-remote --heads origin` — **đừng tin lời báo "push xong rồi"**: ngày 16/09 báo xong 2 lần mà
`main` trên GitHub vẫn đứng ở commit cũ, chỉ `ls-remote` mới chỉ ra sự thật.

## Vercel
- **Vercel runs `server.js` as a serverless function** — it is NOT a pure static host. So `/api/svgs`,
  `/api/library`, `/api/download` work online, which means **Brochure downloads and Name Card editing work on
  the live site** (no static-bundle workaround needed). Brochure JPGs are committed so they deploy.

### ☠️☠️ CÓ **HAI** PROJECT VERCEL CÙNG NỐI MỘT REPO — đây là bẫy đắt nhất 16/09/2026

Tài liệu này trước đây ghi *"Live URLs, same repo"* khiến người đọc tưởng **một** project có nhiều tên miền.
**SAI.** Có **hai project riêng biệt** trong team `hadangtien0702-8981's projects`:

| Project Vercel | Tên miền | Repo nó đang trỏ | Vai trò |
|---|---|---|---|
| **`thinksmarttool-gy6f`** | **`tool.thinksmartinsurance.com`** + `thinksmarttool-gy6f.vercel.app` | `hadangtien0702-dot/Thinksmarttool` (**TÊN CŨ**) | ⭐ **BẢN LIVE THẬT — 77 sale dùng cái này** |
| `thinksmarttool` | `editor-proposesalsale.vercel.app` | `thinksmart-dev/Thinksmarttool` (tên mới) | bản phụ, tên cũ, **không phải bản sale dùng** |

→ **Deploy vào project `thinksmarttool` KHÔNG đổi gì trên `tool.thinksmartinsurance.com`.** Đã vấp đúng thế
16/09: deploy xong, Vercel báo *Ready*, mà live vẫn v1.49 — vì bắn nhầm project.
→ **Muốn đổi bản live thì phải vào project `thinksmarttool-gy6f`.**
→ Kiểm nhanh project nào đang giữ tên miền: dashboard → thẻ project nào ghi `tool.thinksmartinsurance.com`.

### ☠️ AUTO-DEPLOY ĐANG CHẾT (16/09/2026) — push KHÔNG còn tự lên live

Repo đã chuyển sang org `thinksmart-dev`, nhưng project **`thinksmarttool-gy6f` vẫn trỏ tên cũ**
`hadangtien0702-dot/Thinksmarttool`. Vercel không nhận được sự kiện push từ org mới ⇒ **push xong
không có build nào chạy**. Đo 16/09: push lúc 15:5x, chờ **5 phút / 30 lần kiểm**, live không nhúc nhích.

**Ba giả thuyết đã bị BÁC BỎ bằng đo đạc — đừng đi lại đường này:**

| Nghi ngờ | Cách kiểm | Kết quả |
|---|---|---|
| Đứt kết nối Git | Settings → Git | ❌ vẫn "Connected" |
| Vercel App thiếu quyền trên org | GitHub org → Installed Apps → Vercel → Configure | ❌ đủ quyền, đã chọn đúng repo |
| Kho đầy nên bị chặn (Deployment Storage **99,98 GB / 10 GB**, gói Hobby) | Bấm Redeploy thử | ❌ **build ngon trong 5 giây** → KHÔNG hề bị chặn |

→ ☠️ **Suýt để chủ tool xoá 200 deployment vì tin cái "99,98 GB / 10 GB".** Con số đó có thật, đứng cạnh
triệu chứng thật, nhưng **không phải nguyên nhân**. Một phép thử Redeploy 5 giây đã cứu cả đống dữ liệu.
**Thấy hai thứ bất thường nằm cạnh nhau KHÔNG có nghĩa cái này gây ra cái kia.**
→ Dấu vân tay chỉ đúng thủ phạm: hộp **Create Deployment** ghi repo **tên CŨ**, trong khi trang
**Settings → Git** ghi **tên MỚI**. **Hai chỗ trong cùng một dashboard nói hai tên khác nhau = Vercel
chưa cập nhật xong sau khi repo đổi chủ.**

**CÁCH DEPLOY TAY (đang phải dùng cho tới khi nối lại Git):**
1. Vercel → project **`thinksmarttool-gy6f`** → **Deployments**
2. Nút `…` góc phải trên → **Create Deployment**
3. Dán **commit hash đầy đủ** (vd `19220f5329129b349975af50a072f52f3c27b1e6`)
4. Chờ tick xanh + nó hiện đúng dòng commit → nút đổi thành **Deploy to Production** → bấm
5. **Kiểm bằng số đo, đừng tin chữ "Ready"**: `curl -s https://tool.thinksmartinsurance.com/ | grep version-badge`

**VIỆC CÒN TREO — sửa gốc:** trong `thinksmarttool-gy6f` → Settings → Git → **Disconnect rồi Connect lại**
vào `thinksmart-dev/Thinksmarttool` để auto-deploy sống lại. Chưa làm vì cần chủ tool duyệt (đụng cấu hình
bản live của 77 người).

### Tên miền
- **`https://tool.thinksmartinsurance.com`** ← custom domain (verified 2026-07-17) — SHARE THIS ONE.
  DNS: CNAME `tool` → vercel-dns; TXT `_vercel` giữ lại cho lần re-verify. Thuộc project `thinksmarttool-gy6f`.
- `https://thinksmarttool-gy6f.vercel.app` ← Vercel default của cùng project đó, vẫn sống.
- `https://editor-proposesalsale.vercel.app` ← **project KHÁC** (`thinksmarttool`), đừng nhầm là cùng một chỗ.

## Deploy steps (end of day)
1. Bump `?v=` in `index.html` for any changed front-end file (see `conventions.md`).
2. `git add -A && git commit -m "..." && git push origin main`.
3. Verify: poll the live URL until the new version shows, e.g.
   ```bash
   for i in $(seq 1 25); do v=$(curl -s https://thinksmarttool-gy6f.vercel.app/ | grep -oE "js/core.js\?v=[0-9]+" | head -1); [ "$v" = "js/core.js?v=<N>" ] && { echo "DEPLOYED $v"; break; }; sleep 6; done
   ```
4. Sanity-check the live `templates/manifest.json` and a couple of asset URLs return 200.

`deploy-vercel.bat` automates copying masters → `public/templates` + commit + push, but the manual flow above
is what's typically used. When adding a template/name card to the deploy, copy the SVG into `public/templates/`
AND add an entry to `public/templates/manifest.json`.
