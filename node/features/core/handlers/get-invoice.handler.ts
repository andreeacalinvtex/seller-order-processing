import type { VtexAuthData } from '../../vtex/dto/auth.dto'
import type { IVtexOrder } from '../../vtex/dto/order.dto'
import { getVtexAppSettings } from '../utils/getVtexAppSettings'

export async function getInvoiceHandler(ctx: Context) {
  const {
    vtex: {
      route: { params },
    },
    clients: { vtexOrder: vtexOrderClient, smartbill },
  } = ctx

  const settings = await getVtexAppSettings(ctx)

  smartbill.throwIfDisabled(settings)

  const vtexAuthData: VtexAuthData = {
    vtex_appKey: settings.vtex_appKey,
    vtex_appToken: settings.vtex_appToken,
  }

  const orderId = params.orderId as string

  const order: IVtexOrder = await vtexOrderClient.getVtexOrderData(
    vtexAuthData,
    orderId
  )

  const { invoiceNumber } = order?.packageAttachment?.packages.pop()

  return smartbill.getInvoice({ settings, invoiceNumber })
}
