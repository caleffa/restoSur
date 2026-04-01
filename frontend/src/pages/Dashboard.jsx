import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content">
        <h2>Dashboard</h2>
        <p><strong>Usuario:</strong> {user?.name}</p>
        <p><strong>Rol:</strong> {user?.role}</p>
        <p><strong>Sucursal:</strong> {user?.branchId}</p>
      </main>
    </div>
  );
}

export default Dashboard;
