'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '../client.web'
import { Routine, RoutineNode } from '@vision-board/shared/lib'
import { ROUTINE_COLORS, generateId } from '@vision-board/shared'

// Re-export types for consumers
export type { Routine, RoutineNode } from '@vision-board/shared/lib'

export function useRoutines(boardId: string | null, userId: string | null) {
  const supabase = useMemo(() => createClient(), [])

  const [routines, setRoutines] = useState<Record<string, Routine>>({})
  const [routineNodes, setRoutineNodes] = useState<RoutineNode[]>([])
  const [loading, setLoading] = useState(true)

  const loadRoutines = useCallback(async () => {
    if (!boardId || !userId) return

    try {
      const { data: routinesData, error: routinesError } = await supabase
        .from('routines')
        .select('*')
        .eq('board_id', boardId)

      if (routinesError) {
        console.error('Failed to load routines:', routinesError)
        return
      }

      const { data: routineNodesData, error: routineNodesError } = await supabase
        .from('routine_nodes')
        .select('*')
        .eq('user_id', userId)

      if (routineNodesError) {
        console.error('Failed to load routine_nodes:', routineNodesError)
        return
      }

      const routinesMap: Record<string, Routine> = {}
      ;(routinesData || []).forEach((r: {
        id: string
        board_id: string
        title: string
        color: string
        history?: Record<string, boolean>
        created_at?: string
        active_days?: number[]
      }) => {
        routinesMap[r.id] = {
          id: r.id,
          boardId: r.board_id,
          title: r.title,
          color: r.color,
          history: r.history || {},
          createdAt: r.created_at,
          activeDays: r.active_days || undefined,
        }
      })

      const routineNodesList: RoutineNode[] = (routineNodesData || []).map((rn: {
        id: string
        routine_id: string
        node_id: string
        sort_order: number
      }) => ({
        id: rn.id,
        routineId: rn.routine_id,
        nodeId: rn.node_id,
        sortOrder: rn.sort_order,
      }))

      setRoutines(routinesMap)
      setRoutineNodes(routineNodesList)
    } catch (err) {
      console.error('Failed to load routines:', err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, userId])

  useEffect(() => {
    if (boardId && userId) {
      loadRoutines()
    }
  }, [boardId, userId, loadRoutines])

  const getRoutinesForNode = useCallback((nodeId: string): Routine[] => {
    const nodeRoutineIds = routineNodes
      .filter(rn => rn.nodeId === nodeId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(rn => rn.routineId)

    return nodeRoutineIds
      .map(id => routines[id])
      .filter(Boolean)
  }, [routines, routineNodes])

  const toggleRoutineCheck = useCallback(async (
    routineId: string,
    date: string
  ): Promise<boolean> => {
    if (!userId) return false

    const routine = routines[routineId]
    if (!routine) return false

    const newChecked = !routine.history[date]
    const newHistory = { ...routine.history, [date]: newChecked }

    setRoutines(prev => ({
      ...prev,
      [routineId]: { ...routine, history: newHistory }
    }))

    try {
      const { error } = await supabase
        .from('routines')
        .update({ history: newHistory })
        .eq('id', routineId)

      if (error) throw error
      return true
    } catch (err) {
      setRoutines(prev => ({
        ...prev,
        [routineId]: routine
      }))
      console.error('Failed to toggle routine check:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routines, userId])

  const createRoutine = useCallback(async (
    title: string,
    nodeId: string
  ): Promise<Routine | null> => {
    if (!boardId || !userId) return null

    const newRoutineId = generateId()
    const randomColor = ROUTINE_COLORS[Math.floor(Math.random() * ROUTINE_COLORS.length)]

    const newRoutine: Routine = {
      id: newRoutineId,
      boardId,
      title,
      color: randomColor,
      history: {},
      createdAt: new Date().toISOString(),
    }

    setRoutines(prev => ({ ...prev, [newRoutineId]: newRoutine }))

    try {
      const { error: routineError } = await supabase
        .from('routines')
        .insert({
          id: newRoutineId,
          board_id: boardId,
          user_id: userId,
          title,
          color: randomColor,
          history: {},
          created_at: newRoutine.createdAt,
        })

      if (routineError) throw routineError

      const maxSortOrder = routineNodes
        .filter(rn => rn.nodeId === nodeId)
        .reduce((max, rn) => Math.max(max, rn.sortOrder), -1)

      const newRoutineNode: RoutineNode = {
        id: generateId(),
        routineId: newRoutineId,
        nodeId,
        sortOrder: maxSortOrder + 1,
      }

      const { error: linkError } = await supabase
        .from('routine_nodes')
        .insert({
          id: newRoutineNode.id,
          routine_id: newRoutineId,
          node_id: nodeId,
          user_id: userId,
          sort_order: newRoutineNode.sortOrder,
        })

      if (linkError) throw linkError

      setRoutineNodes(prev => [...prev, newRoutineNode])
      return newRoutine
    } catch (err) {
      setRoutines(prev => {
        const newRoutines = { ...prev }
        delete newRoutines[newRoutineId]
        return newRoutines
      })
      console.error('Failed to create routine:', err)
      return null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, userId, routineNodes])

  const addRoutineToNode = useCallback(async (
    routineId: string,
    nodeId: string
  ): Promise<boolean> => {
    if (!userId) return false

    const exists = routineNodes.some(
      rn => rn.routineId === routineId && rn.nodeId === nodeId
    )
    if (exists) return true

    const maxSortOrder = routineNodes
      .filter(rn => rn.nodeId === nodeId)
      .reduce((max, rn) => Math.max(max, rn.sortOrder), -1)

    const newRoutineNode: RoutineNode = {
      id: generateId(),
      routineId,
      nodeId,
      sortOrder: maxSortOrder + 1,
    }

    setRoutineNodes(prev => [...prev, newRoutineNode])

    try {
      const { error } = await supabase
        .from('routine_nodes')
        .insert({
          id: newRoutineNode.id,
          routine_id: routineId,
          node_id: nodeId,
          user_id: userId,
          sort_order: newRoutineNode.sortOrder,
        })

      if (error) throw error
      return true
    } catch (err) {
      setRoutineNodes(prev => prev.filter(rn => rn.id !== newRoutineNode.id))
      console.error('Failed to add routine to node:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, routineNodes])

  const removeRoutineFromNode = useCallback(async (
    routineId: string,
    nodeId: string
  ): Promise<boolean> => {
    if (!userId) return false

    const targetLink = routineNodes.find(
      rn => rn.routineId === routineId && rn.nodeId === nodeId
    )
    if (!targetLink) return true

    setRoutineNodes(prev => prev.filter(rn => rn.id !== targetLink.id))

    try {
      const { error } = await supabase
        .from('routine_nodes')
        .delete()
        .eq('routine_id', routineId)
        .eq('node_id', nodeId)

      if (error) throw error
      return true
    } catch (err) {
      setRoutineNodes(prev => [...prev, targetLink])
      console.error('Failed to remove routine from node:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, routineNodes])

  const deleteRoutine = useCallback(async (routineId: string): Promise<boolean> => {
    if (!userId) return false

    const routine = routines[routineId]
    if (!routine) return true

    const relatedLinks = routineNodes.filter(rn => rn.routineId === routineId)

    setRoutines(prev => {
      const newRoutines = { ...prev }
      delete newRoutines[routineId]
      return newRoutines
    })
    setRoutineNodes(prev => prev.filter(rn => rn.routineId !== routineId))

    try {
      const { error } = await supabase
        .from('routines')
        .delete()
        .eq('id', routineId)

      if (error) throw error
      return true
    } catch (err) {
      setRoutines(prev => ({ ...prev, [routineId]: routine }))
      setRoutineNodes(prev => [...prev, ...relatedLinks])
      console.error('Failed to delete routine:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, routines, routineNodes])

  const updateRoutineTitle = useCallback(async (
    routineId: string,
    newTitle: string
  ): Promise<boolean> => {
    if (!userId) return false

    const routine = routines[routineId]
    if (!routine) return false

    setRoutines(prev => ({
      ...prev,
      [routineId]: { ...routine, title: newTitle }
    }))

    try {
      const { error } = await supabase
        .from('routines')
        .update({ title: newTitle })
        .eq('id', routineId)

      if (error) throw error
      return true
    } catch (err) {
      setRoutines(prev => ({ ...prev, [routineId]: routine }))
      console.error('Failed to update routine title:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, routines])

  const updateRoutineColor = useCallback(async (
    routineId: string,
    newColor: string
  ): Promise<boolean> => {
    if (!userId) return false

    const routine = routines[routineId]
    if (!routine) return false

    setRoutines(prev => ({
      ...prev,
      [routineId]: { ...routine, color: newColor }
    }))

    try {
      const { error } = await supabase
        .from('routines')
        .update({ color: newColor })
        .eq('id', routineId)

      if (error) throw error
      return true
    } catch (err) {
      setRoutines(prev => ({ ...prev, [routineId]: routine }))
      console.error('Failed to update routine color:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, routines])

  const updateRoutineActiveDays = useCallback(async (
    routineId: string,
    activeDays: number[] | undefined
  ): Promise<boolean> => {
    if (!userId) return false

    const routine = routines[routineId]
    if (!routine) return false

    setRoutines(prev => ({
      ...prev,
      [routineId]: { ...routine, activeDays }
    }))

    try {
      const { error } = await supabase
        .from('routines')
        .update({ active_days: activeDays || null })
        .eq('id', routineId)

      if (error) throw error
      return true
    } catch (err) {
      setRoutines(prev => ({ ...prev, [routineId]: routine }))
      console.error('Failed to update routine active days:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, routines])

  const reorderRoutinesInNode = useCallback(async (
    nodeId: string,
    fromIndex: number,
    toIndex: number
  ): Promise<boolean> => {
    if (!userId) return false

    const nodeLinks = routineNodes
      .filter(rn => rn.nodeId === nodeId)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    if (fromIndex < 0 || toIndex < 0 || fromIndex >= nodeLinks.length || toIndex >= nodeLinks.length) {
      return false
    }

    const newLinks = [...nodeLinks]
    const [moved] = newLinks.splice(fromIndex, 1)
    newLinks.splice(toIndex, 0, moved)

    const updatedLinks = newLinks.map((link, index) => ({
      ...link,
      sortOrder: index,
    }))

    setRoutineNodes(prev => {
      const otherLinks = prev.filter(rn => rn.nodeId !== nodeId)
      return [...otherLinks, ...updatedLinks]
    })

    try {
      for (const link of updatedLinks) {
        const { error } = await supabase
          .from('routine_nodes')
          .update({ sort_order: link.sortOrder })
          .eq('id', link.id)

        if (error) throw error
      }
      return true
    } catch (err) {
      setRoutineNodes(prev => {
        const otherLinks = prev.filter(rn => rn.nodeId !== nodeId)
        return [...otherLinks, ...nodeLinks]
      })
      console.error('Failed to reorder routines:', err)
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, routineNodes])

  return {
    routines,
    routineNodes,
    loading,
    getRoutinesForNode,
    toggleRoutineCheck,
    createRoutine,
    addRoutineToNode,
    removeRoutineFromNode,
    deleteRoutine,
    updateRoutineTitle,
    updateRoutineColor,
    updateRoutineActiveDays,
    reorderRoutinesInNode,
    reload: loadRoutines,
  }
}
