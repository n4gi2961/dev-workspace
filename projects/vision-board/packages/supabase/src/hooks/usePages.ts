'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '../client.web'
import {
  Page,
  SupabasePage,
  pageToSupabase,
  supabaseToPage,
  createInitialPage,
} from '@vision-board/shared/lib'

// Re-export types for consumers
export type { Page, Block, Milestone, Routine, FrozenDate } from '@vision-board/shared/lib'

export function usePages(userId?: string) {
  const supabase = useMemo(() => createClient(), [])

  const [pages, setPages] = useState<Record<string, Page>>({})
  const [loading, setLoading] = useState(true)

  const loadPage = useCallback(async (nodeId: string): Promise<Page | null> => {
    if (!userId) return null

    try {
      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('node_id', nodeId)
        .single()

      if (pageError) {
        if (pageError.code === 'PGRST116') {
          return createInitialPage()
        }
        console.error('Failed to load page:', pageError)
        return createInitialPage()
      }

      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('node_id', nodeId)
        .order('sort_order', { ascending: true })

      const { data: frozenDatesData } = await supabase
        .from('frozen_dates')
        .select('*')
        .eq('node_id', nodeId)

      const milestones = (milestonesData || []).map((m: { id: string; title: string; completed: boolean; completed_at?: string }) => ({
        id: m.id,
        title: m.title,
        completed: m.completed,
        completedAt: m.completed_at || undefined,
      }))

      const frozenDates = (frozenDatesData || []).map((f: { id: string; date: string }) => ({
        id: f.id,
        date: f.date,
      }))

      return supabaseToPage(pageData as SupabasePage, milestones, [], frozenDates)
    } catch (err) {
      console.error('Failed to load page:', err)
      return createInitialPage()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const getPage = useCallback(async (nodeId: string): Promise<Page> => {
    if (pages[nodeId]) {
      return pages[nodeId]
    }

    const page = await loadPage(nodeId)
    const result = page || createInitialPage()

    setPages(prev => ({
      ...prev,
      [nodeId]: result
    }))

    return result
  }, [pages, loadPage])

  const savePage = useCallback(async (nodeId: string, page: Partial<Page>): Promise<boolean> => {
    if (!userId) return false

    try {
      const { data: existingPage } = await supabase
        .from('pages')
        .select('id')
        .eq('node_id', nodeId)
        .single()

      const pageData = pageToSupabase(page, nodeId, userId)

      if (existingPage) {
        const { error } = await supabase
          .from('pages')
          .update(pageData)
          .eq('id', existingPage.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('pages')
          .insert(pageData)

        if (error) throw error
      }

      setPages(prev => ({
        ...prev,
        [nodeId]: {
          ...createInitialPage(),
          ...prev[nodeId],
          ...page,
          updatedAt: Date.now(),
        }
      }))

      return true
    } catch (err) {
      console.error('Failed to save page:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const updatePageLocal = useCallback((nodeId: string, updates: Partial<Page>) => {
    setPages(prev => ({
      ...prev,
      [nodeId]: {
        ...createInitialPage(),
        ...prev[nodeId],
        ...updates,
      }
    }))
  }, [])

  const deletePage = useCallback(async (nodeId: string): Promise<boolean> => {
    if (!userId) return false

    try {
      await supabase
        .from('milestones')
        .delete()
        .eq('node_id', nodeId)

      await supabase
        .from('frozen_dates')
        .delete()
        .eq('node_id', nodeId)

      await supabase
        .from('pages')
        .delete()
        .eq('node_id', nodeId)

      setPages(prev => {
        const newPages = { ...prev }
        delete newPages[nodeId]
        return newPages
      })

      return true
    } catch (err) {
      console.error('Failed to delete page:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const saveMilestones = useCallback(async (
    nodeId: string,
    milestones: Page['milestones']
  ): Promise<boolean> => {
    if (!userId) return false

    try {
      await supabase
        .from('milestones')
        .delete()
        .eq('node_id', nodeId)

      if (milestones.length > 0) {
        const milestonesData = milestones.map((m, index) => ({
          id: m.id,
          node_id: nodeId,
          user_id: userId,
          title: m.title,
          completed: m.completed,
          completed_at: m.completedAt
            ? (typeof m.completedAt === 'number'
                ? new Date(m.completedAt).toISOString()
                : m.completedAt)
            : null,
          sort_order: index,
        }))

        const { error } = await supabase
          .from('milestones')
          .insert(milestonesData)

        if (error) throw error
      }

      setPages(prev => ({
        ...prev,
        [nodeId]: {
          ...createInitialPage(),
          ...prev[nodeId],
          milestones,
        }
      }))

      return true
    } catch (err) {
      console.error('Failed to save milestones:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const addFrozenDate = useCallback(async (
    nodeId: string,
    date: string
  ): Promise<boolean> => {
    if (!userId) return false

    try {
      const newFrozenDate = {
        node_id: nodeId,
        user_id: userId,
        date: date,
      }

      const { data, error } = await supabase
        .from('frozen_dates')
        .insert(newFrozenDate)
        .select()
        .single()

      if (error) throw error

      setPages(prev => {
        const currentPage = prev[nodeId] || createInitialPage()
        const currentFrozenDates = currentPage.frozenDates || []
        return {
          ...prev,
          [nodeId]: {
            ...currentPage,
            frozenDates: [...currentFrozenDates, { id: data.id, date: date }],
          }
        }
      })

      return true
    } catch (err) {
      console.error('Failed to add frozen date:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const removeFrozenDate = useCallback(async (
    nodeId: string,
    date: string
  ): Promise<boolean> => {
    if (!userId) return false

    try {
      const { error } = await supabase
        .from('frozen_dates')
        .delete()
        .eq('node_id', nodeId)
        .eq('date', date)

      if (error) throw error

      setPages(prev => {
        const currentPage = prev[nodeId] || createInitialPage()
        const currentFrozenDates = currentPage.frozenDates || []
        return {
          ...prev,
          [nodeId]: {
            ...currentPage,
            frozenDates: currentFrozenDates.filter(f => f.date !== date),
          }
        }
      })

      return true
    } catch (err) {
      console.error('Failed to remove frozen date:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    setLoading(false)
  }, [])

  return {
    pages,
    loading,
    getPage,
    savePage,
    updatePageLocal,
    deletePage,
    saveMilestones,
    addFrozenDate,
    removeFrozenDate,
  }
}
