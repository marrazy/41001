import { AlertDialog, Box, Button, Card, Flex, Heading, Spinner, Table, Text } from '@radix-ui/themes'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, asList, money } from '../api'
import ErrorBox from '../components/ErrorBox'

function DeleteButton({ item, onDeleted, onError }) {
  const [busy, setBusy] = useState(false)

  const handleDelete = async () => {
    setBusy(true)
    try {
      await api(`/items/${item.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (err) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button variant="soft" color="red" size="2" loading={busy}>
          Delete
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="420px">
        <AlertDialog.Title>Delete {item.name}?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          This removes the item from the shop. It can't be undone.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button color="red" onClick={handleDelete}>
              Delete
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  )
}

export default function SellerItems() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setItems(asList(await api('/items/mine'), 'items'))
    } catch (err) {
      setError(err.message)
      setItems([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Flex direction="column" gap="5">
      <Flex justify="between" align="end" wrap="wrap" gap="3">
        <Flex direction="column" gap="1">
          <Heading as="h1" size="7">
            My items
          </Heading>
          <Text color="gray">Items you are selling.</Text>
        </Flex>
        <Button asChild size="3">
          <RouterLink to="/seller/items/new">Add item</RouterLink>
        </Button>
      </Flex>

      <ErrorBox message={error} />

      {items === null ? (
        <Flex justify="center" py="9">
          <Spinner size="3" />
        </Flex>
      ) : items.length === 0 ? (
        <Box py="9">
          <Text color="gray">You're not selling anything yet. Add your first item.</Text>
        </Box>
      ) : (
        <Card size="1" style={{ overflowX: 'auto' }}>
          <Table.Root size="2" style={{ minWidth: 560 }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Price</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Stock</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {items.map((item) => (
                <Table.Row key={item.id} align="center">
                  <Table.RowHeaderCell>
                    <Text weight="bold">{item.name}</Text>
                  </Table.RowHeaderCell>
                  <Table.Cell>{money(item.price)}</Table.Cell>
                  <Table.Cell>{item.stock}</Table.Cell>
                  <Table.Cell justify="end">
                    <Flex gap="2" justify="end">
                      <Button asChild variant="outline" color="gray" size="2">
                        <RouterLink to={`/seller/items/${item.id}/edit`}>Edit</RouterLink>
                      </Button>
                      <DeleteButton
                        item={item}
                        onDeleted={() => {
                          setError('')
                          load()
                        }}
                        onError={setError}
                      />
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card>
      )}

      <Text size="1" color="gray">
        Items that already appear in an order can't be deleted. Set their stock to 0 instead.
      </Text>
    </Flex>
  )
}
