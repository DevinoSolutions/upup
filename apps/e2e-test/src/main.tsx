import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import './upup.css'

const BasicUploader = lazy(() => import('./pages/01-basic-uploader'))
const HeadlessHook = lazy(() => import('./pages/02-headless-hook'))
const ThemeSystem = lazy(() => import('./pages/03-theme-system'))
const I18nSystem = lazy(() => import('./pages/04-i18n-system'))
const FileOperations = lazy(() => import('./pages/05-file-operations'))
const UploadLifecycle = lazy(() => import('./pages/06-upload-lifecycle'))
const PropGetters = lazy(() => import('./pages/07-prop-getters'))
const PluginSystem = lazy(() => import('./pages/08-plugin-system'))
const Accessibility = lazy(() => import('./pages/09-accessibility'))
const Sources = lazy(() => import('./pages/10-sources'))
const ThemeProvider = lazy(() => import('./pages/11-theme-provider'))
const Restrictions = lazy(() => import('./pages/12-restrictions'))

const routes = [
  { path: '/basic', label: 'Basic', testId: 'nav-basic', element: <BasicUploader /> },
  { path: '/headless', label: 'Headless', testId: 'nav-headless', element: <HeadlessHook /> },
  { path: '/theme', label: 'Theme', testId: 'nav-theme', element: <ThemeSystem /> },
  { path: '/i18n', label: 'i18n', testId: 'nav-i18n', element: <I18nSystem /> },
  { path: '/files', label: 'Files', testId: 'nav-files', element: <FileOperations /> },
  { path: '/upload', label: 'Upload', testId: 'nav-upload', element: <UploadLifecycle /> },
  { path: '/prop-getters', label: 'Prop Getters', testId: 'nav-prop-getters', element: <PropGetters /> },
  { path: '/plugins', label: 'Plugins', testId: 'nav-plugins', element: <PluginSystem /> },
  { path: '/a11y', label: 'A11y', testId: 'nav-a11y', element: <Accessibility /> },
  { path: '/sources', label: 'Sources', testId: 'nav-sources', element: <Sources /> },
  { path: '/theme-provider', label: 'ThemeProvider', testId: 'nav-theme-provider', element: <ThemeProvider /> },
  { path: '/restrictions', label: 'Restrictions', testId: 'nav-restrictions', element: <Restrictions /> },
] as const

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <nav
          data-testid="nav-sidebar"
          style={{
            width: 200,
            padding: 16,
            borderRight: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <h2 data-testid="nav-title" style={{ margin: '0 0 12px', fontSize: 16 }}>
            E2E Tests
          </h2>
          {routes.map(r => (
            <NavLink
              key={r.path}
              to={r.path}
              data-testid={r.testId}
              style={({ isActive }) => ({
                display: 'block',
                padding: '6px 8px',
                borderRadius: 4,
                textDecoration: 'none',
                color: isActive ? '#fff' : '#333',
                background: isActive ? '#6366f1' : 'transparent',
                fontSize: 14,
              })}
            >
              {r.label}
            </NavLink>
          ))}
        </nav>
        <main data-testid="page-content" style={{ flex: 1, padding: 24 }}>
          <Suspense fallback={<div data-testid="loading">Loading...</div>}>
            <Routes>
              {routes.map(r => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
              <Route
                path="/"
                element={
                  <div data-testid="home-page">
                    <h1>upup E2E Test App</h1>
                    <p>Select a test page from the sidebar.</p>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
