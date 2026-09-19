import { NavLink, Route, Routes } from 'react-router-dom'
import { QuestGeneratorPage } from './pages/QuestGeneratorPage.jsx'
import { SaveInfoPage } from './pages/SaveInfoPage.jsx'

function navLinkClassName({ isActive }) {
  return isActive ? 'app__nav-link app__nav-link--active' : 'app__nav-link'
}

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>No Man's Sky Quest Generator</h1>
        <nav className="app__nav">
          <NavLink to="/" end className={navLinkClassName}>
            Quest Generator
          </NavLink>
          <NavLink to="/save-info" className={navLinkClassName}>
            Save Info
          </NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<QuestGeneratorPage />} />
          <Route path="/save-info" element={<SaveInfoPage />} />
        </Routes>
      </main>
    </div>
  )
}
