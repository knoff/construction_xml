import { Outlet, Link, NavLink } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-6 p-4">
          <Link to="/" className="font-semibold">XSD Registry</Link>
          <nav className="flex gap-4">
            <NavLink to="/schemas" className={({isActive}) => isActive ? 'underline' : ''}>Схемы</NavLink>
            <NavLink to="/objects" className={({isActive}) => isActive ? 'underline' : ''}>Объекты</NavLink>
            <NavLink to="/documents" className={({isActive}) => isActive ? 'underline' : ''}>Документы</NavLink>
            <NavLink to="/files" className={({isActive}) => isActive ? 'underline' : ''}>Файлы</NavLink>
          </nav>
          <NavLink
            to="/docs"
            className={({isActive}) => isActive ? 'ml-auto font-medium underline' : 'ml-auto font-medium hover:underline'}
          >
            Документация
          </NavLink>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
