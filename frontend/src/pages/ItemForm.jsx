// One form for both adding (/seller/items/new) and editing (/seller/items/:id/edit).
import { Box, Button, Card, Flex, Heading, Link, Spinner, Text, TextArea } from '@radix-ui/themes'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import ErrorBox from '../components/ErrorBox'
import Field from '../components/Field'

export default function ItemForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) return
    api(`/items/${id}`)
      .then((item) => {
        setName(item.name ?? '')
        setDescription(item.description ?? '')
        setPrice(String(item.price ?? ''))
        setStock(String(item.stock ?? ''))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [editing, id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const body = {
      name,
      description: description || null,
      price,
      stock: Number(stock || 0),
    }
    try {
      if (editing) {
        await api(`/items/${id}`, { method: 'PATCH', body })
      } else {
        await api('/items', { method: 'POST', body })
      }
      navigate('/seller/items')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box maxWidth="640px" mx="auto">
      <Flex direction="column" gap="5">
        <Flex direction="column" gap="2">
          <Link asChild size="2">
            <RouterLink to="/seller/items">Back to my items</RouterLink>
          </Link>
          <Heading as="h1" size="7">
            {editing ? 'Edit item' : 'Add item'}
          </Heading>
        </Flex>

        {loading ? (
          <Flex justify="center" py="9">
            <Spinner size="3" />
          </Flex>
        ) : (
          <Card size="3">
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="4">
                <ErrorBox message={error} />
                <Field
                  id="item-name"
                  label="Name"
                  placeholder="e.g. Tomatoes"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Flex direction="column" gap="1">
                  <Text as="label" htmlFor="item-desc" size="2" weight="bold">
                    Description{' '}
                    <Text weight="regular" color="gray">
                      (optional)
                    </Text>
                  </Text>
                  <TextArea
                    id="item-desc"
                    size="3"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Flex>
                <Flex gap="4" wrap="wrap">
                  <Box style={{ flex: '1 1 200px' }}>
                    <Field
                      id="item-price"
                      label="Price ($)"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </Box>
                  <Box style={{ flex: '1 1 200px' }}>
                    <Field
                      id="item-stock"
                      label="Stock"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </Box>
                </Flex>
                <Flex gap="2" justify="end" pt="2">
                  <Button asChild variant="outline" color="gray" size="3">
                    <RouterLink to="/seller/items">Cancel</RouterLink>
                  </Button>
                  <Button type="submit" size="3" loading={busy}>
                    Save item
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Card>
        )}
      </Flex>
    </Box>
  )
}
