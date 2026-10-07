# PROMPTS — Bilet 010

Vosita: Claude Code. Har bosqich alohida commit (qarang: `git log`).

## v1 (60 daqiqalik variant, 10:42–10:46)
| # | So'rov (qisqa) | Natija |
|---|---|---|
| 1 | Tanlov reglamenti va Bilet 010 berildi | REJA.md: talab → yechim, chekka holatlar |
| 2 | Reja bo'yicha qurish | logic.js + 9 test, sahifa |
| 3 | O'zini tekshirish | brauzer sinovi 21/21, 2 kamchilik tuzatildi |
| 4 | Topshirish | README |

## v2 (vaqt 90 daqiqa bo'ldi)
Ishtirokchi talabi: “professional sayt, promptlarni o'zing professional yozib, reja tuz”. Qo'shimchalarni ishtirokchi tanladi: tahrir/o'chirish/bekor qilish; mas'ul/muhimlik/muddat; tarix va hisobot; sudrash va mobil tablar; har bosqichdan keyin git commit.

### P1 — Reja v2 va git
```
Loyiha: Bilet 010 “Vazifalar taxtasi”, v1 ishlaydi. Vaqt 90 daqiqa.
Maqsad: professional v2. Asosiy 4 talab va bilet sinovi (Yangi→Bajarilmoqda: Yangi −1,
Bajarilmoqda +1) har bosqichda saqlanishi SHART.
1) git init, .gitignore, v1 ni "v1: asosiy 4 talab" deb commit qil.
2) REJA.md ni v2 ga yangila: qo'shimchalar ro'yxati, ma'lumot modeli v2,
   har qo'shimcha uchun chekka holatlar jadvali, bosqichlar va vaqt.
Kod yozma. Subagent ishlatma.
```

### P2 — Mantiq v2 (DOM'siz) + testlar
```
logic.js ni kengaytir (eski API saqlansin, v1 ma'lumoti avtomatik ko'chsin):
- assignee (ixtiyoriy, 2–30 belgi), priority (past|orta|yuqori, default orta),
  due (ixtiyoriy, YYYY-MM-DD; noto'g'ri va o'tgan sana — yangi vazifada rad).
- editTask (takror — o'zidan tashqari), removeTask, bekor qilish uchun asl massiv o'zgarmasin.
- Tarix (oxirgi 50), isOverdue, filterTasks (apostrof farqsiz), buildReport.
- sanitize v2: noma'lum priority → orta, yaroqsiz due → null.
test.js ga har funksiya uchun test; eski 9 test o'zgarmasdan o'tsin. Subagent ishlatma.
```

### P3 — Interfeys: shakl, karta, tahrir, o'chirish, bekor qilish, filtr
```
script.js va index.html ni v2 mantiqqa ula (logic.js ni o'zgartirma):
"Batafsil" (mas'ul, muhimlik, muddat), har maydonda label va xato xabari;
karta: mas'ul belgisi, muhimlik, muddat, "Muddati o'tgan";
tahrir: Enter — saqlash, Esc — bekor; o'chirish tasdiqsiz + 6 soniya "Bekor qilish";
filtr paneli; ustun sonlari doim umumiy; fokus hech qachon body ga tushmasin.
Bilet sinovini brauzerda qayta tekshir.
```

### P4 — Sudrash, mobil tablar, tarix, hisobot
```
HTML5 DnD faqat canMove ruxsat bergan ustunga, ruxsatsizida "bu yerga mumkin emas";
tugmalar qoladi. ≤640px: tablar (role=tablist, son, tanlov eslab qolinadi).
"Tarix" bo'limi (oxirgi 20). "Hisobot" oynasi + "Nusxalash" (clipboard bo'lmasa — belgilash).
Bilet sinovini qayta tekshir.
```

### P5 — Dizayn sayqali
```
Polish the visual layer only. Do NOT change logic, validation or storage. UI text stays Uzbek.
Calm, precise team workspace; status colour only where it carries meaning.
Check 390 / 768 / 1366 and dark mode; list the weakest points, fix them.
Confirm the ticket test still passes.
```

### P6 — Hakam kabi sinov
```
Hakam kabi sina, jadvalni TESTLAR.md ga yoz; xatolarni tuzat, qayta sina;
skrinshotlarni dalillar/ ga saqla. Yangi funksiya qo'shma.
```

### P7 — Topshirish
```
README v2, PROMPTS.md, HIMOYA.md; maxfiy kalit tekshiruvi; papka nomi tuman_<KOD>_010.
Yangi funksiya qo'shma.
```

## v3 — qayta dizayn
Ishtirokchi fikri: “dizayn yoqmadi, matn juda ko‘p, hammasi bir joyga yig‘ilgan”. Variantlar ko‘rsatildi (ASCII maket bilan), ishtirokchi tanladi: **ilova ko‘rinishi** + **oq minimal uslub**.

