# Mera

Bursa’da kıyı avı planlayıcısı. Mudanya Sahili, Gemsaz ve Karacabey Yeniköy için bölgesel av kaynakları ve Open-Meteo hava ve deniz modelinden yararlanır. Öneriler yerel saat, hedef tür ve gelecek model saatlerine göre hazırlanır. Kıyı dip yapısı doğrulanmadığı için öneriye katılmaz.

Yerel geliştirme için bu dizinde `python3 -m http.server 8000` komutunu çalıştır ve `http://localhost:8000` adresini aç. Av defteri mevcut `mera:log` tarayıcı kayıtlarını okur ve aynı anahtara yazar. Kişisel kayıtlar bu tarayıcıda kalır.
