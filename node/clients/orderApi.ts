import { ExternalClient } from '@vtex/api'
import type { InstanceOptions, IOContext } from '@vtex/api'

import type { VtexAuthData } from '../types/VtexAuthData'
import type { ITrackAwbInfoResponse } from '../types/orderApi'
import type {
  ITrackAwbInfoPayload,
  RequestAWBForInvoiceResponse,
} from '../types/carrier-client'

export default class OrderApi extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(`https://${ctx.account}.vtexcommercestable.com.br`, ctx, {
      ...options,
      headers: {
        ...options?.headers,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Vtex-Use-Https': 'true',
      },
    })
  }

  public async getVtexOrderData(
    vtexAuthData: VtexAuthData,
    orderId: string
  ): Promise<unknown> {
    return this.http.get(`/api/oms/pvt/orders/${orderId}`, {
      headers: {
        'X-VTEX-API-AppKey': vtexAuthData.vtex_appKey,
        'X-VTEX-API-AppToken': vtexAuthData.vtex_appToken,
      },
    })
  }

  public async trackAndInvoice(
    vtexAuthData: VtexAuthData,
    body: RequestAWBForInvoiceResponse
  ): Promise<unknown> {
    const { orderId } = body

    return this.http.post(`/api/oms/pvt/orders/${orderId}/invoice`, body, {
      headers: {
        'X-VTEX-API-AppKey': vtexAuthData.vtex_appKey,
        'X-VTEX-API-AppToken': vtexAuthData.vtex_appToken,
      },
    })
  }

  public async trackAWBInfo({
    payload,
    vtexAuthData,
    pathParams,
  }: ITrackAwbInfoPayload & {
    vtexAuthData: VtexAuthData
  }): Promise<ITrackAwbInfoResponse> {
    const { orderId, invoiceNumber } = pathParams

    return this.http.put(
      `/api/oms/pvt/orders/${orderId}/invoice/${invoiceNumber}/tracking`,
      payload,
      {
        headers: {
          'X-VTEX-API-AppKey': vtexAuthData.vtex_appKey,
          'X-VTEX-API-AppToken': vtexAuthData.vtex_appToken,
        },
      }
    )
  }
}
