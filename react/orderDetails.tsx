import React, { useState, useEffect } from 'react'
import type { FC } from 'react'
import { Layout, Spinner } from 'vtex.styleguide'

import { getOrderDataById } from './src/utils/api/index'
import { normalizeOrderData } from './src/utils/normalizeData/orderDetails'
import OrderDetail from './src/pages/OrderDetail/index'
import { OrderHeader } from './src/components/OrderDetail'
import type { OrderDetailsData } from './src/typings/normalizedOrder'
import ErrorNotification from './src/components/ErrorNotification'
import type { IOrder } from './src/typings/order'

const OrderDetails: FC = () => {
  const [order, setOrder] = useState<OrderDetailsData>()
  const [rawData, setRawData] = useState<IOrder>()
  const [isLoading, setIsLoading] = useState(true)
  const getOrdeData = async () => {
    const orderId = window.location.pathname
      .match(/GCB-[0-9]+-[0-9]+/g)
      ?.toString()

    const data = orderId && (await getOrderDataById(orderId))

    if (data) {
      setRawData(data)
      const normalizedData = normalizeOrderData(data)

      setOrder(normalizedData)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    getOrdeData()
  }, [])

  return isLoading ? (
    <div className="vh-100 w-100 flex items-center justify-center">
      <Spinner size={60} />
    </div>
  ) : (
    <>
      <Layout
        fullWidth
        pageHeader={
          <OrderHeader
            orderId={order?.marketPlaceOrderId ?? 'Lipsa ID'}
            orderStatus={order?.status}
          />
        }
      >
        {order ? (
          <OrderDetail orderData={order} rawOrderData={rawData} />
        ) : (
          <ErrorNotification errorMessage="Eroare, incercati mai tarziu" />
        )}
      </Layout>
    </>
  )
}

export default OrderDetails
