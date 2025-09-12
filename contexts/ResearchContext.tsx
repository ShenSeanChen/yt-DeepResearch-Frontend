// Directory: yt-deepresearch-frontend/contexts/ResearchContext.tsx
/**
 * Research context for persistent state management across tabs
 * Handles streaming events, messages, and research state
 */

'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Types for research state
export interface StreamingEvent {
  type: string
  stage?: string
  content?: string
  timestamp: string
  research_id?: string
  model?: string
  error?: string
  node_name?: string
  node_count?: number
  duration?: number
}

export interface ResearchMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  model?: string
  stage?: string
  isStreaming?: boolean
}

interface ResearchState {
  messages: ResearchMessage[]
  streamingEvents: StreamingEvent[]
  currentStage: string
  isStreaming: boolean
  selectedModel: string
  apiKey: string
  setMessages: (messages: ResearchMessage[] | ((prev: ResearchMessage[]) => ResearchMessage[])) => void
  setStreamingEvents: (events: StreamingEvent[] | ((prev: StreamingEvent[]) => StreamingEvent[])) => void
  setCurrentStage: (stage: string) => void
  setIsStreaming: (streaming: boolean) => void
  setSelectedModel: (model: string) => void
  setApiKey: (key: string) => void
}

// Research context
const ResearchContext = createContext<ResearchState | undefined>(undefined)

// Hook to use research context
export const useResearchState = () => {
  const context = useContext(ResearchContext)
  if (!context) {
    throw new Error('useResearchState must be used within ResearchProvider')
  }
  return context
}

// Research provider component
export const ResearchProvider = ({ children }: { children: ReactNode }) => {
  // Persistent research state across tabs
  const [messages, setMessages] = useState<ResearchMessage[]>([])
  const [streamingEvents, setStreamingEvents] = useState<StreamingEvent[]>([])
  const [currentStage, setCurrentStage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedModel, setSelectedModel] = useState('anthropic')
  const [apiKey, setApiKey] = useState('')

  const researchState: ResearchState = {
    messages,
    streamingEvents,
    currentStage,
    isStreaming,
    selectedModel,
    apiKey,
    setMessages,
    setStreamingEvents,
    setCurrentStage,
    setIsStreaming,
    setSelectedModel,
    setApiKey
  }

  return (
    <ResearchContext.Provider value={researchState}>
      {children}
    </ResearchContext.Provider>
  )
}
