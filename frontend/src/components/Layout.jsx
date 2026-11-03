// The top navigation bar, shown on every page except login and register.
import { Box, Button, Container, Flex, Link, Text } from '@radix-ui/themes'
import { NavLink, Outlet, Link as RouterLink, useNavigate } from 'react-router-dom'
import { money } from '../api'
import { useAuth } from '../auth'

function NavItem({ to, children }) {
  return (
    <NavLink to={to} end style={{ textDecoration: 'none', color: 'var(--gray-12)' }}>
      {({ isActive }) => (
        <Box
          px="3"
          py="3"
          style={{
            borderBottom: isActive ? '2px solid var(--accent-9)' : '2px solid transparent',
          }}
        >
          <Text size="2" weight={isActive ? 'bold' : 'regular'} color={isActive ? undefined : 'gray'} highContrast={isActive}>
            {children}
          </Text>
        </Box>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Box style={{ minHeight: '100vh', background: 'var(--gray-2)' }}>
      <Box asChild style={{ background: 'var(--color-panel-solid)', borderBottom: '1px solid var(--gray-5)' }}>
        <header>
          <Container size="4" px="4">
            <Flex asChild align="center" wrap="wrap" gapX="5" gapY="1" py="1">
              <nav aria-label="Main">
                <Link asChild size="4" weight="bold" highContrast underline="none">
                  <RouterLink to="/">FreshBasket</RouterLink>
                </Link>

                <Flex wrap="wrap" gap="1" style={{ flexGrow: 1 }}>
                  <NavItem to="/">Shop</NavItem>
                  {user && <NavItem to="/orders">My orders</NavItem>}
                  {user?.is_seller && <NavItem to="/seller/items">My items</NavItem>}
                  {user && <NavItem to="/account">Account</NavItem>}
                </Flex>

                {user ? (
                  <Flex align="center" gap="3">
                    <Text size="2" color="gray">
                      Balance{' '}
                      <Text weight="bold" highContrast>
                        {money(user.balance)}
                      </Text>
                    </Text>
                    <Button variant="outline" color="gray" size="3" onClick={handleLogout}>
                      Log out
                    </Button>
                  </Flex>
                ) : (
                  <Flex align="center" gap="2">
                    <Button asChild variant="outline" color="gray" size="3">
                      <RouterLink to="/login">Log in</RouterLink>
                    </Button>
                    <Button asChild size="3">
                      <RouterLink to="/register">Register</RouterLink>
                    </Button>
                  </Flex>
                )}
              </nav>
            </Flex>
          </Container>
        </header>
      </Box>

      <Container size="4" px="4" py="6">
        <main>
          <Outlet />
        </main>
      </Container>
    </Box>
  )
}