### P8 — Qayta dizayn
```
Redesign layout and visual layer. Do NOT change logic.js. Keep every element id used by script.js and tests.
Layout: app shell — left sidebar (Taxta, Tarix, Haqida; Hisobot, Tozalash at bottom),
top bar (search with icon, Filtr popover with active-count badge, "+ Vazifa" primary).
Add/edit in one right-side drawer (focus trap, Esc closes, focus returns to opener).
Cut text: no helper paragraphs; card = title + assignee avatar + due date + flag only if high priority;
created time only in title attribute and history; sample data = one banner with "remove samples".
"Qanday ishlaydi" + "Jamoa uchun" → one short "Haqida" (1 sentence + 3 lines).
Style: white minimal (Linear/Notion), neutral lanes, colour only for status dots, overdue, primary action.
Tokens: bg #fff, side #f7f7f8, line #e6e6e9, ink #18181b, muted #71717a, primary #4f46e5; dark mode.
Mobile ≤640: sidebar → compact top header, column tabs, floating "+ Vazifa".
Update e2e tests for the drawer (no fewer checks), run all, screenshot 1366/768/390/dark, fix issues.
```
Natija: 49/49 brauzer tekshiruvi, 3 ta ko‘rinish xatosi topilib tuzatildi (TESTLAR.md, 8–10).

### P9 — Animatsiyalar (UI/UX)
```
Add short, meaningful animations without changing behaviour or the ticket requirements:
drawer and report close (ghost copy animates out, real element hides instantly so focus/tests never wait),
modal scale-in, filter popover, toast slide-up, new card fade-in, "not allowed" column shake.
≤0.26 s, all disabled under prefers-reduced-motion. Add shortcuts N (new task) and / (search),
ignored while typing or when a dialog is open. Add tests; run everything.
```
Natija: 57/57 brauzer tekshiruvi.

### P10 — O‘z kalendari
Ishtirokchi fikri: “kalendar oynasi yoqmadi, chap tomonga yopishib qolgan”.
```
Replace the native date input (cannot be styled, opens at the wrong place on some systems) with a custom
calendar popover anchored under the "Muddat" field. Keep the value in hidden #due (YYYY-MM-DD) so logic and
tests stay the same. Uzbek months and Monday-first weekdays; today ring, selected filled; past days disabled
for new tasks only; quick chips Bugun / Ertaga / 1 haftadan / Tozalash; keyboard: arrows, PageUp/PageDown,
Enter, Esc (closes only the calendar). Errors focus the calendar button. Add tests.
```
Natija: 66/66 brauzer tekshiruvi; sinovda oy almashtirishda kalendar yopilib qolish xatosi topilib tuzatildi.

### P11 — Hisobot (PDF) va tozalash oynasi
Ishtirokchi talabi: “hisobotni chiroyli qil yoki PDF fayl bo‘lsin (shartga zid bo‘lmasa); Tozalash bosilganda o‘rtada chiroyli dialog chiqsin”.
```
Report: render a designed document (header with date, 4 stat tiles, progress, overdue callout, one table per
column) instead of plain text; keep plain text for "copy". "PDF saqlash" = window.print() with print CSS that
shows only the report in light colours on A4 and sets the file name via document.title; no libraries.
Reset: centred alertdialog with icon, task count, safe button focused first, Esc/backdrop close, focus trap;
empty board → toast instead of dialog. Add tests; generate a real PDF and check it.
```
Natija: 76/76 brauzer tekshiruvi; birinchi PDF bo‘sh chiqdi (animatsiya shaffofdan boshlangan) — topilib tuzatildi.

### P12 — Namuna ma’lumotlar va ranglar
Ishtirokchi: “ichida bir nechta demo ma’lumot bo‘lsin”, “sayt ranglarining boshqa variantlari?”.
5 ta rang varianti saytning o‘zida skrinshot qilinib ko‘rsatildi; ishtirokchi **Samarqand** (lojuvard + oltin) ni tanladi.
```
Apply the "Samarqand" palette: lapis primary #1e3a8a, gold accent #c8962e, lapis gradient sidebar with a faint
girih (8-point star) pattern, gold active nav item; matching dark mode; status colours unchanged.
Expand sample data to 10 tasks + 9 history events; make tests derive counts from sample data.
```

## AI natijasida kiritilgan muhim tuzatishlar
- Sinovda topilgan 12 kamchilik (TESTLAR.md, “Topilgan va tuzatilgan xatolar”).
- Commit test natijasini kutmay o'tib ketgan holat bo'ldi (`7a609a3`); keyingi commitlar faqat barcha testlar o'tganda bajariladigan qilindi.

## Ishtirokchi qarorlari
- Qo'shimchalar ro'yxati va har bosqich commit qilinishi — ishtirokchi tanlovi.
- Repo nomi: Team-Board.
- Dizayn yo‘nalishi: ilova ko‘rinishi + oq minimal (3 variantdan tanlandi).
- Brauzer kalendari o‘rniga o‘z kalendari (ishtirokchi talabi).
- Rang palitrasi: Samarqand (5 variantdan tanlandi).
- <o'zingiz kiritgan boshqa o'zgarishlar>
