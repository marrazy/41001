import { Heading, Link, Text, Flex } from '@radix-ui/themes'
import { Route, Link as RouterLink, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Account from './pages/Account'
import ItemForm from './pages/ItemForm'
import Login from './pages/Login'
import Orders from './pages/Orders'
import Register from './pages/Register'
import SellerItems from './pages/SellerItems'
import Shop from './pages/Shop'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Shop />} />
        <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
        <Route path="/seller/items" element={<RequireAuth sellerOnly><SellerItems /></RequireAuth>} />
        <Route path="/seller/items/new" element={<RequireAuth sellerOnly><ItemForm /></RequireAuth>} />
        <Route path="/seller/items/:id/edit" element={<RequireAuth sellerOnly><ItemForm /></RequireAuth>} />
        <Route
          path="*"
          element={
            <Flex direction="column" gap="2" py="9">
              <Heading as="h1">Page not found</Heading>
              <Text>
                <Link asChild>
                  <RouterLink to="/">Back to the shop</RouterLink>
                </Link>
              </Text>
            </Flex>
          }
        />
      </Route>
    </Routes>
  )
}
