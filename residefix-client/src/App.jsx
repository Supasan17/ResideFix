import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SubmitComplaint from './pages/SubmitComplaint.jsx';
import MyComplaints from './pages/MyComplaints.jsx';
import ComplaintDetails from './pages/ComplaintDetails.jsx';
import ManagerView from './pages/ManagerView.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Any logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/complaints/:id" element={<ComplaintDetails />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Residents submit and track their own complaints */}
        <Route element={<ProtectedRoute roles={['resident']} />}>
          <Route path="/complaints/new" element={<SubmitComplaint />} />
          <Route path="/my-complaints" element={<MyComplaints />} />
        </Route>

        {/* Property staff */}
        <Route element={<ProtectedRoute roles={['manager', 'admin']} />}>
          <Route path="/manage" element={<ManagerView />} />
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
