import type { FC } from 'react'
import React, { useEffect, useState } from 'react'
import { Table } from 'vtex.styleguide'

import type { IOrderTableItem } from '../../types/order'
import type { OrderDetailsData } from '../../typings/normalizedOrder'

const OrderTable: FC<{ orderData?: OrderDetailsData }> = ({ orderData }) => {
  const [tableData, setTableData] = useState<IOrderTableItem[]>([])

  const customSchema = {
    properties: {
      productSku: {
        title: 'SKU-ul produsului',
        width: 200,
      },
      productName: {
        title: 'Numele Produslui',
        width: 600,
      },
      productQuantity: {
        title: 'Cantitate',
      },
      productPriceNoTva: {
        title: 'Pret fara TVA',
        width: 100,
      },
      tvaProcent: {
        title: 'TVA',
        width: 50,
      },
      productPriceTva: {
        title: 'Pret cu TVA',
        width: 100,
      },
    },
  }

  const normalizeTableData = (data: OrderDetailsData) => {
    const { items } = data
    const orderTotals: { [key: string]: number } = {}
    const result: IOrderTableItem[] = []

    items.forEach((element) => {
      result.push({
        productSku: element.sellerSku,
        productName: element.name,
        productQuantity: element.quantity,
        productPriceNoTva: `${element.priceDefinition.total / 100} Lei`,
        tvaProcent: `${element.tax}%`,
        productPriceTva: `${
          (element.priceDefinition.total + element.tax) / 100
        } Lei`,
      })
    })
    data.totals.forEach((element) => {
      Object.assign(orderTotals, {
        [element.id.toLocaleLowerCase()]: element.value,
      })
    })
    result.push(
      {
        productSku: '',
        productName: 'Taxa de livrare',
        productQuantity: null,
        productPriceNoTva: `${orderData?.orderTotals.shipping} Lei`,
        tvaProcent: '0%',
        productPriceTva: `${orderData?.orderTotals.shipping} Lei`,
      },
      {
        productSku: '',
        productName: 'Total',
        productQuantity: null,
        productPriceNoTva: `${
          (orderTotals.items + orderTotals.shipping) / 100
        } Lei`,
        tvaProcent: '',
        productPriceTva: `${
          (orderTotals.items + orderTotals.shipping + orderTotals.tax) / 100
        } Lei`,
      }
    )
    setTableData(result)
  }

  useEffect(() => {
    orderData && normalizeTableData(orderData)
  }, [])

  return (
    <div className="flex flex-column mb7">
      <h3 className="t-heading-3">Produse</h3>
      <div className="mb5">
        <Table fullWidth schema={customSchema} items={tableData} />
      </div>
    </div>
  )
}

export default OrderTable
