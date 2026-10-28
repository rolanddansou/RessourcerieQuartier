import Login from './pages/login'
import Espace from './pages/espace'
import PlanningApp from './PlanningApp'
import Gestion from './pages/gestion'

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/login') return <Login />
  if (path === '/espace') return <Espace />
  if (path === '/planning' || path.startsWith('/admin/planning')) return <PlanningApp />
  if (path === '/gestion') return <Gestion />
  return <Login />
}
