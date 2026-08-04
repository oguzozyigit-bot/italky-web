const MAX_BYTES = 2_500_000;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function decodeHtml(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function stripTags(value = '') {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  );
}

function meta(html, key, attr = 'property') {
  const safe = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${safe}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${safe}["'][^>]*>`, 'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtml(match[1]);
  }
  return '';
}

function jsonLdNodes(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const values = [];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      if (Array.isArray(parsed)) values.push(...parsed);
      else if (parsed && parsed['@graph']) values.push(...parsed['@graph']);
      else values.push(parsed);
    } catch (_) {}
  }
  return values;
}

function findProduct(nodes) {
  return nodes.find((node) => {
    const type = node && node['@type'];
    return type === 'Product' || (Array.isArray(type) && type.includes('Product'));
  }) || null;
}

function titleFromSlug(inputUrl) {
  try {
    const url = new URL(inputUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    const productSlug = parts.find((part) => /-p-\d+/i.test(part)) || parts[parts.length - 1] || '';
    const raw = productSlug.replace(/-p-\d+.*$/i, '');
    return decodeURIComponent(raw)
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (m) => m.toLocaleUpperCase('tr-TR'));
  } catch (_) {
    return '';
  }
}

function inferFromUrl(inputUrl) {
  const url = new URL(inputUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  const brand = parts[0] ? decodeURIComponent(parts[0]).replace(/-/g, ' ') : '';
  const title = titleFromSlug(inputUrl);
  const modelMatch = title.match(/\b[A-ZÇĞİÖŞÜ]{2,}\s*-?\s*\d{2,}[A-Z0-9-]*\b/i);
  const productIdMatch = url.pathname.match(/-p-(\d+)/i);
  return {
    title,
    brand: brand ? brand.replace(/\b\w/g, (m) => m.toLocaleUpperCase('tr-TR')) : '',
    model: modelMatch ? modelMatch[0].replace(/\s+/g, '').toUpperCase() : '',
    productId: productIdMatch ? productIdMatch[1] : '',
    merchantId: url.searchParams.get('merchantId') || ''
  };
}

function partialResult(url, sourceStatus, reason) {
  const inferred = inferFromUrl(url.toString());
  return {
    type: 'product',
    url: url.toString(),
    hostname: url.hostname.replace(/^www\./, ''),
    siteName: url.hostname.includes('trendyol') ? 'Trendyol' : url.hostname,
    title: inferred.title || 'Ürün bağlantısı',
    description: '',
    image: '',
    brand: inferred.brand,
    model: inferred.model,
    seller: inferred.merchantId ? `Satıcı No: ${inferred.merchantId}` : '',
    price: '',
    currency: 'TL',
    availability: '',
    rating: '',
    reviewCount: '',
    productId: inferred.productId,
    accessLimited: true,
    sourceStatus,
    analysisSummary: `Kaynak site otomatik erişimi kısıtladı${sourceStatus ? ` (${sourceStatus})` : ''}. Ürün adı, marka, model ve bağlantı kimlikleri URL üzerinden çıkarıldı; fiyat, puan ve yorumlar doğrulanamadı.`,
    warning: reason || 'Kaynak site otomatik erişimi engelliyor. Eksik alanlar tahmin edilmedi.',
    analyzedAt: new Date().toISOString()
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Yalnızca POST isteği destekleniyor.' });
  }

  let url;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    url = new URL(body.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
  } catch (_) {
    return send(res, 400, { error: 'Geçerli bir http veya https bağlantısı gönderin.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);

  try {
    const response = await fetch(url.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'accept-language': 'tr-TR,tr;q=0.9,en;q=0.7',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'cache-control': 'no-cache',
        pragma: 'no-cache'
      }
    });

    if (!response.ok) {
      if ([401, 403, 429].includes(response.status)) {
        return send(res, 200, partialResult(url, response.status));
      }
      return send(res, 502, { error: `Kaynak site ${response.status} yanıtı verdi.` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return send(res, 415, { error: 'Bu ilk sürüm yalnızca web sayfası bağlantılarını analiz ediyor.' });
    }

    const reader = response.body.getReader();
    let received = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > MAX_BYTES) break;
      chunks.push(value);
    }

    const html = new TextDecoder('utf-8').decode(Buffer.concat(chunks.map((value) => Buffer.from(value))));
    const product = findProduct(jsonLdNodes(html));
    const offers = product && (Array.isArray(product.offers) ? product.offers[0] : product.offers);
    const aggregate = product && product.aggregateRating;
    const brandObj = product && product.brand;
    const inferred = inferFromUrl(response.url || url.toString());

    const titleTag = decodeHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].replace(/\s+/g, ' '));
    const title = (product && product.name) || meta(html, 'og:title') || titleTag || inferred.title;
    const description = stripTags((product && product.description) || meta(html, 'og:description') || meta(html, 'description', 'name'));
    const imageRaw = (product && product.image) || meta(html, 'og:image');
    const image = Array.isArray(imageRaw) ? imageRaw[0] : (typeof imageRaw === 'object' && imageRaw ? imageRaw.url : imageRaw);
    const brand = typeof brandObj === 'string' ? brandObj : (brandObj && brandObj.name) || inferred.brand;
    const sellerObj = offers && offers.seller;
    const seller = typeof sellerObj === 'string' ? sellerObj : (sellerObj && sellerObj.name) || (inferred.merchantId ? `Satıcı No: ${inferred.merchantId}` : '');
    const price = String((offers && (offers.price || offers.lowPrice)) || meta(html, 'product:price:amount') || '').trim();
    const currency = (offers && offers.priceCurrency) || meta(html, 'product:price:currency') || 'TL';
    const availabilityRaw = offers && offers.availability;
    const availability = availabilityRaw ? String(availabilityRaw).split('/').pop().replace(/([a-z])([A-Z])/g, '$1 $2') : '';
    const rating = aggregate && aggregate.ratingValue ? String(aggregate.ratingValue) : '';
    const reviewCount = aggregate && (aggregate.reviewCount || aggregate.ratingCount) ? String(aggregate.reviewCount || aggregate.ratingCount) : '';
    const model = (product && (product.model || product.sku || product.mpn)) || inferred.model;
    const type = product || price || /trendyol|hepsiburada|n11|amazon|pazarama|pttavm/i.test(url.hostname) ? 'product' : 'page';
    const found = [title, description, image, price, seller, brand, rating].filter(Boolean).length;

    return send(res, 200, {
      type,
      url: response.url || url.toString(),
      hostname: new URL(response.url || url.toString()).hostname.replace(/^www\./, ''),
      siteName: meta(html, 'og:site_name'),
      title,
      description: description.slice(0, 1800),
      image,
      brand,
      model,
      seller,
      price,
      currency,
      availability,
      rating,
      reviewCount,
      productId: inferred.productId,
      accessLimited: false,
      analysisSummary: type === 'product'
        ? `${found} temel veri alanı sayfadan çıkarıldı. ${price ? 'Fiyat bilgisi mevcut.' : 'Fiyat bilgisi çıkarılamadı.'}`
        : 'Bağlantının erişilebilir temel bilgileri çıkarıldı.',
      analyzedAt: new Date().toISOString()
    });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return send(res, 200, partialResult(url, 408, 'Kaynak site zamanında yanıt vermedi.'));
    }
    return send(res, 200, partialResult(url, 0, 'Bağlantı tam olarak okunamadı; güvenli kısmi analiz gösteriliyor.'));
  } finally {
    clearTimeout(timeout);
  }
};