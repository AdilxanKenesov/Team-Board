# PROMPTS — AI bilan ishlash

**Vosita:** Claude Code · **Usul:** har bosqich bitta aniq prompt bilan; natija testdan o‘tmaguncha keyingisiga o‘tilmaydi.
**Shablon:** Kontekst → Vazifa → Talablar → Tekshiruv. Prompt qisqa, lekin chegaralari aniq: nima qilinadi, nima qilinmaydi, “tayyor” nimani anglatadi.

---

### 1. Arxitektura va yadro
```text
Kontekst: Bilet 010 "Vazifalar taxtasi". Sayt index.html dan, file:// orqali, internetsiz ochilishi shart.
Vazifa: loyiha karkasini qur — ma'lumot qatlami, kirish tizimi, router, UI komponentlar.
Talablar:
- Vanilla JS, kutubxonasiz, build'siz; ES modul emas (file:// da CORS), bitta App nomlar maydoni.
- logic.js — DOM'siz, sof funksiyalar (validatsiya, ruxsatlar, statistika), Node'da test qilinadi.
- store.js — localStorage, sxema + sanitize (buzilgan ma'lumotda ham ishlasin), har o'zgarish mutate() orqali.
- Parol: tuz + SHA-256, 5 xato → 30 s blok, sessiya 12 soat / 30 kun.
Tekshiruv: node tests/unit.js — sha256 vektorlari, auth, sanitize.
```

### 2. Admin: Kanban taxta va vazifa formasi
```text
Vazifa: admin uchun taxta — Yangi / Bajarilmoqda / Tugagan, har ustunda son.
Talablar:
- Yangi vazifa formasi: nom (2–120), loyiha, mas'ul, muhimlik, muddat (o'z kalendari), teglar, checklist.
- Holat tugmalar bilan (Boshlash →, Tugatish →, ← Qaytarish) va sudrab; har amaldan keyin 6 s "Bekor qilish".
- Xatolar maydon ostida, aniq o'zbekcha matn bilan; alert() ishlatma.
Tekshiruv: bilet sinovi — "Boshlash" bosilganda Yangi −1, Bajarilmoqda +1; bekor qilish qaytaradi.
```

### 3. Xodim interfeysi va ruxsatlar
```text
Vazifa: xodim uchun alohida UI — "Mening kunim", "Mening taxtam", bildirishnomalar.
Talablar:
- Xodim faqat o'ziga biriktirilgan vazifani ko'radi; vazifa yaratmaydi; holatni faqat ketma-ket o'zgartiradi.
- Ruxsat tekshiruvi UI'da emas, store'da (L.can) — tugmani yashirish yetarli emas.
- Bildirishnoma: biriktirildi, izoh, holat, muddat yaqin/o'tgan (kuniga bir marta).
Tekshiruv: e2e — admin vazifa beradi → xodim bildirishnomani ko'radi → boshlaydi → admin'ga xabar.
```

### 4. Statistika (dataviz)
```text
Vazifa: boshqaruv paneliga statistika — holatlar donuti, 7/14/30 kunlik dinamika, xodimlar reytingi,
muddat va muhimlik taqsimoti.
Talablar:
- SVG, kutubxonasiz; bitta o'q (dual axis yo'q); legenda + to'g'ridan-to'g'ri yorliqlar; tooltip.
- Ranglar validator bilan tekshirilsin (CVD ΔE ≥ 8, kontrast ≥ 3:1), status rangi ikonka/yozuvsiz ishlatilmasin.
- Har grafikda "Jadval" ko'rinishi (accessibility).
- Hisob-kitoblar logic.js da (dueBuckets, avgCompletionDays) — unit test bilan.
Tekshiruv: e2e — KPI raqamlari ma'lumotga mos, 7→14 kun almashadi, reyting tartibi to'g'ri.
```

