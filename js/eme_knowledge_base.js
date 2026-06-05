// FILE: /js/eme_knowledge_base.js

export const EME_OUT_OF_SCOPE_RESPONSE =
  "Ben Eme, italkyAI destek asistanıyım. Size uygulama kullanımı, üyelik, aktivasyon kodu ve teknik destek konularında yardımcı olabilirim. Lütfen italkyAI ile ilgili sorunuzu yazın.";

export const EME_HANDOFF_MESSAGE =
  "Bu konuda size hemen net bir çözüm sunamadığım için özür dilerim. Müşteri hizmetlerimiz konuyu inceleyip en kısa sürede sizinle iletişime geçecektir. Lütfen aşağıdaki formu doldurun.";

export const EME_ALLOWED_SCOPE = [
  "aktivasyon kodu",
  "üyelik",
  "uygulama kullanımı",
  "teknik destek",
  "modül kullanımı"
];

export const EME_KNOWLEDGE_BASE = [
  {
    id: "code_used",
    topic: "activation_code",
    keywords: ["kod kullanılmış", "daha önce kullanılmış", "kod kullanildi", "kullanılmış diyor", "used code"],
    answer:
      "Bu uyarı, kodun daha önce bir hesapta işlem gördüğünü gösterebilir. Kodunuzu kontrol edebilmem için lütfen aktivasyon kodunu yazın. Sorun devam ederse müşteri hizmetlerimiz destek formu üzerinden konuyu inceleyecektir.",
    needsCodeDiagnostic: true
  },
  {
    id: "code_invalid",
    topic: "activation_code",
    keywords: ["kod geçersiz", "geçersiz diyor", "gecersiz", "invalid code", "hatalı kod", "hatali kod"],
    answer:
      "Kodu boşluk bırakmadan, büyük harfle ve eksiksiz girin. O-0 veya I-1 gibi benzer karakterleri kontrol edin. Uyarı devam ederse kodu ve ekrandaki hata mesajını destek formuna ekleyin.",
    needsCodeDiagnostic: true
  },
  {
    id: "code_not_applied",
    topic: "activation_code",
    keywords: ["kod hesabıma işlenmedi", "hesabıma geçmedi", "islenmedi", "eklenmedi", "yüklenmedi", "yuklenmedi"],
    answer:
      "Ana sayfaya dönüp hesabınızı yenileyin ve aynı hesapla giriş yaptığınızdan emin olun. Süre hâlâ görünmüyorsa kodunuzu ve sorununuzu destek formuna ekleyin.",
    needsCodeDiagnostic: true
  },
  {
    id: "code_how_to_use",
    topic: "activation_code",
    keywords: ["aktivasyon kodu nasıl kullanılır", "kod nasıl kullanılır", "kodu nereye", "kod nasil", "aktivasyon"],
    answer:
      "Aktivasyon kodunu uygulamadaki kod yükleme alanına boşluk bırakmadan girin. Kod kabul edilirse süre hesabınıza eklenir. İşlemden sonra ana sayfayı yenileyin."
  },
  {
    id: "membership_duration_missing",
    topic: "membership",
    keywords: ["üyelik sürem görünmüyor", "uyelik surem", "sürem görünmüyor", "surem gorunmuyor", "günüm görünmüyor", "gunum gorunmuyor"],
    answer:
      "Aynı hesapla giriş yaptığınızı kontrol edin ve ana sayfayı yenileyin. Üyelik süresi hâlâ görünmüyorsa destek formunu doldurun; ekip kayıtları inceleyecektir."
  },
  {
    id: "code_reuse",
    topic: "activation_code",
    keywords: ["aynı kodu tekrar", "ayni kodu tekrar", "kodu tekrar kullan", "bir daha kullanabilir", "yeniden kullan"],
    answer:
      "Genellikle aynı aktivasyon kodu bir kez kullanılabilir. Kodun daha önce işlendiğini düşünüyorsanız destek ekibi güvenli şekilde kontrol sağlayabilir.",
    needsCodeDiagnostic: true
  },
  {
    id: "wrong_account",
    topic: "activation_code",
    keywords: ["yanlış hesaba", "yanlis hesaba", "başka hesaba", "baska hesaba", "farklı hesap", "farkli hesap"],
    answer:
      "Kod farklı bir hesapta kullanılmış görünüyorsa başka kullanıcıya ait kişisel bilgi paylaşamam. Kendi talebinizi destek formu üzerinden iletin; ekip doğrulama sonrası konuyu inceleyecektir.",
    needsCodeDiagnostic: true
  },
  {
    id: "app_rejects_code",
    topic: "activation_code",
    keywords: ["uygulama kodu kabul etmiyor", "kod kabul etmiyor", "kod almıyor", "kod almiyor", "reddediyor"],
    answer:
      "Kod alanında boşluk, küçük harf veya özel karakter kalmadığından emin olun. Kod hâlâ kabul edilmiyorsa ekrandaki uyarıyı ve kodu destek formuna ekleyin.",
    needsCodeDiagnostic: true
  },
  {
    id: "days_missing",
    topic: "membership",
    keywords: ["gün aldım görünmüyor", "gun aldim gorunmuyor", "gün yükledim", "gun yukledim", "süre eklenmedi", "sure eklenmedi"],
    answer:
      "Ana sayfayı yenileyin ve aynı hesapla giriş yaptığınızı kontrol edin. Süre hâlâ görünmüyorsa destek formuna işlem açıklamasını ve varsa referans numarasını ekleyin."
  },
  {
    id: "offline_packs_missing",
    topic: "module_usage",
    keywords: ["offline dil paketleri görünmüyor", "dil paketi görünmüyor", "paket görünmüyor", "offline paket", "gorunmuyor"],
    answer:
      "Dil paketleri ekranını yenileyin ve bağlantınızı kontrol edin. Aradığınız paket hâlâ görünmüyorsa hangi dili aradığınızı destek formuna yazın."
  },
  {
    id: "offline_pack_download",
    topic: "module_usage",
    keywords: ["offline dil paketi indiremiyorum", "paket indiremiyorum", "indirme hata", "download", "dil paketi inmiyor"],
    answer:
      "Bağlantınızı kontrol edin, yeterli depolama alanı olduğundan emin olun ve indirmeyi tekrar deneyin. Sorun sürerse hangi paket olduğunu destek formuna ekleyin."
  },
  {
    id: "two_phone_connect",
    topic: "module_usage",
    keywords: ["iki telefon bağlanmıyor", "iki telefon baglanmiyor", "oda kodu", "eşleşmiyor", "eslesmiyor"],
    answer:
      "İki cihazda da aynı oda kodunun girildiğini kontrol edin. Kod süresi dolmadan iki cihazın da bağlantı ekranında kalması gerekir."
  },
  {
    id: "two_phone_code",
    topic: "module_usage",
    keywords: ["iki telefon kodu çalışmıyor", "iki telefon kodu calismiyor", "oda kodu çalışmıyor", "oda kodu calismiyor"],
    answer:
      "Oda kodunu yeniden oluşturup diğer cihaza aynen girin. Kod hâlâ çalışmıyorsa iki cihazı da yenileyip tekrar deneyin."
  },
  {
    id: "facetoface_not_working",
    topic: "module_usage",
    keywords: ["yüzyüze çeviri çalışmıyor", "yuzyuze ceviri calismiyor", "facetoface çalışmıyor", "karşılıklı çeviri"],
    answer:
      "YüzYüze Çeviri için mikrofon iznini, bağlantınızı ve seçili dilleri kontrol edin. Sorun devam ederse hangi adımda kaldığınızı destek formuna yazın."
  },
  {
    id: "microphone_not_working",
    topic: "technical",
    keywords: ["mikrofon çalışmıyor", "mikrofon calismiyor", "ses almıyor", "ses almiyor", "konuşma algılanmıyor"],
    answer:
      "Cihazınızda mikrofon izninin açık olduğundan emin olun. Uygulama veya tarayıcı ayarlarından mikrofon erişimini kontrol edip sayfayı yenileyin."
  },
  {
    id: "conference_not_working",
    topic: "module_usage",
    keywords: ["gezi konferans çalışmıyor", "gezi konferans calismiyor", "konferans çalışmıyor", "dinleyici bağlanmıyor"],
    answer:
      "Gezi & Konferans modülünde bağlantı ve mikrofon izinlerini kontrol edin. Oturum yenilenmezse kapatıp yeniden başlatın."
  },
  {
    id: "text_translate_not_working",
    topic: "module_usage",
    keywords: ["yazıdan çeviri çalışmıyor", "yazidan ceviri calismiyor", "text translate", "metin çeviri"],
    answer:
      "Metni kısa parçalar halinde deneyin ve seçili dilleri kontrol edin. Çeviri hâlâ gelmiyorsa sorunu destek formuna yazın."
  },
  {
    id: "level_test_not_opening",
    topic: "module_usage",
    keywords: ["seviye tespit açılmıyor", "seviye tespit acilmiyor", "level test açılmıyor", "test açılmıyor"],
    answer:
      "Sayfayı yenileyin ve bağlantınızı kontrol edin. Seviye Tespit hâlâ açılmıyorsa destek formuna cihazınızı ve gördüğünüz hatayı yazın."
  },
  {
    id: "games_not_opening",
    topic: "module_usage",
    keywords: ["oyunlar açılmıyor", "oyunlar acilmiyor", "eğlenerek öğren", "eglenerek ogren", "game menu"],
    answer:
      "Oyunlar ekranını yenileyin ve bağlantınızı kontrol edin. Sorun devam ederse hangi oyunda kaldığınızı destek formuna ekleyin."
  },
  {
    id: "login_issue",
    topic: "technical",
    keywords: ["giriş yapamıyorum", "giris yapamiyorum", "hesabıma giremiyorum", "hesabima giremiyorum", "login"],
    answer:
      "E-posta ve şifrenizi kontrol edin. Giriş hâlâ başarısızsa şifre yenileme adımını deneyin veya destek formu üzerinden bize ulaşın."
  },
  {
    id: "app_slow",
    topic: "technical",
    keywords: ["uygulama yavaş", "uygulama yavas", "çok yavaş", "cok yavas", "donuyor", "takılıyor"],
    answer:
      "Bağlantınızı kontrol edin, uygulamayı kapatıp yeniden açın ve aynı işlemi tekrar deneyin. Sorun sürerse hangi ekranda yavaşladığını destek formuna yazın."
  },
  {
    id: "restart_session",
    topic: "technical",
    keywords: ["çıkış yapıp tekrar giriş", "cikis yapip tekrar giris", "yeniden giriş", "yeniden giris", "oturumu yenile"],
    answer:
      "Uygulamadan güvenli çıkış yapıp tekrar giriş yapmak çoğu geçici oturum sorununu düzeltebilir. Sonrasında ana sayfayı yenileyin."
  },
  {
    id: "human_support",
    topic: "other",
    keywords: ["müşteri hizmetleri", "musteri hizmetleri", "destek formu", "biri arasın", "biri arasin", "yardım edin"],
    answer:
      "Elbette. Konunun incelenebilmesi için destek formunu doldurun; müşteri hizmetlerimiz en kısa sürede sizinle iletişime geçecektir.",
    openForm: true
  }
];
