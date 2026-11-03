import { Box, Card, Flex, Heading, Inset, Spinner, Table, Text } from '@radix-ui/themes'
import { useEffect, useState } from 'react'
import { api, asList, formatDate, money } from '../api'
import ErrorBox from '../components/ErrorBox'

// Order lines only carry item_id, so look up item names separately.
async function loadItemNames(orders) {
  const names = {}
  try {
    for (const item of asList(await api('/items'), 'items')) names[item.id] = item.name
  } catch {
    // fall back to fetching one by one below
  }
  const missing = new Set()
  for (const order of orders) {
    for (const line of order.lines || []) if (!names[line.item_id]) missing.add(line.item_id)
  }
  await Promise.all(
    [...missing].map(async (id) => {
      try {
        names[id] = (await api(`/items/${id}`)).name
      } catch {
        names[id] = 'Unknown item'
      }
    }),
  )
  return names
}

function orderTotal(order) {
  if (order.total !== undefined && order.total !== null) return order.total
  return (order.lines || []).reduce((sum, l) => sum + Number(l.unit_price) * l.quantity, 0)
}

export default function Orders() {
  const [orders, setOrders] = useState(null)
  const [names, setNames] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = asList(await api('/orders/me'), 'orders')
        const itemNames = await loadItemNames(list)
        if (!cancelled) {
          setNames(itemNames)
          setOrders(list)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          setOrders([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="1">
        <Heading as="h1" size="7">
          My orders
        </Heading>
        <Text color="gray">Newest first.</Text>
      </Flex>

      <ErrorBox message={error} />

      {orders === null ? (
        <Flex justify="center" py="9">
          <Spinner size="3" />
        </Flex>
      ) : orders.length === 0 ? (
        <Box py="9">
          <Text color="gray">You haven't ordered anything yet.</Text>
        </Box>
      ) : (
        orders.map((order) => (
          <Card key={order.id} size="2">
            <Flex justify="between" align="center" wrap="wrap" gap="2" mb="3">
              <Flex direction="column">
                <Heading as="h2" size="3">
                  Order #{String(order.id).slice(0, 8)}
                </Heading>
                <Text size="1" color="gray">
                  {formatDate(order.created_at)}
                </Text>
              </Flex>
              <Text>
                Total <Text weight="bold">{money(orderTotal(order))}</Text>
              </Text>
            </Flex>
            <Inset side="bottom">
              <Box style={{ overflowX: 'auto' }}>
                <Table.Root size="2" style={{ minWidth: 480 }}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Item</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Qty</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Unit price</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell justify="end">Subtotal</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {(order.lines || []).map((line) => (
                      <Table.Row key={line.id ?? line.item_id}>
                        <Table.RowHeaderCell>{names[line.item_id] ?? '…'}</Table.RowHeaderCell>
                        <Table.Cell>{line.quantity}</Table.Cell>
                        <Table.Cell>{money(line.unit_price)}</Table.Cell>
                        <Table.Cell justify="end">{money(Number(line.unit_price) * line.quantity)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Inset>
          </Card>
        ))
      )}
    </Flex>
  )
}
