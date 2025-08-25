import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest }, ref
) {
  return <input ref={ref} className={clsx('border rounded-md px-3 py-2', className)} {...rest} />
})
