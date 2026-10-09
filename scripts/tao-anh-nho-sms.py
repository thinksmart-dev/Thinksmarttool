#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
TAO ANH NHO CHO LUOI "SMS / Tin nhan mau" (09/10/2026).

VI SAO: luoi SMS hien nhieu anh cung luc. Anh goc 2000x2000 nang 0,7-1 MB moi tam;
tai nguyen co 12 tam la ~11 MB chi de nhin o vuong 170px. Script nay sinh ban rong
480px (vai chuc KB) vao SMS/_thumb/ CUNG TEN voi anh goc. Giao dien (danhSachSms
trong public/js/brochure.js) tu dung anh nho neu co, khong co thi dung anh goc.

CHAY: sau moi lan THEM / DOI TEN / XOA anh trong SMS/
    python scripts/tao-anh-nho-sms.py
No chi lam lai tam nao thieu hoac cu hon anh goc, va don anh nho mo coi (anh goc
da xoa hoac da doi ten). Thu muc bat dau bang "_" (_goc, _thumb) bi bo qua.
"""
import os, sys
from PIL import Image

GOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'SMS')
NHO = os.path.join(GOC, '_thumb')
RONG = 480
DUOI = ('.jpg', '.jpeg', '.png', '.webp', '.gif')

def main():
    os.makedirs(NHO, exist_ok=True)
    anh = [f for f in sorted(os.listdir(GOC))
           if os.path.isfile(os.path.join(GOC, f)) and f.lower().endswith(DUOI)]
    can = set()
    moi = giu = 0
    for f in anh:
        ten = os.path.splitext(f)[0] + '.jpg'
        can.add(ten)
        src, dst = os.path.join(GOC, f), os.path.join(NHO, ten)
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            giu += 1
            continue
        im = Image.open(src).convert('RGBA')
        nen = Image.new('RGB', im.size, (255, 255, 255))
        nen.paste(im, mask=im.getchannel('A'))
        cao = max(1, round(nen.size[1] * RONG / nen.size[0]))
        nen.resize((RONG, cao), Image.LANCZOS).save(dst, 'JPEG', quality=82, optimize=True)
        moi += 1
    xoa = 0
    for f in sorted(os.listdir(NHO)):          # anh nho mo coi: anh goc khong con
        if f not in can:
            os.remove(os.path.join(NHO, f))
            xoa += 1
    tong = sum(os.path.getsize(os.path.join(NHO, f)) for f in os.listdir(NHO))
    goc = sum(os.path.getsize(os.path.join(GOC, f)) for f in anh)
    sys.stdout.write('anh goc: %d tam, %.1f MB | anh nho: tao %d, giu %d, don %d | tong anh nho %d KB\n'
                     % (len(anh), goc / 1048576.0, moi, giu, xoa, tong // 1024))

if __name__ == '__main__':
    main()
