import { useEffect, useState } from 'react'
import { Cpu } from 'lucide-react'
import type { WebMCPHost } from '../lib/webmcp'

export default function WebMCPStatus() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [toolCount, setToolCount] = useState(0)
  const [host, setHost] = useState<WebMCPHost | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function boot() {
      try {
        // Codex / ChatGPT use native document.modelContext — skip polyfill when present.
        const hasNativeDocument =
          typeof document !== 'undefined' &&
          typeof document.modelContext?.registerTool === 'function'

        if (!hasNativeDocument) {
          await import('@mcp-b/global')
        }

        const { registerWebMCPTools } = await import('../lib/webmcp')
        const result = await registerWebMCPTools({
          signal: controller.signal,
        })

        if (cancelled) return
        setToolCount(result.toolCount)
        setHost(result.host)
        setStatus('ready')
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setErrorMsg(String(err))
        setStatus('error')
      }
    }

    void boot()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return (
    <div className="fixed bottom-0 inset-x-0 bg-black text-green-400 px-4 py-2 flex items-center gap-3 text-[10px] z-50 border-t-4 border-green-500">
      <Cpu size={14} className="text-green-400" />
      <span className="font-bold uppercase">WebMCP</span>
      {status === 'loading' && (
        <span className="text-green-600">
          Loading tools<span className="pixel-blink">_</span>
        </span>
      )}
      {status === 'ready' && (
        <span className="text-green-400">
          &gt; {toolCount} tools via {host} [OK]
        </span>
      )}
      {status === 'error' && (
        <span className="text-red-500" title={errorMsg}>
          &gt; ERR: registration failed
        </span>
      )}
    </div>
  )
}
