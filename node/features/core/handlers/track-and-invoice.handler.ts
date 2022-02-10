import { json } from 'co-body'

import type { IVtexOrder } from '../../vtex/dto/order.dto'
import type { NotifyInvoicePayload } from '../../vtex/dto/invoice.dto'
import type { CarrierValues } from '../../shared/enums/carriers.enum'
import type { TrackingInfoDTO } from '../../shared/clients/carrier-client'
import type { TrackAndInvoiceRequestDTO } from '../dto/order-api.dto'
import { getVtexAppSettings } from '../utils/getVtexAppSettings'
import type { VtexAuthData } from '../../vtex/dto/auth.dto'

export async function trackAndInvoiceHandler(ctx: Context) {
  const {
    vtex: {
      route: { params },
    },
    clients: { vtexOrder: vtexOrderClient, carrier: carrierClient, smartbill },
  } = ctx

  const orderId = params.orderId as string

  const invoiceData: TrackAndInvoiceRequestDTO = await json(ctx.req)

  const { invoice, tracking } = invoiceData

  const settings = await getVtexAppSettings(ctx)

  const carrier = carrierClient.getCarrierClientByName(
    ctx,
    tracking.provider as CarrierValues
  )

  const vtexAuthData: VtexAuthData = {
    vtex_appKey: settings.vtex_appKey,
    vtex_appToken: settings.vtex_appToken,
  }

  let trackingInfoPayload: TrackingInfoDTO

  if (tracking.generate) {
    const order: IVtexOrder = await vtexOrderClient.getVtexOrderData(
      vtexAuthData,
      orderId
    )

    trackingInfoPayload = await carrier.createTracking({
      settings,
      order,
      params: { ...tracking.params },
    })
  } else {
    trackingInfoPayload = {
      courier: tracking.provider,
      trackingNumber: tracking.params.trackingNumber as string,
      trackingUrl: tracking.params.trackingUrl ?? '',
    }
  }

  let notifyInvoiceRequest: NotifyInvoicePayload

  if (invoice.provider.toLowerCase() === 'smartbill') {
    const order: IVtexOrder = await vtexOrderClient.getVtexOrderData(
      vtexAuthData,
      orderId
    )

    const smartbillInvoice = await smartbill.generateInvoice({
      settings,
      order,
    })

    notifyInvoiceRequest = {
      ...trackingInfoPayload,
      type: 'Output',
      invoiceNumber: smartbillInvoice.number,
      issuanceDate: new Date().toISOString().slice(0, 10), // '2022-02-01'
      invoiceValue: order.value,
      invoiceKey: invoice.provider,
    }
  } else {
    notifyInvoiceRequest = {
      ...trackingInfoPayload,
      ...invoice.params,
      invoiceKey: invoice.provider,
      type: 'Output',
    }
  }

  await vtexOrderClient.trackAndInvoice({
    authData: vtexAuthData,
    orderId,
    payload: notifyInvoiceRequest,
  })

  return notifyInvoiceRequest
}
