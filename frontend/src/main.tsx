import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import SchemasList from './pages/SchemasList'
import FilesList from './pages/FilesList'
import ObjectsList from './pages/ObjectsList'
import DocumentsList from './pages/DocumentsList'
import DocumentFill from './pages/DocumentFill'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <SchemasList /> },
      { path: 'schemas', element: <SchemasList /> },
      { path: 'files', element: <FilesList /> },
      { path: 'objects', element: <ObjectsList /> },
      { path: 'documents', element: <DocumentsList /> },
      { path: 'documents/:id/fill', element: <DocumentFill /> },
    ]
  }
], { basename: import.meta.env.DEV ? '/' : '/ui' })

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
