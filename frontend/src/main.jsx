import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App.jsx'
import './index.css'

import { LabsProvider } from './context/LabsContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <LabsProvider>
        <App />
      </LabsProvider>
    </Provider>
  </React.StrictMode>,
)
