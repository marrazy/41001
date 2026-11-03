import { Button, Flex, Link, Text } from '@radix-ui/themes'
import { useState } from 'react'
import { Navigate, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import AuthCard from '../components/AuthCard'
import ErrorBox from '../components/ErrorBox'
import Field from '../components/Field'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const goTo = location.state?.from || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={goTo} replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate(goTo, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Log in" subtitle="Welcome back. Log in to shop or manage your items.">
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <ErrorBox message={error} />
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" size="3" loading={busy}>
            Log in
          </Button>
        </Flex>
      </form>
      <Text size="2" color="gray" align="center">
        No account yet?{' '}
        <Link asChild>
          <RouterLink to="/register">Register</RouterLink>
        </Link>
      </Text>
    </AuthCard>
  )
}
