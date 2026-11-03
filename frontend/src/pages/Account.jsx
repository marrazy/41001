import { Badge, Button, Card, DataList, Flex, Heading, Text, TextField } from '@radix-ui/themes'
import { useState } from 'react'
import { api, money } from '../api'
import { useAuth } from '../auth'
import ErrorBox from '../components/ErrorBox'

export default function Account() {
  const { user, refreshUser } = useAuth()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const handleTopUp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!(Number(amount) > 0)) {
      setError('Enter an amount greater than 0.')
      return
    }
    setBusy(true)
    try {
      await api('/wallet/top-up', { method: 'POST', body: { amount } })
      await refreshUser()
      setSuccess(`Added ${money(amount)} to your wallet.`)
      setAmount('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Flex direction="column" gap="5">
      <Heading as="h1" size="7">
        Account
      </Heading>

      <Flex gap="4" wrap="wrap" align="start">
        <Card size="3" style={{ flex: '1 1 320px' }}>
          <Flex direction="column" gap="4">
            <Heading as="h2" size="4">
              Profile
            </Heading>
            <DataList.Root>
              <DataList.Item>
                <DataList.Label>Name</DataList.Label>
                <DataList.Value>{user.name || '—'}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Email</DataList.Label>
                <DataList.Value>{user.email}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Account type</DataList.Label>
                <DataList.Value>
                  <Badge color={user.is_seller ? 'green' : 'gray'} size="2">
                    {user.is_seller ? 'Seller' : 'Buyer'}
                  </Badge>
                </DataList.Value>
              </DataList.Item>
            </DataList.Root>
          </Flex>
        </Card>

        <Card size="3" style={{ flex: '1 1 320px' }}>
          <Flex direction="column" gap="4">
            <Heading as="h2" size="4">
              Wallet
            </Heading>
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">
                Current balance
              </Text>
              <Text size="8" weight="bold">
                {money(user.balance)}
              </Text>
            </Flex>
            <form onSubmit={handleTopUp}>
              <Flex direction="column" gap="2">
                <Text as="label" htmlFor="amount" size="2" weight="bold">
                  Add money
                </Text>
                <Flex gap="2" wrap="wrap">
                  <TextField.Root
                    id="amount"
                    size="3"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="50.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ flex: '1 1 160px' }}
                  />
                  <Button type="submit" size="3" loading={busy}>
                    Top up
                  </Button>
                </Flex>
                <Text size="1" color="gray">
                  Simulated money only. No real payments are made.
                </Text>
              </Flex>
            </form>
            <ErrorBox message={error} />
            <ErrorBox message={success} color="green" />
          </Flex>
        </Card>
      </Flex>
    </Flex>
  )
}
