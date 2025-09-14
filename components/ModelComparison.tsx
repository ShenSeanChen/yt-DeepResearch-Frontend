// Directory: yt-deepresearch-frontend/components/ModelComparison.tsx
/**
 * Model comparison dashboard component
 * Shows performance metrics and comparisons between different AI models
 */

'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Clock, CheckCircle, AlertCircle, TrendingUp, Zap } from 'lucide-react'
import { useResearchState } from '@/contexts/ResearchContext'
import { cn, formatDuration, getModelDisplayName, getModelColor } from '@/lib/utils'

interface ModelMetrics {
  model: string
  totalRuns: number
  averageDuration: number
  successRate: number | undefined
  lastUsed: string
}

interface ComparisonData {
  models: ModelMetrics[]
  totalResearches: number
  averageResponseTime: number | undefined
}

interface MultiModelRun {
  id: string
  query: string
  timestamp: string
  results: {
    model: string
    duration: number
    stageTimings: {
      clarification: number
      research_brief: number
      research_execution: number
      final_report: number
    }
    sourceCount: number
    wordCount: number
    success: boolean
    error?: string
  }[]
}

// Reserved for future advanced comparison metrics

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

const ModelComparison = () => {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Placeholder for future tabs if we expand this page further
  const [activeTab, setActiveTab] = useState<'overview' | 'multi-compare' | 'agent-flow'>('overview')
  
  // Multi-model comparison state
  const [multiModelQuery, setMultiModelQuery] = useState('')
  const [selectedModels, setSelectedModels] = useState<string[]>(['anthropic', 'openai', 'kimi'])
  const [isRunningComparison, setIsRunningComparison] = useState(false)
  const [comparisonResults, setComparisonResults] = useState<MultiModelRun[]>([])
  const [currentRunProgress, setCurrentRunProgress] = useState<{[key: string]: string}>({})
  const { apiKey } = useResearchState()
  
  const availableModels = [
    { id: 'anthropic', name: 'Claude 4', description: 'Latest Anthropic Claude 4' },
    { id: 'openai', name: 'GPT-5', description: 'OpenAI\'s newest flagship model' },
    { id: 'kimi', name: 'Kimi K2 0905 Preview', description: 'Kimi K2 0905 via Moonshot' }
  ]

  useEffect(() => {
    fetchComparisonData()
  }, [])

  const fetchComparisonData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${BACKEND_URL}/research/comparison`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setComparisonData(data)
    } catch (err: unknown) {
      console.error('Error fetching comparison data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      // Set mock data for demo purposes
      setComparisonData({
        models: [
          {
            model: 'anthropic',
            totalRuns: 12,
            averageDuration: 45.2,
            successRate: 95.8,
            lastUsed: new Date().toISOString()
          },
          {
            model: 'openai',
            totalRuns: 8,
            averageDuration: 38.7,
            successRate: 92.5,
            lastUsed: new Date(Date.now() - 3600000).toISOString()
          },
          {
            model: 'kimi',
            totalRuns: 5,
            averageDuration: 52.1,
            successRate: 98.0,
            lastUsed: new Date(Date.now() - 7200000).toISOString()
          }
        ],
        totalResearches: 25,
        averageResponseTime: 44.2
      })
    } finally {
      setLoading(false)
    }
  }

  // Friendly model label
  const modelName = (id: string) => availableModels.find(m => m.id === id)?.name || id

  // Normalize stage names from stream to our buckets
  const normalizeStage = (stage?: string): keyof MultiModelRun['results'][number]['stageTimings'] => {
    const s = (stage || '').toLowerCase()
    if (s.includes('clar')) return 'clarification'
    if (s.includes('brief')) return 'research_brief'
    if (s.includes('final')) return 'final_report'
    return 'research_execution'
  }

  // MVP: run the same prompt on multiple models in parallel and measure duration + stage timings.
  const runMultiModelComparison = async () => {
    if (!multiModelQuery.trim() || selectedModels.length === 0 || !apiKey.trim()) return
    setIsRunningComparison(true)
    const runId = `mm_${Date.now()}`

    // Prepare one SSE request per model.
    const tasks = selectedModels.map(async (model) => {
      const controller = new AbortController()
      const started = Date.now()
      let totalContent = ''
      let activeStage: keyof MultiModelRun['results'][number]['stageTimings'] = 'clarification'
      let stageStart = started
      const stageTimings: MultiModelRun['results'][number]['stageTimings'] = {
        clarification: 0,
        research_brief: 0,
        research_execution: 0,
        final_report: 0,
      }
      let sourceCount = 0
      try {
        const res = await fetch(`${BACKEND_URL}/research/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: multiModelQuery, model, api_key: apiKey }),
          signal: controller.signal,
        })
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        if (!reader) throw new Error('No reader')
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const evt = JSON.parse(line.slice(6))
              if (evt.stage) {
                const nextStage = normalizeStage(evt.stage)
                if (nextStage !== activeStage) {
                  const now = Date.now()
                  stageTimings[activeStage] += (now - stageStart) / 1000
                  activeStage = nextStage
                  stageStart = now
                }
              }
              if (evt.type === 'sources_found') {
                const found = Array.isArray(evt?.metadata?.sources) ? evt.metadata.sources.length : 1
                sourceCount += found
              }
              if (evt.content && typeof evt.content === 'string') totalContent += `\n${evt.content}`
              setCurrentRunProgress(prev => ({ ...prev, [model]: evt.stage || 'streaming' }))
            } catch {}
          }
        }
        const duration = (Date.now() - started) / 1000
        // Close final stage
        stageTimings[activeStage] += (Date.now() - stageStart) / 1000
        return { model, duration, content: totalContent, stageTimings, sourceCount }
      } catch (e) {
        // Close stage timing on error
        stageTimings[activeStage] += (Date.now() - stageStart) / 1000
        return { model, duration: (Date.now() - started) / 1000, error: (e as Error).message, content: totalContent, stageTimings, sourceCount }
      }
    })

    const results = await Promise.all(tasks)
    const merged: MultiModelRun = {
      id: runId,
      query: multiModelQuery,
      timestamp: new Date().toISOString(),
      results: results.map(r => ({
        model: r.model,
        duration: r.duration,
        stageTimings: r.stageTimings,
        sourceCount: r.sourceCount,
        wordCount: r.content.split(/\s+/).filter(Boolean).length,
        success: !r.error,
        error: r.error,
      })),
    }
    setComparisonResults(prev => [merged, ...prev])
    setIsRunningComparison(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600 dark:text-slate-400">Loading comparison data...</span>
      </div>
    )
  }

  if (error && !comparisonData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Error Loading Data
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          {error}
        </p>
        <button
          onClick={fetchComparisonData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const getBestPerformer = (metric: 'speed' | 'success' | 'usage') => {
    if (!comparisonData?.models.length) return null
    
    switch (metric) {
      case 'speed':
        return comparisonData.models.reduce((best, current) => 
          current.averageDuration < best.averageDuration ? current : best
        )
      case 'success':
        return comparisonData.models.reduce((best, current) => 
          (current.successRate ?? 0) > (best.successRate ?? 0) ? current : best
        )
      case 'usage':
        return comparisonData.models.reduce((best, current) => 
          current.totalRuns > best.totalRuns ? current : best
        )
      default:
        return null
    }
  }

  const getPerformanceBar = (value: number, maxValue: number, color: string) => {
    const percentage = (value / maxValue) * 100
    return (
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className={cn("h-2 rounded-full transition-all duration-300", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Model Performance Comparison
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Compare AI model performance across different metrics
        </p>
        {error && (
          <div className="mt-2 text-sm text-orange-600 dark:text-orange-400">
            ⚠️ Using demo data due to connection issues
          </div>
        )}
      </div>

      {/* Multi-Model Compare MVP */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Run Quick Compare</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={multiModelQuery}
            onChange={(e) => setMultiModelQuery(e.target.value)}
            placeholder="Enter a research prompt to compare across models"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            disabled={isRunningComparison}
          />
          <div className="flex flex-wrap gap-2">
            {availableModels.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedModels(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                className={cn('px-3 py-1.5 rounded-md text-sm border', selectedModels.includes(m.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600')}
                disabled={isRunningComparison}
              >
                {m.name}
              </button>
            ))}
          </div>
          <button
            onClick={runMultiModelComparison}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-slate-400"
            disabled={isRunningComparison || !multiModelQuery.trim()}
          >
            {isRunningComparison ? 'Running...' : 'Compare Now'}
          </button>
          {Object.keys(currentRunProgress).length > 0 && (
            <div className="text-xs text-slate-500">Progress: {selectedModels.map(m => `${m}: ${currentRunProgress[m] || '-'}`).join('  |  ')}</div>
          )}
        </div>
      </div>

      {/* Latest run results */}
      {comparisonResults.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Latest Comparison</h3>
            <p className="text-xs text-slate-500">Prompt: {comparisonResults[0].query}</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {comparisonResults[0].results.map((r) => {
              const total = Math.max(r.duration, 0.001)
              const pct = (v: number) => `${Math.max(0, Math.min(100, (v / total) * 100))}%`
              return (
                <div key={`${comparisonResults[0].id}-${r.model}`} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{modelName(r.model)}</div>
                    <div className="text-xs text-slate-500">{formatDuration(r.duration)}</div>
                  </div>
                  <div className="flex w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-3">
                    <div className="h-2 bg-blue-500" style={{ width: pct(r.stageTimings.clarification) }} />
                    <div className="h-2 bg-purple-500" style={{ width: pct(r.stageTimings.research_brief) }} />
                    <div className="h-2 bg-green-500" style={{ width: pct(r.stageTimings.research_execution) }} />
                    <div className="h-2 bg-amber-500" style={{ width: pct(r.stageTimings.final_report) }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-slate-50 dark:bg-slate-800 p-2"><span className="text-slate-500">Clarify</span><div className="font-semibold">{formatDuration(r.stageTimings.clarification)}</div></div>
                    <div className="rounded bg-slate-50 dark:bg-slate-800 p-2"><span className="text-slate-500">Brief</span><div className="font-semibold">{formatDuration(r.stageTimings.research_brief)}</div></div>
                    <div className="rounded bg-slate-50 dark:bg-slate-800 p-2"><span className="text-slate-500">Execution</span><div className="font-semibold">{formatDuration(r.stageTimings.research_execution)}</div></div>
                    <div className="rounded bg-slate-50 dark:bg-slate-800 p-2"><span className="text-slate-500">Final</span><div className="font-semibold">{formatDuration(r.stageTimings.final_report)}</div></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <div>Sources: <span className="font-semibold text-slate-700 dark:text-slate-300">{r.sourceCount}</span></div>
                    <div>Words: <span className="font-semibold text-slate-700 dark:text-slate-300">{r.wordCount}</span></div>
                    <div>{r.success ? '✅ Success' : '❌ Error'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Researches</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {comparisonData?.totalResearches || 0}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Avg Response Time</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatDuration(comparisonData?.averageResponseTime ?? 0)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Models Available</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {comparisonData?.models.length || 0}
              </p>
            </div>
            <Zap className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Detailed Model Metrics
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Runs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Avg Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {comparisonData?.models.map((model) => {
                const maxRuns = Math.max(...comparisonData.models.map(m => m.totalRuns))
                const maxDuration = Math.max(...comparisonData.models.map(m => m.averageDuration))
                const speedBest = getBestPerformer('speed')
                const successBest = getBestPerformer('success')
                const usageBest = getBestPerformer('usage')
                
                return (
                  <tr key={model.model} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={cn("w-3 h-3 rounded-full mr-3", getModelColor(model.model))} />
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {getModelDisplayName(model.model)}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {model.model}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white font-medium">
                        {model.totalRuns}
                        {usageBest?.model === model.model && (
                          <TrendingUp className="w-4 h-4 text-green-500 inline ml-1" />
                        )}
                      </div>
                      <div className="mt-1">
                        {getPerformanceBar(model.totalRuns, maxRuns, getModelColor(model.model))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white font-medium">
                        {formatDuration(model.averageDuration)}
                        {speedBest?.model === model.model && (
                          <Zap className="w-4 h-4 text-green-500 inline ml-1" />
                        )}
                      </div>
                      <div className="mt-1">
                        {getPerformanceBar(maxDuration - model.averageDuration, maxDuration, 'bg-green-500')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white font-medium">
                        {(model.successRate ?? 0).toFixed(1)}%
                        {successBest?.model === model.model && (
                          <CheckCircle className="w-4 h-4 text-green-500 inline ml-1" />
                        )}
                      </div>
                      <div className="mt-1">
                        {getPerformanceBar(model.successRate ?? 0, 100, 'bg-green-500')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {speedBest?.model === model.model && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Fastest
                          </span>
                        )}
                        {successBest?.model === model.model && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Most Reliable
                          </span>
                        )}
                        {usageBest?.model === model.model && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            Most Used
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchComparisonData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  )
}

export default ModelComparison
