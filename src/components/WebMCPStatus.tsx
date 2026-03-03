import { Component, Suspense, use, type ReactNode } from "react";
import { Cpu } from "lucide-react";

const webmcpPromise = import("@mcp-b/global")
  .then(() => import("../lib/webmcp"))
  .then(({ registerWebMCPTools }) => registerWebMCPTools());

class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function WebMCPReady() {
  const toolCount = use(webmcpPromise);
  return (
    <span className="text-green-400">
      &gt; {toolCount} tools registered [OK]
    </span>
  );
}

export default function WebMCPStatus() {
  return (
    <div className="fixed bottom-0 inset-x-0 bg-black text-green-400 px-4 py-2 flex items-center gap-3 text-[10px] z-50 border-t-4 border-green-500">
      <Cpu size={14} className="text-green-400" />
      <span className="font-bold uppercase">WebMCP</span>
      <Suspense
        fallback={
          <span className="text-green-600">
            Loading tools<span className="pixel-blink">_</span>
          </span>
        }
      >
        <ErrorBoundary
          fallback={
            <span className="text-red-500">&gt; ERR: registration failed</span>
          }
        >
          <WebMCPReady />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
