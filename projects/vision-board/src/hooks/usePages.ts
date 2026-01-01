'use client'

import { useState, useCallback } from 'react'

export interface Page {
  title: string
  description: string
  headerImage: string | null
  category: string
  targetDecade: string
  milestones: Array<{
    id: string
    title: string
    completed: boolean
    completedAt: number | null
  }>
  routines: Array<{
    id: string
    title: string
    color: string
    history: Record<string, boolean>
  }>
  blocks: any[]
  createdAt: number
  updatedAt: number
}

export function usePages() {
  const [pages, setPages] = useState<Record<string, Page>>({})

  const updatePage = useCallback((nodeId: string, pageData: Page) => {
    setPages(prev => ({
      ...prev,
      [nodeId]: pageData,
    }))
  }, [])

  const getPage = useCallback((nodeId: string) => {
    return pages[nodeId]
  }, [pages])

  return {
    pages,
    updatePage,
    getPage,
  }
}
