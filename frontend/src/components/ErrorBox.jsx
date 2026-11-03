import { Callout } from '@radix-ui/themes'

// Shows an error (or success) message; shows nothing when message is empty.
export default function ErrorBox({ message, color = 'red' }) {
  if (!message) return null
  return (
    <Callout.Root color={color} role={color === 'red' ? 'alert' : 'status'}>
      <Callout.Text>{message}</Callout.Text>
    </Callout.Root>
  )
}
