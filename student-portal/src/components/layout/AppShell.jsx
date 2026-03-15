import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'

const AppShell = () => (
  <div className="flex h-screen overflow-hidden bg-canvas">
    <Sidebar />
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  </div>
)

export default AppShell
