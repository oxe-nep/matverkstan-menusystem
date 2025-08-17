import { useState, useEffect } from 'react'
import axios from 'axios'
import './Login.css'

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Sätt login-titel
    document.title = 'Restaurang Matverkstan - Admin'
  }, [])

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!credentials.username || !credentials.password) {
      setError('Vänligen fyll i alla fält')
      return
    }

    setLoading(true)
    
    try {
      const response = await axios.post('/api/auth/login', credentials)
      onLogin(response.data.token)
    } catch (err) {
      setError(err.response?.data?.message || 'Inloggning misslyckades')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Restaurang Matverkstan</h1>
          <p>Logga in för att hantera menyer</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Användarnamn</label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              placeholder="Ange användarnamn"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Lösenord</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder="Ange lösenord"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="login-button primary"
            disabled={loading}
          >
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            <a href="/">← Tillbaka till menyvisning</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
