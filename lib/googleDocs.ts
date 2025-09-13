// Directory: yt-DeepResearch-Frontend/lib/googleDocs.ts
/**
 * Google Docs helper utilities.
 *
 * This module lazily loads Google Identity Services, requests an OAuth token
 * with the minimum required scopes, and provides a function to create a Google
 * Doc in the signed-in user's Drive and insert the provided content.
 *
 * All functions include concise comments per Google style guidelines.
 */

// Types for the small surface we use from the global `google` SDK.
interface GoogleTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (resp: { access_token?: string; error?: string }) => void
          }) => GoogleTokenClient
        }
      }
    }
    _dra_gsi_loaded?: boolean
  }
}

// Cached access token for the current page session.
let cachedAccessToken: string | null = null

/**
 * Injects the Google Identity Services script exactly once.
 */
export async function ensureGsiLoaded(): Promise<void> {
  if (window._dra_gsi_loaded) return
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      window._dra_gsi_loaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

/**
 * Requests an access token for Google Docs/Drive scope using a popup.
 * The token is cached for subsequent calls during the session.
 */
export async function getGoogleAccessToken(): Promise<string> {
  if (cachedAccessToken) return cachedAccessToken

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in env')
  }

  await ensureGsiLoaded()

  const scopes = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive.file',
  ].join(' ')

  const token: string = await new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error))
          return
        }
        if (!resp.access_token) {
          reject(new Error('No access token returned'))
          return
        }
        resolve(resp.access_token)
      },
    })

    // Prompt the user to grant access on first call.
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })

  cachedAccessToken = token
  return token
}

/**
 * Creates a Google Doc with the provided title and body content.
 * Returns the created document ID and an editor URL.
 */
export async function createGoogleDoc(params: {
  title: string
  body: string
}): Promise<{ documentId: string; url: string }>
{
  const accessToken = await getGoogleAccessToken()

  // Step 1: Create an empty document.
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: params.title }),
  })

  if (!createRes.ok) {
    const text = await createRes.text()
    throw new Error(`Failed to create document: ${createRes.status} ${text}`)
  }

  const created = await createRes.json()
  const documentId: string = created.documentId

  // Step 2: Insert the content at the end of the document.
  const batchRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            text: params.body,
            endOfSegmentLocation: {},
          },
        },
      ],
    }),
  })

  if (!batchRes.ok) {
    const text = await batchRes.text()
    throw new Error(`Failed to write content: ${batchRes.status} ${text}`)
  }

  return { documentId, url: `https://docs.google.com/document/d/${documentId}/edit` }
}


