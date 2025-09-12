// Directory: yt-deepresearch-frontend/components/ResearchInterface.tsx
/**
 * Main research interface component
 * Handles streaming research with real-time visualization of AI thinking process
 * Similar to Perplexity and OpenAI's thinking mode
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertCircle, CheckCircle, Search, FileText, Lightbulb } from 'lucide-react'
import { cn, formatTimestamp, getModelDisplayName } from '@/lib/utils'

// Types for streaming events
interface StreamingEvent {
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

interface ResearchMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  model?: string
  stage?: string
  isStreaming?: boolean
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

const ResearchInterface = () => {
  const [messages, setMessages] = useState<ResearchMessage[]>([])
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStage, setCurrentStage] = useState('')
  const [streamingEvents, setStreamingEvents] = useState<StreamingEvent[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingEvents])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !apiKey.trim() || isStreaming) return

    const query = input.trim()
    setInput('')
    setIsStreaming(true)
    setStreamingEvents([])
    setCurrentStage('')

    // Add user message
    const userMessage: ResearchMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])

    // Add system message for streaming
    const systemMessage: ResearchMessage = {
      id: (Date.now() + 1).toString(),
      type: 'system',
      content: `Starting deep research with ${getModelDisplayName(selectedModel)}...`,
      timestamp: new Date().toISOString(),
      model: selectedModel,
      isStreaming: true
    }
    setMessages(prev => [...prev, systemMessage])

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      const response = await fetch(`${BACKEND_URL}/research/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          model: selectedModel,
          api_key: apiKey
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += new TextDecoder().decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6))
              const event: StreamingEvent = {
                ...eventData,
                timestamp: eventData.timestamp || new Date().toISOString()
              }
              
              setStreamingEvents(prev => [...prev, event])
              
              if (event.stage) {
                setCurrentStage(event.stage)
              }

              // Handle completion
              if (event.type === 'research_complete') {
                setIsStreaming(false)
                
                // Look for final report in the streaming events
                const finalReportEvent = streamingEvents.find(e => 
                  e.node_name === 'final_report_generation' && e.content?.includes('📄 Final Report:')
                )
                
                let finalReportContent = "Research completed successfully!"
                if (finalReportEvent && finalReportEvent.content) {
                  const reportMatch = finalReportEvent.content.match(/📄 Final Report: (.*)$/m)
                  if (reportMatch) {
                    finalReportContent = reportMatch[1]
                  }
                }
                
                // Add final research results as a new message
                const finalMessage: ResearchMessage = {
                  id: (Date.now() + 2).toString(),
                  type: 'assistant',
                  content: finalReportContent,
                  timestamp: new Date().toISOString(),
                  model: selectedModel
                }
                
                setMessages(prev => [...prev.map(msg => 
                  msg.id === systemMessage.id 
                    ? { ...msg, content: `Research completed in ${event.duration?.toFixed(1)}s`, isStreaming: false }
                    : msg
                ), finalMessage])
              }

              // Handle errors
              if (event.type === 'error') {
                setIsStreaming(false)
                setMessages(prev => prev.map(msg => 
                  msg.id === systemMessage.id 
                    ? { ...msg, content: `Error: ${event.error || event.content}`, isStreaming: false }
                    : msg
                ))
              }

            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError)
            }
          }
        }
      }

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted')
      } else {
        console.error('Streaming error:', error)
        setMessages(prev => prev.map(msg => 
          msg.id === systemMessage.id 
            ? { ...msg, content: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`, isStreaming: false }
            : msg
        ))
      }
      setIsStreaming(false)
    }
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsStreaming(false)
  }

  const getStageIcon = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'clarification': return <User className="w-4 h-4" />
      case 'research_brief': return <FileText className="w-4 h-4" />
      case 'research': return <Search className="w-4 h-4" />
      case 'final_report': return <CheckCircle className="w-4 h-4" />
      default: return <Lightbulb className="w-4 h-4" />
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'session_start': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'stage_start': return 'text-green-600 bg-green-50 border-green-200'
      case 'stage_complete': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'research_complete': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'research_finding': return 'text-indigo-600 bg-indigo-50 border-indigo-200'
      case 'research_summary': return 'text-cyan-600 bg-cyan-50 border-cyan-200'
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Model Selection and API Key */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isStreaming}
            >
              <option value="anthropic">Anthropic Claude</option>
              <option value="openai">OpenAI GPT-4</option>
              <option value="kimi">Kimi K2</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isStreaming}
            />
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[400px] mb-4">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Research Session</h2>
          {currentStage && (
            <div className="flex items-center space-x-2 mt-2 text-sm text-slate-600 dark:text-slate-400">
              {getStageIcon(currentStage)}
              <span>Current Stage: {currentStage.replace('_', ' ').toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start space-x-3",
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.type !== 'user' && (
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  message.type === 'system' ? 'bg-blue-500' : 'bg-slate-500'
                )}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={cn(
                "max-w-[80%] px-4 py-2 rounded-lg",
                message.type === 'user'
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
              )}>
                <div className="text-sm">
                  {message.content}
                  {message.isStreaming && (
                    <Loader2 className="w-4 h-4 animate-spin inline ml-2" />
                  )}
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {formatTimestamp(message.timestamp)}
                  {message.model && ` • ${getModelDisplayName(message.model)}`}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Streaming Events */}
          {streamingEvents.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Research Process (Real-time)
              </h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                {streamingEvents.slice(-20).map((event, index) => (
                  <div
                    key={index}
                    className={cn(
                      "text-xs p-2 rounded border-l-4",
                      getEventTypeColor(event.type)
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {event.type.replace('_', ' ').toUpperCase()}
                        {event.stage && ` - ${event.stage.replace('_', ' ')}`}
                        {event.node_name && ` (${event.node_name})`}
                      </span>
                      <span className="opacity-70">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    {event.content && (
                      <div className="mt-1 opacity-80">
                        {event.type === 'research_finding' || event.type === 'research_summary' 
                          ? event.content 
                          : event.content.length > 150 
                            ? `${event.content.slice(0, 150)}...` 
                            : event.content
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a research question..."
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isStreaming}
        />
        
        {isStreaming ? (
          <button
            type="button"
            onClick={stopStreaming}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() || !apiKey.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Research</span>
          </button>
        )}
      </form>
    </div>
  )
}

export default ResearchInterface
