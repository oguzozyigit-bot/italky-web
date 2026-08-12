from pathlib import Path

path = Path("pages/jetonbuy.html")
s = path.read_text(encoding="utf-8")

old_price = 'function formatTokens(v){try{return Number(v||0).toLocaleString("tr-TR")}catch{return String(v||0)}}function setTokenViews(v){const t=formatTokens(v);if(currentTokensEl)currentTokensEl.textContent=t;if(headerTokensEl)headerTokensEl.textContent=t;if(drawerTokensEl)drawerTokensEl.textContent=t}function extractGooglePlayPrice(id){const info=lastPriceMap[id]||{};return String(info.formattedPrice||info.localizedPrice||info.priceText||info.price||"").trim()}function priceHtml(p){const price=extractGooglePlayPrice(p.id);if(price)return `<div class="price-main"><span>${price}</span></div><div class="unit-price">Google Play fiyatı</div>`;return `<div class="price-main pending"><span>Ödeme ekranında gösterilir</span></div><div class="unit-price">Gerçek fiyatı Google Play belirler.</div>`}'
new_price = 'function formatTokens(v){try{return Number(v||0).toLocaleString("tr-TR")}catch{return String(v||0)}}function setTokenViews(v){const t=formatTokens(v);if(currentTokensEl)currentTokensEl.textContent=t;if(headerTokensEl)headerTokensEl.textContent=t;if(drawerTokensEl)drawerTokensEl.textContent=t}function extractGooglePlayPrice(id){const info=lastPriceMap[id]||{};return String(info.formattedPrice||info.localizedPrice||info.priceText||info.price||"").trim()}function priceHtml(p){const price=extractGooglePlayPrice(p.id);if(price)return `<div class="price-main"><span>${price}</span></div><div class="unit-price">Google Play fiyatı</div>`;return `<div class="price-main pending"><span>Google Play fiyatı yükleniyor…</span></div><div class="unit-price">Fiyat Google Play’den alınıyor.</div>`}'
if old_price not in s:
    raise SystemExit("price fallback target not found")
s = s.replace(old_price, new_price, 1)

old_setter = 'window.italkySetGooglePlayPrices=function(payload){const map=normalizePricePayload(payload);if(Object.keys(map).length){lastPriceMap=map;if(priceStateEl)priceStateEl.textContent="Google Play fiyatları yüklendi";renderProducts()}};'
new_setter = 'window.italkySetGooglePlayPrices=function(payload){const map=normalizePricePayload(payload);if(Object.keys(map).length){lastPriceMap={...lastPriceMap,...map};if(priceStateEl)priceStateEl.textContent="Google Play fiyatları yüklendi";renderProducts()}};'
if old_setter not in s:
    raise SystemExit("price setter target not found")
s = s.replace(old_setter, new_setter, 1)

old_request = 'async function requestNativePrices(){renderProducts();const ids=PRODUCTS.map(p=>p.id);try{const b=window.AndroidBilling;if(!b){if(priceStateEl)priceStateEl.textContent="Fiyatlar Android uygulamada Google Play’den alınır";return}if(typeof b.getProductPrices==="function"){const r=b.getProductPrices(JSON.stringify(ids));if(r)window.italkySetGooglePlayPrices(r);return}if(typeof b.requestProductDetails==="function"){b.requestProductDetails(JSON.stringify(ids));return}if(typeof b.queryProducts==="function"){b.queryProducts(JSON.stringify(ids));return}if(typeof b.getProducts==="function"){b.getProducts(JSON.stringify(ids));return}if(priceStateEl)priceStateEl.textContent="Android fiyat köprüsü bekleniyor"}catch(e){console.warn("[jetonbuy prices]",e);if(priceStateEl)priceStateEl.textContent="Google Play fiyatı ödeme ekranında açılır"}}'
new_request = '''async function requestNativePrices(){
  renderProducts();
  const ids=PRODUCTS.map(p=>p.id),payload=JSON.stringify(ids);
  const ask=()=>{
    try{
      const b=window.AndroidBilling;
      if(!b){if(priceStateEl)priceStateEl.textContent="Google Play fiyat köprüsü bekleniyor";return false}
      if(typeof b.requestProductDetails==="function"){b.requestProductDetails(payload);return true}
      if(typeof b.getProductPrices==="function"){const r=b.getProductPrices(payload);if(r)window.italkySetGooglePlayPrices(r);return true}
      if(typeof b.queryProducts==="function"){const r=b.queryProducts(payload);if(r)window.italkySetGooglePlayPrices(r);return true}
      if(typeof b.getProducts==="function"){const r=b.getProducts(payload);if(r)window.italkySetGooglePlayPrices(r);return true}
      if(priceStateEl)priceStateEl.textContent="Android fiyat köprüsü bekleniyor";
      return false;
    }catch(e){console.warn("[jetonbuy prices]",e);return false}
  };
  ask();
  [700,1600,3000,5000].forEach(ms=>setTimeout(()=>{
    if(Object.keys(lastPriceMap).length>=PRODUCTS.length)return;
    ask();
  },ms));
}'''
if old_request not in s:
    raise SystemExit("native price request target not found")
s = s.replace(old_request, new_request, 1)

path.write_text(s, encoding="utf-8")
print("Jeton Market live Google Play price patch applied")
