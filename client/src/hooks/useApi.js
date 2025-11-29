import { useState, useCallback } from 'react'

/**
 * Custom Hook für API-Aufrufe
 */
export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const request = useCallback(async (url, options = {}) => {
    setLoading(true)
    setError(null)

    try {
      const defaultOptions = {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      }

      const response = await fetch(url, { ...defaultOptions, ...options })
      
      // Handle blob responses (for file downloads)
      if (options.responseType === 'blob') {
        if (!response.ok) {
          throw new Error('Download fehlgeschlagen')
        }
        return response.blob()
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ein Fehler ist aufgetreten')
      }

      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // GET request
  const get = useCallback((url) => request(url), [request])

  // POST request
  const post = useCallback((url, body) => {
    return request(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }, [request])

  // PUT request
  const put = useCallback((url, body) => {
    return request(url, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  }, [request])

  // DELETE request
  const del = useCallback((url) => {
    return request(url, { method: 'DELETE' })
  }, [request])

  // Download file
  const download = useCallback(async (url, filename) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Download fehlgeschlagen')
      }

      const blob = await response.blob()
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename || 'download'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      return true
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    setError,
    get,
    post,
    put,
    del,
    download,
    request
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value || 0)
}

/**
 * Format date for display
 */
export function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Format number
 */
export function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value || 0)
}
