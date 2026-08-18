import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import ImportIcs from './pages/ImportIcs';
import History from './pages/History';
import RadarStatus from './pages/RadarStatus';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pessoas" element={<People />} />
        <Route path="/importar" element={<ImportIcs />} />
        <Route path="/historico" element={<History />} />
        <Route path="/status" element={<RadarStatus />} />
      </Route>
    </Routes>
  );
}