### 5. Dizayn tizimi
```text
Vazifa: "Grafit + binafsha" mavzusi — tokens.css orqali, komponentlarga tegmasdan.
Talablar:
- Barcha rang tokenlarda; yorug' / tungi / tizim — uch holat.
- Inter + Manrope base64 bilan CSS ichida (file:// da shrift CORS'ga tushmasin).
- 390 / 768 / 1366 px; telefonda pastki menyu; prefers-reduced-motion.
Tekshiruv: har ekranning skrinshoti uch kenglikda; gorizontal scroll yo'q (e2e).
```

### 6. Hisobot va eksport
```text
Vazifa: hisobot sahifasi — davr, loyiha, xodim filtri; "Yuklab olish" menyusi: TXT, CSV, PDF.
Talablar:
- PDF — window.print + print.css: faqat hisobot varag'i, yorug' ranglar, A4, animatsiyasiz.
- CSV — ";" ajratgich, BOM (Excel'da kirill/lotin to'g'ri), formula-injection himoyasi.
Tekshiruv: CDP printToPDF bilan PDF yaratib, sahifalarni rasmga aylantirib ko'rish.
```

### 7. Ikki til va umumiy sozlamalar
```text
Muammo: "Русский" tanlansa ham matnlar o'zbekcha; login'da tanlangan til kirgandan keyin yo'qoladi.
Vazifa: to'liq ruscha lug'at va til/mavzuni qurilma bo'yicha umumiy qilish.
Talablar:
- Kalit = o'zbekcha matn; dinamik xabarlar shablon + parametr ({n}, {x}) bilan.
- Bildirishnomalar matn emas, shablon sifatida saqlansin — ko'rsatilayotganda tarjima qilinsin.
- Til va mavzu: login, admin, xodim — bir xil; boshqa oynada ham yangilansin.
Tekshiruv: unit — koddagi har bir t('...') lug'atda bor; e2e — login(ru) → admin → chiqish → xodim: til va mavzu saqlangan.
```

### 8. Audit: tugmalar va qoidalar
```text
Vazifa: loyihani topshirishdan oldin audit qil.
Talablar:
- Har sahifa, menyu, oyna va panelda har bir tugma/havola: click ishlovchisi bor yoki marshrut mavjud.
- Qoida: brauzer kodida ochiq parol bo'lmasin — demo hisoblar faqat xesh bilan.
- Ishlatilmaydigan CSS/JS, takrorlanuvchi navigatsiya — olib tashla.
- file:// da ochib, konsolda xato yo'qligini tekshir.
Tekshiruv: node tests/buttons.mjs (22 holat) + unit + e2e — barchasi 0 xato.
```

### 9. Hujjatlar
```text
Vazifa: README.md — qoidadagi tartibda: kod va bilet, ishga tushirish, majburiy imkoniyatlar jadvali
(talab → yechim → sinov → natija), noto'g'ri kiritish sinovlari, testlar, tuzatilgan xatolar (commit bilan),
cheklovlar, fayllar, vositalar.
Talablar: faqat haqiqatda tekshirilgan narsani yoz; cheklovlarni halol ko'rsat.
```

---

## O‘zim qabul qilgan qarorlar va o‘zgartirishlar
- **Tuzilma:** server o‘rniga `localStorage` tanladim. Sayt hakam kompyuterida `index.html` dan ochilishi kerak. Cheklovni README’da halol yozdim.
- **Soddalashtirish:** loyiha katta bo‘lib ketgach, kalendar, loyihalar sahifasi, faollik jurnali va Ctrl+K panelini olib tashladim. Admin menyusida 4 bo‘lim, xodimda 3 bo‘lim qoldi, asosiy yo‘l — admin vazifa beradi, xodim bajaradi.
- **Dizayn:** 4 xil rang variantini skrinshotda solishtirib, “Grafit + binafsha” ni tanladim. Grafik ranglarini validator talabi bo‘yicha qayta tanladim.
- **Testlar va xatolar:** har bosqichdan keyin testlar va skrinshotlar bilan tekshirdim. Topilgan xatolarni (skip-link, rus tili, til/mavzu saqlanmasligi, ochiq parollar, PDF maketi) o‘zim aniqlab, tuzatishni so‘radim.
- **Commit tartibi:** har o‘zgarish alohida commit bilan, faqat testlar o‘tgandan keyin.
