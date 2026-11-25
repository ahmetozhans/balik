# Mera

Marmara'da kıyı avı için Türkçe web uygulaması. Hava ve deniz tahmini Open-Meteo'dan, harita OpenStreetMap'ten gelir. Av puanı sezon, gün doğumu ve batımı, rüzgâr, dalga ve su sıcaklığına göre hesaplanan deneysel bir göstergedir.

## Çalıştırma

Depo dizininde `python3 -m http.server 8000` komutunu çalıştırıp `http://localhost:8000` adresini aç. iPhone'da GPS ve ana ekrana kurulum için dosyaları HTTPS üzerinden sun. Safari'de Paylaş menüsünden Ana Ekrana Ekle'yi seç.

Av kayıtları, fotoğraflar ve kaydedilen meralar tarayıcıda saklanır. Tarayıcı verileri silindiğinde bu kayıtlar da silinir. Tahmin için seçili koordinatlar Open-Meteo'ya, mera ekranı açıldığında haritanın konumu OpenStreetMap'e iletilir.

## Kişisel av planı

Kıyı, tekne ve tatlı su modlarında uygun meralar ve türler gösterilir. Göl modu hava tahminini kullanır. Tekne modu kullanıcının girdiği dalga eşiğini saatlik tahminle karşılaştırır. Isı haritası kayıtlı meralara ait nokta puanlarını gösterir. Ana solunar pencereler yaklaşık hesaplanır. 7 Gün ekranındaki takvim dosyası aktarıldığında av saatinden 30 dakika önce hatırlatma içerir.

Bursa tür listesi için [Mudanya](https://www.baliksende.com/nokta/bursa/mudanya/mudanya), [Gemlik](https://www.baliksende.com/nokta/bursa/gemlik/gemlik) ve [Bursa İl Tarım ve Orman Müdürlüğü](https://bursa.tarimorman.gov.tr/Duyuru/787/Uluabat-Golu-Su-Urunleri-Istihsal-Hakkinin-Kiraya-Verilmesi-Hakkinda-Duyuru) kaynakları incelendi. Ay filtreleri av tahminindeki sezon varsayımlarını gösterir.
