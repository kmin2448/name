import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // vtracer-wasm 패키지 버그 우회.
    // glue 코드가 new URL('vtracer_bg.wasm', import.meta.url)로 wasm을 찾는데,
    // 정작 패키지에 들어 있는 파일 이름은 vtracer.wasm이라 빌드가 깨진다.
    // webpack이 URL을 정적으로 훑어 해석하므로 실행 여부와 무관하게 막히며,
    // 실제 파일로 이어 주면 wasm이 정상적으로 에셋에 담긴다.
    config.resolve.alias = {
      ...config.resolve.alias,
      'vtracer_bg.wasm': path.resolve(dir, 'node_modules/vtracer-wasm/vtracer.wasm'),
    }
    return config
  },
}

export default nextConfig
