import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Gem, Calculator, Scale, TrendingUp, TrendingDown, Minus, ExternalLink, ImageOff, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import styles from './GoldItemsPage.module.css'

// ─── Types ────────────────────────────────────────────────────
interface KaratPrice { karat: number; pricePerGram: number; change: number | null }
interface GoldDeal { description: string; price: number; real_price: number; delta: number; karats: string; weight: number; url: string | null; image_url?: string | null }
type SortKey = keyof GoldDeal
type SortDir = 'asc' | 'desc'

const KARATS = [10, 14, 18, 21, 22, 24]
const fmt = (n: number) => n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Fetch live gold spot + USD/ILS rate ─────────────────────
async function fetchLivePrices(): Promise<{ priceILS: number; change: number | null }> {
  // Gold spot in USD/troy-oz from metals.live (free, no key)
  const [metalsRes, boiRes] = await Promise.all([
    fetch('https://api.metals.live/v1/spot/gold').then(r => r.json()),
    fetch('https://boi.org.il/PublicApi/GetExchangeRates').then(r => r.json()),
  ])

  const spotUSD: number = metalsRes[0]?.price ?? metalsRes?.price ?? metalsRes
  const usdRate = boiRes.exchangeRates?.find((r: { key: string }) => r.key === 'USD')
  const ilsPerUSD: number = usdRate?.currentExchangeRate ?? 3.72

  // troy oz → gram
  const pricePerGram24KILS = (spotUSD / 31.1035) * ilsPerUSD

  const changeUSD: number | null = usdRate?.currentChange ?? null
  const changePct = changeUSD !== null ? (changeUSD / ilsPerUSD) * 100 : null

  return { priceILS: pricePerGram24KILS, change: changePct }
}

