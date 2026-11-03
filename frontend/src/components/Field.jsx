// A label + text box pair, used by every form.
import { Flex, Text, TextField } from '@radix-ui/themes'

export default function Field({ id, label, hint, ...inputProps }) {
  return (
    <Flex direction="column" gap="1">
      <Text as="label" htmlFor={id} size="2" weight="bold">
        {label}
      </Text>
      <TextField.Root id={id} size="3" {...inputProps} />
      {hint && (
        <Text size="1" color="gray">
          {hint}
        </Text>
      )}
    </Flex>
  )
}
