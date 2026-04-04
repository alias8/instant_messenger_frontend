import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Chat } from './pages/Chat.tsx'
import { Login } from './pages/Login.tsx'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/chat" element={<Chat />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
