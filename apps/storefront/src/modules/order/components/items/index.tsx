import { convertToLocale } from "@lib/util/money"
import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Table } from "@modules/common/components/ui"

import Divider from "@modules/common/components/divider"
import Item from "@modules/order/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsProps = {
  order: HttpTypes.StoreOrder
}

const Items = ({ order }: ItemsProps) => {
  const items = order.items

  return (
    <div className="flex flex-col">
      <Divider className="!mb-0" />
      <Table>
        <Table.Body data-testid="products-table">
          {items?.length
            ? items
                .sort((a, b) => {
                  return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                })
                .map((item) => {
                  if (item.metadata?.type === "cod_fee") {
                    return (
                      <Table.Row key={item.id}>
                        <Table.Cell className="!pl-0 py-3 text-sm text-ink-soft" colSpan={2}>{item.title}</Table.Cell>
                        <Table.Cell className="!pr-0 py-3 text-right text-sm text-ink">
                          {convertToLocale({ amount: Number(item.total ?? item.unit_price), currency_code: order.currency_code })}
                        </Table.Cell>
                      </Table.Row>
                    )
                  }
                  return (
                    <Item
                      key={item.id}
                      item={item}
                      currencyCode={order.currency_code}
                    />
                  )
                })
            : repeat(5).map((i) => {
                return <SkeletonLineItem key={i} />
              })}
        </Table.Body>
      </Table>
    </div>
  )
}

export default Items
