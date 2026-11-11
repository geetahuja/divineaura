"use client"

import { convertToLocale } from "@lib/util/money"
import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Table, clx } from "@modules/common/components/ui"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart: HttpTypes.StoreCart
}

const ItemsPreviewTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart.items
  const hasOverflow = items && items.length > 4

  return (
    <div
      className={clx({
        "pl-[1px] overflow-y-scroll overflow-x-hidden no-scrollbar max-h-[420px]":
          hasOverflow,
      })}
    >
      <Table>
        <Table.Body data-testid="items-table">
          {items
            ? items
                .sort((a, b) => {
                  return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                })
                .map((item) => {
                  // The COD fee is a priced line on the server, not a product.
                  if (item.metadata?.type === "cod_fee") {
                    return (
                      <Table.Row key={item.id}>
                        <Table.Cell className="!pl-0 py-3 text-sm text-ink-soft" colSpan={2}>{item.title}</Table.Cell>
                        <Table.Cell className="!pr-0 py-3 text-right text-sm text-ink">
                          {convertToLocale({ amount: Number(item.total ?? item.unit_price), currency_code: cart.currency_code })}
                        </Table.Cell>
                      </Table.Row>
                    )
                  }
                  return (
                    <Item
                      key={item.id}
                      item={item}
                      type="preview"
                      currencyCode={cart.currency_code}
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

export default ItemsPreviewTemplate
