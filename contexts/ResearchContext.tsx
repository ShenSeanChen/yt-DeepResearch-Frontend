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

interface ApiKeys {
  openai: string
  anthropic: string
  kimi: string
}

interface ResearchState {
  messages: ResearchMessage[]
  streamingEvents: StreamingEvent[]
  currentStage: string
  isStreaming: boolean
  selectedModel: string
  apiKey: string // Current model's API key (for backwards compatibility)
  apiKeys: ApiKeys // All API keys for multi-model comparison
  setMessages: (messages: ResearchMessage[] | ((prev: ResearchMessage[]) => ResearchMessage[])) => void
  setStreamingEvents: (events: StreamingEvent[] | ((prev: StreamingEvent[]) => StreamingEvent[])) => void
  setCurrentStage: (stage: string) => void
  setIsStreaming: (streaming: boolean) => void
  setSelectedModel: (model: string) => void
  setApiKey: (key: string) => void
  setApiKeys: (keys: Partial<ApiKeys>) => void
  clearApiKeys: () => void
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
  
  // Initialize API keys from localStorage
  const [apiKeys, setApiKeysState] = useState<ApiKeys>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dra_api_keys')
        if (stored) {
          return JSON.parse(stored)
        }
      } catch (error) {
        console.warn('Failed to load API keys from localStorage:', error)
      }
    }
    return { openai: '', anthropic: '', kimi: '' }
  })

  // API key management functions
  const setApiKeys = (newKeys: Partial<ApiKeys>) => {
    const updatedKeys = { ...apiKeys, ...newKeys }
    setApiKeysState(updatedKeys)
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dra_api_keys', JSON.stringify(updatedKeys))
      } catch (error) {
        console.warn('Failed to save API keys to localStorage:', error)
      }
    }
    
    // Update current API key if the selected model's key changed
    if (newKeys[selectedModel as keyof ApiKeys] !== undefined) {
      setApiKey(newKeys[selectedModel as keyof ApiKeys] || '')
    }
  }
  
  const clearApiKeys = () => {
    const emptyKeys = { openai: '', anthropic: '', kimi: '' }
    setApiKeysState(emptyKeys)
    setApiKey('')
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dra_api_keys')
    }
  }
  
  // Update current API key when model changes
  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    const modelKey = apiKeys[model as keyof ApiKeys] || ''
    setApiKey(modelKey)
  }
  
  // Update specific model key when API key changes
  const handleApiKeyChange = (key: string) => {
    setApiKey(key)
    setApiKeys({ [selectedModel]: key })
  }

  const researchState: ResearchState = {
    messages,
    streamingEvents,
    currentStage,
    isStreaming,
    selectedModel,
    apiKey,
    apiKeys,
    setMessages,
    setStreamingEvents,
    setCurrentStage,
    setIsStreaming,
    setSelectedModel: handleModelChange,
    setApiKey: handleApiKeyChange,
    setApiKeys,
    clearApiKeys
  }

  return (
    <ResearchContext.Provider value={researchState}>
      {children}
    </ResearchContext.Provider>
  )
}
