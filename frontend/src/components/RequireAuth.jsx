// Wrap a page in this to make it need a login (and optionally a seller account).
import { Flex, Spinner } from '@radix-ui/themes'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

export default function RequireAuth({ sellerOnly = false, children }) {
  const { user, loading, loggedOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    )
  }
  if (!user) {
    // Remember where they were going, so login can send them back (not after a deliberate logout)
    return <Navigate to="/login" replace state={loggedOut ? undefined : { from: location.pathname }} />
  }
  if (sellerOnly && !user.is_seller) {
    return <Navigate to="/" replace />
  }
  return children
}
