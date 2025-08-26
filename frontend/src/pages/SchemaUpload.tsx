import { useState } from 'react'
//import { useForm } from 'react-hook-form'
import { api } from '../lib/api'
//import { Button } from '../components/ui/button'
//import { Input } from '../components/ui/input'

//type Form = { file: FileList }

export default function SchemaUpload() {
/*  const { register, handleSubmit, reset } = useForm<Form>()
  const [msg, setMsg] = useState<string>('')

  const onSubmit = async (v: Form) => {
    const files = v.file
    if (!files || files.length === 0) return
    const f = files[0]
    // NOTE: server enforces MAX_UPLOAD_MB=80; client can add pre-check if desired
    const form = new FormData()
    form.append('file', f)
    const res = await api.post('/schemas/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    setMsg(`Uploaded: ${res.data.path}`)
    reset()
  }
*/
/*
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Загрузка XSD/XSL</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-3">
        <Input type="file" accept=".xsd,.xsl" {...register('file')} />
        <Button type="submit">Загрузить</Button>
      </form>
      {msg && <div className="text-sm text-green-600">{msg}</div>}
    </div>
  )
*/
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Загрузка XSD/XSL</h1>
    </div>
  )
}
