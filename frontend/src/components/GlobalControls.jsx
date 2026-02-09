import React from 'react'
import { getTVScreenState } from './TVScreen'

/**
 * GlobalControls - Always visible controls for audio/video
 * Shows buttons and keyboard shortcuts info
 */
export default function GlobalControls() {
  const [state, setState] = React.useState({
    audioEnabled: false,
    videoEnabled: false,
    onEnableAudio: null,
    onEnableVideo: () => window.dispatchEvent(new CustomEvent('RequestToggleVideo')), // Default enabled for event
    userCount: 0,
  })

  // Update state periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      const tvState = getTVScreenState()
      setState({
        audioEnabled: tvState.audioEnabled || false,
        videoEnabled: tvState.videoEnabled || false,
        onEnableAudio: tvState.onEnableAudio,
        onEnableVideo: tvState.onEnableVideo,
        userCount: tvState.userCount || 0,
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (event) => {
      // Only trigger if not typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      if (event.key.toLowerCase() === 'o') {
        // Toggle audio
        if (state.onEnableAudio) {
          state.onEnableAudio()
        }
      } else if (event.key.toLowerCase() === 'p') {
        // Toggle video
        if (state.onEnableVideo) {
          state.onEnableVideo()
        }
      }
    }


    window.addEventListener('keydown', handleKeyPress)

    // Listen for video state changes from UserVideoGrid
    const handleVideoStateChange = (e) => {
      setState(prev => ({
        ...prev,
        videoEnabled: e.detail.enabled,
        onEnableVideo: () => window.dispatchEvent(new CustomEvent('RequestToggleVideo')) // Ensure it's truthy
      }))
    }
    window.addEventListener('VideoStateChanged', handleVideoStateChange)

    // Trigger initial check
    window.dispatchEvent(new CustomEvent('RequestVideoState'))

    return () => {
      window.removeEventListener('keydown', handleKeyPress)
      window.removeEventListener('VideoStateChanged', handleVideoStateChange)
    }
  }, [state.onEnableAudio, state.onEnableVideo])

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      padding: '15px 20px',
      borderRadius: '10px',
      color: 'white',
      zIndex: 1000,
      fontFamily: 'Arial, sans-serif',
      minWidth: '280px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '12px',
        borderBottom: '1px solid #444',
        paddingBottom: '8px'
      }}>
        🎮 Virtual World Controls
      </div>

      <div style={{
        fontSize: '12px',
        opacity: 0.8,
        marginBottom: '10px'
      }}>
        👥 {state.userCount} user(s) in room
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginBottom: '10px'
      }}>
        <button
          onClick={() => {
            if (state.onEnableAudio) {
              state.onEnableAudio()
            } else {
              console.warn('Audio handler not available yet')
              alert('Audio controls are initializing. Please wait a moment and try again.')
            }
          }}
          disabled={!state.onEnableAudio}
          style={{
            padding: '10px 16px',
            backgroundColor: state.audioEnabled ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: state.onEnableAudio ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background-color 0.2s',
            opacity: state.onEnableAudio ? 1 : 0.5
          }}
          onMouseOver={(e) => {
            if (state.onEnableAudio) {
              e.target.style.opacity = '0.9'
            }
          }}
          onMouseOut={(e) => {
            if (state.onEnableAudio) {
              e.target.style.opacity = '1'
            }
          }}
        >
          {state.audioEnabled ? '🔊' : '🔇'}
          {state.audioEnabled ? 'Audio ON' : 'Audio OFF'}
          <span style={{ fontSize: '11px', opacity: 0.8 }}>(Press O)</span>
        </button>

        <button
          onClick={() => {
            // Dispatch event to toggle video in UserVideoGrid
            window.dispatchEvent(new CustomEvent('RequestToggleVideo'))
          }}
          disabled={!state.onEnableVideo}
          style={{
            padding: '10px 16px',
            backgroundColor: state.videoEnabled ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: state.onEnableVideo ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background-color 0.2s',
            opacity: state.onEnableVideo ? 1 : 0.5
          }}
          onMouseOver={(e) => {
            if (state.onEnableVideo) {
              e.target.style.opacity = '0.9'
            }
          }}
          onMouseOut={(e) => {
            if (state.onEnableVideo) {
              e.target.style.opacity = '1'
            }
          }}
        >
          {state.videoEnabled ? '📹' : '📷'}
          {state.videoEnabled ? 'Video ON' : 'Video OFF'}
          <span style={{ fontSize: '11px', opacity: 0.8 }}>(Press P)</span>
        </button>
      </div>

      <div style={{
        fontSize: '10px',
        opacity: 0.6,
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #444'
      }}>
        <div>⌨️ Keyboard Shortcuts:</div>
        <div style={{ marginTop: '5px' }}>
          <div><strong>O</strong> - Toggle Audio</div>
          <div><strong>P</strong> - Toggle Video</div>
        </div>
      </div>
    </div>
  )
}
