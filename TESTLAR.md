# TESTLAR — Bilet 010 “Jamoa taxtasi”

Jami: **20 unit test** (`node test.js`) + **57 brauzer tekshiruvi** (`tests/`: 26 + 31). Hammasi o‘tadi.

## Qanday ishga tushiriladi
```
node test.js                         # mantiq testlari
python3 -m http.server 8000          # loyiha papkasida
# brauzerda: http://localhost:8000/tests/e2e-asosiy.html
#            http://localhost:8000/tests/e2e-qoshimcha.html
```
Brauzer testlari sahifaning `localStorage`ini tozalaydi — o‘z ma’lumotingiz bo‘lgan brauzerda ishga tushirmang.

## Bilet sinovi
| Sinov | Kutilgan | Natija |
|---|---|---|
| Yangi vazifani “Boshlash →” bilan o‘tkazish (tugma 2 marta bosildi) | Yangi −1, Bajarilmoqda +1 | ✅ 3→2, 1→2 |
| Xuddi shu — sichqoncha bilan sudrab | Yangi −1, Bajarilmoqda +1 | ✅ 2→1, 1→2 |

## Noto‘g‘ri kiritish
| Sinov | Kutilgan | Natija |
|---|---|---|
| Bo‘sh nom / faqat probel | “Vazifa nomini yozing.” | ✅ |
| 1 belgi / 81 belgi | “kamida 2…” / “80 tadan oshmasin (hozir 81 ta)” | ✅ |
| Takror nom (katta-kichik harf, probel farqi bilan) | “Bunday vazifa allaqachon bor…” | ✅ |
| Mas’ul 1 belgi | “Mas’ul ismi 2–30 ta belgi bo‘lsin.”, panel ochiq qoladi | ✅ |
| Muddat o‘tgan sana | “Muddat bugundan oldin bo‘lmasin.” | ✅ |
| Muddat `2026-02-30` | “Muddat noto‘g‘ri sana.” | ✅ (unit) |
| Tahrirda boshqa vazifa nomi | rad etiladi; o‘z nomini qayta saqlash mumkin | ✅ |
| `<img src=x onerror=…>` | oddiy matn sifatida ko‘rinadi | ✅ |

## Amallar va chekka holatlar
| Sinov | Kutilgan | Natija |
|---|---|---|
| Ko‘chirish → “Bekor qilish” | sonlar oldingi holatga qaytadi | ✅ |
| O‘chirish → “Bekor qilish” | vazifa qaytadi | ✅ |
| Tahrir paneli, Esc | o‘zgarish saqlanmaydi, panel yopiladi | ✅ |
| Filtr paneli | ochiladi, faol filtrlar soni ko‘rinadi, Esc yopadi | ✅ |
| “Namunalarni o‘chirish” | faqat namuna vazifalar o‘chadi, banner yo‘qoladi | ✅ |
| Panel yopilganda fokus | “+ Vazifa” tugmasiga qaytadi | ✅ |
| Yopilish animatsiyasi | haqiqiy panel/oyna darhol yopiladi, nusxasi 0.3 s ichida o‘chadi, takroriy `id` yo‘q | ✅ |
| Tezkor tugmalar | `N` panelni ochadi (matn yozilayotganda emas), `/` qidiruvga o‘tadi | ✅ |
| Yangi → Tugagan sudrash | rad, “Bu ustunga o‘tkazib bo‘lmaydi” | ✅ |
| Qidiruv `ROʻYXAT` (boshqa apostrof) | “ro‘yxat” topiladi; “1 / 5 ta vazifa” | ✅ |
| Filtrda | ustun sonlari umumiy; bo‘sh ustunda “Filtrga mos vazifa yo‘q” | ✅ |
| Muddati o‘tgan vazifa | qizil “Muddati o‘tgan” belgisi, hisobotda alohida | ✅ |
| Hisobot oynasi | matn to‘g‘ri; nusxalash yoki belgilash; Esc yopadi | ✅ |
| Sahifani yangilash | vazifalar, tarix, tanlangan tab saqlanadi | ✅ |
| v1 formatdagi ma’lumot | avtomatik ko‘chadi | ✅ |
| Buzilgan `localStorage` | sayt ishlaydi, namuna taxta | ✅ |
| Konsol xatolari | yo‘q | ✅ |

## Ekran va klaviatura
| Sinov | Kutilgan | Natija |
|---|---|---|
| 390 / 768 / 1366 px | yonga surish yo‘q | ✅ |
| 390 px | ustunlar tablarga bo‘linadi, ← → bilan tab almashadi; “+ Vazifa” suzuvchi tugma | ✅ |
| Ko‘chirish / tahrir / o‘chirishdan keyin fokus | mantiqiy joyda, `body`da emas | ✅ |
| Kunduzgi va tungi rejim | ikkalasi ham o‘qiladi | ✅ (skrinshot) |

## Topilgan va tuzatilgan xatolar
| # | Xato | Tuzatish | Commit |
|---|---|---|---|
| 1 | v1: bo‘sh holat xabari ostida ortiqcha bo‘shliq | bo‘sh holatda yig‘iladi | v1 |
| 2 | Telefonda vazifa boshqa tabga o‘tganda fokus yo‘qolardi | fokus joriy tabga o‘tadi | `7a609a3` |
| 3 | Hisobot oynasi yopilganda fokus boshqa joyga qaytardi | doim “Hisobot” tugmasiga qaytadi | `7dadcee` |
| 4 | Kompyuterda sarlavha va shakl tekis emas edi | yuqoridan tekislandi | `478080c` |
| 5 | Telefonda “Bajarilmoqda 1” tabi 2 qatorga bo‘linardi | bir qatorga sig‘diriladi | `478080c` |
| 6 | Tahrir shaklida bo‘sh xato qatorlari bo‘shliq qoldirardi | bo‘sh xato joy olmaydi | `478080c` |
| 7 | Tungi rejimda “Bekor qilish” tugmasi kontrasti past | matn rangi + ramka | `478080c` |
| 8 | v3: qidiruv ikonkasi placeholder ustiga tushardi | maydon ichki chegarasi tuzatildi | `febeae3` |
| 9 | v3: telefonda yuqori menyu ekran balandligigacha cho‘zilardi | grid qatorlari `auto 1fr` | `febeae3` |
| 10 | v3: 768 px da “Tugatish” tugmasi kartadan chiqib ketardi | karta pastki qatori o‘raladi | `febeae3` |

Sinov jarayonidagi o‘z xatom: test skriptida Esc kartaga yuborilgan edi (shaklga yetmagan) — test tuzatildi, sayt to‘g‘ri ishlagan.
