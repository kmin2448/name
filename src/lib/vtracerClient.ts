'use client'
// vtracer(wasm) 로딩과 호출을 감싼다.
//
// wasm 쪽에서 패닉이 나면 인스턴스가 못 쓰는 상태로 남는다. 그대로 두면
// 파일 하나가 실패한 뒤 나머지도 전부 실패하므로, 실패를 감지하면
// 인스턴스를 버리고 다음 호출 때 새로 초기화한다.
import type { VtracerConfig } from '@/lib/vectorize'

type TraceFn = (pixels: Uint8Array, width: number, height: number, config: VtracerConfig) => string

let ready: Promise<TraceFn> | null = null

async function load(): Promise<TraceFn> {
  const mod = await import('vtracer-wasm')
  await mod.default()
  return mod.to_svg
}

/** 다음 호출에서 wasm을 새로 올리도록 표시한다 */
function discard() {
  ready = null
}

/**
 * RGBA 화소를 SVG 문자열로 바꾼다.
 * 실패하면 인스턴스를 버리고 오류를 그대로 던진다 — 다음 파일은 새 인스턴스로 처리된다.
 */
export async function traceToSvg(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  config: VtracerConfig
): Promise<string> {
  if (!ready) ready = load()

  let toSvg: TraceFn
  try {
    toSvg = await ready
  } catch (e) {
    // 로딩 자체가 실패하면 다음에 다시 시도할 수 있게 비워 둔다
    discard()
    throw e
  }

  try {
    // wasm 쪽 시그니처가 Uint8Array라 뷰를 새로 씌운다 (복사는 일어나지 않는다)
    return toSvg(new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength), width, height, config)
  } catch (e) {
    discard()
    throw e
  }
}
