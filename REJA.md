# REJA — Bilet 010 “Vazifalar taxtasi”

Vaqt: 90 daqiqa · Vosita: Claude Code · Repo: github.com/AdilxanKenesov/Team-Board

## v1 (tayyor, `924a465`)
| # | Talab | Yechim |
|---|---|---|
| 1 | Vazifa nomini qo'shish | Shakl: `label` + input + “Qo'shish”; Enter bilan ham |
| 2 | Yangi / Bajarilmoqda / Tugagan | 3 ustun, har birida son |
| 3 | Tugmalar bilan holat almashtirish | Boshlash →, ← Qaytarish, Tugatish →, ← Qayta ochish |
| 4 | Son va vazifalar saqlansin | `localStorage` |
| Sinov | Yangi → Bajarilmoqda: Yangi −1, Bajarilmoqda +1 | unit + brauzer sinovi |

**Qoida:** v2 dagi har bosqichdan keyin bilet sinovi qayta tekshiriladi. 70-daqiqadan keyin yangi funksiya yo'q.

## v2 qo'shimchalari
| Bosqich | Qo'shimcha | Ball |
|---|---|---|
| P2 | Mantiq: mas'ul, muhimlik, muddat; tahrir, o'chirish, bekor qilish; tarix; filtr; hisobot | 1.2, 2.3 |
| P3 | Interfeys: kengaytirilgan shakl, karta, tahrir, o'chirish + “Bekor qilish”, filtr paneli | 1.2, 3.2 |
| P4 | Sudrab o'tkazish, telefonda tablar, “Tarix” bo'limi, “Hisobot” oynasi | 3.1, 6.2 |
| P5 | Dizayn sayqali | 3.3, 6.3 |
| P6 | Hakam kabi sinov → TESTLAR.md | 5.3 |
| P7 | README v2, HIMOYA.md, dalillar | 5.4, 4 |

## Ma'lumot modeli v2
`localStorage['taxta010.v2'] = { tasks: Task[], history: Event[] }`
- `Task = { id, title, status: new|doing|done, createdAt, updatedAt, sample, assignee: string|null, priority: past|orta|yuqori, due: 'YYYY-MM-DD'|null }`
- `Event = { at, type: add|move|edit|remove|clear, title, from?, to? }` — oxirgi 50 ta
- v1 kaliti (`taxta010.tasks`) bo'lsa — avtomatik ko'chiriladi (priority = orta, assignee/due = null).

## Chekka holatlar (v2)
| Holat | Natija / xabar |
|---|---|
| Mas'ul 1 belgi yoki 30 dan uzun | “Mas'ul ismi 2–30 belgi bo'lsin.” |
| Muddat noto'g'ri (`2026-02-30`) | “Muddat noto'g'ri sana.” |
| Yangi vazifada o'tgan muddat | “Muddat bugundan oldin bo'lmasin.” |
| Tahrirda nom boshqa vazifa bilan bir xil | “Bunday vazifa allaqachon bor…” (o'zi bilan solishtirilmaydi) |
| Tahrirda eski o'tgan muddat o'zgartirilmasa | qabul (faqat yangi qiymat tekshiriladi) |
| O'chirish | darhol, 6 soniya “Bekor qilish” imkoniyati |
| “Bekor qilish” bosildi | oldingi holat to'liq qaytadi (tarix ham) |
| Muddati o'tgan, Tugagan emas | “Muddati o'tgan” belgisi |
| Filtrga mos vazifa yo'q | “Filtrga mos vazifa yo'q”; ustun sonlari umumiy sonni ko'rsatadi |
| Qidiruvda `o'`, `o‘`, `oʻ` | bir xil deb topiladi |
| Ruxsat etilmagan ustunga sudrash | tushmaydi, “Bu ustunga o'tkazib bo'lmaydi” |
| Buzilgan v2 yoki v1 ma'lumot | yaroqsizlari tashlanadi; umuman buzilgan bo'lsa — namuna taxta |
| Clipboard ishlamasa | hisobot matni belgilanadi, “Ctrl+C bilan nusxalang” |
