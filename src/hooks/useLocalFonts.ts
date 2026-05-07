'use client'
import { useState, useEffect } from 'react'

const FALLBACK_FONTS = [
  '맑은 고딕', '굴림', '굴림체', '궁서', '궁서체', '돋움', '돋움체',
  '바탕', '바탕체', '나눔고딕', '나눔명조', '나눔바른고딕', '나눔스퀘어',
  'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS',
  'Courier New', 'Georgia', 'Impact', 'Segoe UI', 'Tahoma',
  'Times New Roman', 'Trebuchet MS', 'Verdana',
].sort()

export function useLocalFonts(): string[] {
  const [fonts, setFonts] = useState<string[]>(FALLBACK_FONTS)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.queryLocalFonts) return
    window.queryLocalFonts()
      .then((localFonts) => {
        const families = [...new Set(localFonts.map((f) => f.family))].sort()
        setFonts(families)
      })
      .catch(() => {
        // Permission denied — keep fallback list
      })
  }, [])

  return fonts
}
