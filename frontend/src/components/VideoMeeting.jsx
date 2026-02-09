import React, { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

if (!import.meta.env.VITE_API_BASE_URL) {
    throw new Error('❌ VITE_API_BASE_URL is required!')
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export default function VideoMeeting() {
    const [step, setStep] = useState('lobby') // 'lobby' or 'meeting'
    const [roomId, setRoomId] = useState(() => {
        const params = new URLSearchParams(window.location.search)
        return params.get('roomID') || 'fashion-1'
    })
    const [userName, setUserName] = useState(`User-${Math.floor(Math.random() * 1000)}`)

    // Media State
    const [permissionGranted, setPermissionGranted] = useState(false)
    const [mediaStream, setMediaStream] = useState(null)
    const [isAudioMuted, setIsAudioMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    const [error, setError] = useState(null)

    // Socket & WebRTC
    const socketRef = useRef(null)
    const peerConnectionsRef = useRef(new Map())
    const [remoteStreams, setRemoteStreams] = useState([])
    const [connected, setConnected] = useState(false)

    // Refs
    const localVideoRef = useRef(null)

    // RTC Config
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    }

    useEffect(() => {
        // Request permissions on load
        startCamera()
        return () => {
            stopCamera()
            if (socketRef.current) socketRef.current.disconnect()
        }
    }, [])

    useEffect(() => {
        if (localVideoRef.current && mediaStream) {
            localVideoRef.current.srcObject = mediaStream
        }
    }, [mediaStream, step])

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            setMediaStream(stream)
            setPermissionGranted(true)
            setError(null)
        } catch (err) {
            console.error('Error accessing media:', err)
            setError('Could not access camera/microphone. Please allow permissions.')
            setPermissionGranted(false)
        }
    }

    const stopCamera = () => {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop())
            setMediaStream(null)
        }
    }

    const toggleAudio = () => {
        if (mediaStream) {
            const newState = !isAudioMuted
            mediaStream.getAudioTracks().forEach(t => t.enabled = !newState)
            setIsAudioMuted(newState)
        }
    }

    const toggleVideo = () => {
        if (mediaStream) {
            const newState = !isVideoOff
            mediaStream.getVideoTracks().forEach(t => t.enabled = !newState)
            setIsVideoOff(newState)
        }
    }

    const joinMeeting = () => {
        if (!mediaStream) return
        setStep('meeting')
        connectToSocket()
    }

    const connectToSocket = () => {
        const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? API_BASE_URL
            : API_BASE_URL
        const socketUrl = `${serverUrl}/meeting`

        socketRef.current = io(socketUrl, {
            transports: ['websocket', 'polling']
        })

        const socket = socketRef.current

        socket.on('connect', () => {
            setConnected(true)
            // Join room with full payload needed for UserVideoGrid
            socket.emit('join-room', {
                roomId,
                userId: userName, // Ideally this should be a unique ID, but userName works for now
                userName,
                productCategory: 'General'
            })
        })

        socket.on('disconnect', () => setConnected(false))

        socket.on('room-users', (data) => {
            if (data.users) {
                const mySocketId = socket.id
                data.users.forEach(user => {
                    // Filter out ourselves
                    if (user.socketId && user.socketId !== mySocketId) {
                        createPeerConnection(user.socketId, user.userName, false)
                    }
                })
            }
        })

        socket.on('user-joined', (data) => {
            const mySocketId = socket.id
            if (data.socketId && data.socketId !== mySocketId) {
                createPeerConnection(data.socketId, data.userName, true)
            }
        })

        socket.on('user-left', (data) => {
            removePeerConnection(data.socketId)
        })

        socket.on('offer', async (data) => {
            const pc = createPeerConnection(data.senderSocketId, data.senderUserName, false)
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            socket.emit('answer', {
                answer,
                targetSocketId: data.senderSocketId,
                roomId
            })
        })

        socket.on('answer', async (data) => {
            const pc = peerConnectionsRef.current.get(data.senderSocketId)
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
            }
        })

        socket.on('ice-candidate', async (data) => {
            const pc = peerConnectionsRef.current.get(data.senderSocketId)
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
                } catch (e) {
                    console.error("Error adding ice candidate", e)
                }
            }
        })
    }

    const createPeerConnection = (socketId, remoteName, isInitiator) => {
        if (peerConnectionsRef.current.has(socketId)) return peerConnectionsRef.current.get(socketId)

        const pc = new RTCPeerConnection(rtcConfig)
        peerConnectionsRef.current.set(socketId, pc)

        // Add local tracks
        mediaStream.getTracks().forEach(track => pc.addTrack(track, mediaStream))

        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('ice-candidate', {
                    candidate: event.candidate,
                    targetSocketId: socketId,
                    roomId
                })
            }
        }

        pc.ontrack = (event) => {
            setRemoteStreams(prev => {
                const existing = prev.find(p => p.socketId === socketId)
                if (existing) {
                    // Update stream if it changed (though usually unnecessary for simple tracks)
                    if (existing.stream.id !== event.streams[0].id) {
                        return prev.map(p => p.socketId === socketId ? { ...p, stream: event.streams[0] } : p)
                    }
                    return prev
                }
                return [...prev, { socketId, userName: remoteName, stream: event.streams[0] }]
            })
        }

        pc.onconnectionstatechange = () => {
            if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                removePeerConnection(socketId)
            }
        }

        if (isInitiator) {
            pc.createOffer().then(offer => {
                pc.setLocalDescription(offer)
                if (socketRef.current) {
                    socketRef.current.emit('offer', {
                        offer,
                        targetSocketId: socketId,
                        roomId
                    })
                }
            })
        }

        return pc
    }

    const removePeerConnection = (socketId) => {
        const pc = peerConnectionsRef.current.get(socketId)
        if (pc) {
            pc.close()
            peerConnectionsRef.current.delete(socketId)
        }
        setRemoteStreams(prev => prev.filter(p => p.socketId !== socketId))
    }

    const leaveMeeting = () => {
        if (socketRef.current) socketRef.current.disconnect()
        peerConnectionsRef.current.forEach(pc => pc.close())
        peerConnectionsRef.current.clear()
        setRemoteStreams([])
        setStep('lobby')
        setConnected(false)
    }

    // --- Modern Google Meet-inspired UI Styles ---

    const styles = {
        container: {
            fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
            backgroundColor: '#202124',
            color: '#e8eaed',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        },
        // Layouts
        lobbyContainer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#202124',
            padding: '20px',
        },
        lobbyContent: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '60px',
            maxWidth: '1200px',
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
        },
        // Preview Area
        previewColumn: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            flex: '1 1 500px',
            maxWidth: '700px'
        },
        videoPreviewCard: {
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: '#3c4043',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
        },
        videoElement: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // Mirror local video
        },
        previewControls: {
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '20px',
        },
        // Form/Join Area
        formColumn: {
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            flex: '0 1 400px',
            minWidth: '320px',
        },
        title: {
            fontSize: '36px',
            fontWeight: 400,
            lineHeight: '44px',
            color: '#fff',
        },
        inputContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
        },
        inputField: {
            padding: '14px',
            borderRadius: '4px',
            border: '1px solid #5f6368', // Google grey
            backgroundColor: 'transparent',
            color: '#e8eaed',
            fontSize: '16px',
            outline: 'none',
            width: '100%',
            marginBottom: '8px'
        },
        joinButton: {
            padding: '12px 24px',
            backgroundColor: '#8ab4f8',
            color: '#202124',
            border: 'none',
            borderRadius: '24px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            alignSelf: 'flex-start'
        },
        // Meeting Room
        header: {
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#202124',
        },
        participantGrid: {
            flex: 1,
            padding: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '20px',
            overflowY: 'auto',
            alignContent: 'start',
            maxWidth: '1600px',
            margin: '0 auto',
            width: '100%',
        },
        participantCard: {
            position: 'relative',
            aspectRatio: '16/9',
            backgroundColor: '#3c4043',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
        },
        bottomBar: {
            height: '80px',
            flexShrink: 0,
            backgroundColor: '#202124',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            zIndex: 10
        },
        controlButton: (isActive, isHangup = false) => ({
            width: isHangup ? '60px' : '50px',
            height: '50px',
            borderRadius: '50%', // Circle
            border: 'none',
            backgroundColor: isHangup ? '#ea4335' : (isActive ? '#ea4335' : '#3c4043'),
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            ...(isHangup ? { width: '80px', borderRadius: '40px' } : {})
        }),
        nameTag: {
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '4px 8px',
            borderRadius: '4px'
        }
    }

    if (step === 'lobby') {
        return (
            <div style={styles.lobbyContainer}>
                <div style={styles.lobbyContent}>
                    {/* Preview Section */}
                    <div style={styles.previewColumn}>
                        <div style={styles.videoPreviewCard}>
                            {permissionGranted ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    style={styles.videoElement}
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0a6' }}>
                                    {error || 'Camera is starting...'}
                                </div>
                            )}
                            <div style={styles.previewControls}>
                                <button
                                    onClick={toggleAudio}
                                    style={styles.controlButton(isAudioMuted)}
                                    title="Toggle Microphone"
                                >
                                    {isAudioMuted ? '🔇' : '🎤'}
                                </button>
                                <button
                                    onClick={toggleVideo}
                                    style={styles.controlButton(isVideoOff)}
                                    title="Toggle Camera"
                                >
                                    {isVideoOff ? '📷' : '📹'}
                                </button>
                            </div>
                        </div>
                        <div style={{ color: '#e8eaed', fontSize: '24px' }}>Ready to join?</div>
                    </div>

                    {/* Join Form Section */}
                    <div style={styles.formColumn}>
                        <h1 style={styles.title}>Virtual Meeting</h1>

                        <div style={styles.inputContainer}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '14px', color: '#bdc1c6' }}>Display Name</label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    style={styles.inputField}
                                    placeholder="Your Name"
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '14px', color: '#bdc1c6' }}>Room ID</label>
                                <input
                                    type="text"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    style={styles.inputField}
                                />
                            </div>
                        </div>

                        <button
                            onClick={joinMeeting}
                            disabled={!userName || !roomId}
                            style={{
                                ...styles.joinButton,
                                opacity: (!userName || !roomId) ? 0.6 : 1,
                                cursor: (!userName || !roomId) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Join now
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // MEETING ROOM RENDER
    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ fontSize: '18px', fontWeight: 500, color: '#e8eaed' }}>{roomId}</div>
                <div style={{ fontSize: '14px', color: '#9aa0a6' }}>
                    {formatTime()}  •  {userName}
                </div>
            </div>

            {/* Main Video Grid */}
            <div style={styles.participantGrid}>
                {/* Local User */}
                <div style={styles.participantCard}>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        style={styles.videoElement}
                    />
                    <div style={styles.nameTag}>
                        You {isAudioMuted ? '(Muted)' : ''}
                    </div>
                </div>

                {/* Remote Users */}
                {remoteStreams.map(user => (
                    <RemoteVideo
                        key={user.socketId}
                        user={user}
                        cardStyle={styles.participantCard}
                        videoStyle={{ ...styles.videoElement, transform: 'none' }}
                        nameTagStyle={styles.nameTag}
                    />
                ))}
            </div>

            {/* Bottom Control Bar */}
            <div style={styles.bottomBar}>
                <button
                    onClick={toggleAudio}
                    style={styles.controlButton(isAudioMuted)}
                    title="Toggle Microphone"
                >
                    {isAudioMuted ? '🔇' : '🎤'}
                </button>
                <button
                    onClick={toggleVideo}
                    style={styles.controlButton(isVideoOff)}
                    title="Toggle Camera"
                >
                    {isVideoOff ? '📷' : '📹'}
                </button>
                <button
                    onClick={leaveMeeting}
                    style={styles.controlButton(false, true)}
                    title="Leave Call"
                >
                    📞
                </button>
            </div>
        </div>
    )
}

function RemoteVideo({ user, cardStyle, videoStyle, nameTagStyle }) {
    const videoRef = useRef(null)

    useEffect(() => {
        if (videoRef.current && user.stream) {
            videoRef.current.srcObject = user.stream
        }
    }, [user.stream])

    return (
        <div style={cardStyle}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={videoStyle}
            />
            <div style={nameTagStyle}>
                {user.userName}
            </div>
        </div>
    )
}

function formatTime() {
    const d = new Date()
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
