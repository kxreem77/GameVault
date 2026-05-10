import { useState } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'

function App() {
  // Check if we already have a token when the app loads
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'))

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsLoggedIn(false)
  }

  return (
    <div>
      {isLoggedIn ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </div>
  )
}

export default App