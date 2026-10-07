# Jamoa taxtasi — Bilet 010 “Vazifalar taxtasi”

**Bosqich:** tuman · **Ishtirokchi kodi:** KOD · **Bilet:** 010 (B daraja, manbadagi 089) · **Yo‘nalish:** Jamoa va ishni tashkil etish

Jamoaga vazifalar bajarilishini kuzatishga yordam beradigan bitta sahifali veb-sayt: vazifa qo‘shiladi va tugmalar bilan **Yangi → Bajarilmoqda → Tugagan** ustunlari bo‘ylab o‘tkaziladi.

## Ishga tushirish
`index.html` faylini Chrome yoki Edge’da oching (ikki marta bosish yetarli). Internet, server va o‘rnatish talab qilinmaydi.
Mantiq testlari: `node test.js` (Node.js 18+).

## Fayllar
| Fayl | Vazifasi |
|---|---|
| `index.html` | Sahifa: menyu, Taxta, Qanday ishlaydi, Jamoa uchun |
| `style.css` | Ko‘rinish; 390 / 768 / 1366 px; kunduzgi va tungi rejim |
| `logic.js` | Qo‘shish, o‘tkazish, tekshiruv, sanash, saqlash (DOM’siz, test qilinadi) |
| `script.js` | Sahifa bilan bog‘lash: tugmalar, xabarlar, fokus |
| `test.js` | Avtomatik sinovlar |
| `REJA.md` | Ish rejasi va qarorlar |
| `PROMPTS.md` | AI’ga berilgan asosiy so‘rovlar |

## Majburiy imkoniyatlar va sinov natijalari
| # | Talab | Qanday tekshirildi | Natija |
|---|---|---|---|
| 1 | Vazifa nomini qo‘shish | “Hisobot tayyorlash” → Yangi ustuni 2 → 3 | ✅ |
| 2 | Yangi, Bajarilmoqda, Tugagan ustunlari | Uch ustun, har birida son | ✅ |
| 3 | Tugmalar bilan holatni almashtirish | Boshlash, Tugatish, Qaytarish, Qayta ochish — barcha o‘tishlar | ✅ |
| 4 | Son va vazifalar saqlanadi | O‘zgarishlardan keyin sahifa yangilandi: 3/1/2 saqlandi | ✅ |
| **Bilet sinovi** | Yangi → Bajarilmoqda: Yangi −1, Bajarilmoqda +1 | Yangi 4 → 3, Bajarilmoqda 1 → 2 (tugma ikki marta bosilganda ham) | ✅ |

### Noto‘g‘ri kiritish va chekka holatlar
| Sinov | Kutilgan | Natija |
|---|---|---|
| Bo‘sh nom / faqat probel | “Vazifa nomini yozing.” | ✅ |
| 1 ta belgi | “Nom kamida 2 ta belgidan iborat bo‘lsin.” | ✅ |
| 81 ta belgi | “Nom 80 ta belgidan oshmasin (hozir 81 ta).” | ✅ |
| Takror nom (“  HISOBOT   tayyorlash ”) | “Bunday vazifa allaqachon bor: “Yangi” ustunida.” | ✅ |
| `<img src=x onerror=…>` kabi matn | Oddiy matn sifatida ko‘rinadi | ✅ |
| O‘tkazish tugmasini tez ikki marta bosish | Faqat bitta o‘tish | ✅ |
| Taxtani tozalash | Sahifa ichida tasdiq so‘raladi; ustunlarda “Hozircha vazifa yo‘q.” | ✅ |
| Buzilgan `localStorage` | Sayt ishlaydi, namuna taxta ochiladi | ✅ |
| 390 / 768 / 1366 px | Yonga surish yo‘q, hamma tugma ko‘rinadi | ✅ |
| Klaviatura | Tab / Enter bilan hammasi; o‘tkazilgandan keyin fokus vazifaning yangi joyida | ✅ |

Sinov vositalari: `node test.js` — 9/9; Chrome (headless) brauzer sinovi — 21/21.

## Topilgan va tuzatilgan kamchiliklar
1. Holat xabari bo‘sh turganda ham joy egallab, ustunlar ostida ortiqcha bo‘shliq qoldirardi — bo‘sh holatda yig‘iladigan qilindi.
2. Planshet (768 px) uchun dastlab ustunlar bitta qatorga tizilgan edi — taxta ko‘rinishi yo‘qolmasligi uchun 3 ustun saqlandi, bitta ustunga faqat 640 px dan tor ekranda o‘tadi.

## O‘ylangan yechimlar
- **Jamoa holati chizig‘i**: uch rangli bo‘laklar va “Tugagan: N%” — taxtaga qaramasdan ham umumiy holat ko‘rinadi.
- Birinchi ochilishda **namuna vazifalar** (“Namuna” belgisi bilan) — bo‘sh sahifa o‘rniga ishlab turgan taxta; “Taxtani tozalash” bilan o‘chiriladi.
- Vazifa o‘tkazilganda **fokus u bilan birga ko‘chadi** — klaviaturada ketma-ket ishlash mumkin.
- Har kartada oxirgi o‘zgarish vaqti: “Qo‘shildi / Boshlandi / Tugadi”.

## Cheklovlar
- Ma’lumot faqat shu brauzerda saqlanadi (`localStorage`) — jamoa a’zolari o‘rtasida avtomatik ulashilmaydi.
- Vazifani tahrirlash va alohida o‘chirish yo‘q (biletda talab qilinmagan); faqat butun taxtani tozalash bor.
- Mas’ul shaxs va muddat maydonlari yo‘q.

## Vositalar va manbalar
Claude Code (AI yordamchi), Google Chrome (sinov), Node.js (testlar). Tashqi kutubxona, shrift va rasm ishlatilmagan; logo — inline SVG.
