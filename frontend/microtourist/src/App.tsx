import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import BlogsPage from './pages/BlogsPage'
import BlogDetailPage from './pages/BlogDetailPage'
import CreateBlogPage from './pages/CreateBlogPage'
import AdminPage from './pages/AdminPage'
import './App.css'

function Navbar() {
  const { account, signOut } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    signOut()
    navigate('/login')
  }

  return (
    <div className="navbar-wrap">
    <nav className="navbar">
      <Link to="/" className="nav-brand">MicroTourist</Link>
      <div className="nav-links">
        <Link to="/">Blogs</Link>
        {account ? (
          <>
            {account.role !== 'administrator' && <Link to="/profile">Profile</Link>}
            {account.role === 'administrator' && <Link to="/admin">Admin</Link>}
            <span className="nav-user">{account.username} ({account.role})</span>
            <button className="nav-btn" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
    </div>
  )
}

function Layout() {
  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<BlogsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/blogs/new" element={<CreateBlogPage />} />
          <Route path="/blogs/:id" element={<BlogDetailPage />} />
          <Route path="/blogs/:id/edit" element={<CreateBlogPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </AuthProvider>
  )
}
