import { Link, NavLink, Outlet } from "react-router-dom";

import { usePrimaryNavigationLinks } from "@/app/navigation";

export function RootLayout() {
  const navigationLinks = usePrimaryNavigationLinks();

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-6 p-4">
          <Link to="/" className="font-semibold">
            XSD Registry
          </Link>
          <nav className="flex flex-1 gap-4">
            {navigationLinks.map((link) => (
              <NavLink key={link.id} to={link.to} className={({ isActive }) => (isActive ? "underline" : "hover:underline")}> 
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}

export default RootLayout;
