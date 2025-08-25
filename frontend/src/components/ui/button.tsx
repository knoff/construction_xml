import { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props
  return <button className={clsx('px-4 py-2 rounded-md border shadow-sm', className)} {...rest} />
}
