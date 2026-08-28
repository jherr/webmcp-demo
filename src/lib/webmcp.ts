import { z } from 'zod'
import { useStore } from './store'

export type WebMCPHost = 'document' | 'navigator'

export type RegisterWebMCPToolsResult = {
  toolCount: number
  host: WebMCPHost
}

type RegisterOptions = {
  signal?: AbortSignal
}

const getMenuSchema = {
  type: 'object' as const,
  properties: {
    category: {
      type: 'string' as const,
      enum: ['cheesesteaks', 'sides', 'drinks'],
      description: 'Optional category to filter by',
    },
  },
  additionalProperties: false,
}

const addToCartSchema = {
  type: 'object' as const,
  properties: {
    item_id: { type: 'string' as const, description: 'Menu item ID' },
    quantity: {
      type: 'number' as const,
      description: 'Quantity to add (default 1)',
    },
  },
  required: ['item_id'],
  additionalProperties: false,
}

const getCartSchema = {
  type: 'object' as const,
  properties: {},
  additionalProperties: false,
}

const getMenuParams = z.object({
  category: z.enum(['cheesesteaks', 'sides', 'drinks']).optional(),
})

const addToCartParams = z.object({
  item_id: z.string(),
  quantity: z.number().optional(),
})

function resolveModelContext(): { mc: ModelContext; host: WebMCPHost } {
  // Codex / ChatGPT site tools and current WebMCP draft use document.modelContext.
  // MCP-B polyfill and older Chrome expose navigator.modelContext.
  if (typeof document !== 'undefined' && document.modelContext) {
    return { mc: document.modelContext, host: 'document' }
  }
  if (typeof navigator !== 'undefined' && navigator.modelContext) {
    return { mc: navigator.modelContext, host: 'navigator' }
  }
  throw new Error(
    'WebMCP modelContext not available on document or navigator',
  )
}

/** Codex/Chrome expect plain JSON; MCP-B polyfill expects MCP ToolResponse. */
function formatResult(
  host: WebMCPHost,
  data: unknown,
  isError = false,
): unknown {
  if (host === 'document') {
    if (isError && data && typeof data === 'object') {
      return { ...data, isError: true }
    }
    return data
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
    ...(isError ? { isError: true } : {}),
  }
}

async function registerTool(
  mc: ModelContext,
  tool: ModelContextTool,
  signal?: AbortSignal,
) {
  const result = mc.registerTool(
    tool,
    signal ? { signal } : undefined,
  )
  if (result != null && typeof (result as Promise<void>).then === 'function') {
    await result
  }
}

export async function registerWebMCPTools(
  options: RegisterOptions = {},
): Promise<RegisterWebMCPToolsResult> {
  const { signal } = options
  const { mc, host } = resolveModelContext()

  if (signal?.aborted) {
    throw new DOMException('WebMCP registration aborted', 'AbortError')
  }

  await registerTool(
    mc,
    {
      name: 'get_menu',
      description:
        "Get the cheesesteak shop menu. Optionally filter by category: 'cheesesteaks', 'sides', or 'drinks'.",
      inputSchema: getMenuSchema,
      annotations: { readOnlyHint: true },
      execute: async (params) => {
        const { category } = getMenuParams.parse(params)
        const items = useStore.getState().getMenuByCategory(category)
        return formatResult(host, items)
      },
    },
    signal,
  )

  await registerTool(
    mc,
    {
      name: 'add_to_cart',
      description:
        'Add an item to the cart by menu item ID (e.g. "classic-whiz", "fries"). Quantity defaults to 1.',
      inputSchema: addToCartSchema,
      annotations: { readOnlyHint: false },
      execute: async (params) => {
        const { item_id, quantity = 1 } = addToCartParams.parse(params)
        const state = useStore.getState()
        const item = state.menu.find((i) => i.id === item_id)
        if (!item) {
          return formatResult(
            host,
            { error: `Item "${item_id}" not found` },
            true,
          )
        }
        state.addToCart(item, quantity)
        return formatResult(host, {
          success: true,
          added: item.name,
          quantity,
        })
      },
    },
    signal,
  )

  await registerTool(
    mc,
    {
      name: 'get_cart',
      description: 'Get the current cart contents and total price.',
      inputSchema: getCartSchema,
      annotations: { readOnlyHint: true },
      execute: async () => {
        const state = useStore.getState()
        const items = state.items.map((i) => ({
          id: i.menuItem.id,
          name: i.menuItem.name,
          price: i.menuItem.price,
          quantity: i.quantity,
          subtotal: i.menuItem.price * i.quantity,
        }))
        return formatResult(host, { items, total: state.getTotal() })
      },
    },
    signal,
  )

  return { toolCount: 3, host }
}
