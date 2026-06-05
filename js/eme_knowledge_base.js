// FILE: /js/eme_knowledge_base.js

export const EME_OUT_OF_SCOPE_RESPONSE =
  "Ben Eme, italkyAI destek asistanıyım. Size uygulama kullanımı, üyelik, aktivasyon kodu ve teknik destek konularında yardımcı olabilirim. Lütfen italkyAI ile ilgili sorunuzu yazın.";

export const EME_HANDOFF_MESSAGE =
  "Bu konuda size hemen net bir çözüm sunamadığım için özür dilerim. Müşteri hizmetlerimiz konuyu inceleyip en kısa sürede sizinle iletişime geçecektir. Lütfen aşağıdaki formu doldurun.";

export const EME_ALLOWED_SCOPE = [
  "aktivasyon kodu",
  "üyelik",
  "uygulama içi satın alma",
  "gün satın alma",
  "sipariş / referans numarası",
  "teknik destek",
  "kod kontrolü",
  "üyelik süresi",
  "modül kullanımı",
  "destek talebi"
];

export const EME_KNOWLEDGE_BASE = [
  {
    id: "code_used",
    topic: "activation_code",
    keywords: ["kod kullanılmış", "daha önce kullanılmış", "kod kullanildi", "kullanılmış diyor", "used code"],
    answer:
      "Bu uyarı, aktivasyon kodunun daha önce bir hesapta işlem görmüş olabileceğini gösterir. Kodunuzu kontrol edebilmem için lütfen aktivasyon kodunuzu yazın. Kod farklı bir hesapta kullanılmışsa gizlilik nedeniyle hesap bilgisi paylaşamam; ancak destek talebi oluşturarak konunun incelenmesini sağlayabilirim.",
    needsCodeDiagnostic: true
  },
  {
    id: "code_invalid",
    topic: "activation_code",
    keywords: ["kod geçersiz", "geçersiz diyor", "gecersiz", "invalid code", "hatalı kod", "hatali kod"],
    answer:
      "Lütfen aktivasyon kodunuzu boşluk bırakmadan ve eksiksiz yazdığınızdan emin olun. Kodun başında veya sonunda boşluk varsa silin. Sorun devam ederse kodunuzu destek üzerinden kontrol edebiliriz.",
    needsCodeDiagnostic: true
  },
  {
    id: "code_not_applied",
    topic: "activation_code",
    keywords: ["kod hesabıma işlenmedi", "hesabıma geçmedi", "islenmedi", "eklenmedi", "yüklenmedi", "yuklenmedi"],
    answer:
      "Kod uygulandıktan sonra üyelik süresi hemen görünmeyebilir. Lütfen uygulamadan çıkış yapıp tekrar giriş yapın. Hâlâ görünmüyorsa aktivasyon kodunuzu yazın, kontrol edelim.",
    needsCodeDiagnostic: true
  },
  {
    id: "code_reuse",
    topic: "activation_code",
    keywords: ["aynı kodu tekrar", "ayni kodu tekrar", "kodu tekrar kullan", "bir daha kullanabilir", "yeniden kullan"],
    answer:
      "Aktivasyon kodları genellikle tek kullanım içindir. Bir kod daha önce kullanıldıysa aynı kod tekrar farklı bir hesapta kullanılamaz. Kodun durumunu kontrol etmek için aktivasyon kodunuzu yazabilirsiniz.",
    needsCodeDiagnostic: true
  },
  {
    id: "wrong_account",
    topic: "activation_code",
    keywords: ["yanlış hesaba", "yanlis hesaba", "başka hesaba", "baska hesaba", "farklı hesap", "farkli hesap"],
    answer:
      "Aktivasyon kodları uygulandığı hesapla ilişkilendirilebilir. Gizlilik ve güvenlik nedeniyle başka hesap bilgisi paylaşamam. Konunun incelenmesi için destek talebi oluşturabilirsiniz.",
    needsCodeDiagnostic: true
  },
  {
    id: "membership_duration_missing",
    topic: "membership",
    keywords: ["üyelik sürem görünmüyor", "uyelik surem", "sürem görünmüyor", "surem gorunmuyor", "günüm görünmüyor", "gunum gorunmuyor"],
    answer:
      "Önce uygulamadan çıkış yapıp tekrar giriş yapmanızı öneririm. Üyelik süreniz hâlâ görünmüyorsa profilinizdeki hesap bilgisi ve varsa aktivasyon kodunuzla destek talebi oluşturabilirsiniz."
  },
  {
    id: "days_missing",
    topic: "membership",
    keywords: ["gün satın aldım", "gun satin aldim", "gün aldım görünmüyor", "gun aldim gorunmuyor", "gün yükledim", "gun yukledim", "süre eklenmedi", "sure eklenmedi"],
    answer:
      "Üyelik veya gün yükleme işlemi bazen kısa süre içinde yenilenir. Lütfen uygulamayı tamamen kapatıp tekrar açın. Sorun devam ederse destek talebi oluşturabilirsiniz."
  },
  {
    id: "code_how_to_use",
    topic: "activation_code",
    keywords: ["aktivasyon kodu nasıl kullanılır", "kod nasıl kullanılır", "kodu nereye", "kod nasil", "aktivasyon"],
    answer:
      "Ana ekrandan Kod ile Gün Yükle alanına girin. Aktivasyon kodunuzu boşluk bırakmadan yazın ve onaylayın. İşlem tamamlandığında üyelik süreniz hesabınıza eklenir."
  },
  {
    id: "app_rejects_code",
    topic: "activation_code",
    keywords: ["uygulama kodu kabul etmiyor", "kod kabul etmiyor", "kod almıyor", "kod almiyor", "reddediyor"],
    answer:
      "Kodunuzu eksiksiz yazdığınızdan emin olun. Harf ve rakamları karıştırmamaya dikkat edin. Boşluk veya özel karakter eklemeyin. Sorun devam ederse kodunuzu destek ekranından kontrol ettirebilirsiniz.",
    needsCodeDiagnostic: true
  },
  {
    id: "offline_packs_missing",
    topic: "module_usage",
    keywords: ["offline dil paketleri görünmüyor", "dil paketi görünmüyor", "paket görünmüyor", "offline paket", "gorunmuyor"],
    answer:
      "Offline dil paketleri bazı üyelik ve süre koşullarına göre görünebilir. Kullanım süreniz çok az kaldıysa offline paket indirme alanı görünmeyebilir. Uygulamadan çıkış yapıp tekrar giriş yapın. Sorun devam ederse destek talebi oluşturabilirsiniz."
  },
  {
    id: "offline_pack_download",
    topic: "module_usage",
    keywords: ["offline dil paketi indiremiyorum", "paket indiremiyorum", "indirme hata", "download", "dil paketi inmiyor"],
    answer:
      "Telefonunuzda yeterli boş alan olduğundan ve internet bağlantınızın stabil olduğundan emin olun. İlk offline motor kurulumu cihaz modeline ve bağlantıya göre uzun sürebilir. Sonraki dil indirmeleri daha kısa sürer. Sorun devam ederse cihaz modelinizi de yazarak destek talebi oluşturabilirsiniz."
  },
  {
    id: "some_languages_not_working",
    topic: "module_usage",
    keywords: ["japonca çalışmıyor", "korece çalışmıyor", "çince çalışmıyor", "japonca calismiyor", "korece calismiyor", "cince calismiyor", "bazı diller çalışmıyor", "bazi diller calismiyor"],
    answer:
      "Bazı diller cihazın Android sürümü, offline motor kurulumu, bellek durumu veya dil paketinin tam kurulmamış olması nedeniyle çalışmayabilir. Uygulamayı güncelleyin, cihazınızda boş alan açın ve dil paketini yeniden deneyin. Sorun devam ederse cihaz modelinizi ve çalışmayan dili yazarak destek talebi oluşturabilirsiniz."
  },
  {
    id: "old_android",
    topic: "technical",
    keywords: ["android sürümüm eski", "android surumum eski", "eski android", "android sürümü", "android surumu"],
    answer:
      "Bazı özellikler eski Android sürümlerinde sınırlı çalışabilir. Uygulamanın güncel sürümünü kullandığınızdan ve cihaz sisteminizin mümkün olduğunca güncel olduğundan emin olun."
  },
  {
    id: "low_storage",
    topic: "technical",
    keywords: ["hafıza az", "hafiza az", "depolama az", "boş alan", "bos alan", "indirme olur mu"],
    answer:
      "Offline dil paketleri ve offline motor telefonunuzda depolama alanı kullanır. Yeterli boş alan yoksa indirme tamamlanmayabilir veya dil paketi çalışmayabilir. Önce cihazınızda boş alan açıp tekrar deneyin."
  },
  {
    id: "microphone_not_working",
    topic: "technical",
    keywords: ["mikrofon çalışmıyor", "mikrofon calismiyor", "ses almıyor", "ses almiyor", "konuşma algılanmıyor"],
    answer:
      "Lütfen uygulamaya mikrofon izni verdiğinizden emin olun. Telefon ayarlarından italkyAI uygulamasına girerek mikrofon iznini kontrol edin. Ayrıca başka bir uygulama mikrofonu kullanıyorsa kapatıp tekrar deneyin."
  },
  {
    id: "speaker_not_working",
    topic: "technical",
    keywords: ["ses gelmiyor", "hoparlör çalışmıyor", "hoparlor calismiyor", "ses çıkmıyor", "ses cikmiyor"],
    answer:
      "Telefon ses seviyesini, sessiz mod ayarını ve medya sesini kontrol edin. Uygulamadan çıkıp tekrar giriş yapın. Sorun devam ederse cihaz modelinizi yazarak destek talebi oluşturabilirsiniz."
  },
  {
    id: "facetoface_not_working",
    topic: "module_usage",
    keywords: ["yüzyüze çeviri çalışmıyor", "yuzyuze ceviri calismiyor", "facetoface çalışmıyor", "karşılıklı çeviri"],
    answer:
      "Mikrofon izni, internet bağlantısı ve seçili dilleri kontrol edin. Uygulamayı tamamen kapatıp tekrar açın. Sorun devam ederse hangi iki dilde sorun yaşadığınızı yazarak destek talebi oluşturabilirsiniz."
  },
  {
    id: "two_phone_connect",
    topic: "module_usage",
    keywords: ["iki telefon bağlanmıyor", "iki telefon baglanmiyor", "oda kodu", "eşleşmiyor", "eslesmiyor"],
    answer:
      "Bir cihazda görüşme başlatıp oluşan kodu diğer cihaza girmeniz gerekir. Kodun doğru yazıldığından ve iki cihazın da internete bağlı olduğundan emin olun. Bağlantı kurulmazsa yeni kod oluşturup tekrar deneyin."
  },
  {
    id: "two_phone_code",
    topic: "module_usage",
    keywords: ["iki telefon kodu çalışmıyor", "iki telefon kodu calismiyor", "oda kodu çalışmıyor", "oda kodu calismiyor"],
    answer:
      "Kod 6 haneli olmalı ve diğer cihazda doğru girilmelidir. Kod eskiyse veya oturum kapandıysa yeni kod oluşturun. İnternet bağlantınızı kontrol edip tekrar deneyin."
  },
  {
    id: "conference_not_working",
    topic: "module_usage",
    keywords: ["gezi konferans çalışmıyor", "gezi konferans calismiyor", "konferans çalışmıyor", "dinleyici bağlanmıyor"],
    answer:
      "Konuşmacı önce oturum başlatmalı ve oturum kodunu katılımcılarla paylaşmalıdır. Katılımcılar kodu girerek kendi dinleme dilini seçebilir. Ses veya çeviri gelmiyorsa internet bağlantısını ve mikrofon iznini kontrol edin."
  },
  {
    id: "text_translate_not_working",
    topic: "module_usage",
    keywords: ["yazıdan çeviri çalışmıyor", "yazidan ceviri calismiyor", "text translate", "metin çeviri"],
    answer:
      "Metni yazdıktan sonra kaynak ve hedef dili kontrol edin. İnternet bağlantınız yoksa online çeviri çalışmayabilir. Uygulamayı kapatıp tekrar açarak yeniden deneyin."
  },
  {
    id: "level_test_not_opening",
    topic: "module_usage",
    keywords: ["seviye tespit açılmıyor", "seviye tespit acilmiyor", "level test açılmıyor", "test açılmıyor"],
    answer:
      "İnternet bağlantınızı kontrol edin ve uygulamayı yeniden başlatın. Sorun devam ederse hangi ekranda kaldığınızı yazarak destek talebi oluşturabilirsiniz."
  },
  {
    id: "games_not_opening",
    topic: "module_usage",
    keywords: ["oyunlar açılmıyor", "oyunlar acilmiyor", "eğlenerek öğren", "eglenerek ogren", "game menu"],
    answer:
      "Bazı oyunlar erişim veya jeton durumuna göre açılabilir. Uygulamadan çıkış yapıp tekrar giriş yapın. Sorun devam ederse hangi oyunda sorun yaşadığınızı yazın."
  },
  {
    id: "login_issue",
    topic: "technical",
    keywords: ["giriş yapamıyorum", "giris yapamiyorum", "hesabıma giremiyorum", "hesabima giremiyorum", "login"],
    answer:
      "İnternet bağlantınızı kontrol edin. Daha önce aynı hesapla giriş yaptıysanız uygulamayı kapatıp tekrar açın. Sorun devam ederse kullandığınız e-posta adresiyle destek talebi oluşturabilirsiniz."
  },
  {
    id: "deleted_account_login",
    topic: "technical",
    keywords: ["hesabımı sildim", "hesabimi sildim", "tekrar giriş yapamıyorum", "tekrar giris yapamiyorum"],
    answer:
      "Hesap silme sonrası aynı hesapla girişte sistem oturumu yenilemekte zorlanabilir. Uygulamayı kapatıp tekrar açın. Sorun devam ederse destek talebi oluşturabilirsiniz."
  },
  {
    id: "app_slow",
    topic: "technical",
    keywords: ["uygulama yavaş", "uygulama yavas", "çok yavaş", "cok yavas", "donuyor", "takılıyor"],
    answer:
      "Cihaz belleği, internet bağlantısı ve arka planda çalışan uygulamalar performansı etkileyebilir. Uygulamayı kapatıp tekrar açın, cihazınızda boş alan olduğundan emin olun."
  },
  {
    id: "app_not_opening",
    topic: "technical",
    keywords: ["uygulama açılmıyor", "uygulama acilmiyor", "açılmıyor", "acilmiyor", "başlamıyor", "baslamiyor"],
    answer:
      "Uygulamanın güncel olduğundan emin olun. Cihazı yeniden başlatıp tekrar deneyin. Sorun devam ederse cihaz modelinizi ve Android sürümünüzü yazarak destek talebi oluşturabilirsiniz."
  },
  {
    id: "language_select_not_opening",
    topic: "module_usage",
    keywords: ["dil seçimi açılmıyor", "dil secimi acilmiyor", "dil listesi açılmıyor", "dil listesi acilmiyor"],
    answer:
      "Uygulamayı kapatıp tekrar açın. Dil seçimi hâlâ açılmıyorsa hangi modülde bu sorunu yaşadığınızı yazarak destek talebi oluşturabilirsiniz."
  },
  {
    id: "translation_quality",
    topic: "module_usage",
    keywords: ["çeviri yanlış", "ceviri yanlis", "çeviri eksik", "ceviri eksik", "yanlış çeviriyor", "yanlis ceviriyor"],
    answer:
      "Kısa, net ve anlaşılır cümleler çeviri kalitesini artırır. Gürültülü ortam, düşük mikrofon kalitesi veya çok uzun cümleler çeviriyi etkileyebilir."
  },
  {
    id: "offline_usage",
    topic: "module_usage",
    keywords: ["internet olmadan çalışır mı", "internet olmadan calisir mi", "offline çalışır mı", "offline calisir mi"],
    answer:
      "Bazı özellikler internet bağlantısı gerektirir. Offline dil paketleri kuruluysa desteklenen dillerde internet olmadan da kullanım sağlanabilir. Ancak tüm modüller offline çalışmayabilir."
  },
  {
    id: "human_support",
    topic: "other",
    keywords: ["müşteri hizmetleri", "musteri hizmetleri", "destek formu", "biri arasın", "biri arasin", "yardım edin"],
    answer:
      "Elbette. Konunun incelenebilmesi için destek formunu doldurun; müşteri hizmetlerimiz en kısa sürede sizinle iletişime geçecektir.",
    openForm: true
  },
  {
    id: "out_of_scope",
    topic: "other",
    keywords: ["hava nasıl", "hava nasil", "yemek tarifi", "siyaset", "hukuk", "sağlık tavsiyesi", "saglik tavsiyesi"],
    answer: EME_OUT_OF_SCOPE_RESPONSE
  },
  {
    id: "unresolved",
    topic: "other",
    keywords: ["çözemedim", "cozemedim", "devam ediyor", "olmuyor", "olmadı", "olmadi"],
    answer: EME_HANDOFF_MESSAGE,
    openForm: true
  }
];
