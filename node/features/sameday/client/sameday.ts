import type { InstanceOptions, IOContext } from '@vtex/api'

import type { VtexTrackingEvent } from '../../vtex/dto/tracking.dto'
import type {
  CreateTrackingRequest,
  GetTrackingLabelRequest,
  GetTrackingStatusRequest
} from '../../shared/clients/carrier-client'
import { CarrierClient } from '../../shared/clients/carrier-client'
import type {
  ISamedayCountyData,
  ISamedayAwbResponse,
  ISamedayTrackAWBResponse,
} from '../dto/sameday-awb.dto'
import type { IAuthDataSameday } from '../models/sameday-auth.model'
import { createOrderPayload } from '../helpers/sameday-create-payload.helper'
import { CarriersEnum } from '../../shared/enums/carriers.enum'

export default class SamedayClient extends CarrierClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    // URL for demo environment
    super('https://sameday-api.demo.zitec.com', ctx, {
      ...options,
      headers: {
        ...options?.headers,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Vtex-Use-Https': 'true',
      },
    })
  }

  private async getAuthToken(
    settings: IOContext['settings']
  ): Promise<IAuthDataSameday> {
    return this.http.post(
      '/api/authenticate?remember_me=1',
      {},
      {
        headers: {
          'X-AUTH-PASSWORD': settings.sameday__password,
          'X-AUTH-USERNAME': settings.sameday__username,
        },
      }
    )
  }

  private async getCountyId(
    token: string,
    countyCode: string
  ): Promise<number> {
    const { data } = await this.http.get('/api/geolocation/county', {
      headers: {
        'X-AUTH-TOKEN': token,
      },
    })

    // Resolve issue with wrong countyCode
    if (countyCode === 'VN') {
      countyCode = 'VR'
    }

    const county = data.find((el: ISamedayCountyData) => countyCode === el.code)

    return county.id
  }

  protected async requestAWB({ settings, order, params }: CreateTrackingRequest): Promise<ISamedayAwbResponse> {
    const { token } = await this.getAuthToken(settings)
    const countyId = await this.getCountyId(
      token,
      order.shippingData.address.state
    )

    const body = createOrderPayload(order, countyId, params)

    return this.http.post('/api/awb', body, {
      headers: {
        'X-AUTH-TOKEN': token,
      },
    })
  }

  public async trackingLabel({
    settings,
    trackingNumber,
    paperSize
  }: GetTrackingLabelRequest): Promise<unknown> {
    const { token } = await this.getAuthToken(settings)

    return this.http.getStream(
      `/api/awb/download/${trackingNumber}/${paperSize}`,
      {
        headers: {
          'X-AUTH-TOKEN': token,
        },
      }
    )
  }

  public async createTracking(request: CreateTrackingRequest) {
    const { awbNumber: trackingNumber } = await this.requestAWB(request)

    return {
      trackingNumber,
      trackingUrl: `https://sameday.ro/#awb=${trackingNumber}`,
      courier: CarriersEnum.SAMEDAY,
    }
  }

  public async getTrackingStatus({ settings, trackingNumber, invoiceNumber }: GetTrackingStatusRequest) {
    const { token } = await this.getAuthToken(settings)

    const updatedAwbInfo: ISamedayTrackAWBResponse = await this.http.get(
      `/api/client/awb/${trackingNumber}/status`,
      {
        headers: {
          'X-AUTH-TOKEN': token,
        },
      }
    )

    let trackingEvents: VtexTrackingEvent[] = []
    let isDelivered = false

    if (
      updatedAwbInfo?.hasOwnProperty.call(
        updatedAwbInfo,
        'expeditionHistory'
      ) &&
      invoiceNumber
    ) {
      const {
        expeditionHistory: trackingHistory,
        expeditionSummary,
      } = updatedAwbInfo

      trackingEvents = trackingHistory.map((event) => {
        return {
          description: event.statusState,
          date: event.statusDate.split('T')[0],
        }
      })

      isDelivered = expeditionSummary.delivered
    }

    return {
      isDelivered,
      events: trackingEvents,
    }
  }
}
