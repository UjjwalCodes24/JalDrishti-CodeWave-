import './styles/global.css'
import './styles/interactions.css'
import './styles/app-ui.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RegionProvider } from './context/RegionContext'
import AppShell from './components/AppShell'
import DashboardPage from './pages/DashboardPage'
import FloodRiskMapPage from './pages/FloodRiskMapPage'
import AINowcastPage from './pages/AINowcastPage'
import ExplainableAIPage from './pages/ExplainableAIPage'
import EmergencyResponsePage from './pages/EmergencyResponsePage'
import SafeRoutePage from './pages/SafeRoutePage'
import LandingPage from './pages/LandingPage'
import DataModelStatusPage from './pages/DataModelStatusPage'

function App() {
  return (
    <RegionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/risk-map" element={<FloodRiskMapPage />} />
            <Route path="/safe-routes" element={<SafeRoutePage />} />
            <Route path="/nowcast" element={<AINowcastPage />} />
            <Route path="/explainable-ai" element={<ExplainableAIPage />} />
            <Route path="/emergency-response" element={<EmergencyResponsePage />} />
            <Route path="/data-status" element={<DataModelStatusPage />} />
            <Route path="/data-model-status" element={<DataModelStatusPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RegionProvider>
  )
}

export default App