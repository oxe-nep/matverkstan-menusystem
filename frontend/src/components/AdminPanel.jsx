import { useState, useEffect } from 'react'
import axios from 'axios'
import './AdminPanel.css'

const AdminPanel = ({ onLogout }) => {
  const [menus, setMenus] = useState({})
  const [loading, setLoading] = useState(true)
  const [uploadLoading, setUploadLoading] = useState({})
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [currentDisplayedDay, setCurrentDisplayedDay] = useState(null)
  const [eventSource, setEventSource] = useState(null)
  
  // Hämta aktuell host för att bygga fullständiga URL:er
  const getFullImageUrl = (relativePath) => {
    if (!relativePath) return null
    const protocol = window.location.protocol
    const host = window.location.host
    return `${protocol}//${host}${relativePath}`
  }

  const days = [
    { key: 'monday', name: 'Måndag' },
    { key: 'tuesday', name: 'Tisdag' },
    { key: 'wednesday', name: 'Onsdag' },
    { key: 'thursday', name: 'Torsdag' },
    { key: 'friday', name: 'Fredag' }
  ]

  useEffect(() => {
    // Sätt admin-titel
    document.title = 'Restaurang Matverkstan - Admin'
    
    fetchMenus()
    getCurrentDisplayedDay()
    setupEventSource()
    
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  const setupEventSource = () => {
    try {
      const es = new EventSource('/api/menu/events')
      
      es.onopen = () => {
        console.log('Admin SSE connection established')
      }
      
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Admin SSE message received:', data)
          
          if (data.type === 'menu-update') {
            console.log('Menu update received in admin, updating display day:', data.selectedDay)
            // Uppdatera vilken meny som visas (null = automatiskt val)
            setCurrentDisplayedDay(data.selectedDay || null)
            
            // Uppdatera även menyerna för att säkerställa att allt är synkroniserat
            setTimeout(() => {
              fetchMenus()
            }, 200)
          } else if (data.type === 'weekly-menu-update') {
            console.log('Weekly menu update received in admin')
            // Uppdatera menyerna när veckomeny ändras
            fetchMenus()
          }
        } catch (err) {
          console.error('Error parsing admin SSE message:', err)
        }
      }
      
      es.onerror = (error) => {
        console.error('Admin SSE error:', error)
        es.close()
        
        // Försök återansluta efter 5 sekunder
        setTimeout(() => {
          console.log('Attempting to reconnect admin SSE...')
          setupEventSource()
        }, 5000)
      }
      
      setEventSource(es)
    } catch (error) {
      console.error('Failed to setup admin EventSource:', error)
    }
  }

  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/menu/all', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMenus(response.data)
    } catch (error) {
      showMessage('Fel vid hämtning av menyer', 'error')
      console.error('Error fetching menus:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentDisplayedDay = async () => {
    try {
      const response = await axios.get('/api/menu/current-display')
      console.log('Current display response:', response.data)
      // Om selectedDay är null betyder det automatiskt val
      // Viktigt: sätt explicit till null för automatiskt val
      setCurrentDisplayedDay(response.data.selectedDay || null)
    } catch (error) {
      console.error('Error fetching current day:', error)
      // Fallback till automatiskt val (null) om det blir fel
      setCurrentDisplayedDay(null)
    }
  }

  const showMenuOnDisplay = async (day) => {
    try {
      console.log(`Setting display menu to: ${day}`)
      const token = localStorage.getItem('token')
      const response = await axios.post(`/api/menu/set-display/${day}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      console.log('Backend response:', response.data)
      
      // Uppdatera lokala staten direkt
      setCurrentDisplayedDay(day)
      console.log(`Local state updated to: ${day}`)
      showMessage(`Visar nu meny för ${getDayName(day)}`, 'success')
      
      // Vänta lite och uppdatera igen för att säkerställa synkronisering
      setTimeout(() => {
        console.log('Syncing with backend...')
        getCurrentDisplayedDay()
      }, 500)
      
    } catch (error) {
      console.error('Error setting display menu:', error)
      showMessage(
        error.response?.data?.message || 'Fel vid byte av meny',
        'error'
      )
    }
  }

    const handleWeeklyFileUpload = async (file) => {
    console.log('handleWeeklyFileUpload called')
    if (!file) return

    // Validera filtyp
    if (!file.type.startsWith('image/')) {
      showMessage('Endast bildfiler (PNG/JPG) är tillåtna', 'error')
      return
    }

    // Validera filstorlek (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showMessage('Filen är för stor. Max 10MB tillåts', 'error')
      return
    }

    setUploadLoading(prev => ({ ...prev, weekly: true }))

    try {
      const formData = new FormData()
      formData.append('menu', file)

      const token = localStorage.getItem('token')
      console.log('Uploading weekly menu to /api/menu/upload/weekly')
      
      const response = await axios.post('/api/menu/upload/weekly', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      })

      console.log('Weekly upload response:', response.data)
      showMessage('Veckomeny uppladdad!', 'success')
      fetchMenus() // Uppdatera listan

      // Vänta lite och uppdatera igen för att säkerställa att filen är tillgänglig
      setTimeout(() => {
        fetchMenus()
      }, 1000)
    } catch (error) {
      console.error('Weekly upload error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Fel vid uppladdning av veckomeny'
      console.log('Error details:', error.response)
      showMessage(errorMessage, 'error')
    } finally {
      setUploadLoading(prev => ({ ...prev, weekly: false }))
    }
  }

  const showMessage = (text, type = 'info') => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => {
      setMessage('')
      setMessageType('')
    }, 5000)
  }

  const handleFileUpload = async (day, file) => {
    console.log('handleFileUpload called with day:', day)
    if (!file) return

    // Validera filtyp
    if (!file.type.startsWith('image/')) {
      showMessage('Endast bildfiler (PNG/JPG) är tillåtna', 'error')
      return
    }

    // Validera filstorlek (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showMessage('Filen är för stor. Max 10MB tillåts', 'error')
      return
    }

    setUploadLoading({ ...uploadLoading, [day]: true })

    try {
      const formData = new FormData()
      formData.append('menu', file)

      const token = localStorage.getItem('token')
      const response = await axios.post(`/api/menu/upload/${day}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      })

      console.log('Upload response:', response.data)
      showMessage(`Meny för ${getDayName(day)} uppladdad!`, 'success')
      
      // Uppdatera menyerna
      fetchMenus()
      
      // Om den uppladdade menyn är den som visas just nu, uppdatera även displayen
      if (currentDisplayedDay === day) {
        console.log(`Uploaded menu for currently displayed day: ${day}, triggering display update`)
        // Vänta lite för att säkerställa att filen är tillgänglig
        setTimeout(() => {
          // Trigga en manuell uppdatering av frontend-displayen
          // Detta kommer att skicka SSE-meddelande som uppdaterar alla klienter
          console.log('Triggering manual display update for uploaded menu')
        }, 1000)
      }
      
    } catch (error) {
      console.error('Upload error:', error)
      showMessage(
        error.response?.data?.message || 'Fel vid uppladdning',
        'error'
      )
    } finally {
      setUploadLoading({ ...uploadLoading, [day]: false })
    }
  }

  const handleDeleteMenu = async (day) => {
    const displayName = day === 'weekly' ? 'veckomenyn' : getDayName(day)
    
    if (!confirm(`Är du säker på att du vill ta bort ${displayName}?`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.delete(`/api/menu/${day}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      console.log('Delete response:', response.data)
      showMessage(`${displayName} borttagen`, 'success')
      fetchMenus() // Uppdatera listan
      
      // Extra uppdatering efter en kort stund
      setTimeout(() => {
        fetchMenus()
      }, 500)
      
    } catch (error) {
      console.error('Delete error:', error)
      showMessage(
        error.response?.data?.message || 'Fel vid borttagning',
        'error'
      )
    }
  }

  const getDayName = (day) => {
    const dayItem = days.find(d => d.key === day)
    return dayItem ? dayItem.name : day
  }

  const getCurrentDisplayText = () => {
    if (currentDisplayedDay) {
      // Specifik dag är vald
      return getDayName(currentDisplayedDay)
    } else {
      // Automatiskt val - visa dagens dag på svenska utan "(automatiskt)"
      const today = getTodaysDay()
      const swedishDayNames = {
        'monday': 'Måndag',
        'tuesday': 'Tisdag', 
        'wednesday': 'Onsdag',
        'thursday': 'Torsdag',
        'friday': 'Fredag',
        'saturday': 'Lördag',
        'sunday': 'Söndag'
      }
      return swedishDayNames[today] || today
    }
  }

  const resetToAutomatic = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/menu/reset-to-auto', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      showMessage('Återgick till automatiskt val av dagens meny', 'success')
      // Sätt till null för att indikera automatiskt val (getCurrentDisplayText hanterar visningen)
      setCurrentDisplayedDay(null)
    } catch (error) {
      showMessage(
        error.response?.data?.message || 'Fel vid återställning till automatiskt val',
        'error'
      )
    }
  }

  const getTodaysDay = () => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const today = new Date()
    return dayNames[today.getDay()]
  }

  if (loading) {
    return (
      <div className="admin-panel loading">
        <div className="loading-content">
          <h2>Laddar adminpanel...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>Restaurang Matverkstan - Admin</h1>
          <div className="header-actions">
            <a href="/" target="_blank" rel="noopener noreferrer" className="view-menu-btn">
              Visa Meny
            </a>
            <button onClick={onLogout} className="logout-btn secondary">
              Logga ut
            </button>
          </div>
        </div>
      </header>

      <main className="admin-content">
        {message && (
          <div className={`alert ${messageType}`}>
            {message}
          </div>
        )}



        {/* Veckomeny sektion */}
        <div className="weekly-menu-section">
          <h2>Veckomeny</h2>
          <div className="menu-card weekly-card">
            <div className="menu-card-header">
              <h3>Veckans meny</h3>
            </div>
            <div className="menu-card-content">
              {menus.weekly ? (
                <div className="current-menu">
                  <div className="menu-image-container">
                                         <img 
                       src={getFullImageUrl(menus.weekly)} 
                       alt="Veckans meny"
                       className="menu-preview"
                     />
                  </div>
                  <div className="menu-actions">
                    <button
                      onClick={() => handleDeleteMenu('weekly')}
                      className="delete-btn danger"
                    >
                      Ta bort
                    </button>
                  </div>
                </div>
              ) : (
                <div className="no-menu">
                  <p>Ingen veckomeny uppladdad</p>
                </div>
              )}

              <div className="upload-section">
                <label className="upload-label">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => handleWeeklyFileUpload(e.target.files[0])}
                    disabled={uploadLoading.weekly}
                    className="file-input"
                  />
                  <span className="upload-button secondary">
                    {uploadLoading.weekly 
                      ? 'Laddar upp...' 
                      : menus.weekly 
                        ? 'Byt veckomeny'
                        : 'Ladda upp veckomeny'
                    }
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="menu-control-section">
          <h2>Dagliga menyer</h2>
          <div className="menu-control-actions">
            <button
              onClick={resetToAutomatic}
              className={`auto-btn ${!currentDisplayedDay ? 'active' : 'inactive'}`}
              title="Återgå till automatiskt val av dagens meny"
            >
              {!currentDisplayedDay ? '✅ Automatiskt val aktivt' : '🔄 Välj dag automatiskt'}
            </button>
            <button
              onClick={() => {
                getCurrentDisplayedDay()
                fetchMenus()
              }}
              className="control-btn secondary"
              title="Synkronisera med backend"
            >
              🔄 Synkronisera
            </button>
            <span className="current-selection">
              Visar just nu: <strong>{getCurrentDisplayText()}</strong>
            </span>
          </div>
        </div>
        <div className="admin-grid">
          {days.map(day => {
            const isToday = day.key === getTodaysDay()
            const isCurrentlyDisplayed = day.key === currentDisplayedDay
            const hasMenu = menus[day.key]
            
            return (
              <div key={day.key} className={`menu-card ${isToday ? 'today' : ''} ${isCurrentlyDisplayed ? 'displayed' : ''}`}>
                <div className="menu-card-header">
                  <h3>
                    {day.name}
                    {isToday && <span className="today-badge">Idag</span>}
                    {isCurrentlyDisplayed && <span className="displayed-badge">Visas nu</span>}
                  </h3>
                </div>

                <div className="menu-card-content">
                  {hasMenu ? (
                    <div className="current-menu">
                      <div className="menu-image-container">
                                                 <img 
                           src={getFullImageUrl(hasMenu)} 
                           alt={`Meny för ${day.name}`}
                           className="menu-preview"
                         />
                      </div>
                      <div className="menu-actions">
                        <button
                          onClick={() => showMenuOnDisplay(day.key)}
                          className="show-btn primary"
                          disabled={!hasMenu}
                        >
                          Visa denna meny
                        </button>
                        <button
                          onClick={() => handleDeleteMenu(day.key)}
                          className="delete-btn danger"
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="no-menu">
                      <p>Ingen meny uppladdad</p>
                    </div>
                  )}

                  <div className="upload-section">
                    <label className="upload-label">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={(e) => handleFileUpload(day.key, e.target.files[0])}
                        disabled={uploadLoading[day.key]}
                        className="file-input"
                      />
                      <span className="upload-button secondary">
                        {uploadLoading[day.key] 
                          ? 'Laddar upp...' 
                          : hasMenu 
                            ? 'Byt meny'
                            : 'Ladda upp meny'
                        }
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="admin-info">
          <div className="info-card">
            <h3>Information</h3>
            <ul>
              <li>Endast PNG och JPG filer accepteras</li>
              <li>Maximal filstorlek: 10MB</li>
              <li>Menyer visas automatiskt på huvudsidan</li>
              <li>Dagens meny uppdateras automatiskt varje dag</li>
              <li>Menyer visas endast måndag-fredag</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminPanel
