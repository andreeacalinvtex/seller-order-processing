import type { ClientsConfig, ServiceContext, RecorderState } from '@vtex/api'
import { LRUCache, method, Service } from '@vtex/api'

import { Clients } from './clients'
import { getInvoiceHandler } from './features/core/handlers/get-invoice.handler'
import { getTrackingLabelHandler } from './features/core/handlers/get-tracking-label.handler'
import { trackAndInvoiceHandler } from './features/core/handlers/track-and-invoice.handler'
import { updateTrackingStatusHandler } from './features/core/handlers/update-tracking-invoice.handler'
import { errorHandleMiddleware } from './features/core/middlewares/error.middleware'

const TIMEOUT_MS = 1000 * 10

// Create a LRU memory cache for the Status client.
// The @vtex/api HttpClient respects Cache-Control headers and uses the provided cache.
const memoryCache = new LRUCache<string, any>({ max: 5000 })

metrics.trackCache('status', memoryCache)

// This is the configuration for clients available in `ctx.clients`.
const clients: ClientsConfig<Clients> = {
  // We pass our custom implementation of the clients bag, containing the Status client.
  implementation: Clients,
  options: {
    // All IO Clients will be initialized with these options, unless otherwise specified.
    default: {
      retries: 2,
      timeout: TIMEOUT_MS,
    },
    // This key will be merged with the default options and add this cache to our Status client.
    status: {
      memoryCache,
    },
  },
}

declare global {
  // We declare a global Context type just to avoid re-writing ServiceContext<Clients, State> in every handler and resolver
  type Context = ServiceContext<Clients, State>

  // The shape of our State object found in `ctx.state`. This is used as state bag to communicate between middlewares.
  interface State extends RecorderState {
    code: number
  }
}

// Export a service that defines route handlers and client options.
export default new Service({
  clients,
  routes: {
    updateTrackingStatus: method({
      POST: [errorHandleMiddleware(updateTrackingStatusHandler)],
    }),
    trackAndInvoice: method({
      POST: [errorHandleMiddleware(trackAndInvoiceHandler)],
    }),
    trackingLabel: method({
      GET: [errorHandleMiddleware(getTrackingLabelHandler)],
    }),
    getInvoice: method({
      GET: [errorHandleMiddleware(getInvoiceHandler)],
    }),
  },
})
