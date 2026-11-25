# Mera

Bursa’da kıyı avı planlayıcısı. Mudanya Sahili, Gemsaz, Gemlik Sahili ve Karacabey Yeniköy için bölgesel av kaynakları ve Open-Meteo hava ve deniz modelinden yararlanır. Öneriler yerel saat, hedef tür ve gelecek model saatlerine göre hazırlanır. Kıyı dip yapısı doğrulanmadığı için öneriye katılmaz.

Yerel geliştirme için bu dizinde `python3 -m http.server 8000` komutunu çalıştır ve `http://localhost:8000` adresini aç. Av defteri mevcut `mera:log` tarayıcı kayıtlarını okur ve aynı anahtara yazar. Kişisel kayıtlar bu tarayıcıda kalır.

Mera bağlantıları Google Maps’i koordinatla açar. Hedef tür listesi deniz ve tatlı su kayıtlarını kapsar. Saat önerisi, kaynak profili tanımlanmış kıyı türleriyle sınırlıdır.

Ana ekran Mera’nın yerel GeoJSON verisiyle çizdiği Bursa kıyı haritasıdır. Kıyı geometrisi Natural Earth 1:10 milyon ölçekli verisinden kırpılmıştır ve genel görünüm için kullanılır. Uygulama harita karosu istemez. Leaflet etkileşim katmanını sağlar. Dip zemini ve 25 metrelik atış ayrıntısı bu veri setinde bulunmaz.
