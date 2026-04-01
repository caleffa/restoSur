import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

function POS() {
  const { tableId } = useParams();

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content">
        <h2>POS - Mesa {tableId}</h2>
        <p>Vista lista para integrar productos, comanda y cobro.</p>
      </main>
    </div>
  );
}

export default POS;
