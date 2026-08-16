'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Search, Loader2, X, Check } from 'lucide-react'
import { PixabayImage, PixabaySearchResponse, mergeSearchResults, hasMoreResults } from '@/lib/pixabay'
import { composeBandedBackground } from '@/lib/backgroundCompose'
import { getBackgroundImageCss, getBackgroundSize } from '@/lib/backgroundPresets'
import { renderItemsStatic } from '@/components/NameplatePreview/NameplateCanvas'
import { MM_TO_PX } from '@/lib/sizeConstants'
import { NameplateSize, TextFieldConfig } from '@/types/nameplate'

export type BackgroundApplyMode = 'cover' | 'band'

type Props = {
  initialMode: BackgroundApplyMode
  size: NameplateSize
  fields: TextFieldConfig[]
  previewData: Record<string, string>
  onApply: (image: string) => void
  onClose: () => void
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

export function PixabaySearchModal({ initialMode, size, fields, previewData, onApply, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PixabayImage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [searched, setSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<BackgroundApplyMode>(initialMode)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false)

  // Esc로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const search = async (nextPage: number) => {
    const q = query.trim()
    if (!q) return
    setIsSearching(true)
    try {
      const res = await fetch(`/api/pixabay/search?q=${encodeURIComponent(q)}&page=${nextPage}`)
      const data = (await res.json()) as PixabaySearchResponse | { error: string }
      if (!res.ok || 'error' in data) {
        // 마지막 페이지 이후 요청은 API가 거부하므로 추가 페이지 실패는 종료로 처리
        if (nextPage > 1) {
          setHasMore(false)
          toast.info('더 불러올 결과가 없습니다.')
        } else {
          toast.error('error' in data ? data.error : '검색에 실패했습니다.')
        }
        return
      }
      const merged = mergeSearchResults(results, data.hits, nextPage)
      setResults(merged)
      setHasMore(hasMoreResults(merged.length, data.total, data.hits.length))
      setPage(nextPage)
      setSearched(true)
      // 새로 붙은 결과가 내부 스크롤 아래에 숨지 않도록 그리드를 끝까지 스크롤
      if (nextPage > 1) {
        requestAnimationFrame(() => {
          gridRef.current?.scrollTo({ top: gridRef.current.scrollHeight, behavior: 'smooth' })
        })
      }
    } catch {
      toast.error('검색 중 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  const select = async (img: PixabayImage) => {
    setSelectedId(img.id)
    setIsLoadingPhoto(true)
    setPhotoDataUrl(null)
    try {
      const res = await fetch(`/api/pixabay/image?url=${encodeURIComponent(img.webformatURL)}`)
      if (!res.ok) throw new Error('image fetch failed')
      setPhotoDataUrl(await blobToDataUrl(await res.blob()))
    } catch {
      toast.error('이미지를 불러오지 못했습니다.')
      setSelectedId(null)
    } finally {
      setIsLoadingPhoto(false)
    }
  }

  // 옵션이 바뀌면 캐시된 원본 사진으로 즉시 재합성 (재다운로드 없음)
  const previewBg = useMemo(() => {
    if (!photoDataUrl) return null
    return mode === 'band' ? composeBandedBackground(photoDataUrl, size.heightMm, fields) : photoDataUrl
  }, [photoDataUrl, mode, size.heightMm, fields])

  // 명패 실제 비율의 소형 미리보기 (텍스트 항목 포함)
  const PREVIEW_W = 340
  const widthPx = size.widthMm * MM_TO_PX
  const heightPx = size.heightMm * MM_TO_PX
  const pScale = PREVIEW_W / widthPx
  const previewH = Math.round(heightPx * pScale)

  const apply = () => {
    if (!previewBg) return
    onApply(previewBg)
    toast.success(mode === 'band' ? '상·하단 띠 배경으로 적용했습니다.' : '배경으로 적용했습니다.')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#475569] text-white shrink-0">
          <span className="text-sm font-semibold">픽사베이 배경 검색</span>
          <button
            onClick={onClose}
            title="닫기 (Esc)"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {/* 검색 입력 */}
          <div className="flex gap-1.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search(1) }}
              placeholder="예: 벚꽃, 나무 질감, 골드"
              autoFocus
              className="h-8 flex-1 min-w-0 text-sm rounded border border-input px-2"
            />
            <button
              onClick={() => search(1)}
              disabled={isSearching || !query.trim()}
              className="h-8 px-3 rounded bg-[#475569] text-white text-xs flex items-center gap-1 disabled:opacity-40 hover:bg-[#3b4a5c] transition-colors shrink-0"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              검색
            </button>
          </div>

          {searched && results.length === 0 && (
            <p className="text-xs text-gray-400">검색 결과가 없습니다. 다른 검색어를 시도해 보세요.</p>
          )}

          {/* 검색 결과 */}
          {results.length > 0 && (
            <div className="space-y-2">
              <div ref={gridRef} className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                {results.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => select(img)}
                    title={`${img.tags} · 사진: ${img.user}`}
                    className={`relative rounded border overflow-hidden h-14 transition-colors ${
                      selectedId === img.id
                        ? 'border-[#475569] ring-2 ring-[#475569]'
                        : 'border-gray-200 hover:border-[#475569]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.previewURL} alt={img.tags} className="w-full h-full object-cover" />
                    {selectedId === img.id && !isLoadingPhoto && (
                      <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#475569] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    )}
                    {selectedId === img.id && isLoadingPhoto && (
                      <span className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-[#475569]" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {hasMore && (
                <button
                  onClick={() => search(page + 1)}
                  disabled={isSearching}
                  className="w-full h-7 rounded border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  {isSearching ? '불러오는 중…' : '결과 더 보기'}
                </button>
              )}
            </div>
          )}

          {/* 적용 방식 + 미리보기 */}
          {selectedId !== null && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex text-xs border border-gray-200 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMode('cover')}
                  className={`flex-1 py-1.5 transition-colors ${mode === 'cover' ? 'bg-[#475569] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  전체 채우기
                </button>
                <button
                  type="button"
                  onClick={() => setMode('band')}
                  title="사진을 상·하단 띠에만 배치해 글씨와 겹치지 않습니다"
                  className={`flex-1 py-1.5 border-l border-gray-200 transition-colors ${mode === 'band' ? 'bg-[#475569] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  상·하단 띠 (글씨 간섭 없음)
                </button>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div
                  className="rounded border border-gray-300 shadow-sm"
                  style={{
                    width: PREVIEW_W,
                    height: previewH,
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    backgroundImage: getBackgroundImageCss(previewBg) ?? undefined,
                    backgroundSize: previewBg ? getBackgroundSize(previewBg) : undefined,
                    backgroundPosition: 'center',
                  }}
                >
                  {isLoadingPhoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                      <Loader2 className="w-5 h-5 animate-spin text-[#475569]" />
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transform: `scale(${pScale})`,
                      transformOrigin: 'top left',
                      width: widthPx,
                      height: heightPx,
                    }}
                  >
                    {renderItemsStatic([], fields, [], previewData)}
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">
                  실제 명패 비율({size.widthMm}×{size.heightMm}mm) 미리보기 · 옵션을 바꾸면 즉시 반영됩니다
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={apply}
                  disabled={!previewBg || isLoadingPhoto}
                  className="flex-1 h-8 rounded bg-[#475569] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#3b4a5c] transition-colors"
                >
                  배경으로 적용
                </button>
                <button
                  onClick={onClose}
                  className="h-8 px-4 rounded border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <p className="text-[10px] text-gray-400">사진 출처: Pixabay (무료 라이선스)</p>
          )}
        </div>
      </div>
    </div>
  )
}
