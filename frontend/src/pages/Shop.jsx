import { Box, Button, Card, Flex, Grid, Heading, Inset, Spinner, Text, TextField } from '@radix-ui/themes'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, asList, money } from '../api'
import { useAuth } from '../auth'
import ErrorBox from '../components/ErrorBox'

function ItemCard({ item, onBuy }) {
  const [qty, setQty] = useState('1')
  const [busy, setBusy] = useState(false)
  const inStock = item.stock > 0
  const qtyId = `qty-${item.id}`

  const handleBuy = async () => {
    setBusy(true)
    try {
      await onBuy(item, Number(qty))
      setQty('1')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card size="2">
      <Flex direction="column" gap="3" height="100%">
        <Inset clip="padding-box" side="top" pb="current">
          <Flex align="center" justify="center" height="140px" style={{ background: 'var(--gray-3)' }}>
            <Text size="1" color="gray">
              Photo
            </Text>
          </Flex>
        </Inset>
        <Flex justify="between" align="baseline" gap="2">
          <Heading as="h2" size="4">
            {item.name}
          </Heading>
          <Text size="4" weight="bold">
            {money(item.price)}
          </Text>
        </Flex>
        {item.description && (
          <Text size="2" color="gray">
            {item.description}
          </Text>
        )}
        <Text size="1" color="gray">
          {inStock ? `${item.stock} in stock` : 'Out of stock'}
        </Text>
        <Flex gap="2" align="end" mt="auto">
          <Flex direction="column" gap="1">
            <Text as="label" htmlFor={qtyId} size="1" color="gray">
              Qty
            </Text>
            <TextField.Root
              id={qtyId}
              size="3"
              type="number"
              min="1"
              max={item.stock}
              value={qty}
              disabled={!inStock}
              onChange={(e) => setQty(e.target.value)}
              style={{ width: 72 }}
            />
          </Flex>
          <Button
            size="3"
            style={{ flexGrow: 1 }}
            disabled={!inStock || !(Number(qty) >= 1)}
            loading={busy}
            onClick={handleBuy}
          >
            {inStock ? 'Buy' : 'Sold out'}
          </Button>
        </Flex>
      </Flex>
    </Card>
  )
}

export default function Shop() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadItems = useCallback(async () => {
    try {
      const data = await api('/items')
      setItems(asList(data, 'items'))
    } catch (err) {
      setError(err.message)
      setItems([])
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleBuy = async (item, quantity) => {
    setError('')
    setSuccess('')
    if (!user) {
      navigate('/login', { state: { from: '/' } })
      return
    }
    try {
      const result = await api('/orders', {
        method: 'POST',
        body: { lines: [{ item_id: item.id, quantity }] },
      })
      setSuccess(`Bought ${quantity} × ${item.name} for ${money(result.total)}.`)
      await Promise.all([refreshUser(), loadItems()])
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="1">
        <Heading as="h1" size="7">
          Shop
        </Heading>
        <Text color="gray">Fresh produce from local growers.</Text>
      </Flex>

      <ErrorBox message={error} />
      <ErrorBox message={success} color="green" />

      {items === null ? (
        <Flex justify="center" py="9">
          <Spinner size="3" />
        </Flex>
      ) : items.length === 0 ? (
        <Box py="9">
          <Text color="gray">No items for sale yet.</Text>
        </Box>
      ) : (
        <Grid columns={{ initial: '1', xs: '2', md: '3' }} gap="4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onBuy={handleBuy} />
          ))}
        </Grid>
      )}
    </Flex>
  )
}
