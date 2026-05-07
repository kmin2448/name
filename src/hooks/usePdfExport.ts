'use client'
import { useState, useCallback } from 'react'
import { NameplateState } from '@/types/nameplate'
import { generatePdf } from '@/lib/pdfGenerator'

export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const exportPdf = useCallback(async (state: NameplateState) => {
    setIsExporting(true)
    try {
      await generatePdf(state, (current, total) => setProgress({ current, total }))
    } finally {
      setIsExporting(false)
      setProgress({ current: 0, total: 0 })
    }
  }, [])

  return { exportPdf, isExporting, progress }
}
