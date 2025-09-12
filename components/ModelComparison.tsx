// Directory: yt-deepresearch-frontend/components/ModelComparison.tsx
/**
 * Model comparison dashboard component
 * Shows performance metrics and comparisons between different AI models
 */

'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Clock, CheckCircle, AlertCircle, TrendingUp, Zap } from 'lucide-react'
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

const ModelComparison = () => {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
