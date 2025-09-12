// Directory: yt-deepresearch-frontend/components/ResearchInterface.tsx
/**
 * Main research interface component
 * Handles streaming research with real-time visualization of AI thinking process
 * Similar to Perplexity and OpenAI's thinking mode
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertCircle, CheckCircle, Search, FileText, Lightbulb, ChevronDown, ChevronRight, ExternalLink, Link } from 'lucide-react'
import { cn, formatTimestamp, getModelDisplayName } from '@/lib/utils'
import { useResearchState, type StreamingEvent, type ResearchMessage } from '@/contexts/ResearchContext'

// Types imported from ResearchContext

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

const ResearchInterface = () => {
  const {
    messages,
    setMessages,
    streamingEvents,
    setStreamingEvents,
    currentStage,
    setCurrentStage,
    isStreaming,
    setIsStreaming,
    selectedModel,
    setSelectedModel,
    apiKey,
    setApiKey
  } = useResearchState()
  
  const [input, setInput] = useState('')
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set())
  const [isTyping, setIsTyping] = useState(false)
  const [currentTypingStage, setCurrentTypingStage] = useState('')
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
              if (event.stage) {
                setCurrentStage(event.stage)
                setCurrentTypingStage(event.stage)
                setIsTyping(true)
                // Clear typing indicator after a delay
                setTimeout(() => setIsTyping(false), 2000)
              }

              // Handle completion
              if (event.type === 'research_complete') {
                setIsStreaming(false)
                
                // Look for final report in all streaming events (including current one)
                setStreamingEvents(prevEvents => {
                  const allEvents = [...prevEvents, event]
                  
                  // Find final report content from any final_report_generation node
                  let finalReportContent = "Research completed successfully!"
                  
                  // Look for the final report in all events
                  const finalReportEvents = allEvents.filter(e => 
                    e.node_name === 'final_report_generation' && e.content
                  )
                  
                  if (finalReportEvents.length > 0) {
                    // Get the last final report event
                    const lastReportEvent = finalReportEvents[finalReportEvents.length - 1]
                    
                    // Try multiple patterns to extract the report
                    const patterns = [
                      /📄 Final Report: (.*)$/m,
                      /📄 Generated Report: (.*)$/m,
                      /📋 Generated Report: (.*)$/m,
                      /Final Report: (.*)$/m,
                      /Report \d+: (.*)$/m
                    ]
                    
                    for (const pattern of patterns) {
                      const match = lastReportEvent.content?.match(pattern)
                      if (match && match[1] && match[1].trim().length > 50) {
                        finalReportContent = match[1].trim()
                        break
                      }
                    }
                    
                    // If no pattern matched, use the full content if it's substantial
                    if (finalReportContent === "Research completed successfully!" && 
                        lastReportEvent.content && lastReportEvent.content.length > 100) {
                      finalReportContent = lastReportEvent.content
                    }
                  }
                  
                  // Add final research results as a new message
                  const finalMessage = {
                    id: (Date.now() + 2).toString(),
                    type: 'assistant' as const,
                    content: finalReportContent,
                    timestamp: new Date().toISOString(),
                    model: selectedModel
                  }
                  
                  setMessages(prev => [...prev.map(msg => 
                    msg.id === systemMessage.id 
                      ? { ...msg, content: `Research completed in ${event.duration?.toFixed(1)}s`, isStreaming: false }
                      : msg
                  ), finalMessage])
                  
                  return allEvents
                })
              } else {
                // For non-completion events, just add to the list
                setStreamingEvents(prev => [...prev, event])
              }

              // Handle errors with better UX
              if (event.type === 'error') {
                setIsStreaming(false)
                setIsTyping(false)
                const errorMessage = event.error || event.content || 'An unexpected error occurred'
                
                // Add retry button for certain errors
                const isRetryableError = errorMessage.includes('500') || errorMessage.includes('rate limit') || errorMessage.includes('timeout')
                const displayMessage = isRetryableError 
                  ? `${errorMessage} - This might be temporary. You can try again.`
                  : `Error: ${errorMessage}`
                
                setMessages(prev => prev.map(msg => 
                  msg.id === systemMessage.id 
                    ? { ...msg, content: displayMessage, isStreaming: false }
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

  const toggleEventExpansion = (index: number) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedEvents(newExpanded)
  }

  const extractSourcesFromContent = (content: string): string[] => {
    const sources: string[] = []
    
    // Extract URLs from content
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g
    const urls = content.match(urlRegex) || []
    sources.push(...urls)
    
    // Extract potential source mentions
    const sourcePatterns = [
      /SOURCE:\s*([^\n]+)/gi,
      /Source:\s*([^\n]+)/gi,
      /from\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
      /according to\s+([^\n,]+)/gi,
      /cited from\s+([^\n,]+)/gi
    ]
    
    sourcePatterns.forEach(pattern => {
      const matches = content.match(pattern) || []
      sources.push(...matches.map(match => match.replace(pattern, '$1').trim()))
    })
    
    return [...new Set(sources)].filter(source => source.length > 3)
  }

  const isEventExpandable = (event: StreamingEvent): boolean => {
    return Boolean(event.content && (
      event.content.length > 200 ||
      event.content.includes('\n') ||
      event.type === 'research_finding' ||
      event.type === 'research_summary' ||
      event.node_name === 'write_research_brief' ||
      event.node_name === 'research_supervisor' ||
      extractSourcesFromContent(event.content).length > 0
    ))
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Research Session</h2>
            {isStreaming && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Live</span>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          {isStreaming && (
            <div className="mt-3">
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000 ease-out"
                     style={{width: `${Math.min((streamingEvents.length / 4) * 100, 100)}%`}}></div>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Progress</span>
                <span>{Math.min(Math.round((streamingEvents.length / 4) * 100), 100)}%</span>
              </div>
            </div>
          )}
          
          {currentStage && (
            <div className="flex items-center space-x-2 mt-3 text-sm text-slate-600 dark:text-slate-400">
              {getStageIcon(currentStage)}
              <span>Current Stage: {currentStage.replace('_', ' ').toUpperCase()}</span>
              {isTyping && currentTypingStage === currentStage && (
                <div className="flex items-center space-x-1 ml-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  </div>
                  <span className="text-blue-500 font-medium">AI thinking...</span>
                </div>
              )}
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
                  <div className="space-y-3 max-h-80 overflow-y-auto scroll-smooth">
                {streamingEvents.slice(-20).map((event, index) => {
                  const actualIndex = streamingEvents.length - 20 + index
                  const isExpanded = expandedEvents.has(actualIndex)
                  const isExpandable = isEventExpandable(event)
                  const sources = event.content ? extractSourcesFromContent(event.content) : []
                  const isNewEvent = index === streamingEvents.slice(-20).length - 1
                  
                  return (
                    <div
                      key={actualIndex}
                      className={cn(
                        "text-xs p-4 rounded-lg border-l-4 transition-all duration-300 ease-out",
                        "transform hover:scale-[1.01] hover:shadow-lg",
                        getEventTypeColor(event.type),
                        isExpandable && "cursor-pointer",
                        isNewEvent && "animate-in slide-in-from-right-2 fade-in duration-500"
                      )}
                      onClick={isExpandable ? () => toggleEventExpansion(actualIndex) : undefined}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {isExpandable && (
                            isExpanded ? 
                              <ChevronDown className="w-3 h-3 text-gray-500" /> : 
                              <ChevronRight className="w-3 h-3 text-gray-500" />
                          )}
                          <span className="font-medium">
                            {event.type.replace('_', ' ').toUpperCase()}
                            {event.stage && ` - ${event.stage.replace('_', ' ')}`}
                            {event.node_name && ` (${event.node_name})`}
                          </span>
                          {sources.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Link className="w-3 h-3 text-blue-500" />
                              <span className="text-blue-500 font-medium">{sources.length} source{sources.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                        <span className="opacity-70">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                      
                      {event.content && (
                        <div className="mt-2 opacity-90">
                          {isExpanded || !isExpandable ? (
                            // Show full content
                            <div className="space-y-2">
                              <div className="whitespace-pre-wrap">
                                {event.content}
                              </div>
                              
                              {/* Show sources if available */}
                              {sources.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    📎 Sources & References:
                                  </div>
                                  <div className="space-y-1">
                                    {sources.map((source, sourceIndex) => (
                                      <div key={sourceIndex} className="flex items-center space-x-2">
                                        <ExternalLink className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                        {source.startsWith('http') ? (
                                          <a 
                                            href={source} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 dark:text-blue-400 hover:underline text-xs break-all"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {source}
                                          </a>
                                        ) : (
                                          <span className="text-gray-600 dark:text-gray-400 text-xs">
                                            {source}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Show truncated content with expand hint
                            <div>
                              <div>
                                {event.content.length > 150 
                                  ? `${event.content.slice(0, 150)}...` 
                                  : event.content
                                }
                              </div>
                              {isExpandable && (
                                <div className="mt-1 text-blue-500 font-medium">
                                  Click to expand {sources.length > 0 && `• ${sources.length} source${sources.length > 1 ? 's' : ''} available`}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
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
