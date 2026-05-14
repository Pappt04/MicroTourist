import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import BlogsPage from './pages/BlogsPage'
import BlogDetailPage from './pages/BlogDetailPage'
import CreateBlogPage from './pages/CreateBlogPage'
import AdminPage from './pages/AdminPage'
import RecommendationsPage from './pages/RecommendationsPage'
import MyToursPage from './pages/MyToursPage'
import CreateTourPage from './pages/CreateTourPage'
import PublishedToursPage from './pages/PublishedToursPage'
import TourDetailPage from './pages/TourDetailPage'
import EditTourWaypointsPage from './pages/EditTourWaypointsPage'
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
            {account.role !== 'administrator' && <Link to="/people">People</Link>}
            {account.role === 'tourist' && <Link to="/tours">Tours</Link>}
            {account.role === 'guide' && <Link to="/my-tours">My Tours</Link>}
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
          <Route path="/people" element={<RecommendationsPage />} />
          <Route path="/my-tours" element={<MyToursPage />} />
          <Route path="/tours/new" element={<CreateTourPage />} />
          <Route path="/tours" element={<PublishedToursPage />} />
          <Route path="/tours/:id" element={<TourDetailPage />} />
          <Route path="/tours/:id/waypoints" element={<EditTourWaypointsPage />} />
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
