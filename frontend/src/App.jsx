import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import MenuDisplay from './components/MenuDisplay'
import AdminPanel from './components/AdminPanel'
import Login from './components/Login'
import axios from 'axios'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const response = await axios.get('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.status === 200) {
          setIsAuthenticated(true)
        }
      }
    } catch (error) {
      localStorage.removeItem('token')
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (token) => {
    localStorage.setItem('token', token)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Laddar...
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Huvudsida - menydisplay */}
        <Route path="/" element={<MenuDisplay />} />
        
        {/* Admin login */}
        <Route 
          path="/admin/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/admin" replace /> : 
            <Login onLogin={handleLogin} />
          } 
        />
        
        {/* Admin panel */}
        <Route 
          path="/admin/*" 
          element={
            isAuthenticated ? 
            <AdminPanel onLogout={handleLogout} /> : 
            <Navigate to="/admin/login" replace />
          } 
        />
      </Routes>
    </Router>
  )
}

export default App
