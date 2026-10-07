# Jamoa taxtasi — Bilet 010 “Vazifalar taxtasi”

**Bosqich:** tuman · **Ishtirokchi kodi:** KOD · **Bilet:** 010 (B daraja, manbadagi 089) · **Yo‘nalish:** Jamoa va ishni tashkil etish
**Repo:** https://github.com/AdilxanKenesov/Team-Board

Jamoaga vazifalar bajarilishini kuzatishga yordam beradigan veb-ilova. Vazifa qo‘shiladi va tugmalar (yoki sichqoncha bilan sudrash) orqali **Yangi → Bajarilmoqda → Tugagan** ustunlari bo‘ylab o‘tkaziladi.

**Ko‘rinish:** ilova uslubi — chapda menyu (Taxta, Tarix, Haqida), tepada qidiruv, filtr va “+ Vazifa”; qo‘shish va tahrir o‘ngdan chiqadigan panelda; kartada faqat nom, mas’ul, muddat va muhimlik belgisi. Oq minimal uslub, tungi rejim, telefonda tablar va suzuvchi tugma.

## Ishga tushirish
`index.html` ni Chrome yoki Edge’da oching (ikki marta bosish yetarli). Internet, server, o‘rnatish kerak emas.
Testlar: `node test.js` va `tests/` (qarang: `TESTLAR.md`).

## Biletning majburiy imkoniyatlari
| # | Talab | Yechim | Natija |
|---|---|---|---|
| 1 | Vazifa nomini qo‘shish | Shakl (label, Enter), 2–80 belgi, takror nom rad etiladi | ✅ |
| 2 | Yangi, Bajarilmoqda, Tugagan ustunlari | Uch ustun, har birida son | ✅ |
| 3 | Tugmalar orqali holatni almashtirish | Boshlash →, Tugatish →, ← Qaytarish, ← Qayta ochish | ✅ |
| 4 | Son va vazifalar saqlansin | `localStorage`, sahifa yangilanganda hammasi joyida | ✅ |
| Sinov | Yangi → Bajarilmoqda: Yangi −1, Bajarilmoqda +1 | Tugma va sudrash bilan tekshirildi | ✅ |

## Qo‘shimcha imkoniyatlar (asosiy talablar bajarilgandan keyin)
- **Mas’ul, muhimlik, muddat** — “+ Vazifa” panelida; muddati o‘tgan vazifa qizil sana bilan.
- **Tahrirlash va o‘chirish**; har amaldan keyin **6 soniya “Bekor qilish”**.
- **Qidiruv va filtr** (mas’ul, muhimlik); o‘zbekcha apostroflar (‘ ' ʻ) farqlanmaydi.
- **Sudrab o‘tkazish** — faqat ruxsat etilgan ustunga; tugmalar asosiy yo‘l bo‘lib qoladi.
- **Telefonda tablar** — uch ustun o‘rniga “Yangi / Bajarilmoqda / Tugagan” tablari; “+ Vazifa” — suzuvchi tugma.
- **Namuna banneri** — namuna vazifalarni bir bosishda o‘chirish (o‘zingiz qo‘shganlari qoladi).
- **Tarix** — oxirgi 10 o‘zgarish vaqti bilan (saqlanadi 50 tagacha).
- **Yig‘ilish uchun hisobot** — bezatilgan hujjat (raqamlar, holat chizig‘i, muddati o‘tganlar, har ustun jadvali); **PDF saqlash** (brauzerning chop etish oynasi, faqat hisobot chiqadi, kutubxonasiz) va matnni nusxalash. Namuna: `dalillar/07_hisobot_namuna.pdf`.
- **Tozalash** — ekran o‘rtasida tasdiq oynasi: nechta vazifa o‘chishi yoziladi, fokus “Bekor qilish”da, Esc yopadi; o‘chirilgandan keyin ham 6 soniya “Bekor qilish”.
- **Animatsiyalar** — panel, oyna, filtr, xabar va yangi karta uchun qisqa (≤0.26 s) animatsiyalar; yopilganda fokus kutmaydi; “harakatni kamaytirish” yoqilgan bo‘lsa — o‘chadi.
- **Tezkor tugmalar** — `N` yangi vazifa, `/` qidirish, `Esc` yopish.
- **O‘z kalendari** — brauzerning bezatib bo‘lmaydigan sana oynasi o‘rniga: o‘zbekcha oy va kunlar (dushanbadan), “Bugun / Ertaga / 1 haftadan” tugmalari, o‘tgan kunlar yangi vazifada yopiq, klaviatura bilan (strelkalar, PageUp/PageDown, Esc).

## Fayllar
| Fayl | Vazifasi |
|---|---|
| `index.html` | Sahifa: menyu, yuqori panel, Taxta, Tarix, Haqida, qo‘shish/tahrir paneli |
| `style.css` | Ko‘rinish; 390 / 768 / 1366 px; kunduzgi va tungi rejim |
| `logic.js` | Barcha qoidalar: tekshiruv, o‘tishlar, filtr, hisobot, saqlash (DOM’siz) |
| `script.js` | Sahifa bilan bog‘lash: tugmalar, sudrash, tablar, fokus, “Bekor qilish” |
| `test.js`, `tests/` | 20 unit + 76 brauzer tekshiruvi |
| `REJA.md`, `PROMPTS.md`, `TESTLAR.md`, `HIMOYA.md` | Reja, AI so‘rovlari, sinovlar, himoya |
| `dalillar/` | 6 ta skrinshot + namuna PDF hisobot |

## Sinovlar
To‘liq jadval — `TESTLAR.md`. Qisqacha: bilet sinovi, bo‘sh/qisqa/uzun/takror nom, noto‘g‘ri va o‘tgan muddat, ikki marta bosish, ruxsat etilmagan sudrash, bekor qilish, filtr, yangilash, buzilgan va eski formatdagi ma’lumot, 390/768/1366 px, klaviatura — hammasi ✅. Topilgan 10 ta kamchilik tuzatilgan (commitlar bilan).

## Cheklovlar
- Ma’lumot faqat shu brauzerda saqlanadi — jamoa a’zolari o‘rtasida avtomatik ulashilmaydi (buning uchun server kerak).
- Sudrash faqat sichqoncha bilan; telefonda va klaviaturada tugmalar ishlatiladi.
- “Bekor qilish” faqat oxirgi bitta amalga va 6 soniya ichida.
- Mas’ul — erkin matn (foydalanuvchilar ro‘yxati yoki hisob yo‘q).

## Vositalar va manbalar
Claude Code (AI yordamchi), Google Chrome (sinov), Node.js (testlar), Git va GitHub (versiyalar). Tashqi kutubxona, shrift va rasm ishlatilmagan; logo va ikonkalar — inline SVG. Namuna vazifalar va ismlar to‘qima.
