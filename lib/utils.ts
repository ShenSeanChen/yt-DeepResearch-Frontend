// Directory: yt-deepresearch-frontend/lib/utils.ts
/**
 * Utility functions for the Deep Research Frontend
 * Includes class name merging and common helpers
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge class names with Tailwind CSS
 * Combines clsx and tailwind-merge for optimal class handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString()
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

/**
 * Get model display name from model ID
 */
export function getModelDisplayName(modelId: string): string {
  const modelNames: Record<string, string> = {
    'openai': 'OpenAI GPT-5',
    'anthropic': 'Anthropic Claude 4',
    'kimi': 'Kimi K2 0905 Preview'
  }
  return modelNames[modelId] || modelId
}

/**
 * Get model color for UI elements
 */
export function getModelColor(modelId: string): string {
  const modelColors: Record<string, string> = {
    'openai': 'bg-green-500',
    'anthropic': 'bg-orange-500', 
    'kimi': 'bg-purple-500'
  }
  return modelColors[modelId] || 'bg-gray-500'
}
