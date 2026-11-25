# Mera

Marmara'da kıyı avı için Türkçe web uygulaması. Hava ve deniz tahmini Open-Meteo'dan, harita OpenStreetMap'ten gelir. Av puanı sezon, gün doğumu ve batımı, rüzgâr, dalga ve su sıcaklığına göre hesaplanan deneysel bir göstergedir.

## Çalıştırma

Depo dizininde `python3 -m http.server 8000` komutunu çalıştırıp `http://localhost:8000` adresini aç. iPhone'da GPS ve ana ekrana kurulum için dosyaları HTTPS üzerinden sun. Safari'de Paylaş menüsünden Ana Ekrana Ekle'yi seç.

Av kayıtları, fotoğraflar ve kaydedilen meralar tarayıcıda saklanır. Tarayıcı verileri silindiğinde bu kayıtlar da silinir. Tahmin için seçili koordinatlar Open-Meteo'ya, mera ekranı açıldığında haritanın konumu OpenStreetMap'e iletilir.
