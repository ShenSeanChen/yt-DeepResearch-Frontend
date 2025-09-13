// Directory: yt-deepresearch-frontend/app/page.tsx
/**
 * Main page component for Deep Research Agent
 * Features modern Perplexity-style interface with streaming research capabilities
 */

'use client'

import { useState } from 'react'
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
          <option value="anthropic">Anthropic Claude</option>
          <option value="openai">OpenAI GPT-4o</option>
          <option value="kimi">Kimi K2</option>
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
              <TabsList className="grid w-full grid-cols-1 gap-1 bg-slate-100 dark:bg-slate-800 p-1">
                <TabsTrigger 
                  value="research" 
                  className="flex items-center justify-start space-x-2 w-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700"
                >
                  <Brain className="w-4 h-4" />
                  <span>Research</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="comparison" 
                  className="flex items-center justify-start space-x-2 w-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Compare</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex items-center justify-start space-x-2 w-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700"
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
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
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
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsContent value="research" className="flex-1 m-0">
            <ResearchInterface />
          </TabsContent>

          <TabsContent value="comparison" className="flex-1 m-0 p-8">
            <ModelComparison />
          </TabsContent>

          <TabsContent value="history" className="flex-1 m-0 p-8">
            <div className="text-center py-12">
              <History className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Research History
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                View your past research sessions and performance metrics
              </p>
              <div className="mt-6 text-sm text-slate-500">
                Coming soon...
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