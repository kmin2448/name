'use client'
import { useCallback, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { Download, FileImage, Trash2, Upload, Wand2 } from 'lucide-react'
import { AppMenu } from '@/components/AppMenu'
import { VisitCounter } from '@/components/VisitCounter'
import {
  ACCEPT_ATTR,
  MAX_FILE_BYTES,
  TRACE_LEVELS,
  TraceLevel,
  formatBytes,
  maxDimension,
  scaledSize,
  svgFileName,
  traceOptions,
  validateFile,
} from '@/lib/vectorize'

/** 변환이 끝난 결과 한 건 */
type Result = {
  name: string
  svg: string
  /** 미리보기용 data URL */
  previewUrl: string
  originalBytes: number
  svgBytes: number
  /** 해상도 한도 때문에 줄여서 변환했는지 */
  scaled: boolean
}

/** 진행바가 실제로 그려지도록 다음 프레임까지 양보한다 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

/** 파일 한 장을 화소 데이터로 읽어들인다 (트레이싱 정도에 따라 크기를 줄인다) */
async function readImageData(
  file: File,
  level: TraceLevel
): Promise<{ imageData: ImageData; scaled: boolean }> {
  const bitmap = await createImageBitmap(file)
  try {
    const { width, height, scaled } = scaledSize(
      bitmap.width,
      bitmap.height,
      maxDimension(level)
    )

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('캔버스를 만들 수 없습니다.')

    ctx.drawImage(bitmap, 0, 0, width, height)
    return { imageData: ctx.getImageData(0, 0, width, height), scaled }
  } finally {
    bitmap.close()
  }
}

export default function VectorizePage() {
  const [files, setFiles] = useState<File[]>([])
  const [level, setLevel] = useState<TraceLevel>('medium')
  const [results, setResults] = useState<Result[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' })
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const accepted: File[] = []
    for (const file of Array.from(incoming)) {
      const problem = validateFile(file)
      if (problem) toast.error(problem)
      else accepted.push(file)
    }
    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted])
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index))

  const reset = () => {
    setFiles([])
    setResults([])
    setProgress({ done: 0, total: 0, label: '' })
  }

  const convert = async () => {
    if (files.length === 0) return

    setBusy(true)
    setResults([])
    setProgress({ done: 0, total: files.length, label: '준비 중...' })

    // 1200줄짜리 라이브러리라 이 화면에 들어올 때까지 내려받지 않는다
    const { default: ImageTracer } = await import('imagetracerjs')
    const options = traceOptions(level)
    const converted: Result[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProgress({ done: i, total: files.length, label: `${file.name} 읽는 중...` })
        await nextFrame()

        try {
          const { imageData, scaled } = await readImageData(file, level)

          setProgress({ done: i, total: files.length, label: `${file.name} 변환 중...` })
          // 트레이싱은 화면을 멈추므로, 진행 문구가 먼저 그려지도록 한 프레임 양보한다
          await nextFrame()

          const svg = ImageTracer.imagedataToSVG(imageData, options)
          converted.push({
            name: svgFileName(file.name),
            svg,
            previewUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
            originalBytes: file.size,
            svgBytes: new Blob([svg]).size,
            scaled,
          })
        } catch {
          toast.error(`${file.name}: 변환하지 못했습니다. 다른 파일로 시도해 주세요.`)
        }

        setProgress({ done: i + 1, total: files.length, label: `${file.name} 완료` })
        await nextFrame()
      }

      setResults(converted)
      if (converted.length > 0) toast.success(`${converted.length}개 파일을 변환했습니다.`)
    } finally {
      setBusy(false)
      setProgress({ done: 0, total: 0, label: '' })
    }
  }

  const download = (result: Result) => {
    const blob = new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.name
    a.click()
    URL.revokeObjectURL(url)
  }

  const percent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <>
      <Toaster position="top-right" richColors />
      <VisitCounter />
      <div className="min-h-screen flex flex-col bg-gray-100">
        <header className="bg-[#475569] text-white shrink-0 flex items-center gap-1.5 px-4 py-2">
          <AppMenu current="vectorize" />
          <span className="text-[11px] text-white/60 hidden sm:inline">
            JPG·PNG를 벡터 SVG로 변환합니다
          </span>
          <div className="ml-auto shrink-0 text-xs opacity-60">© min2448</div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {/* 안내 */}
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-4 h-4 text-[#475569] shrink-0" />
                <h2 className="text-sm font-bold text-gray-800">이미지 → SVG 변환</h2>
              </div>
              <ul className="text-[13px] text-gray-500 leading-relaxed space-y-1.5">
                <li className="flex gap-1.5">
                  <span className="text-[#475569] shrink-0">•</span>
                  <span>
                    JPG·PNG 그림의 색 경계를 따라 <b className="font-medium text-gray-600">벡터
                    도형(SVG)</b>으로 다시 그립니다. 확대해도 깨지지 않습니다.
                  </span>
                </li>
                <li className="flex gap-1.5">
                  <span className="text-[#475569] shrink-0">•</span>
                  <span>
                    <b className="font-medium text-gray-600">로고·교표·도장·라인아트</b>처럼 색
                    경계가 뚜렷한 그림에 잘 맞습니다.
                  </span>
                </li>
                <li className="flex gap-1.5">
                  <span className="text-[#475569] shrink-0">•</span>
                  <span>
                    반대로 <b className="font-medium text-gray-600">일반 사진</b>은 색이 잘게 나뉘어
                    파일만 커지고 원본보다 못한 결과가 나옵니다. 권하지 않습니다.
                  </span>
                </li>
                <li className="flex gap-1.5">
                  <span className="text-[#475569] shrink-0">•</span>
                  <span>
                    변환은 전부 <b className="font-medium text-gray-600">브라우저 안에서</b>
                    이루어집니다. 파일이 서버로 올라가거나 어딘가에 저장되지 않습니다.
                  </span>
                </li>
              </ul>
            </section>

            {/* 업로드 */}
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-2">1. 파일 선택</h3>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg py-8 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                  dragging
                    ? 'border-[#475569] bg-slate-50'
                    : 'border-gray-300 hover:border-[#475569] hover:bg-gray-50'
                }`}
              >
                <Upload className="w-5 h-5 text-[#475569]" />
                <p className="text-xs text-gray-600">
                  여기로 파일을 끌어다 놓거나 눌러서 선택하세요
                </p>
                <p className="text-[11px] text-gray-400">
                  JPG · PNG · 한 장당 최대 {formatBytes(MAX_FILE_BYTES)} · 여러 장 가능
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_ATTR}
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files)
                  e.target.value = ''
                }}
              />

              {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {files.map((file, i) => (
                    <li
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-2 text-xs border border-gray-200 rounded px-2.5 py-1.5"
                    >
                      <FileImage className="w-3.5 h-3.5 text-[#475569] shrink-0" />
                      <span className="truncate text-gray-700" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-gray-400 shrink-0 ml-auto">
                        {formatBytes(file.size)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(i)
                        }}
                        disabled={busy}
                        className="shrink-0 p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="목록에서 빼기"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 트레이싱 정도 */}
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-2">2. 트레이싱 정도</h3>
              <div className="flex text-xs border border-gray-200 rounded overflow-hidden">
                {TRACE_LEVELS.map((option, i) => (
                  <button
                    key={option.value}
                    onClick={() => setLevel(option.value)}
                    disabled={busy}
                    className={`flex-1 py-1.5 font-medium transition-colors disabled:opacity-40 ${
                      i > 0 ? 'border-l border-gray-200' : ''
                    } ${
                      level === option.value
                        ? 'bg-[#475569] text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                {TRACE_LEVELS.find((o) => o.value === level)?.desc}
                {' '}긴 변이 {maxDimension(level)}px을 넘으면 그 크기로 줄여서 변환합니다.
              </p>
            </section>

            {/* 변환 + 진행바 */}
            <section className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-2">3. 변환</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={convert}
                  disabled={busy || files.length === 0}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded bg-[#475569] text-white hover:bg-[#334155] active:bg-[#1e293b] transition-colors disabled:opacity-40"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {busy
                    ? '변환 중...'
                    : files.length > 0
                      ? `SVG로 변환 (${files.length}개)`
                      : 'SVG로 변환'}
                </button>
                {(files.length > 0 || results.length > 0) && (
                  <button
                    onClick={reset}
                    disabled={busy}
                    className="text-xs px-3 py-2 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    모두 지우기
                  </button>
                )}
              </div>

              {busy && (
                <div className="mt-3">
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#475569] rounded-full"
                      style={{ width: `${percent}%`, transition: 'width 200ms ease' }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5 flex items-center justify-between">
                    <span className="truncate">{progress.label}</span>
                    <span className="shrink-0 tabular-nums ml-2">
                      {progress.done}/{progress.total} ({percent}%)
                    </span>
                  </p>
                </div>
              )}
            </section>

            {/* 결과 */}
            {results.length > 0 && (
              <section className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-600 mb-2">
                  4. 결과 ({results.length}개)
                </h3>
                <ul className="space-y-2">
                  {results.map((result, i) => (
                    <li
                      key={`${result.name}-${i}`}
                      className="flex items-center gap-3 border border-gray-200 rounded p-2.5"
                    >
                      {/* 체크무늬 배경 위에 얹어 흰 배경 SVG도 보이게 한다 */}
                      <div
                        className="w-14 h-14 shrink-0 rounded border border-gray-100 bg-white flex items-center justify-center overflow-hidden"
                        style={{
                          backgroundImage:
                            'linear-gradient(45deg,#f1f5f9 25%,transparent 25%,transparent 75%,#f1f5f9 75%),linear-gradient(45deg,#f1f5f9 25%,transparent 25%,transparent 75%,#f1f5f9 75%)',
                          backgroundSize: '10px 10px',
                          backgroundPosition: '0 0,5px 5px',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.previewUrl}
                          alt={result.name}
                          className="max-w-full max-h-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {result.name}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          원본 {formatBytes(result.originalBytes)} → SVG{' '}
                          {formatBytes(result.svgBytes)}
                          {result.svgBytes > result.originalBytes && (
                            <span className="text-orange-500">
                              {' '}· 원본보다 큽니다. 정도를 낮춰 보세요
                            </span>
                          )}
                        </p>
                        {result.scaled && (
                          <p className="text-[11px] text-gray-400">
                            긴 변을 {maxDimension(level)}px으로 줄여 변환했습니다.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => download(result)}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-[#475569] text-white hover:bg-[#334155] active:bg-[#1e293b] transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        SVG 받기
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
