// Supabase Edge Function "market": proxy de datos de mercado (Yahoo Finance).
// Es la única copia del código: la app la usa en producción (GitHub Pages) y el
// servidor de desarrollo de Vite la carga en local para servir /api/market.
//
// GET ?symbol=AAPL&range=1d&interval=5m   -> gráfica + cotización
// GET ?symbols=AAPL,MSFT,SAN.MC           -> cotizaciones en lote (hasta 100)
// GET ?q=apple                             -> búsqueda de símbolos
// GET ?screener=most_actives&count=50      -> listas reales (ver SCREENERS)
//
// Publicar: npx supabase functions deploy market --project-ref vvxfewktdsltzsxfumio --no-verify-jwt
const YAHOO = 'https://query1.finance.yahoo.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const SYMBOL_RE = /^[A-Za-z0-9.\-^=]{1,20}$/;
const RANGES = new Set(['1d', '2d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']);
const INTERVALS = new Set(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo']);
const SCREENERS = new Set([
  'most_actives', 'day_gainers', 'day_losers',
  'most_actives_europe', 'day_gainers_europe', 'day_losers_europe',
  'most_actives_asia', 'day_gainers_asia', 'day_losers_asia',
  'most_actives_ca', 'day_gainers_au',
  'all_cryptocurrencies_us', 'top_etfs_us',
  'growth_technology_stocks', 'undervalued_growth_stocks', 'small_cap_gainers', 'most_shorted_stocks',
]);
const SPARK_CHUNK = 20;
const MAX_BATCH = 100;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200, cacheSeconds = 0): Response {
  const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' };
  if (cacheSeconds > 0 && status === 200) {
    headers['Cache-Control'] = `public, max-age=${Math.min(cacheSeconds, 15)}, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`;
  } else {
    headers['Cache-Control'] = 'no-store';
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function yahoo(path: string): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${YAHOO}${path}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Método no permitido' }, 405);

  try {
    const url = new URL(req.url);

    // 1. Búsqueda
    const q = url.searchParams.get('q');
    if (q !== null) {
      const query = q.trim().slice(0, 50);
      if (!query) return json({ quotes: [] });
      const r = await yahoo(`/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0`);
      if (!r.ok) return json({ error: `Yahoo HTTP ${r.status}` }, 502);
      return json({ quotes: r.data?.quotes ?? [] }, 200, 300);
    }

    // 2. Listas reales de Yahoo (más negociadas, suben, bajan, cripto, ETFs...)
    const screener = url.searchParams.get('screener');
    if (screener !== null) {
      if (!SCREENERS.has(screener)) return json({ error: 'Lista no válida' }, 400);
      const count = Math.min(100, Math.max(1, parseInt(url.searchParams.get('count') || '50', 10) || 50));
      const start = Math.min(5000, Math.max(0, parseInt(url.searchParams.get('start') || '0', 10) || 0));
      const r = await yahoo(`/v1/finance/screener/predefined/saved?scrIds=${screener}&count=${count}&start=${start}`);
      const result = r.data?.finance?.result?.[0];
      if (!r.ok || !result) return json({ error: `Yahoo HTTP ${r.status}` }, 502);
      return json({ total: result.total ?? 0, start, quotes: result.quotes ?? [] }, 200, 60);
    }

    // 3. Cotizaciones en lote
    const symbolsParam = url.searchParams.get('symbols');
    if (symbolsParam !== null) {
      const symbols = Array.from(
        new Set(symbolsParam.split(',').map((s) => s.trim()).filter((s) => SYMBOL_RE.test(s)))
      ).slice(0, MAX_BATCH);
      if (symbols.length === 0) return json({ spark: { result: [] } });

      const chunks: string[][] = [];
      for (let i = 0; i < symbols.length; i += SPARK_CHUNK) chunks.push(symbols.slice(i, i + SPARK_CHUNK));

      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const r = await yahoo(`/v7/finance/spark?symbols=${encodeURIComponent(chunk.join(','))}&range=1d&interval=1d`);
          return r.ok ? r.data?.spark?.result ?? [] : [];
        })
      );
      return json({ spark: { result: results.flat() } }, 200, 15);
    }

    // 4. Gráfica + cotización de un símbolo
    const symbol = url.searchParams.get('symbol') || '';
    const range = url.searchParams.get('range') || '1d';
    const interval = url.searchParams.get('interval') || '5m';
    if (!SYMBOL_RE.test(symbol)) return json({ error: 'Símbolo no válido' }, 400);
    if (!RANGES.has(range) || !INTERVALS.has(interval)) return json({ error: 'Rango o intervalo no válido' }, 400);

    const r = await yahoo(`/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`);
    if (!r.ok) return json({ error: `Yahoo HTTP ${r.status}` }, r.status === 404 ? 404 : 502);
    const intraday = range === '1d' || range === '2d';
    return json(r.data, 200, intraday ? 15 : 300);
  } catch (err: any) {
    return json({ error: err?.message || 'Error interno' }, 500);
  }
}

// En Supabase (Deno) se arranca el servidor; en Node (Vite) sólo se exporta el handler.
const deno = (globalThis as any).Deno;
if (deno?.serve) deno.serve(handler);
