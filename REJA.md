# REJA — Bilet 010 “Vazifalar taxtasi”

Boshlanish: 10:42 · Vaqt: 60 daqiqa · Vosita: Claude Code

## Bilet talablari → yechim
| # | Talab | Yechim |
|---|---|---|
| 1 | Vazifa nomini qo'shish | Shakl: `label` + input + “Qo'shish”; Enter bilan ham ishlaydi |
| 2 | Yangi / Bajarilmoqda / Tugagan ustunlari | 3 ustun, har birida sarlavha va son |
| 3 | Tugmalar orqali holatni almashtirish | Yangi: “Boshlash →” · Bajarilmoqda: “← Qaytarish”, “Tugatish →” · Tugagan: “← Qayta ochish” |
| 4 | Son va vazifalar saqlansin | `localStorage` (`taxta010.tasks`), har o'zgarishda yoziladi |
| Sinov | Yangi → Bajarilmoqda: Yangi −1, Bajarilmoqda +1 | Avtomatik test + brauzer sinovi |

## Sahifa bo'limlari (bitta sahifa, yopishqoq menyu)
1. **Taxta** — shakl, umumiy holat chizig'i, 3 ustun (birinchi ko'rinadi)
2. **Qanday ishlaydi** — 4 qadam
3. **Jamoa uchun** — kim uchun, qanday foyda

## Ma'lumot
`{ id, title, status: 'new'|'doing'|'done', createdAt, updatedAt, sample }`

## Chekka holatlar
| Holat | Natija | Xabar |
|---|---|---|
| Bo'sh nom / faqat probel | qo'shilmaydi | “Vazifa nomini yozing.” |
| 2 belgidan qisqa | qo'shilmaydi | “Nom kamida 2 ta belgidan iborat bo'lsin.” |
| 80 belgidan uzun | qo'shilmaydi | “Nom 80 ta belgidan oshmasin.” |
| Takror nom (katta-kichik harf farqsiz) | qo'shilmaydi | “Bunday vazifa allaqachon bor: … ustunida.” |
| Tugmani tez ikki marta bosish | bitta o'tish | — (karta qayta chiziladi, eski tugma yo'qoladi) |
| Noto'g'ri o'tish (masalan, Tugagan → Tugagan) | rad etiladi | — |
| Ustun bo'sh | tushunarli matn | “Hozircha vazifa yo'q.” |
| Sahifani yangilash | hammasi joyida | — |
| Buzilgan localStorage | namuna taxta bilan ochiladi | — |
| `<script>` kabi matn | oddiy matn sifatida ko'rinadi | — |

## Qarorlar (faraz)
- Birinchi ochilishda 4 ta **namuna vazifa** (“Namuna” belgisi bilan) — taxta bo'sh ko'rinmasin; “Taxtani tozalash” bilan o'chiriladi (sahifa ichidagi tasdiq bilan).
- O'chirish biletda yo'q — qo'shilmaydi, faqat tozalash bor.
- Holat o'zgarganda fokus o'sha vazifaning yangi ustundagi tugmasiga o'tadi.
- Umumiy holat chizig'i: uch rangli bo'laklar + “Tugagan: N%”.
