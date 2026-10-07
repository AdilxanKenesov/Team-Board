# HIMOYA — Bilet 010 “Jamoa taxtasi” (15 daqiqa)

## 1. Taqdimot — 5 daqiqa
- **Kim uchun:** to‘garak, talabalar loyihasi, kichik ish jamoasi.
- **Muammo:** vazifalar chat va daftarda yo‘qoladi; kim mas’ul, nima kechikkani noaniq.
- **Yechim:** uch ustunli taxta — har vazifaning bosqichi, egasi va muddati bir qarashda; “Jamoa holati” chizig‘i va yig‘ilish uchun tayyor hisobot.

## 2. Namoyish — 5 daqiqa (shu tartibda)
1. “+ Vazifa” → panel ochiladi; bo‘sh nom bilan “Qo‘shish” → xato xabari (**noto‘g‘ri kiritish**).
2. “Hisobot tayyorlash”, mas’ul “Sardor”, muhimlik “Yuqori” → qo‘shiladi, panel yopiladi.
3. “Boshlash →” → **Yangi −1, Bajarilmoqda +1** (bilet sinovi). Sonlarni ko‘rsating.
4. “Bekor qilish” → qaytadi; yana “Boshlash →”.
5. Sichqoncha bilan Tugaganga sudrash; Yangi → Tugagan sudrab bo‘lmasligini ko‘rsatish.
6. Sahifani yangilash (F5) → hammasi saqlangan.
7. F12 → telefon (390 px) → tablar.
8. “Hisobot” → bezatilgan hisobot → “PDF saqlash”.
9. “Tozalash” → o‘rtadagi tasdiq oynasi → “Bekor qilish”.

## 3. Savollarga javob — 5 daqiqa (34-band)
**Foydalanuvchi qaysi ishni bajaradi?**
Vazifa qo‘shadi, ish boshlanganda va tugaganda uni keyingi ustunga o‘tkazadi, kim nima qilayotganini va nima kechikkanini ko‘radi.

**Nega shu vosita?**
Claude Code fayllarni o‘zi yozadi, testlarni ishga tushiradi va brauzerda tekshiradi — reja, kod, 96 ta sinov va hujjatni bir joyda qilish mumkin bo‘ldi. Natija oddiy HTML/CSS/JS — internetsiz, o‘rnatishsiz ochiladi.

**AI natijasida nima o‘zgartirildi?**
Qo‘shimchalarni va dizayn yo‘nalishini o‘zim tanladim: birinchi dizaynda matn juda ko‘p edi — ilova ko‘rinishiga o‘tkazib, matnni qisqartirdim (qo‘shish/tahrir alohida panelda, kartada faqat kerakli ma’lumot). Bosqichlarni commitlarga bo‘ldim. Sinovda 12 ta kamchilik topilib tuzatildi: masalan, telefonda vazifa boshqa tabga o‘tganda fokus yo‘qolardi; hisobot oynasi yopilganda fokus noto‘g‘ri joyga qaytardi; tungi rejimda tugma kontrasti past edi. Bir marta commit test natijasini kutmay o‘tib ketdi — shundan keyin commit faqat hamma test o‘tsa bajariladigan qilindi.

**Qaysi xato qanday tekshirildi?**
`node test.js` (20 test) va `tests/` dagi brauzer testlari (76 tekshiruv). Misol: hisobot oynasi Esc bilan yopilganda fokus qayerga tushishi avtomatik tekshirildi, xato topildi, tuzatildi, qayta tekshirildi (`7dadcee`).

**Cheklovlar?**
Ma’lumot faqat shu brauzerda — jamoa bilan ulashish uchun server kerak. “Bekor qilish” faqat oxirgi amalga. Sudrash faqat sichqonchada (telefonda tugmalar).
