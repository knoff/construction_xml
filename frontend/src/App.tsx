import { Outlet, Link, NavLink } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto max-w-5xl p-4 flex gap-6">
          <Link to="/" className="font-semibold">XSD Registry</Link>
          <nav className="flex gap-4">
            <NavLink to="/schemas" className={({isActive}) => isActive ? 'underline' : ''}>Схемы</NavLink>
            <NavLink to="/objects" className={({isActive}) => isActive ? 'underline' : ''}>Объекты</NavLink>
            <NavLink to="/documents" className={({isActive}) => isActive ? 'underline' : ''}>Документы</NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
