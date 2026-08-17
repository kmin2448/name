// imagetracerjs는 타입 선언을 제공하지 않아, 실제로 쓰는 부분만 직접 선언한다.
// (프로젝트 규칙상 any를 쓸 수 없으므로 옵션 필드를 명시한다)
declare module 'imagetracerjs' {
  /**
   * 트레이싱 옵션. 전체 목록은 imagetracerjs의 options.md 참고.
   * 여기서는 변환 품질을 좌우하는 값만 추린다.
   */
  export interface TracerOptions {
    /** 직선 근사 허용 오차 — 작을수록 원본에 가깝다 */
    ltres: number
    /** 곡선 근사 허용 오차 — 작을수록 원본에 가깝다 */
    qtres: number
    /** 이 길이 이하의 자잘한 경로를 버린다 — 클수록 단순해진다 */
    pathomit: number
    /** 직각 보정 */
    rightangleenhance: boolean
    /** 색을 몇 가지로 줄일지 */
    numberofcolors: number
    /** 색 군집화 반복 횟수 — 많을수록 색 구분이 정확하다 */
    colorquantcycles: number
    /** 색 군집에서 이 화소 수 미만은 버린다 */
    mincolorratio: number
    /** 트레이싱 전에 적용할 흐림 반경 (0이면 끔) */
    blurradius: number
    /** 흐림 처리 시 색 차이 한계 */
    blurdelta: number
    /** 경로 좌표 소수점 자리수 */
    roundcoords: number
    /** 외곽선 두께 */
    strokewidth: number
    /** 외곽선을 그릴지 (false면 면만 채운다) */
    linefilter: boolean
    /** 출력 SVG 배율 */
    scale: number
    /** viewBox 사용 여부 */
    viewbox: boolean
    /** 경로를 desc 속성으로 남길지 */
    desc: boolean
  }

  /** 캔버스에서 얻은 화소 데이터 */
  export interface TracerImageData {
    width: number
    height: number
    data: Uint8ClampedArray
  }

  /** 화소 데이터를 SVG 문자열로 변환한다 */
  export function imagedataToSVG(
    imageData: TracerImageData,
    options?: Partial<TracerOptions>
  ): string

  const ImageTracer: {
    imagedataToSVG: typeof imagedataToSVG
  }
  export default ImageTracer
}
