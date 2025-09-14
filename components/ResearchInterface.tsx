// Directory: yt-deepresearch-frontend/components/ResearchInterface.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, AlertCircle, Download, ExternalLink, Brain, Menu, X, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useResearchState } from '@/contexts/ResearchContext'
import { createGoogleDoc } from '@/lib/googleDocs'

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
  metadata?: Record<string, unknown>
  node_name?: string
  error?: string
}

// Tab types for research process display
type ResearchTab = 'thinking' | 'sources'

export default function ResearchInterface() {
  const { selectedModel, apiKey, isStreaming, setIsStreaming } = useResearchState()
  
  // Backend URL configuration
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
  
  // State management
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([]) // Keep for chat history cache
  const [streamingEvents, setStreamingEvents] = useState<StreamingEvent[]>([])
  const [apiCallLogs, setApiCallLogs] = useState<string[]>([])
  const [currentStage, setCurrentStage] = useState<string>('')
  const [activeTab, setActiveTab] = useState<ResearchTab>('thinking')
  const [finalReportContent, setFinalReportContent] = useState<string>('')
  const [researchSources, setResearchSources] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false) // Mobile sidebar state
  
  // New state for Perplexity-style interface
  const [currentQuery, setCurrentQuery] = useState<string>('')
  const [researchBrief, setResearchBrief] = useState<string>('')
  const [streamingContent, setStreamingContent] = useState<string>('')
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Persist/load session data so chat history survives tab switches
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('dra_session_v1')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.messages) setMessages(parsed.messages)
        if (parsed.streamingEvents) setStreamingEvents(parsed.streamingEvents)
        if (parsed.apiCallLogs) setApiCallLogs(parsed.apiCallLogs)
        if (parsed.finalReportContent) setFinalReportContent(parsed.finalReportContent)
        if (parsed.researchSources) setResearchSources(parsed.researchSources)
        if (parsed.activeTab) setActiveTab(parsed.activeTab)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const payload = {
        messages,
        streamingEvents,
        apiCallLogs,
        finalReportContent,
        researchSources,
        activeTab,
      }
      sessionStorage.setItem('dra_session_v1', JSON.stringify(payload))
    } catch {}
  }, [messages, streamingEvents, apiCallLogs, finalReportContent, researchSources, activeTab])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-fix: Force display final report if research is complete but fallback message is showing
  useEffect(() => {
    if (currentStage === 'completed' && 
        finalReportContent && 
        streamingContent.includes('check the Thinking Steps tab')) {
      console.log('Auto-fix triggered: Forcing final report display')
      setTimeout(() => setStreamingContent(finalReportContent), 500)
    }
    
    // Additional auto-fix: If we have thinking steps with final report but main chat shows "Starting research"
    if (!isStreaming && streamingEvents.length > 0 && streamingContent.includes('Starting deep research')) {
      const finalReportEvent = streamingEvents.find(e => 
        e.stage === 'Final_report' || 
        (e.content && e.content.includes('# Top 5') && e.content.length > 1000)
      )
      if (finalReportEvent && finalReportEvent.content) {
        console.log('Auto-fix: Found final report in thinking steps, displaying in main chat')
        setFinalReportContent(finalReportEvent.content)
        setStreamingContent(finalReportEvent.content)
        setCurrentStage('completed')
      }
    }
  }, [currentStage, finalReportContent, streamingContent, isStreaming, streamingEvents])

  // Extract sources from content
  const extractSourcesFromContent = (content: string): string[] => {
    const urlRegex = /https?:\/\/[^\s\])+,;]+/g
    const matches = content.match(urlRegex) || []
    // Clean up URLs by removing trailing punctuation and brackets
    const cleanedUrls = matches.map(url => 
      url.replace(/[,;)\]]+$/, '').replace(/^\[/, '')
    )
    return [...new Set(cleanedUrls)]
  }

  // Collect all sources from streaming events and API logs
  const getAllSources = (): string[] => {
    const allSources = new Set<string>()
    
    // Extract from research sources state
    researchSources.forEach(source => allSources.add(source))
    
    // Extract from streaming events, especially sources_found events
    streamingEvents.forEach(event => {
      // Handle sources_found events specifically
      if (event.type === 'sources_found' && event.metadata?.sources && Array.isArray(event.metadata.sources)) {
        (event.metadata.sources as string[]).forEach(source => allSources.add(source))
      }
      
      // Extract from event content
      if (event.content) {
        const sources = extractSourcesFromContent(event.content)
        sources.forEach(source => allSources.add(source))
      }
    })
    
    // Extract from API call logs
    apiCallLogs.forEach(log => {
      const sources = extractSourcesFromContent(log)
      sources.forEach(source => allSources.add(source))
    })
    
    // Extract from final report content
    if (finalReportContent) {
      const sources = extractSourcesFromContent(finalReportContent)
      sources.forEach(source => allSources.add(source))
    }
    
    // Extract from streaming content
    if (streamingContent) {
      const sources = extractSourcesFromContent(streamingContent)
      sources.forEach(source => allSources.add(source))
    }
    
    return Array.from(allSources).filter(url => url.length > 10) // Filter out very short URLs
  }

  // Calculate research progress
  const calculateProgress = (): number => {
    if (!isStreaming && finalReportContent) return 100
    if (currentStage === 'completed') return 100
    if (streamingEvents.length === 0) return 0
    
    const stages = ['initialization', 'clarification', 'research_brief', 'research_execution', 'final_report', 'completed']
    const currentStageIndex = stages.findIndex(stage => currentStage?.includes(stage))
    if (currentStageIndex === -1) return 10
    
    // More granular progress based on events within each stage
    const baseProgress = (currentStageIndex / (stages.length - 1)) * 100
    const researchEvents = streamingEvents.filter(e => e.type === 'research_step' || e.type === 'research_finding')
    const progressBonus = Math.min(10, researchEvents.length * 2) // Up to 10% bonus for research activity
    
    return Math.min(100, Math.max(5, baseProgress + progressBonus))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !apiKey.trim() || isStreaming) return

    // Store current research in chat history if it exists
    if (currentQuery && (streamingContent || finalReportContent)) {
      const completedResearch: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: finalReportContent || streamingContent,
        timestamp: Date.now(),
        sources: researchSources
      }
      setMessages(prev => [...prev, {
        id: `query-${Date.now()}`,
        type: 'user',
        content: currentQuery,
        timestamp: Date.now()
      }, completedResearch])
    }

    // Store the query before setting up new research
    const queryToSend = input.trim()
    
    // Set up new research
    setCurrentQuery(queryToSend)
    setInput('')
    setIsStreaming(true)
    setStreamingEvents([])
    setApiCallLogs([])
    setCurrentStage('')
    setFinalReportContent('')
    setStreamingContent('')
    setResearchBrief('')
    setResearchSources([])
    setActiveTab('thinking')

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`${BACKEND_URL}/research/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryToSend,
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
                // Always add stage events to show workflow progression
                setStreamingEvents(prev => [...prev, {
                  ...eventData,
                  content: eventData.content || `Processing ${eventData.stage?.replace('_', ' ')} stage...`
                }])

                // Handle streaming content for Perplexity-style interface
                if (eventData.stage === 'write_research_brief' && eventData.content && eventData.content.length > 100) {
                  setResearchBrief(eventData.content)
                  // Show research brief in main chat like Perplexity
                  setStreamingContent(`## 📋 Research Strategy\n\n${eventData.content}\n\n---\n\n## 🔍 Research Progress\n\n*Starting comprehensive research...*`)
                } else if ((eventData.stage === 'final_report_generation' || eventData.stage === 'Final_report' || eventData.stage?.toLowerCase().includes('final')) && eventData.content && eventData.content.length > 100) {
                  // CRITICAL: Store the final report content immediately
                  console.log('Storing final report content from stage:', eventData.stage, eventData.content.substring(0, 100) + '...')
                  setFinalReportContent(eventData.content)
                  
                  // Extract sources immediately
                  const sources = extractSourcesFromContent(eventData.content)
                  setResearchSources(sources)
                  
                  // IMMEDIATELY show the final report in main chat - no waiting!
                  console.log('IMMEDIATELY displaying final report in main chat')
                  setStreamingContent(eventData.content)
                } else if (eventData.stage === 'research_execution' && eventData.content && eventData.content.length > 100) {
                  // Show research progress in main chat
                  setStreamingContent(() => {
                    const baseContent = researchBrief ? `## 📋 Research Strategy\n\n${researchBrief}\n\n---\n\n` : ''
                    return `${baseContent}## 🔍 Research Progress\n\n${eventData.content}\n\n*Analyzing findings and preparing final report...*`
                  })
                }
              } else if (eventData.type === 'sources_found') {
                // Handle sources found events
                if (eventData.metadata?.sources && Array.isArray(eventData.metadata.sources)) {
                  setResearchSources(prev => [...prev, ...eventData.metadata!.sources as string[]])
                }
                setStreamingEvents(prev => [...prev, eventData])
              } else if (eventData.type === 'research_step' || eventData.type === 'research_finding') {
                // Handle detailed research progress events - show in main chat like Perplexity
                setStreamingEvents(prev => [...prev, eventData])
                
                // Update main chat with live research progress (with expandable content)
                if (eventData.content && eventData.content.length > 20) {
                  setStreamingContent(prev => {
                    const baseContent = researchBrief ? `## 📋 Research Strategy\n\n${researchBrief}\n\n---\n\n` : ''
                    
                    // Create expandable content if it's too long
                    let displayContent = eventData.content
                    if (displayContent.length > 200) {
                      const preview = displayContent.substring(0, 200) + '...'
                      // Escape HTML in the full content to prevent issues
                      const fullContentEscaped = eventData.content
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;')
                      displayContent = `${preview}\n\n<details class="cursor-pointer"><summary class="text-blue-600 hover:text-blue-800 font-medium">▼ Show full content</summary><div class="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded whitespace-pre-wrap">${fullContentEscaped}</div></details>`
                    }
                    
                    // If this is the first research step, start fresh
                    if (prev.includes('*Starting comprehensive research...*') || prev.includes('*Conducting comprehensive research...*')) {
                      return `${baseContent}## 🔍 Research Progress\n\n${displayContent}\n\n*Research in progress...*`
                    }
                    
                    // If we already have research progress, append new steps
                    if (prev.includes('## 🔍 Research Progress')) {
                      // Replace the "Research in progress..." with new content
                      const beforeProgress = prev.split('## 🔍 Research Progress')[0]
                      const existingSteps = prev.split('## 🔍 Research Progress')[1]?.split('*Research in progress...*')[0] || ''
                      return `${beforeProgress}## 🔍 Research Progress\n\n${existingSteps}\n\n${displayContent}\n\n*Research in progress...*`
                    }
                    
                    // Fallback: append to existing content
                    return `${prev}\n\n${displayContent}`
                  })
                }
              } else if (eventData.type === 'research_complete' || eventData.type === 'stage_complete') {
                // Handle completion events - show final report in main chat like Perplexity
                setIsStreaming(false)
                setCurrentStage('completed')
                setStreamingEvents(prev => [...prev, eventData])
                
                // SIMPLE AND DIRECT: Just find the damn final report and show it
                const showFinalReport = () => {
                  console.log('=== FINAL REPORT SEARCH START ===')
                  console.log('Current finalReportContent:', finalReportContent?.substring(0, 100))
                  console.log('EventData content:', eventData.content?.substring(0, 100))
                  
                  // Get ALL events including the current one
                  const allEvents = [...streamingEvents, eventData]
                  console.log('Total events to search:', allEvents.length)
                  
                  // Find ANY event with substantial content - be very liberal
                  let reportContent = finalReportContent
                  
                  if (!reportContent) {
                    // Look for final report stages (multiple variations)
                    const finalReportEvent = allEvents.find(e => e.content && (
                      e.stage === 'final_report_generation' ||
                      e.stage === 'Final_report' ||
                      e.stage?.toLowerCase().includes('final') ||
                      e.stage?.toLowerCase().includes('report')
                    ))
                    if (finalReportEvent) {
                      reportContent = finalReportEvent.content
                      console.log('Found via final report stage:', finalReportEvent.stage, reportContent.substring(0, 100))
                    }
                  }
                  
                  if (!reportContent) {
                    // Look for any event with report-like patterns
                    const titleEvent = allEvents.find(e => e.content && (
                      e.content.includes('# Top') || 
                      e.content.includes('## AI') ||
                      e.content.includes('**Tweet:**') ||
                      e.content.includes('## Introduction') ||
                      e.content.includes('## Frame AI') ||
                      e.content.includes('### Tweet Summary') ||
                      (e.content.includes('startup') && e.content.includes('#'))
                    ))
                    if (titleEvent) {
                      reportContent = titleEvent.content
                      console.log('Found via title patterns:', reportContent.substring(0, 100))
                    }
                  }
                  
                  if (!reportContent) {
                    // Look for ANY long content that might be the report
                    const longEvent = allEvents.find(e => e.content && e.content.length > 1000)
                    if (longEvent) {
                      reportContent = longEvent.content
                      console.log('Found via length heuristic:', reportContent.substring(0, 100))
                    }
                  }
                  
                  if (!reportContent) {
                    // Last resort: look for ANY content with relevant keywords
                    const relevantEvent = allEvents.find(e => e.content && e.content.length > 200 && (
                      e.content.includes('startup') || 
                      e.content.includes('AI') || 
                      e.content.includes('B2C') ||
                      e.content.includes('#')
                    ))
                    if (relevantEvent) {
                      reportContent = relevantEvent.content
                      console.log('Found via keyword search:', reportContent.substring(0, 100))
                    }
                  }
                  
                  console.log('=== FINAL DECISION ===')
                  if (reportContent) {
                    console.log('✅ SHOWING FINAL REPORT:', reportContent.substring(0, 200))
                    setFinalReportContent(reportContent)
                    setStreamingContent(reportContent)
                  } else {
                    console.log('❌ NO REPORT FOUND - Event details:')
                    allEvents.forEach((e, i) => {
                      console.log(`Event ${i}:`, {
                        type: e.type,
                        stage: e.stage,
                        contentLength: e.content?.length,
                        contentPreview: e.content?.substring(0, 50)
                      })
                    })
                    setStreamingContent('## ✅ Research Complete\n\nResearch has been completed successfully. The detailed report is available in the **Thinking Steps** tab on the right.\n\n*If you don\'t see the final report here, please check the Thinking Steps tab for the complete analysis.*')
                  }
                }
                
                // Show immediately
                showFinalReport()
              } else if (eventData.type === 'api_call') {
                const logEntry = `[${new Date(eventData.timestamp).toLocaleTimeString()}] 🔗 ${eventData.content}`
                setApiCallLogs(prev => [...prev, logEntry])
                setStreamingEvents(prev => [...prev, eventData])
                // Extract sources from API call content
                if (eventData.content) {
                  const apiSources = extractSourcesFromContent(eventData.content)
                  if (apiSources.length > 0) {
                    setResearchSources(prev => [...new Set([...prev, ...apiSources])])
                  }
                }
              } else if (eventData.type === 'research_step') {
                // Add detailed research step information with better content
                const enhancedEvent = {
                  ...eventData,
                  content: eventData.content || `Research step ${streamingEvents.filter(e => e.type === 'research_step').length + 1}: Conducting comprehensive analysis...`,
                  timestamp: eventData.timestamp || new Date().toISOString()
                }
                setStreamingEvents(prev => [...prev, enhancedEvent])
                
                // Extract and update sources from research steps
                if (eventData.content) {
                  const stepSources = extractSourcesFromContent(eventData.content)
                  if (stepSources.length > 0) {
                    setResearchSources(prev => [...new Set([...prev, ...stepSources])])
                  }
                }

                // Update streaming content with progress during research (more frequently for transparency)
                const currentStepCount = streamingEvents.filter(e => e.type === 'research_step').length + 1
                const researchProgress = `${researchBrief ? `## 📋 Research Strategy\n\n${researchBrief}\n\n---\n\n` : ''}🔍 **Research in Progress** (Step ${currentStepCount})\n\n${eventData.content || 'Conducting comprehensive analysis...'}\n\n*Gathering information from multiple sources...*`
                setStreamingContent(researchProgress)
              } else if (eventData.type === 'research_planning') {
                // Handle research planning steps
                setStreamingEvents(prev => [...prev, {
                  ...eventData,
                  content: eventData.content || 'Planning research strategy and identifying key information sources...'
                }])
                // Show planning in main content
                setStreamingContent(`${researchBrief ? `## 📋 Research Strategy\n\n${researchBrief}\n\n---\n\n` : ''}📝 **Planning Research**\n\n${eventData.content || 'Developing comprehensive research strategy and identifying key sources...'}`)
              } else if (eventData.type === 'research_analysis') {
                // Handle research analysis steps
                setStreamingEvents(prev => [...prev, {
                  ...eventData,
                  content: eventData.content || 'Analyzing findings from multiple sources and cross-referencing information...'
                }])
                // Show analysis in main content
                setStreamingContent(`${researchBrief ? `## 📋 Research Strategy\n\n${researchBrief}\n\n---\n\n` : ''}📊 **Analyzing Data**\n\n${eventData.content || 'Analyzing findings from multiple sources and cross-referencing information...'}`)
              } else if (eventData.type === 'research_synthesis') {
                // Handle research synthesis steps
                setStreamingEvents(prev => [...prev, {
                  ...eventData,
                  content: eventData.content || 'Synthesizing findings and preparing comprehensive analysis...'
                }])
                // Show synthesis in main content
                setStreamingContent(`${researchBrief ? `## 📋 Research Strategy\n\n${researchBrief}\n\n---\n\n` : ''}🧩 **Synthesizing Results**\n\n${eventData.content || 'Synthesizing findings and preparing comprehensive analysis...'}`)
              } else if (eventData.type === 'research_complete') {
                // Handle final report completion
                if (eventData.content) {
                  setFinalReportContent(eventData.content)
                  setStreamingContent(eventData.content)
                  const sources = extractSourcesFromContent(eventData.content)
                  setResearchSources(sources)
                }
                setStreamingEvents(prev => [...prev, eventData])
              } else if (eventData.type === 'final_report') {
                // Handle final report content
                if (eventData.content) {
                  setFinalReportContent(eventData.content)
                  setStreamingContent(eventData.content)
                  const sources = extractSourcesFromContent(eventData.content)
                  setResearchSources(sources)
                }
                setStreamingEvents(prev => [...prev, eventData])
              } else if (eventData.type === 'error') {
                setStreamingEvents(prev => [...prev, eventData])
              }

            } catch (error) {
              console.error('Error parsing SSE data:', error)
            }
          }
        }
      }

    } catch (error: unknown) {
      const errorMessage = error as Error
      if (errorMessage.name !== 'AbortError') {
        console.error('Streaming error:', error)
        setStreamingContent(`❌ **Research Error**\n\n${errorMessage.message}\n\nPlease try again or check your API key.`)
      }
    } finally {
      setIsStreaming(false)
      setCurrentStage('')
    }
  }

  // Stop streaming
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsStreaming(false)
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

  // Export to Google Docs function
  const exportToGoogleDocs = async () => {
    if (!finalReportContent && !streamingContent) {
      alert('No research report to export. Please complete a research first.')
      return
    }

    const reportContent = finalReportContent || streamingContent
    const sources = getAllSources()
    
    // Create a comprehensive document
    const docContent = `${currentQuery || 'Deep Research Report'}

Generated on: ${new Date().toLocaleString()}
Model Used: ${selectedModel === 'anthropic' ? 'Claude 4' : selectedModel === 'openai' ? 'GPT-5' : 'Kimi K2 0905 Preview'}

${reportContent}

Sources and References:
${sources.length > 0 ? sources.map((source, index) => `${index + 1}. ${source}`).join('\n') : 'No sources found.'}

Generated by Deep Research Agent v2`

    try {
      // Create the Google Doc using OAuth and open it for the user.
      const title = currentQuery || 'Deep Research Report'
      const { url } = await createGoogleDoc({ title, body: docContent })
      window.open(url, '_blank')
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Google Docs export failed: ${(error as Error).message}. You can still use Copy for Docs as a fallback.`)
    }
  }

  // Copy to clipboard for easy Google Docs pasting
  const copyForGoogleDocs = async () => {
    if (!finalReportContent && !streamingContent) {
      alert('No research report to copy. Please complete a research first.')
      return
    }

    const reportContent = finalReportContent || streamingContent
    const sources = getAllSources()
    
    const docContent = `${currentQuery || 'Deep Research Report'}

Generated on: ${new Date().toLocaleString()}
Model Used: ${selectedModel === 'anthropic' ? 'Claude 4' : selectedModel === 'openai' ? 'GPT-5' : 'Kimi K2 0905 Preview'}

${reportContent}

Sources and References:
${sources.length > 0 ? sources.map((source, index) => `${index + 1}. ${source}`).join('\n') : 'No sources found.'}

Generated by Deep Research Agent v2`

    try {
      await navigator.clipboard.writeText(docContent)
      alert('Research report copied to clipboard! You can now paste it directly into a Google Doc.')
    } catch (error) {
      console.error('Copy failed:', error)
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = docContent
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Research report copied to clipboard! You can now paste it directly into a Google Doc.')
    }
  }

  // Render main research content (Perplexity-style)
  const renderResearchContent = () => {
    if (!currentQuery) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Start Your Research
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Ask a question to begin comprehensive AI-powered research
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Query Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {currentQuery}
            </h1>
            {/* Export buttons - show when research is complete OR we have substantial content */}
            {(() => {
              const shouldShow = ((currentStage === 'completed') || (!isStreaming && (finalReportContent || (streamingContent && streamingContent.length > 500))))
              console.log('Export buttons condition:', {
                currentStage,
                isStreaming,
                hasFinalReport: !!finalReportContent,
                streamingContentLength: streamingContent?.length,
                shouldShow
              })
              return shouldShow
            })() && (
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={copyForGoogleDocs}
                  className="flex items-center space-x-1 px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md transition-colors"
                  aria-label="Copy for Docs"
                  title="Copy for Google Docs"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={exportToGoogleDocs}
                  className="flex items-center space-x-1 px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md transition-colors"
                  aria-label="Export to Google Docs"
                  title="Export to Google Docs"
                >
                  <img src="/google-docs.svg" alt="Google Docs" className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          {isStreaming && (
            <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Researching...</span>
            </div>
          )}
        </div>

        {/* Research Brief (if available) - Don't show separately since it's in streaming content */}

        {/* Show Final Report Button - when research is done but final report not showing */}
        {(() => {
          const finalReportInSteps = streamingEvents.find(e => 
            e.stage === 'Final_report' || 
            (e.content && e.content.includes('# Top 5') && e.content.length > 1000)
          )
          const shouldShowButton = !isStreaming && 
                                   finalReportInSteps && 
                                   (streamingContent.includes('Starting deep research') || 
                                    streamingContent.includes('check the Thinking Steps tab'))
          
          return shouldShowButton ? (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                ✨ Research completed! Final report is ready to display.
              </p>
              <button 
                onClick={() => {
                  console.log('Manual: Showing final report from thinking steps')
                  if (finalReportInSteps && finalReportInSteps.content) {
                    setFinalReportContent(finalReportInSteps.content)
                    setStreamingContent(finalReportInSteps.content)
                    setCurrentStage('completed')
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                📄 Show Final Report
              </button>
            </div>
          ) : null
        })()}
        
        {/* Debug button - only show when research is complete and we have final report content */}
        {currentStage === 'completed' && finalReportContent && streamingContent.includes('check the Thinking Steps tab') && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              🐛 Final report detected but not displayed. 
            </p>
            <button 
              onClick={() => {
                console.log('Manual override: showing final report')
                setStreamingContent(finalReportContent)
              }}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
            >
              Show Final Report
            </button>
          </div>
        )}

        {/* Main Research Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          {streamingContent || finalReportContent ? (
            <div 
              className="markdown-content space-y-4"
              style={{
                lineHeight: '1.7',
                fontSize: '16px'
              }}
              dangerouslySetInnerHTML={{
                __html: (finalReportContent || streamingContent)
                  // Convert markdown to HTML for better rendering
                  .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3 mt-6">$1</h3>')
                  .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-4 mt-8">$1</h2>')
                  .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 mt-8">$1</h1>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors">$1</a>')
                  .replace(/(?<!\]\()https?:\/\/[^\s<>"{}|\\^`[\]]+/g, '<a href="$&" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors break-all">$&</a>')
                  // Handle lists
                  .replace(/^\- (.*$)/gm, '<li class="ml-4 mb-2">$1</li>')
                  .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 mb-2">$2</li>')
                  // Handle paragraphs
                  .split('\n\n')
                  .map(para => {
                    if (para.includes('<h1') || para.includes('<h2') || para.includes('<h3')) {
                      return para
                    } else if (para.includes('<li')) {
                      return `<ul class="list-disc ml-6 mb-4 space-y-1">${para}</ul>`
                    } else if (para.trim()) {
                      return `<p class="mb-4 text-slate-700 dark:text-slate-300">${para}</p>`
                    }
                    return ''
                  })
                  .join('')
                  // Clean up empty elements
                  .replace(/<p class="mb-4 text-slate-700 dark:text-slate-300"><\/p>/g, '')
              }}
            />
          ) : isStreaming ? (
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                AI is conducting comprehensive research...
              </p>
            </div>
          ) : (
            <p className="text-slate-600 dark:text-slate-400">
              Starting research process...
            </p>
          )}
        </div>

        {/* Sources (inline, like Perplexity) */}
        {researchSources.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Sources</h3>
            <div className="flex flex-wrap gap-2">
              {researchSources.slice(0, 6).map((source, index) => {
                const domain = source.replace(/^https?:\/\//, '').split('/')[0]
                return (
                  <a
                    key={index}
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{domain}</span>
                  </a>
                )
              })}
              {researchSources.length > 6 && (
                <span className="text-xs text-slate-500">+{researchSources.length - 6} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render thinking steps with vertical timeline (combines old Steps + Thinking)
  const renderThinkingSteps = () => {
    // Combine all streaming events and API logs for comprehensive timeline
    const allEvents = [
      ...streamingEvents,
      ...apiCallLogs.map(log => ({
        type: 'api_log',
        content: log,
        timestamp: new Date().toISOString(),
        stage: 'api_call'
      } as StreamingEvent))
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    const getTimelineIcon = (event: StreamingEvent) => {
      const stage = event.stage || event.type
      switch (stage) {
        case 'clarification': 
        case 'clarify_with_user': return '❓'
        case 'write_research_brief': return '📋'
        case 'research_execution': return '🔍'
        case 'research_step': return '🔬'
        case 'research_planning': return '📝'
        case 'research_analysis': return '📊'
        case 'research_synthesis': return '🧩'
        case 'final_report_generation': return '📄'
        case 'api_call': 
        case 'api_log': return '🌐'
        default: return '⚙️'
      }
    }

    const getStageTitle = (event: StreamingEvent) => {
      const stage = event.stage || event.type
      switch (stage) {
        case 'clarification': return 'Query Clarification'
        case 'clarify_with_user': return 'User Interaction Check'
        case 'write_research_brief': return 'Research Brief Creation'
        case 'research_execution': return 'Research Execution'
        case 'research_step': return 'Research Analysis'
        case 'research_planning': return 'Research Planning'
        case 'research_analysis': return 'Data Analysis'
        case 'research_synthesis': return 'Information Synthesis'
        case 'final_report_generation': return 'Final Report Generation'
        case 'api_call': return 'API Request'
        case 'api_log': return 'External Search'
        default: return stage?.charAt(0).toUpperCase() + stage?.slice(1) || 'Processing'
      }
    }


    if (allEvents.length === 0 && !isStreaming) {
      return (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No thinking steps yet. Start a research query to see the AI&apos;s reasoning process.</p>
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {/* Vertical Timeline */}
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200 dark:from-blue-800 dark:via-purple-800 dark:to-green-800"></div>
          
          {allEvents.map((event, index) => (
            <div key={`timeline-${index}-${event.timestamp}`} className="relative flex items-start pb-4">
              {/* Timeline Node */}
              <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-blue-600 flex items-center justify-center shadow-sm">
                <span className="text-sm">{getTimelineIcon(event)}</span>
              </div>
              
              {/* Content Card */}
              <div className="ml-4 flex-1 min-w-0">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-3 group">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                      {getStageTitle(event)}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {/* Show in Chat button for Final Report entries */}
                      {(() => {
                        const stage = (event.stage || '').toLowerCase()
                        const isFinal = stage.includes('final') || stage.includes('report')
                        return isFinal && event.content ? (
                          <button
                            onClick={() => {
                              // Show this final report content in main chat.
                              // Notes: Keep updates atomic to avoid flicker.
                              setFinalReportContent(event.content!)
                              setStreamingContent(event.content!)
                              setCurrentStage('completed')
                              // Ensure a title is present so the center panel renders even if no prior query.
                              if (!currentQuery) {
                                const prettyStage = (event.stage || 'Final Report').replace(/_/g, ' ')
                                setCurrentQuery(prettyStage)
                              }
                              // Extract sources from the clicked content for the Sources tab.
                              const urls = extractSourcesFromContent(event.content!)
                              if (urls.length > 0) setResearchSources(urls)
                            }}
                            className="m-2 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 border border-blue-200 dark:border-blue-800 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            title="Show this report in the main chat"
                          >
                            Show in Chat
                          </button>
                        ) : null
                      })()}
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  {event.content && (
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {event.type === 'api_log' ? (
                        <div className="font-mono text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded border whitespace-pre-wrap">
                          {event.content}
                        </div>
                      ) : event.stage === 'write_research_brief' && event.content.length > 100 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-blue-700 dark:text-blue-300">📋 Research Brief:</div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                            {event.content}
                          </div>
                        </div>
                      ) : ((event.stage === 'final_report_generation' || (event.stage && event.stage.toLowerCase().includes('final'))) && event.content.length > 100) ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-green-700 dark:text-green-300">📄 Final Report:</div>
                          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                            {event.content}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs whitespace-pre-wrap">
                          {event.content || 'Processing...'}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Metadata */}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                        View metadata
                      </summary>
                      <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        
        {/* Current processing indicator with more detail */}
        {isStreaming && (
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 animate-pulse">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white animate-ping"></div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {currentStage === 'research_supervisor' ? 'Deep Research in Progress' :
                 currentStage?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Processing...'}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {currentStage === 'research_supervisor' 
                  ? 'AI is conducting comprehensive research, analyzing multiple sources, and gathering detailed information...'
                  : currentStage === 'clarification'
                  ? 'Analyzing your query and determining research scope...'
                  : currentStage === 'research_brief'
                  ? 'Creating detailed research plan and strategy...'
                  : currentStage === 'final_report_generation'
                  ? 'Generating comprehensive final report...'
                  : 'Processing your request...'}
              </div>
              <div className="flex items-center mt-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-xs text-blue-500 ml-2">Working...</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {allEvents.length === 0 && !isStreaming && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm">No thinking steps yet</div>
            <div className="text-xs mt-1">Steps will appear here as AI processes your research</div>
          </div>
        )}
        </div>
      </div>
    )
  }

  // Render sources (Perplexity-style)
  const renderSources = () => {
    const allSources = getAllSources()

    return (
      <div className="space-y-2">
        {allSources.map((source, index) => {
          // Extract domain name for display
          const domain = source.replace(/^https?:\/\//, '').split('/')[0]
          return (
            <a
              key={`source-${index}`}
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
            >
              <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0 group-hover:text-blue-700" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {domain}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {source}
                </div>
              </div>
            </a>
          )
        })}
        {allSources.length === 0 && (
          <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
            <ExternalLink className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <div>No sources available yet</div>
            <div className="text-xs mt-1">Sources will appear as research progresses</div>
          </div>
        )}
      </div>
    )
  }


  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-800">
      {/* Header - Fixed Height */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Research Session</h2>
              {/* Mobile sidebar toggle */}
              {(streamingEvents.length > 0 || isStreaming) && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Toggle research panel"
                >
                  <Menu className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              )}
            </div>
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

      {/* Main Content Area - Perplexity-style research display */}
      <div className="flex-1 flex min-h-0">
        {/* Research Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {renderResearchContent()}
        </div>

        {/* Steps/Thinking/Sources Panel - DIV 2 - Desktop Only */}
        {(streamingEvents.length > 0 || isStreaming) && (
          <div className="hidden md:flex w-80 border-l border-slate-200 dark:border-slate-700 flex-col flex-shrink-0">
            {/* Tabs Header - Fixed */}
            <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('thinking')}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm font-medium transition-colors",
                    activeTab === 'thinking'
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Brain className="w-4 h-4 inline mr-1" />
                  Thinking Steps
                </button>
                <button
                  onClick={() => setActiveTab('sources')}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm font-medium transition-colors",
                    activeTab === 'sources'
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <ExternalLink className="w-4 h-4 inline mr-1" />
                  Sources
                </button>
              </div>
            </div>

            {/* Tab Content - Takes remaining height and scrolls */}
            <div className="flex-1 min-h-0">
              <div className="h-full p-4 overflow-y-auto">
                {activeTab === 'thinking' && renderThinkingSteps()}
                {activeTab === 'sources' && renderSources()}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Overlay Sidebar */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <div className="relative ml-auto w-full max-w-sm bg-white dark:bg-slate-800 flex flex-col h-full">
              {/* Header with close button */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Research Progress</h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('thinking')}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm font-medium transition-colors",
                    activeTab === 'thinking'
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Brain className="w-4 h-4 inline mr-1" />
                  Thinking Steps
                </button>
                <button
                  onClick={() => setActiveTab('sources')}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm font-medium transition-colors",
                    activeTab === 'sources'
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <ExternalLink className="w-4 h-4 inline mr-1" />
                  Sources
                </button>
              </div>

              {/* Tab Content - Scrollable */}
              <div className="flex-1 min-h-0">
                <div className="h-full p-4 overflow-y-auto">
                  {activeTab === 'thinking' && renderThinkingSteps()}
                  {activeTab === 'sources' && renderSources()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form - DIV 3 - Fixed Height at Bottom */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a research question..."
            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            disabled={isStreaming}
          />
          
          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2 transition-colors flex-shrink-0"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || !apiKey.trim()}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg flex items-center space-x-2 transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Research</span>
            </button>
          )}
        </form>
      </div>
    </div>
  )
}