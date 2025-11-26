import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import './DrawAreaComponent.css'

const DrawAreaComponent = ({ isDrawing, onGeometryComplete, onCancel }) => {
  const map = useMap()
  const pointsRef = useRef([])
  const markersRef = useRef([])
  const polylineRef = useRef(null)
  const [isActive, setIsActive] = useState(false)
  const handlersRef = useRef({ click: null, dblclick: null })

  const cleanup = useCallback(() => {
    markersRef.current.forEach(marker => map.removeLayer(marker))
    markersRef.current = []
    
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current)
      polylineRef.current = null
    }
    
    pointsRef.current = []
  }, [map])

  const finishDrawing = useCallback(() => {
    if (pointsRef.current.length < 3) {
      return
    }

    // Close the polygon
    const closedPoints = [...pointsRef.current, pointsRef.current[0]]
    
    // Convert to GeoJSON format [lng, lat]
    const coordinates = closedPoints.map(([lat, lng]) => [lng, lat])
    
    const geometry = {
      type: 'Polygon',
      coordinates: [coordinates]
    }

    onGeometryComplete(geometry)
    cleanup()
  }, [onGeometryComplete, cleanup])

  useEffect(() => {
    if (isDrawing) {
      setIsActive(true)
      map.getContainer().style.cursor = 'crosshair'
      pointsRef.current = []
      markersRef.current = []
      
      const handleMapClick = (e) => {
        const { lat, lng } = e.latlng
        pointsRef.current.push([lat, lng])

        // Add marker
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'draw-marker',
            html: '<div class="marker-dot"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })
        }).addTo(map)
        
        markersRef.current.push(marker)

        // Update polyline
        if (polylineRef.current) {
          map.removeLayer(polylineRef.current)
        }

        if (pointsRef.current.length > 1) {
          polylineRef.current = L.polyline(pointsRef.current, {
            color: '#14b8a6',
            weight: 2,
            dashArray: '5, 5',
            opacity: 0.7
          }).addTo(map)
        }
      }

      const handleDoubleClick = (e) => {
        e.originalEvent.preventDefault()
        if (pointsRef.current.length >= 3) {
          finishDrawing()
        }
      }

      handlersRef.current.click = handleMapClick
      handlersRef.current.dblclick = handleDoubleClick
      
      map.on('click', handleMapClick)
      map.on('dblclick', handleDoubleClick)
    } else {
      setIsActive(false)
      map.getContainer().style.cursor = ''
      cleanup()
    }

    return () => {
      map.getContainer().style.cursor = ''
      if (handlersRef.current.click) {
        map.off('click', handlersRef.current.click)
      }
      if (handlersRef.current.dblclick) {
        map.off('dblclick', handlersRef.current.dblclick)
      }
      cleanup()
    }
  }, [isDrawing, map, cleanup, finishDrawing])

  if (!isActive) {
    return null
  }

  return (
    <div className="draw-controls-overlay">
      <div className="draw-instructions">
        <p>Click on the map to add points</p>
        <p>Double-click or click "Finish" to complete</p>
      </div>
      <div className="draw-actions">
        <button 
          className="draw-button finish-button"
          onClick={finishDrawing}
          disabled={pointsRef.current.length < 3}
        >
          Finish Drawing
        </button>
        <button 
          className="draw-button cancel-button"
          onClick={() => {
            cleanup()
            onCancel()
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default DrawAreaComponent

