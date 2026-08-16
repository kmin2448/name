'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Search, Loader2 } from 'lucide-react'
import { PixabayImage, PixabaySearchResponse } from '@/lib/pixabay'
import { composeBandedBackground } from '@/lib/backgroundCompose'

export type BackgroundApplyMode = 'cover' | 'band'

type Props = {
  applyMode: BackgroundApplyMode
  onApply: (image: string) => void
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('unexpected reader result'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function PixabaySearch({ applyMode, onApply }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PixabayImage[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searched, setSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [applyingId, setApplyingId] = useState<number | null>(null)

  const search = async (nextPage: number) => {
    const q = query.trim()
    if (!q) return
    setIsSearching(true)
    try {
      const res = await fetch(`/api/pixabay/search?q=${encodeURIComponent(q)}&page=${nextPage}`)
      const data = (await res.json()) as PixabaySearchResponse | { error: string }
      if (!res.ok || 'error' in data) {
        toast.error('error' in data ? data.error : '검색에 실패했습니다.')
        return
      }
      setResults((prev) => (nextPage === 1 ? data.hits : [...prev, ...data.hits]))
      setTotal(data.total)
      setPage(nextPage)
      setSearched(true)
    } catch {
      toast.error('검색 중 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  const apply = async (img: PixabayImage) => {
    setApplyingId(img.id)
    try {
      const res = await fetch(`/api/pixabay/image?url=${encodeURIComponent(img.webformatURL)}`)
      if (!res.ok) throw new Error('image fetch failed')
      const dataUrl = await blobToDataUrl(await res.blob())
      onApply(applyMode === 'band' ? composeBandedBackground(dataUrl) : dataUrl)
      toast.success(applyMode === 'band' ? '상·하단 띠 배경으로 적용했습니다.' : '배경으로 적용했습니다.')
    } catch {
      toast.error('이미지를 불러오지 못했습니다.')
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-gray-600">픽사베이에서 검색</Label>
      <div className="flex gap-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') search(1) }}
          placeholder="예: 벚꽃, 나무 질감, 골드"
          className="h-7 flex-1 min-w-0 text-xs rounded border border-input px-2"
        />
        <button
          onClick={() => search(1)}
          disabled={isSearching || !query.trim()}
          className="h-7 px-2.5 rounded bg-[#475569] text-white text-xs flex items-center gap-1 disabled:opacity-40 hover:bg-[#3b4a5c] transition-colors shrink-0"
        >
          {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          검색
        </button>
      </div>

      {searched && results.length === 0 && (
        <p className="text-[11px] text-gray-400">검색 결과가 없습니다. 다른 검색어를 시도해 보세요.</p>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {results.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => apply(img)}
                disabled={applyingId !== null}
                title={`${img.tags} · 사진: ${img.user}`}
                className="relative rounded border border-gray-200 overflow-hidden h-14 hover:border-[#475569] transition-colors disabled:opacity-60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.previewURL} alt={img.tags} className="w-full h-full object-cover" />
                {applyingId === img.id && (
                  <span className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-[#475569]" />
                  </span>
                )}
              </button>
            ))}
          </div>
          {results.length < total && (
            <button
              onClick={() => search(page + 1)}
              disabled={isSearching}
              className="w-full h-7 rounded border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              {isSearching ? '불러오는 중…' : '결과 더 보기'}
            </button>
          )}
          <p className="text-[10px] text-gray-400">
            사진 출처: Pixabay (무료 라이선스) · 클릭하면 바로 적용됩니다
          </p>
        </>
      )}
    </div>
  )
}
