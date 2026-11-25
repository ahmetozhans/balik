# Mera

Marmara'da kıyı avı için Türkçe web uygulaması. Hava ve deniz tahmini Open-Meteo'dan, harita OpenStreetMap'ten gelir. Saat önerisi modeldeki rüzgâr, hamle, yağış ihtimali ve dalga değerlerini karşılaştırır. Yakalama olasılığı ve güvenlik kararı üretmez. Av defteri aynı mera ve tür için kişisel sonuçları gösterir.

## Çalıştırma

Depo dizininde `python3 -m http.server 8000` komutunu çalıştırıp `http://localhost:8000` adresini aç. iPhone'da GPS ve ana ekrana kurulum için dosyaları HTTPS üzerinden sun. Safari'de Paylaş menüsünden Ana Ekrana Ekle'yi seç.

Av kayıtları, fotoğraflar ve kaydedilen meralar tarayıcıda saklanır. Tarayıcı verileri silindiğinde bu kayıtlar da silinir. Tahmin için seçili koordinatlar Open-Meteo'ya, mera ekranı açıldığında haritanın konumu OpenStreetMap'e iletilir.

## Kişisel av planı

Kıyı, tekne ve tatlı su modlarında uygun meralar ve türler gösterilir. Göl modu hava tahminini kullanır. Tekne modu kullanıcının girdiği dalga eşiğini saatlik tahminle karşılaştırır. Isı haritası kayıtlı meralara ait nokta puanlarını gösterir. Ana solunar pencereler yaklaşık hesaplanır. 7 Gün ekranındaki takvim dosyası aktarıldığında av saatinden 30 dakika önce hatırlatma içerir.

Bursa tür listesi için [Mudanya](https://www.baliksende.com/nokta/bursa/mudanya/mudanya), [Gemlik](https://www.baliksende.com/nokta/bursa/gemlik/gemlik) ve [Bursa İl Tarım ve Orman Müdürlüğü](https://bursa.tarimorman.gov.tr/Duyuru/787/Uluabat-Golu-Su-Urunleri-Istihsal-Hakkinin-Kiraya-Verilmesi-Hakkinda-Duyuru) kaynakları incelendi. Ay filtreleri av tahminindeki sezon varsayımlarını gösterir.

Deniz modunda dip verisi, seçili meranın koordinatıyla EMODnet Geology ve Seabed Habitats WMS servislerinden sorgulanır. Sonuçlar katman kapsamına ve çözünürlüğüne bağlıdır.

Tür önerisi ayrı bir rehberdir. Uygulama belgelenen habitatı, sezon rehberini ve türün av saatlerini karşılaştırır. Ardından eşleşen saatler arasında mevcut model verilerine göre daha sakin saati gösterir. Denizde rüzgâr veya dalga verisi eksikse saat önerilmez.

Meralar ekranında uydu görünümü Esri World Imagery ile açılır. Atış çizgisi iki seçili koordinatın arasındaki yaklaşık düz mesafeyi ve gerçek kuzeye göre yönü gösterir. Uydu görüntüsü zeminin görünür olduğu durumlarda yorum için kullanılabilir. Otomatik dip sınıflandırması uygulanmaz.

Mudanya pilotunda yaklaşık 40.375844–40.377936 K ve 28.885803–28.888550 D sınırlarında Esri Wayback’in 2019-12-12, 2021-12-21, 2023-12-07, 2025-12-18 ve 2026-11-18 tarihli yayın karoları karşılaştırıldı. 2025 ve 2026 karoları bu alanda aynıydı. Yayın tarihleri çekim tarihi değildir. İncelenen görüntülerden kum, kaya veya bitki sınırı güvenilir biçimde çıkarılamadı.
