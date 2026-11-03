// The centred card used by the Login and Register pages.
import { Box, Card, Flex, Heading, Text } from '@radix-ui/themes'

export default function AuthCard({ title, subtitle, children }) {
  return (
    <Flex align="center" justify="center" px="4" py="8" style={{ minHeight: '100vh', background: 'var(--gray-2)' }}>
      <Box asChild width="100%" maxWidth="400px">
        <main>
          <Card size="4">
            <Flex direction="column" gap="5">
              <Flex direction="column" gap="1">
                <Text size="4" weight="bold">
                  FreshBasket
                </Text>
                <Heading as="h1" size="6">
                  {title}
                </Heading>
                <Text size="2" color="gray">
                  {subtitle}
                </Text>
              </Flex>
              {children}
            </Flex>
          </Card>
        </main>
      </Box>
    </Flex>
  )
}
