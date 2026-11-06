import { Box, Button, Checkbox, Flex, Link, Text } from '@radix-ui/themes'
import { useState } from 'react'
import { Navigate, Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import AuthCard from '../components/AuthCard'
import ErrorBox from '../components/ErrorBox'
import Field from '../components/Field'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSeller, setIsSeller] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register({ name, email, password, isSeller })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Create an account" subtitle="Money is simulated for this assignment.">
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <ErrorBox message={error} />
          <Field id="name" label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Box asChild p="3" style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-3)', cursor: 'pointer' }}>
            <Text as="label" size="2">
              <Flex gap="3" align="start">
                <Checkbox size="2" checked={isSeller} onCheckedChange={(v) => setIsSeller(v === true)} />
                <Flex direction="column" gap="1">
                  <Text weight="bold">I want to sell items</Text>
                  <Text color="gray">Seller accounts can list produce for others to buy.</Text>
                </Flex>
              </Flex>
            </Text>
          </Box>
          <Button type="submit" size="3" loading={busy}>
            Create account
          </Button>
        </Flex>
      </form>
      <Text size="2" color="gray" align="center">
        Already have an account?{' '}
        <Link asChild>
          <RouterLink to="/login">Log in</RouterLink>
        </Link>
      </Text>
    </AuthCard>
  )
}
