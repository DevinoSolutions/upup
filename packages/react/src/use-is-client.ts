'use client'

import { useState, useEffect } from 'react'

export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])
  return isClient
}
