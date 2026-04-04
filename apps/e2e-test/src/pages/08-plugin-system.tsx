import { useState, useEffect, useRef } from 'react'
import { UpupCore, composeEnhancers } from '@upup/core'
import type { UpupPlugin, CoreEnhancer } from '@upup/core'

function createCounterPlugin(): UpupPlugin {
  let count = 0

  return {
    name: 'counter',
    setup(core: unknown) {
      const upup = core as UpupCore
      upup.registerExtension('counter', {
        getCount: () => count,
        reset: () => { count = 0 },
      })
      upup.on('files-added', (files: unknown) => {
        const added = files as unknown[]
        count += Array.isArray(added) ? added.length : 1
      })
    },
  }
}

export default function PluginSystem() {
  const coreRef = useRef<UpupCore | null>(null)
  const [count, setCount] = useState(0)
  const [fileCount, setFileCount] = useState(0)
  const [pluginNames, setPluginNames] = useState<string[]>([])
  const [composeResult, setComposeResult] = useState<string>('')

  useEffect(() => {
    const counterPlugin = createCounterPlugin()
    const core = new UpupCore({
      plugins: [counterPlugin],
    })
    coreRef.current = core

    setPluginNames([counterPlugin.name])

    // Test composeEnhancers
    try {
      const enhancerA: CoreEnhancer = (createCore) => (opts) => {
        const c = createCore(opts)
        return c
      }
      const enhancerB: CoreEnhancer = (createCore) => (opts) => {
        const c = createCore(opts)
        return c
      }
      const composed = composeEnhancers(enhancerA, enhancerB)
      setComposeResult(typeof composed === 'function' ? 'function' : 'unexpected')
    } catch (e) {
      setComposeResult(`error: ${e}`)
    }

    return () => {
      core.destroy()
      coreRef.current = null
    }
  }, [])

  const handleAddFiles = async () => {
    const core = coreRef.current
    if (!core) return

    const testFiles = [
      new File(['plugin test'], `plugin-test-${Date.now()}.txt`, { type: 'text/plain' }),
    ]
    await core.addFiles(testFiles)

    const counterExt = core.ext.counter
    if (counterExt) {
      setCount(counterExt.getCount())
    }
    setFileCount(core.files.size)
  }

  const handleReset = () => {
    const core = coreRef.current
    if (!core) return

    const counterExt = core.ext.counter
    if (counterExt) {
      counterExt.reset()
      setCount(counterExt.getCount())
    }
  }

  const handleRefreshCount = () => {
    const core = coreRef.current
    if (!core) return

    const counterExt = core.ext.counter
    if (counterExt) {
      setCount(counterExt.getCount())
    }
  }

  return (
    <div data-testid="plugins-root">
      <h1 data-testid="plugins-title">Plugin System</h1>

      <div data-testid="plugins-controls">
        <button data-testid="plugins-add-btn" onClick={handleAddFiles}>
          Add file
        </button>
        <button data-testid="plugins-reset-btn" onClick={handleReset}>
          Reset counter
        </button>
        <button data-testid="plugins-refresh-btn" onClick={handleRefreshCount}>
          Refresh count
        </button>
      </div>

      <div data-testid="plugins-counter-section">
        <p data-testid="plugins-counter-label">Counter extension value:</p>
        <span data-testid="plugins-counter-value">{count}</span>
      </div>

      <div data-testid="plugins-files-section">
        <p data-testid="plugins-file-count">
          Files in core: <span data-testid="plugins-file-count-value">{fileCount}</span>
        </p>
      </div>

      <div data-testid="plugins-registered-section">
        <h2 data-testid="plugins-registered-title">Registered Plugins</h2>
        <ul data-testid="plugins-registered-list">
          {pluginNames.map((name, i) => (
            <li key={name} data-testid={`plugins-registered-${i}`}>
              <span data-testid={`plugins-registered-${i}-name`}>{name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div data-testid="plugins-compose-section">
        <h2 data-testid="plugins-compose-title">composeEnhancers</h2>
        <p data-testid="plugins-compose-result">
          Result type: <span data-testid="plugins-compose-result-value">{composeResult}</span>
        </p>
      </div>
    </div>
  )
}
