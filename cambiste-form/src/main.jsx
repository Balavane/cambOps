import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.jsx';

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import OperateurForm from './composant/OperateurForm.jsx';
import OperateurList from './composant/OperateurList.jsx';
import OperateurDetail from './composant/OperateurDetail.jsx';
import Dashboard from './composant/Dashboard.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Route principale : Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Routes Cambistes */}
        <Route path="/nouveau_cambiste" element={<App view="form" />} />
        <Route path="/fiche/:ficheId" element={<App view="detail" />} />
        <Route path="/liste_cambiste" element={<App view="list" />} />

        {/* Routes Opérateurs */}
        <Route path="/enregistrement_operateur" element={<OperateurForm />} />
        <Route path="/liste_operateur" element={<OperateurList />} />
        <Route path="/operateur/:operateurId" element={<OperateurDetail />} />

        {/* Route par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);