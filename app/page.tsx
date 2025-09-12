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
import { Brain, BarChart3, History } from 'lucide-react'
import { ResearchProvider } from '@/contexts/ResearchContext'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('research')

  return (
    <ResearchProvider>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Deep Research Agent
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  AI-Powered Research with Multi-Model Comparison
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Backend Connected</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
            <TabsTrigger value="research" className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>Research</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Compare</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="research" className="mt-0">
            <ResearchInterface />
          </TabsContent>

          <TabsContent value="comparison" className="mt-0">
            <ModelComparison />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
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
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            <p>
              Powered by <span className="font-semibold">OpenAI</span>, <span className="font-semibold">Anthropic</span>, and <span className="font-semibold">Kimi K2</span>
            </p>
            <p className="mt-1">
              Built with Next.js, FastAPI, and LangGraph
            </p>
          </div>
        </div>
      </footer>
    </div>
    </ResearchProvider>
  )
}