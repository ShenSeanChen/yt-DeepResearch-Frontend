// Directory: yt-deepresearch-frontend/components/ResearchInterface.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, AlertCircle, Download, ChevronRight, Search, FileText, CheckCircle, Lightbulb, ExternalLink, Clock, Zap, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useResearchState } from '@/contexts/ResearchContext'

// Types for messages and streaming events
interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: number
  sources?: string[]
}

interface StreamingEvent {
  type: string
  content: string
  stage?: string
  timestamp: string
  metadata?: any
  node_name?: string
  error?: string
}

// Tab types for research process display
type ResearchTab = 'steps' | 'sources' | 'thinking'

export default function ResearchInterface() {
  const { selectedModel, apiKey, isStreaming, setIsStreaming } = useResearchState()
  
  // State management
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingEvents, setStreamingEvents] = useState<StreamingEvent[]>([])
  const [apiCallLogs, setApiCallLogs] = useState<string[]>([])
  const [currentStage, setCurrentStage] = useState<string>('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentTypingStage, setCurrentTypingStage] = useState<string>('')
  const [activeTab, setActiveTab] = useState<ResearchTab>('steps')
  const [finalReportContent, setFinalReportContent] = useState<string>('')
  const [researchSources, setResearchSources] = useState<string[]>([])
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Extract sources from content
  const extractSourcesFromContent = (content: string): string[] => {
    const urlRegex = /https?:\/\/[^\s]+/g
    const matches = content.match(urlRegex) || []
    return [...new Set(matches)]
  }

  // Calculate research progress
  const calculateProgress = (): number => {
    if (!streamingEvents.length) return 0
    const stages = ['clarification', 'research_brief', 'research_execution', 'final_report']
    const currentStageIndex = stages.findIndex(stage => currentStage?.includes(stage))
    return ((currentStageIndex + 1) / stages.length) * 100
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !apiKey.trim() || isStreaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    setStreamingEvents([])
    setApiCallLogs([])
    setCurrentStage('')
    setFinalReportContent('')
    setResearchSources([])
    setActiveTab('steps')

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('http://localhost:8080/research/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          model: selectedModel,
          api_key: apiKey,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body reader available')
      }

      let buffer = ''
      let assistantMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: '',
        timestamp: Date.now(),
        sources: []
      }

      setMessages(prev => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6)) as StreamingEvent
              
              // Handle different event types
              if (eventData.type === 'stage_start' || eventData.type === 'stage_update') {
                setCurrentStage(eventData.stage || '')
                if (eventData.content) {
                  setStreamingEvents(prev => [...prev, eventData])
                }
              } else if (eventData.type === 'api_call') {
                const logEntry = `[${new Date(eventData.timestamp).toLocaleTimeString()}] 🔗 ${eventData.content}`
                setApiCallLogs(prev => [...prev, logEntry])
                setStreamingEvents(prev => [...prev, eventData])
              } else if (eventData.type === 'research_step') {
                setStreamingEvents(prev => [...prev, eventData])
              } else if (eventData.type === 'research_complete') {
                // Extract final report and sources
                const lastEvent = streamingEvents[streamingEvents.length - 1]
                if (lastEvent && lastEvent.content) {
                  setFinalReportContent(lastEvent.content)
                  const sources = extractSourcesFromContent(lastEvent.content)
                  setResearchSources(sources)
                  
                  assistantMessage.content = lastEvent.content
                  assistantMessage.sources = sources
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id ? assistantMessage : msg
                  ))
                }
              } else if (eventData.type === 'error') {
                setStreamingEvents(prev => [...prev, eventData])
              }

              // Update typing indicators
              if (eventData.stage) {
                setIsTyping(true)
                setCurrentTypingStage(eventData.stage)
                setTimeout(() => setIsTyping(false), 2000)
              }

            } catch (error) {
              console.error('Error parsing SSE data:', error)
            }
          }
        }
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Streaming error:', error)
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `❌ Error: ${error.message}`,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsStreaming(false)
      setCurrentStage('')
      setIsTyping(false)
    }
  }

  // Stop streaming
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsStreaming(false)
    setIsTyping(false)
  }

  // Export functions
  const exportToMarkdown = () => {
    const content = messages
      .filter(msg => msg.type === 'assistant')
      .map(msg => msg.content)
      .join('\n\n---\n\n')
    
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToPDF = () => {
    const content = messages
      .filter(msg => msg.type === 'assistant')
      .map(msg => `<div style="margin-bottom: 20px;">${msg.content.replace(/\n/g, '<br>')}</div>`)
      .join('')
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Research Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1, h2, h3 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Deep Research Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <hr>
          ${content}
        </body>
      </html>
    `
    
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Get stage icon
  const getStageIcon = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'clarification': return <User className="w-4 h-4" />
      case 'research_brief': return <FileText className="w-4 h-4" />
      case 'research_execution': return <Search className="w-4 h-4" />
      case 'final_report': return <CheckCircle className="w-4 h-4" />
      default: return <Lightbulb className="w-4 h-4" />
    }
  }

  // Render research steps (Perplexity-style)
  const renderResearchSteps = () => {
    const steps = streamingEvents.filter(event => 
      event.type === 'stage_start' || 
      event.type === 'stage_update' || 
      event.type === 'research_step'
    )

    return (
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={`step-${index}`} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {step.stage?.replace('_', ' ').toUpperCase() || 'Research Step'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {step.content}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {new Date(step.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900 animate-pulse">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {currentStage?.replace('_', ' ').toUpperCase() || 'Processing...'}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                AI is researching your query...
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render sources (Perplexity-style)
  const renderSources = () => {
    const allSources = [...new Set([...researchSources, ...apiCallLogs
      .join(' ')
      .match(/https?:\/\/[^\s]+/g) || []])]

    return (
      <div className="space-y-2">
        {allSources.map((source, index) => (
          <a
            key={`source-${index}`}
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
              {source.replace(/^https?:\/\//, '')}
            </span>
          </a>
        ))}
        {allSources.length === 0 && (
          <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            No sources available yet
          </div>
        )}
      </div>
    )
  }

  // Render thinking process
  const renderThinking = () => {
    return (
      <div className="space-y-2">
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
          <div className="font-mono text-xs space-y-1">
            {apiCallLogs.slice(-10).map((log, index) => (
              <div key={`thinking-${index}`} className="text-slate-600 dark:text-slate-400">
                {log}
              </div>
            ))}
            {apiCallLogs.length === 0 && isStreaming && (
              <div className="text-blue-500 animate-pulse">Initializing research...</div>
            )}
            {apiCallLogs.length === 0 && !isStreaming && (
              <div className="text-slate-500">No API calls yet</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Research Session</h2>
            <div className="flex items-center space-x-2">
              {/* Export Buttons */}
              {messages.some(msg => msg.type === 'assistant' && msg.content.length > 200) && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={exportToMarkdown}
                    className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-md flex items-center space-x-1 transition-colors"
                    title="Export as Markdown"
                  >
                    <Download className="w-3 h-3" />
                    <span>MD</span>
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 rounded-md flex items-center space-x-1 transition-colors"
                    title="Export as HTML"
                  >
                    <Download className="w-3 h-3" />
                    <span>HTML</span>
                  </button>
                </div>
              )}
              {isStreaming && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">Live</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          {isStreaming && (
            <div className="mt-3">
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000 ease-out"
                     style={{width: `${Math.min(calculateProgress(), 100)}%`}}></div>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Progress</span>
                <span>{Math.min(Math.round(calculateProgress()), 100)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Messages */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={`message-${message.id}-${index}-${message.timestamp}`}
                className={cn(
                  "flex items-start space-x-3",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.type !== 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div className={cn(
                  "max-w-3xl p-3 rounded-lg",
                  message.type === 'user' 
                    ? "bg-blue-600 text-white" 
                    : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                )}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Sources:</div>
                      <div className="flex flex-wrap gap-1">
                        {message.sources.slice(0, 3).map((source, idx) => (
                          <a
                            key={idx}
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            [{idx + 1}]
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {message.type === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Research Process Panel (Perplexity-style) */}
        {(streamingEvents.length > 0 || isStreaming) && (
          <div className="w-80 border-l border-slate-200 dark:border-slate-700 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('steps')}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === 'steps'
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Steps
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === 'sources'
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Sources
              </button>
              <button
                onClick={() => setActiveTab('thinking')}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === 'thinking'
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Brain className="w-4 h-4 inline mr-1" />
                Thinking
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {activeTab === 'steps' && renderResearchSteps()}
              {activeTab === 'sources' && renderSources()}
              {activeTab === 'thinking' && renderThinking()}
            </div>
          </div>
        )}
      </div>

      {/* Input Form - Always Fixed at Bottom */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
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
    </div>
  )
}