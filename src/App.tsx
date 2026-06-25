import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.tsx'
import { Chat } from './pages/Chat.tsx'
import { Login } from './pages/Login.tsx'
import { fetchFlags } from './services/featureFlagService.ts'

function App() {
    useEffect(() => {
        fetchFlags()
    }, [])

    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/chat" element={<Chat />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App
