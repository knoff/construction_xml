import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import SchemasList from './pages/SchemasList'
import SchemaUpload from './pages/SchemaUpload'
import SchemaView from './pages/SchemaView'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <SchemasList /> },
      { path: 'schemas', element: <SchemasList /> },
      { path: 'schemas/upload', element: <SchemaUpload /> },
      { path: 'schemas/:id', element: <SchemaView /> }
    ]
  }
], { basename: import.meta.env.DEV ? '/' : '/ui' })

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
