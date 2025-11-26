import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { format, subDays, startOfDay, isAfter, addDays, isBefore, isEqual, isToday } from 'date-fns'
import MapComponent from './MapComponent'
import WeatherSection from './WeatherSection'
import AQISection from './AQISection'
import { calculateGeometryCenter, fetchAQIData, fetchWeatherData } from '../services/api'
import './Dashboard.css'
import './DatePicker.css'

const Dashboard = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const today = startOfDay(new Date())
  const oneWeekAgo = startOfDay(subDays(today, 7))

  const [startDate, setStartDate] = useState(format(oneWeekAgo, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'))
  const [viewType, setViewType] = useState('map') // 'map' or 'satellite'
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawnGeometry, setDrawnGeometry] = useState(null)
  const [uploadedKML, setUploadedKML] = useState(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [currentViewDate, setCurrentViewDate] = useState(null) // Currently viewing date
  const [weatherData, setWeatherData] = useState(null)
  const [aqiData, setAqiData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false) // For mobile sidebar toggle

  useEffect(() => {
    // Update dates daily - recalculate one week ago from today
    const updateDates = () => {
      const currentToday = startOfDay(new Date())
      const currentOneWeekAgo = startOfDay(subDays(currentToday, 7))
      setStartDate(format(currentOneWeekAgo, 'yyyy-MM-dd'))
      setEndDate(format(currentToday, 'yyyy-MM-dd'))
    }

    // Update on mount and set interval to check daily
    updateDates()
    const interval = setInterval(updateDates, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  // Restore analysis view when navigating back from detail page
  useEffect(() => {
    if (location.state?.restoreAnalysis) {
      // Restore the analysis state
      if (location.state.geometry) {
        // If geometry is provided, restore it
        if (location.state.geometry.type === 'Polygon') {
          setDrawnGeometry(location.state.geometry)
        }
      }
      if (location.state.startDate) {
        setStartDate(location.state.startDate)
      }
      if (location.state.endDate) {
        setEndDate(location.state.endDate)
      }
      if (location.state.currentDate) {
        setCurrentViewDate(location.state.currentDate)
      }
      // Show analysis view
      setShowAnalysis(true)
      
      // Fetch data if we have geometry and date
      if (location.state.geometry && location.state.currentDate) {
        const center = calculateGeometryCenter(location.state.geometry)
        if (center) {
          fetchDataForDate(center.latitude, center.longitude, location.state.currentDate)
        }
      }
      
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const handleStartDateChange = (e) => {
    const selectedDate = new Date(e.target.value)
    const selectedStartOfDay = startOfDay(selectedDate)
    const currentEndDate = new Date(endDate)
    
    // Can't select a date after end date
    if (isAfter(selectedStartOfDay, currentEndDate)) {
      return
    }
    
    setStartDate(format(selectedStartOfDay, 'yyyy-MM-dd'))
  }

  const handleEndDateChange = (e) => {
    const selectedDate = new Date(e.target.value)
    const selectedStartOfDay = startOfDay(selectedDate)
    const currentToday = startOfDay(new Date())
    const currentStartDate = new Date(startDate)
    
    // Can't select a date beyond today
    if (isAfter(selectedStartOfDay, currentToday)) {
      return
    }
    
    // Can't select a date before start date
    if (isAfter(currentStartDate, selectedStartOfDay)) {
      return
    }
    
    setEndDate(format(selectedStartOfDay, 'yyyy-MM-dd'))
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleDrawArea = () => {
    setIsDrawing(true)
    setUploadedKML(null) // Clear KML when drawing
  }

  const handleGeometryComplete = (geometry) => {
    setDrawnGeometry(geometry)
    setIsDrawing(false)
  }

  const handleCancelDrawing = () => {
    setIsDrawing(false)
  }

  const handleKMLUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.kml') && !file.name.toLowerCase().endsWith('.kmz')) {
      alert('Please upload a KML or KMZ file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadedKML({
        name: file.name,
        content: event.target.result
      })
      setDrawnGeometry(null) // Clear drawn geometry when KML is uploaded
      setIsDrawing(false)
    }
    reader.readAsText(file)
    e.target.value = '' // Reset file input
  }

  const handleClearGeometry = () => {
    setDrawnGeometry(null)
    setUploadedKML(null)
    setIsDrawing(false)
  }

  const toggleView = () => {
    setViewType(prev => prev === 'map' ? 'satellite' : 'map')
  }

  const getMaxDate = () => {
    return format(today, 'yyyy-MM-dd')
  }

  // Date navigation functions
  const handlePreviousDate = () => {
    if (!currentViewDate || loading) return
    
    const current = new Date(currentViewDate)
    const prev = subDays(current, 1)
    const start = new Date(startDate)
    
    // Don't go before start date
    if (isBefore(prev, start) && !isEqual(prev, start)) {
      return
    }
    
    setCurrentViewDate(format(prev, 'yyyy-MM-dd'))
  }

  const handleNextDate = () => {
    if (!currentViewDate || loading) return
    
    const current = startOfDay(new Date(currentViewDate))
    const next = startOfDay(addDays(current, 1))
    const end = startOfDay(new Date(endDate))
    const todayDate = startOfDay(new Date())
    
    // The maximum date we can navigate to is the earlier of endDate or today
    const maxDate = isBefore(end, todayDate) ? end : todayDate
    
    // Don't go beyond the maximum date (allow going to maxDate itself)
    if (isAfter(next, maxDate)) {
      // If we can't go to next, but we're not at maxDate, go to maxDate
      if (isBefore(current, maxDate)) {
        setCurrentViewDate(format(maxDate, 'yyyy-MM-dd'))
      }
      return
    }
    
    // Allow navigation if next date is equal to or before maxDate
    setCurrentViewDate(format(next, 'yyyy-MM-dd'))
  }

  const canGoPrevious = () => {
    if (!currentViewDate) return false
    const current = startOfDay(new Date(currentViewDate))
    const start = startOfDay(new Date(startDate))
    return isAfter(current, start)
  }

  const canGoNext = () => {
    if (!currentViewDate) return false
    const current = startOfDay(new Date(currentViewDate))
    const end = startOfDay(new Date(endDate))
    const todayDate = startOfDay(new Date())
    const maxDate = isBefore(end, todayDate) ? end : todayDate
    // Can go next if current date is before or equal to maxDate (allow going to most recent date)
    return isBefore(current, maxDate) || isEqual(current, maxDate)
  }

  // Parse KML to geometry
  const parseKMLToGeometry = (kmlContent) => {
    try {
      const parser = new DOMParser()
      const kmlDoc = parser.parseFromString(kmlContent, 'text/xml')
      const errorNode = kmlDoc.querySelector('parsererror')
      
      if (errorNode) {
        console.error('KML parsing error:', errorNode.textContent)
        return null
      }

      const coordinatesElements = kmlDoc.querySelectorAll('coordinates')
      if (coordinatesElements.length > 0) {
        const coordsText = coordinatesElements[0].textContent.trim()
        const coordPairs = coordsText.split(/\s+/).filter(c => c.trim())
        
        const coordinates = coordPairs.map(coord => {
          const [lng, lat] = coord.split(',').map(Number)
          return [lng, lat] // GeoJSON format [lng, lat]
        })
        
        return {
          type: 'Polygon',
          coordinates: [coordinates]
        }
      }
    } catch (error) {
      console.error('Error parsing KML:', error)
    }
    return null
  }

  // Fetch data for a specific date
  const fetchDataForDate = async (latitude, longitude, date) => {
    setLoading(true)
    setError(null)
    // Clear previous data to show loading state
    setWeatherData(null)
    setAqiData(null)

    try {
      const [weather, aqi] = await Promise.all([
        fetchWeatherData(latitude, longitude, date),
        fetchAQIData(latitude, longitude, date)
      ])

      setWeatherData(weather)
      setAqiData(aqi)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle analyse button click
  const handleAnalyse = async () => {
    if (!drawnGeometry && !uploadedKML) {
      alert('Please draw an area or upload a KML file first')
      return
    }

    // Close sidebar on mobile when analyzing
    setSidebarOpen(false)

    setLoading(true)
    setError(null)

    try {
      // Get geometry (from drawing or KML)
      let geometry = drawnGeometry
      if (!geometry && uploadedKML) {
        geometry = parseKMLToGeometry(uploadedKML.content)
      }

      if (!geometry) {
        throw new Error('Could not parse geometry')
      }

      // Calculate center coordinates
      const center = calculateGeometryCenter(geometry)
      if (!center) {
        throw new Error('Could not calculate center coordinates')
      }

      // Set current view date to end date (last date)
      const viewDate = endDate
      setCurrentViewDate(viewDate)
      setShowAnalysis(true)

      // Fetch data for the end date
      await fetchDataForDate(center.latitude, center.longitude, viewDate)
    } catch (err) {
      setError(err.message)
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle date navigation - fetch data when date changes
  useEffect(() => {
    if (showAnalysis && currentViewDate && (drawnGeometry || uploadedKML)) {
      let geometry = drawnGeometry
      if (!geometry && uploadedKML) {
        geometry = parseKMLToGeometry(uploadedKML.content)
      }

      if (geometry) {
        const center = calculateGeometryCenter(geometry)
        if (center) {
          fetchDataForDate(center.latitude, center.longitude, currentViewDate)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentViewDate, showAnalysis])

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-container">
            <div className="logo-icon">
              <div className="logo-eye">
                <div className="eye-pupil"></div>
                <div className="eye-shine"></div>
              </div>
              <div className="logo-ring"></div>
            </div>
            <h1 className="logo-text">Climate Eye</h1>
          </div>
        </div>
        
        <div className="header-right">
          <button className="logout-button" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Mobile sidebar toggle button */}
        {!showAnalysis && (
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        )}
        
        {/* Sidebar overlay for mobile */}
        {!showAnalysis && sidebarOpen && (
          <div 
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <aside className={`sidebar ${showAnalysis ? 'analysis-mode' : ''} ${sidebarOpen ? 'open' : ''}`}>
          {!showAnalysis ? (
            <>
              <div className="kml-section">
                <div className="sidebar-header-mobile">
                  <h2 className="sidebar-title">AREA SELECTION</h2>
                  <button 
                    className="sidebar-close-mobile"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="kml-buttons">
                  <button 
                    className="action-button draw-button"
                    onClick={handleDrawArea}
                    disabled={isDrawing}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
                    </svg>
                    Draw Area
                  </button>
                  
                  <label className="action-button upload-button">
                    <input
                      type="file"
                      accept=".kml,.kmz"
                      onChange={handleKMLUpload}
                      style={{ display: 'none' }}
                    />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Upload KML
                  </label>
                </div>

                {(drawnGeometry || uploadedKML) && (
                  <div className="geometry-info">
                    <p className="info-text">
                      {uploadedKML ? `KML: ${uploadedKML.name}` : 'Area drawn on map'}
                    </p>
                    <button className="clear-button" onClick={handleClearGeometry}>
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="date-range-section">
                <h2 className="sidebar-title">DATE RANGE</h2>
                
                <div className="date-input-group">
                  <label htmlFor="start-date" className="date-label">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="start-date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    max={endDate}
                    className="date-input"
                  />
                </div>

                <div className="date-input-group">
                  <label htmlFor="end-date" className="date-label">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="end-date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    max={getMaxDate()}
                    className="date-input"
                  />
                </div>

                <button 
                  className="update-button" 
                  onClick={handleAnalyse}
                  disabled={loading}
                >
                  {loading ? 'LOADING...' : 'ANALYSE'}
                </button>
              </div>
            </>
          ) : (
            <div className="back-to-map-section">
              <button 
                className="back-to-map-button"
                onClick={() => {
                  setShowAnalysis(false)
                  setSidebarOpen(false) // Close sidebar on mobile when going back to map
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span>Back to Map</span>
              </button>
            </div>
          )}
        </aside>

        <main className="main-content">
          {!showAnalysis ? (
            <div className="map-wrapper">
              <div className="view-toggle-container">
                <button 
                  className={`view-toggle-button ${viewType === 'map' ? 'active' : ''}`}
                  onClick={toggleView}
                  title={viewType === 'map' ? 'Switch to Satellite View' : 'Switch to Map View'}
                >
                  {viewType === 'map' ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span>Map</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                        <line x1="7" y1="2" x2="7" y2="22"></line>
                        <line x1="17" y1="2" x2="17" y2="22"></line>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <line x1="2" y1="7" x2="7" y2="7"></line>
                        <line x1="2" y1="17" x2="7" y2="17"></line>
                        <line x1="17" y1="17" x2="22" y2="17"></line>
                        <line x1="17" y1="7" x2="22" y2="7"></line>
                      </svg>
                      <span>Satellite</span>
                    </>
                  )}
                </button>
              </div>
              <MapComponent 
                viewType={viewType}
                drawnGeometry={drawnGeometry}
                uploadedKML={uploadedKML}
                isDrawing={isDrawing}
                onGeometryComplete={handleGeometryComplete}
                onCancelDrawing={handleCancelDrawing}
              />
            </div>
          ) : (
            <div className="analysis-content">
              <div className="date-navigation-header">
                <button 
                  className="nav-arrow-button"
                  onClick={handlePreviousDate}
                  disabled={!canGoPrevious()}
                  title="Previous Date"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                
                <div className="current-date-display">
                  <div className="date-label">Viewing Date</div>
                  <div className="date-value">
                    {currentViewDate ? format(new Date(currentViewDate), 'MMM dd, yyyy') : 'N/A'}
                  </div>
                </div>
                
                <button 
                  className="nav-arrow-button"
                  onClick={handleNextDate}
                  disabled={!canGoNext()}
                  title="Next Date"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>

              {error && (
                <div className="error-banner">
                  <p>Error: {error}</p>
                </div>
              )}

              <div className="analysis-sections">
                <WeatherSection 
                  geometry={drawnGeometry || (uploadedKML ? parseKMLToGeometry(uploadedKML.content) : null)}
                  startDate={startDate}
                  endDate={endDate}
                  date={currentViewDate} 
                  data={weatherData}
                  isLive={currentViewDate && isToday(new Date(currentViewDate))}
                  loading={loading}
                />
                <AQISection
                  geometry={drawnGeometry || (uploadedKML ? parseKMLToGeometry(uploadedKML.content) : null)}
                  startDate={startDate}
                  endDate={endDate} 
                  date={currentViewDate} 
                  data={aqiData}
                  isLive={currentViewDate && isToday(new Date(currentViewDate))}
                  loading={loading}
                />
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Dashboard

