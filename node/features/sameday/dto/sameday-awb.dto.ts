export interface ISamedayAwbPayload {
  awbPayment: number
  awbRecipient: AwbRecipient
  cashOnDelivery: number
  geniusOrder: number
  insuredValue: number
  observation: string
  packageType: number
  packageNumber?: number
  packageWeight: number
  parcels: SamedayParcel[]
  pickupPoint: number
  service: number
  thirdPartyPickup: number
}

export interface SamedayParcel {
  weight: number
  width?: number
  height?: number
  length?: number
  awbParcelNumber?: string
}

interface AwbRecipient {
  address: string
  cityString: string
  county: number
  email: string
  name: string
  personType: number
  phoneNumber: string
  postalCode: string
  companyName?: string
}

export interface ISamedayAwbResponse {
  awbNumber: string
  awbCost: number
  parcels: ParcelSamedayRes[]
  pdfLink: string
  pickupLogisticLocation: string
  deliveryLogisticLocation: string
  deliveryLogisticCircle: string
  sortingHub: string
  sortingHubId: number
  deliveryLogisticLocationId: number
  pickupLogisticLocationId: number
}
interface ParcelSamedayRes {
  position: number
  awbNumber: string
}

export interface ISamedayTrackAWBResponse {
  expeditionSummary: {
    deliveredAt: string
    lastDeliveryAttempt: string
    delivered: boolean
    canceled: boolean
    deliveryAttempts: number
    servicePayment: number
    awbWeight: number
    cashOnDelivery: number
    awbNumber: string
    redirectionsAttempts: number
  }

  expeditionStatus: {
    statusId: number
    status: string
    statusState: string
    statusLabel: string
    statusDate: string
    county: string
    reason: string
    transitLocation: string
  }

  parcelsStatus: ParcelStatus[]
  expeditionHistory: ISamedayAwbEvent[]
}

interface ParcelStatus {
  statusId: number
  status: string
  statusState: string
  statusLabel: string
  statusDate: string
  reason: string
  parcelAwbNumber: string
  parcelDetails: string
  county: string
  transitLocation: string
  inReturn: boolean
}

interface ISamedayAwbEvent {
  statusId: number
  status: string
  statusLabel: string
  statusState: string
  statusDate: string
  county: string
  reason: string
  transitLocation: string
}

export interface SamedayFormattedPackageAttachments {
  totalWeight: number
  samedayPackageType: number
  packages: SamedayParcel[]
}
