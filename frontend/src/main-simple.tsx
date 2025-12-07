import { createRoot } from 'react-dom/client'

const App = () => <div>Hello World</div>

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(<App />)
}
