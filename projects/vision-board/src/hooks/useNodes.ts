'use client'

import { useState, useCallback } from 'react'
import { generateId } from '@/lib/utils'
import { NODE_TYPES } from '@/constants/types'

export interface Node {
  id: string
  type: 'image' | 'text'
  x: number
  y: number
  width: number
  height: number
  // 画像ノード専用
  src?: string
  shape?: string
  hoverFontSize?: string
  hoverTextColor?: string
  // テキストノード専用
  content?: string
  fontSize?: number
  color?: string
  fontFamily?: string
}

export function useNodes() {
  const [nodes, setNodes] = useState<Node[]>([])

  const addNode = useCallback((node: Omit<Node, 'id'>) => {
    const newNode = { ...node, id: generateId() } as Node
    setNodes(prev => [...prev, newNode])
    return newNode
  }, [])

  const updateNode = useCallback((updatedNode: Node) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n))
  }, [])

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId))
  }, [])

  return {
    nodes,
    addNode,
    updateNode,
    deleteNode,
  }
}
