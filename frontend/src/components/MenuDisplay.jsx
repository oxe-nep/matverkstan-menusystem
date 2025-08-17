import { useState, useEffect } from 'react'
import axios from 'axios'
import './MenuDisplay.css'

const MenuDisplay = () => {
  const [menuData, setMenuData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [eventSource, setEventSource] = useState(null)

  useEffect(() => {
    fetchTodaysMenu()
    setupEventSource()
    
    // Uppdatera tiden varje sekund
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Backup: Kontrollera efter ny meny varje 5 minuter (för säkerhets skull)
    const menuInterval = setInterval(() => {
      fetchTodaysMenu()
    }, 5 * 60 * 1000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(menuInterval)
    }
  }, [])

  // Cleanup för EventSource när komponenten unmountas
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [eventSource])

  const setupEventSource = () => {
    try {
      console.log('Setting up EventSource connection to /api/menu/events')
      const es = new EventSource('/api/menu/events')
      
      es.onopen = () => {
        console.log('SSE connection established successfully')
        setError(null)
      }
      
      es.onmessage = (event) => {
        try {
          console.log('Raw SSE event received:', event)
          const data = JSON.parse(event.data)
          console.log('Parsed SSE message:', data)
          
          if (data.type === 'menu-update' || data.type === 'weekly-menu-update') {
            console.log('Menu update detected, fetching new menu data...')
            // Tvinga fram en fullständig uppdatering av komponenten
            setMenuData(null) // Rensa gammal data först
            setTimeout(() => {
              fetchTodaysMenu(true) // Använd force-refresh för att undvika cache
            }, 100) // Kort delay för att säkerställa att state uppdateras
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err, 'Raw event:', event)
        }
      }
      
      es.onerror = (error) => {
        console.error('SSE error occurred:', error)
        console.log('EventSource readyState:', es.readyState)
        
        if (es.readyState === EventSource.CLOSED) {
          console.log('SSE connection closed, attempting to reconnect...')
          // Försök återansluta efter 5 sekunder
          setTimeout(() => {
            console.log('Attempting to reconnect SSE...')
            setupEventSource()
          }, 5000)
        }
      }
      
      setEventSource(es)
      console.log('EventSource created and stored')
    } catch (error) {
      console.error('Failed to setup EventSource:', error)
    }
  }

  const fetchTodaysMenu = async (forceRefresh = false) => {
    try {
      setLoading(true)
      
      // Lägg till en cache-busting parameter om forceRefresh är true
      const url = forceRefresh ? `/api/menu/today?t=${Date.now()}` : '/api/menu/today'
      const response = await axios.get(url)
      
      setMenuData(response.data)
      setError(null)
      
      // Uppdatera sidans titel
      if (response.data.day) {
        const dayName = getDayName(response.data.day)
        document.title = `Restaurang Matverkstan - ${dayName}`
      } else {
        document.title = 'Restaurang Matverkstan'
      }
    } catch (err) {
      console.error('Fel vid hämtning av meny:', err)
      setError('Kunde inte ladda dagens meny')
      document.title = 'Restaurang Matverkstan'
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('sv-SE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDayName = (day) => {
    const dayNames = {
      'monday': 'Måndag',
      'tuesday': 'Tisdag',
      'wednesday': 'Onsdag',
      'thursday': 'Torsdag',
      'friday': 'Fredag',
      'saturday': 'Lördag',
      'sunday': 'Söndag'
    }
    return dayNames[day] || day
  }

  if (loading) {
    return (
      <div className="menu-display loading">
        <div className="loading-content">
          <h1>Laddar dagens meny...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="menu-display">
      <header className="menu-header">
        <div className="restaurant-info">
          <h1>Restaurang Meny</h1>
          <div className="date-time">
            <div className="date">{formatDate(currentTime)}</div>
            <div className="time">{formatTime(currentTime)}</div>
          </div>
        </div>
      </header>

      <main className="menu-content">
        {error ? (
          <div className="error-message">
            <h2>Tekniskt fel</h2>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Dagens meny (överst) */}
            <div className="daily-menu-container">
              {menuData?.hasMenu ? (
                <img 
                  src={`${menuData.menuUrl}?t=${Date.now()}`} 
                  alt="Dagens meny"
                  className="daily-menu-image"
                  onError={() => setError('Kunde inte ladda dagens meny')}
                  key={`daily-${Date.now()}`}
                />
              ) : (
                <div className="placeholder-menu">
                  <h2>Ingen meny idag</h2>
                  <p>{menuData?.message || 'Ingen meny uppladdad'}</p>
                  {menuData?.day && (
                    <p>({getDayName(menuData.day)})</p>
                  )}
                </div>
              )}
            </div>

            {/* Veckans meny (underst) */}
            <div className="weekly-menu-container">
              {menuData?.hasWeeklyMenu ? (
                <img 
                  src={`${menuData.weeklyMenuUrl}?t=${Date.now()}`} 
                  alt="Veckans meny"
                  className="weekly-menu-image"
                  onError={() => setError('Kunde inte ladda veckans meny')}
                  key={`weekly-${Date.now()}`}
                />
              ) : (
                <div className="placeholder-menu">
                  <h2>Ingen veckomeny</h2>
                  <p>Ingen veckomeny uppladdad</p>
                </div>
              )}
            </div>
          </>
        )}
        

      </main>

      <footer className="menu-footer">
        <p>Automatisk uppdatering - Senast uppdaterad: {formatTime(currentTime)}</p>
        <button 
          onClick={() => fetchTodaysMenu(true)} 
          className="refresh-button"
          title="Uppdatera meny manuellt"
        >
          🔄 Uppdatera
        </button>
      </footer>
    </div>
  )
}

export default MenuDisplay
