import React, { useEffect, useState } from 'react'
import {
  ActionMenu,
  Button,
  DatePicker,
  Divider,
  Dropdown,
  IconDownload,
  Input,
  Modal,
  NumericStepper,
  Tooltip,
} from 'vtex.styleguide'
import type { AxiosError } from 'axios'
import axios from 'axios'
import type { FC, SetStateAction } from 'react'

import type { IOrderAwbProps } from '../../types/awbModal'
import ErrorPopUpMessage from '../ErrorPopUpMessage'
import { createAwbShipping, getOrderDataById } from '../../utils/api'
import { normalizeOrderData } from '../../utils/normalizeData/orderDetails'
import type { OrderDetailsData } from '../../typings/normalizedOrder'
import {
  courierData,
  courierIcons,
  disabledCouriers,
} from '../../utils/constants'

const RequestAwbModal: FC<IOrderAwbProps> = ({
  setTrackingNum,
  setOrderAwb,
  updateAwbData,
  neededOrderId,
  onAwbUpdate,
  resetOrdersData,
  refreshOrderDetails,
}) => {
  const [service, setService] = useState('')
  const [courier, setCourier] = useState('')
  const [packageAmount, setPackageAmount] = useState(1)
  const [invoiceUrl, setInvoiceUrl] = useState('')
  const [weight, setWeight] = useState(1)
  const [packageType, setPackageType] = useState('')
  const [newAwbGenerated, setNewAwbGenerated] = useState(false)
  const [invoiceNum, setInvoiceNum] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [manualAwb, setManualAwb] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [orderData, setOrderData] = useState<OrderDetailsData>()
  const [modalOpen, setModalOpen] = useState(false)
  const [courierSetManually, setCourierManually] = useState([
    { value: 'FanCourier', label: 'FanCourier' },
    { value: 'Cargus', label: 'Cargus' },
    { value: 'SameDay', label: 'SameDay' },
    { value: 'TNT', label: 'TNT' },
    { value: 'DHL', label: 'DHL' },
    { value: 'GLS', label: 'GLS' },
    { value: 'DPD', label: 'DPD' },
  ])

  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [axiosError, setAxiosError] = useState({
    isError: false,
    errorMessage: '',
    errorDetails: '',
  })

  const packageTypeOptions = [
    { value: 'Colet', disabled: false, label: 'Colet' },
    { value: 'Plic', disabled: false, label: 'Plic' },
  ]

  const removeAxiosError = () => {
    setAxiosError({
      ...axiosError,
      isError: false,
    })
  }

  const dropDownOptions = courierData.map((_courier) => {
    return {
      label: (
        <>
          <img
            alt="logo"
            style={{ width: '20px', paddingRight: '6px' }}
            src={courierIcons[_courier.src]}
          />
          {_courier.label}
        </>
      ),
      onClick: () => {
        setService(_courier.service)
      },
    }
  })

  const handlePopUpToggle = () => {
    setModalOpen(!modalOpen)
  }

  const getOrderDetails = async (reset?: boolean) => {
    const rawData = await getOrderDataById(neededOrderId)
    const normalizedData = normalizeOrderData(rawData)

    if (reset) {
      refreshOrderDetails?.()

      if (normalizedData.packageAttachment?.packages && resetOrdersData) {
        const {
          invoiceKey,
          invoiceNumber,
          invoiceUrl: invUrl,
          courier: _courier,
        } = normalizedData?.packageAttachment?.packages

        if (invoiceKey && invoiceNumber) {
          resetOrdersData(
            normalizedData.orderId,
            invoiceKey,
            invoiceNumber,
            invUrl
          )
        }

        setOrderAwb?.((prevState) =>
          prevState.map((el) => {
            if (el.orderId === normalizedData.orderId) {
              el.orderValue = String(invUrl)
              el.courier = _courier
              el.invoiceNumber = invoiceNumber
            }

            return el
          })
        )

        onAwbUpdate(true)
      }
    }

    setOrderData(normalizedData)
    setIsLoading(false)
  }

  const getOrderData = async (orderId: string) => {
    createAwbShipping(
      orderId,
      service,
      weight,
      courierSetManually.toString(),
      packageAmount,
      manualAwb,
      manualUrl,
      courier,
      orderData?.value,
      invoiceDate.toString(),
      invoiceNum.toString(),
      invoiceUrl
    )
      .then((data) => {
        if (!data) {
          return
        }

        setTrackingNum({
          [orderId]: data.trackingNumber,
        })
        updateAwbData?.(data)
        setNewAwbGenerated(true)
        getOrderDetails(true)
      })
      .catch((error) => {
        if (error.status === 504) {
          getOrderDetails(true)

          return
        }

        setAxiosError({
          ...axiosError,
          isError: true,
          errorMessage: error.message,
          errorDetails: error.details,
        })
      })
  }

  const formHandler = (e: React.SyntheticEvent<EventTarget>) => {
    e.preventDefault()
    setModalOpen(!modalOpen)
    setInvoiceNum('')
    orderData?.orderId && getOrderData(orderData?.orderId)
  }

  const printAwb = async (_orderData: OrderDetailsData) => {
    setIsLoading(true)
    try {
      const data = await axios
        .get(`/opa/orders/${_orderData?.orderId}/tracking-label`, {
          params: {
            awbTrackingNumber: _orderData?.value.toString(),
            paperSize: 'A4',
          },
          responseType: 'blob',
        })
        .then((res) => {
          return res.data
        })
        .catch(async (error: AxiosError<Blob>) => {
          if (!error.response || error.response.status === 504) {
            return
          }

          const response = error.response

          const errorResponse = await new Promise<{
            message: string
            details: string
          }>((resolve) => {
            const fileReader = new FileReader()

            fileReader.readAsText(response.data)
            fileReader.onload = () => {
              const errorJSON = JSON.parse(fileReader.result as string) as {
                message: string
                stack: string
              }

              resolve({
                message: errorJSON.message,
                details: errorJSON.stack,
              })
            }
          })

          const errorData = {
            message: errorResponse.message,
            details: errorResponse.details,
          }

          setAxiosError({
            ...axiosError,
            isError: true,
            errorDetails: errorData.details,
            errorMessage: String(errorData.message),
          })
        })

      if (data) {
        const blob = new Blob([data], { type: 'application/pdf' })

        const blobURL = URL.createObjectURL(blob)

        window.open(blobURL)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getOrderDetails()
  }, [newAwbGenerated, neededOrderId])

  const awbButton = () =>
    orderData?.packageAttachment.packages && (
      <Button
        block
        variation="secondary"
        disabled={
          isLoading ||
          orderData?.status === 'canceled' ||
          disabledCouriers.includes(
            orderData?.packageAttachment.packages.courier
          )
        }
        isLoading={isLoading}
        onClick={() => {
          printAwb(orderData)
        }}
      >
        <div className="flex w-100">
          <span>
            <IconDownload />
          </span>
          <div className="w-100 truncate">
            <span className="mh3">
              {orderData?.packageAttachment.packages.courier && (
                <img
                  width="20px"
                  src={
                    courierIcons[
                      orderData?.packageAttachment.packages.courier.toLowerCase()
                    ]
                  }
                  alt=""
                />
              )}
            </span>
            <span className="f6">
              {orderData?.packageAttachment.packages.trackingNumber}
            </span>
          </div>
        </div>
      </Button>
    )

  return (
    <>
      {orderData?.packageAttachment.packages &&
        (!disabledCouriers.includes(
          orderData?.packageAttachment.packages.courier
        ) ? (
          <Tooltip
            label={`${orderData?.packageAttachment.packages.courier} ${orderData?.packageAttachment.packages.trackingNumber}`}
          >
            {awbButton()}
          </Tooltip>
        ) : (
          awbButton()
        ))}
      {!orderData?.packageAttachment.packages && (
        <Button
          block
          variation="primary"
          disabled={isLoading || orderData?.status === 'canceled'}
          isLoading={isLoading}
          onClick={() => {
            setModalOpen(!modalOpen)
          }}
        >
          <span className="f6"> Generează AWB & Factura</span>
        </Button>
      )}
      <Modal
        isOpen={modalOpen}
        responsiveFullScreen
        showCloseIcon
        onClose={() => {
          handlePopUpToggle()
          setCourier('')
          setService('')
        }}
        closeOnOverlayClick
        closeOnEsc
        centered
        zIndex={9}
      >
        <form onSubmit={formHandler}>
          <div className="flex flex-row">
            <div className="flex flex-column w-100 mr5 pb5">
              <h2>AWB Generation</h2>
              <div className="flex">
                <ActionMenu
                  label={service || 'Alege Modalitatea'}
                  zIndex={9999999}
                  options={dropDownOptions}
                />
              </div>

              {service && service !== 'manual' && (
                <>
                  <p>Tip pachet:</p>
                  <Dropdown
                    options={packageTypeOptions}
                    value={packageType || 'Colet'}
                    onChange={(_: any, v: React.SetStateAction<string>) =>
                      setPackageType(v)
                    }
                  />
                  <p>Numar colete :</p>
                  <NumericStepper
                    label="Minimum 1, maximum 5"
                    minValue={1}
                    maxValue={5}
                    value={packageAmount}
                    onChange={(event: { value: number }) =>
                      setPackageAmount(event.value)
                    }
                  />
                  <p>Greutate :</p>
                  <NumericStepper
                    label="Maximum 30 kg"
                    unitMultiplier={1}
                    suffix="kg"
                    minValue={0}
                    maxValue={30}
                    value={weight}
                    defaultValue={1}
                    onChange={(event: React.SetStateAction<any>) =>
                      setWeight(event.value)
                    }
                  />
                </>
              )}

              {service === 'manual' && (
                <>
                  <p>Curier:</p>
                  <Dropdown
                    options={[
                      { value: 'fancourier', label: 'FanCourier' },
                      { value: 'cargus', label: 'Cargus' },
                      { value: 'sameDay', label: 'SameDay' },
                      { value: 'TNT', label: 'TNT' },
                      { value: 'DHL', label: 'DHL' },
                      { value: 'GLS', label: 'GLS' },
                      { value: 'DPD', label: 'DPD' },
                    ]}
                    value={courierSetManually}
                    onChange={(
                      _: unknown,
                      v: SetStateAction<Array<{ value: string; label: string }>>
                    ) => setCourierManually(v)}
                  />
                  <p>AWB :</p>
                  <Input
                    required
                    maxLength={30}
                    placeholder="AWB"
                    onChange={(e: { target: { value: string } }) => {
                      setManualAwb(e.target.value)
                    }}
                  />
                  <p>Track URL :</p>

                  <Input
                    placeholder="Track URL"
                    onChange={(e: { target: { value: string } }) => {
                      setManualUrl(e.target.value)
                    }}
                  />
                </>
              )}
            </div>

            <Divider orientation="vertical" />
            <div className="flex flex-column w-100 ml5">
              <h2>Factura</h2>
              <div className="flex items-center">
                <ActionMenu
                  label={courier || 'Alege Modalitatea'}
                  zIndex={999999}
                  options={[
                    {
                      disabled: true,
                      label: (
                        <>
                          <img
                            alt="logo"
                            style={{ width: '20px', paddingRight: '6px' }}
                            src={courierIcons.facturis}
                          />{' '}
                          Facturis
                        </>
                      ),
                      onClick: () => {
                        setCourier('facturis')
                      },
                    },
                    {
                      label: (
                        <>
                          <img
                            alt="logo"
                            style={{ width: '20px', paddingRight: '6px' }}
                            src={courierIcons.smartbill}
                          />{' '}
                          Smartbill
                        </>
                      ),
                      disabled: false,
                      onClick: () => {
                        setCourier('smartbill')
                      },
                    },
                    {
                      label: (
                        <>
                          <img
                            alt="logo"
                            style={{ width: '20px', paddingRight: '6px' }}
                            src={courierIcons.download}
                          />
                          Incarca Factura Manual
                        </>
                      ),
                      disabled: false,
                      onClick: () => {
                        setCourier('manual')
                      },
                    },
                  ]}
                />
              </div>

              {courier === 'manual' && (
                <>
                  <span>
                    <p>Issuance Date</p>{' '}
                    <DatePicker
                      value={new Date()}
                      onChange={(e: Date) => {
                        return setInvoiceDate(e.toISOString().split('T')[0])
                      }}
                      locale="en-GB"
                      required
                    />
                  </span>
                  <p>Invoice Number</p>
                  <Input
                    placeholder="any value"
                    onChange={(e: { target: { value: string } }) =>
                      setInvoiceNum(e.target.value)
                    }
                    maxLength={20}
                    value={invoiceNum}
                    required
                  />

                  <p>Invoice URL (Optional) </p>
                  <Input
                    placeholder="any value"
                    onChange={(e: { target: { value: string } }) =>
                      setInvoiceUrl(e.target.value)
                    }
                    value={invoiceUrl}
                    required={false}
                  />
                </>
              )}
            </div>
          </div>
          <div className="flex justify-center w-100 mt7">
            <Button disabled={!service || !courier} type="submit">
              Generate
            </Button>
          </div>
        </form>
      </Modal>
      {axiosError.isError && (
        <ErrorPopUpMessage
          errorMessage={axiosError.errorMessage}
          errorDetails={axiosError.errorDetails}
          resetError={removeAxiosError}
        />
      )}
    </>
  )
}

export default RequestAwbModal