// ─── Gold Price Panel ─────────────────────────────────────────
function GoldPricePanel() {
  const [prices, setPrices] = useState<KaratPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [calcWeight, setCalcWeight] = useState('')
  const [calcKarat, setCalcKarat] = useState(18)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { priceILS, change } = await fetchLivePrices()
      setPrices(KARATS.map(k => ({
        karat: k,
        pricePerGram: (priceILS * k) / 24,
        change: change !== null ? (change * k) / 24 : null,
      })))
      setLastUpdated(new Date())
    } catch {
      setError(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const selected = prices.find(p => p.karat === calcKarat)
  const calcResult = selected && calcWeight !== '' && !isNaN(+calcWeight)
    ? fmt(+calcWeight * selected.pricePerGram)
    : ''

  return (
    <div className="card card-accent" style={{ '--accent': 'var(--sun)', '--accent-soft': 'var(--sun-soft)' } as React.CSSProperties}>
      <div className="card-head">
        <span className="card-tag"><span style={{ fontSize: 16 }}>🥇</span></span>
        <span className="card-title">Gold Price</span>
        <span className="card-subtitle">₪ per gram · live</span>
        <div className="card-tools">
          {lastUpdated && <span className={styles.refreshedAt}>{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          <button className="tool" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw size={13} className={loading ? styles.spin : ''} />
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>Could not load live prices — check your connection.</div>}

      {!error && !loading && prices.length > 0 && (
        <div className={styles.strip}>
          {prices.map(p => {
            const isUp = (p.change ?? 0) > 0
            const isDown = (p.change ?? 0) < 0
            return (
              <div key={p.karat} className={styles.tile}>
                <span className={styles.karat}>{p.karat}K</span>
                <span className={styles.price}>₪{fmt(p.pricePerGram)}</span>
                <span className={`${styles.change} ${isUp ? styles.up : isDown ? styles.down : styles.flat}`}>
                  {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : <Minus size={11} />}
                  {p.change !== null ? Math.abs(p.change).toFixed(2) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {!error && prices.length > 0 && (
        <div className={styles.calcBox}>
          <div className={styles.calcLabel}><Calculator size={12} /> Value calculator</div>
          <div className={styles.calcRow}>
            <div className={styles.calcField}>
              <span className={styles.calcFieldLabel}>Weight</span>
              <div className={styles.calcInputWrap}>
                <Scale size={13} className={styles.calcInputIcon} />
                <input className={styles.calcInput} type="number" min="0" placeholder="0"
                  value={calcWeight} onChange={e => setCalcWeight(e.target.value)} dir="ltr" />
                <span className={styles.calcInputUnit}>g</span>
              </div>
            </div>
            <div className={styles.calcField}>
              <span className={styles.calcFieldLabel}>Purity</span>
              <select className={styles.calcSelect} value={calcKarat} onChange={e => setCalcKarat(+e.target.value)}>
                {prices.map(p => <option key={p.karat} value={p.karat}>{p.karat}K</option>)}
              </select>
            </div>
            <span className={styles.calcEquals}>=</span>
            <div className={styles.calcResult}>
              <span className={styles.calcResultNum}><span className={styles.calcResultCcy}>₪</span>{calcResult || '—'}</span>
              {selected && <span className={styles.calcHint}>at ₪{fmt(selected.pricePerGram)}/g · {selected.karat}K</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Gold Deals (Supabase — graceful if empty/unavailable) ────
function GoldDeals({ prices }: { prices: KaratPrice[] }) {
  const [items, setItems] = useState<GoldDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('delta')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [query, setQuery] = useState('')
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
      if (!url || !key) { setLoading(false); return }

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(url, key)
      const { data } = await supabase.rpc('get_gold_deals').limit(1000)
      if (data) setItems(data as GoldDeal[])
    } catch { /* show empty */ }
    setLoading(false)
  }, [])

  useEffect(() => { if (prices.length > 0) load() }, [load, prices])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = query.trim()
    ? items.filter(i => i.description?.toLowerCase().includes(query.toLowerCase()) || i.karats?.toLowerCase().includes(query.toLowerCase()))
    : items

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    if (av == null) return 1; if (bv == null) return -1
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={11} className={styles.sortInactive} />
    return sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
  }

  return (
    <div className="card card-accent" style={{ '--accent': 'var(--sun)', '--accent-soft': 'var(--sun-soft)' } as React.CSSProperties}>
      <div className="card-head">
        <span className="card-tag"><Gem size={16} /></span>
        <span className="card-title">Gold Deals</span>
        <span className="card-subtitle">listed below gold value</span>
        <div className="card-tools">
          <button className="tool" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw size={13} className={loading ? styles.spin : ''} />
          </button>
        </div>
      </div>

      {!loading && items.length === 0 && (
        <div className={styles.emptyRow}>No deals found — scraper not connected yet.</div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className={styles.toolbar}>
            <div className={styles.search}>
              <Search size={13} color="var(--ink-4)" />
              <input placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div className={styles.sortBar}>
              {(['delta','price','real_price','weight','karats'] as SortKey[]).map(k => (
                <button key={k} className={`${styles.sortChip} ${sortKey === k ? styles.sortChipActive : ''}`} onClick={() => handleSort(k)}>
                  {k === 'delta' ? 'Profit' : k === 'price' ? 'Listed' : k === 'real_price' ? 'Gold Value' : k === 'weight' ? 'Weight' : 'Karats'}
                  <SortIcon col={k} />
                </button>
              ))}
            </div>
          </div>

          <div className={styles.grid}>
            {sorted.map((item, i) => {
              const showImg = item.image_url && !brokenImages.has(item.image_url)
              return (
                <div key={i} className={styles.itemCard}>
                  <div className={styles.imgWrap}>
                    {showImg
                      ? <img src={item.image_url!} alt={item.description ?? ''} className={styles.img} loading="lazy"
                          onError={() => setBrokenImages(p => new Set(p).add(item.image_url!))} />
                      : <div className={styles.imgFallback}><ImageOff size={24} /></div>}
                    {item.karats && <span className={styles.karatsBadge}>{item.karats}</span>}
                  </div>
                  <div className={styles.itemBody}>
                    <p className={styles.itemDesc}>{item.description}</p>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemWeight}>{item.weight}g</span>
                      <span className={styles.itemPrice}>₪{fmt(item.price)}</span>
                    </div>
                    <div className={styles.itemFoot}>
                      <span className={styles.itemGoldValue}>Gold value ₪{fmt(item.real_price)}</span>
                      <span className={styles.profit}>+₪{fmt(item.delta)}</span>
                    </div>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                        <ExternalLink size={12} /> View listing
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className={styles.footer}>{sorted.length} deals</div>
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────
export default function GoldItemsPage() {
  const [prices] = useState<KaratPrice[]>([])

  return (
    <div className={styles.content}>
      <GoldPricePanel />
      <GoldDeals prices={prices} />
    </div>
  )
}
