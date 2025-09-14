// Directory: yt-deepresearch-frontend/app/page.tsx
/**
 * Main page component for Deep Research Agent
 * Features modern Perplexity-style interface with streaming research capabilities
 */

'use client'

import { useEffect, useState } from 'react'
import ResearchInterface from '@/components/ResearchInterface'
import ModelComparison from '@/components/ModelComparison'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Brain, BarChart3, History, ChevronLeft, ChevronRight } from 'lucide-react'
import { ResearchProvider, useResearchState } from '@/contexts/ResearchContext'

// Sidebar Configuration Component
function SidebarConfig() {
  const {
    selectedModel,
    setSelectedModel,
    apiKey,
    setApiKey,
    isStreaming
  } = useResearchState()

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          AI Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          disabled={isStreaming}
        >
          <option value="anthropic">Claude 4 (Latest)</option>
          <option value="openai">GPT-5 (Latest)</option>
          <option value="kimi">Kimi K2 0905 Preview</option>
        </select>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key..."
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          disabled={isStreaming}
        />
      </div>
    </div>
  )
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('research')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Sync URL hash (#research, #comparison, #history) with tabs so links work even if sidebar is not clickable for any reason.
  useEffect(() => {
    const syncFromHash = () => {
      const hash = (typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '')
      if (hash === 'comparison' || hash === 'research' || hash === 'history') {
        setActiveTab(hash)
      }
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  return (
    <ResearchProvider>
    <div className="h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} transition-all duration-300 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col flex-shrink-0`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  Deep Research Agent v2
                </h1>

              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            )}
          </button>
        </div>

        {/* Navigation Tabs */}
        {!sidebarCollapsed && (
          <div className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-1 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <TabsTrigger 
                  value="research" 
                  className="flex items-center justify-start space-x-2 w-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-md py-2.5 px-3 text-sm font-medium transition-all"
                >
                  <Brain className="w-4 h-4" />
                  <span>Research</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="comparison" 
                  className="flex items-center justify-start space-x-2 w-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-md py-2.5 px-3 text-sm font-medium transition-all"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Compare</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex items-center justify-start space-x-2 w-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-md py-2.5 px-3 text-sm font-medium transition-all"
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Configuration Inputs (cleaner - no heading) */}
        {!sidebarCollapsed && activeTab === 'research' && (
          <div className="flex-1 p-4">
            <SidebarConfig />
          </div>
        )}

        {/* Connection Status */}
        {!sidebarCollapsed && (
          <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>Backend Connected</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsContent value="research" className="flex-1 m-0 overflow-hidden">
            <ResearchInterface />
          </TabsContent>

          <TabsContent value="comparison" className="flex-1 m-0 overflow-y-auto min-h-0">
            <ModelComparison />
          </TabsContent>

          <TabsContent value="history" className="flex-1 m-0 p-8 overflow-y-auto">
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Research History
              </h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
                Track your research sessions and compare model performance over time.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 max-w-lg mx-auto">
                <div className="text-blue-600 dark:text-blue-400 mb-2">
                  <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Database Integration Available</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                  Enable persistent history and model comparison tracking by integrating with Supabase. 
                  This allows you to save research sessions, compare model performance metrics, and track improvements over time.
                </p>
                <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 rounded px-3 py-2">
                  <strong>Setup Guide:</strong> Check the README.md for Supabase integration instructions
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        {/* <footer className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="px-6 py-4">
            <div className="text-center text-xs text-slate-600 dark:text-slate-400">
              <p>
                Powered by <span className="font-semibold">OpenAI</span>, <span className="font-semibold">Anthropic</span>, and <span className="font-semibold">Kimi K2</span>
              </p>
              <p className="mt-1">
                Built with Next.js, FastAPI, and LangGraph
              </p>
            </div>
          </div>
        </footer> */}
      </div>
    </div>
    </ResearchProvider>
  )
}