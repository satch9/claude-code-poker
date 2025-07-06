import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Poker Texas Hold'em
        </h1>
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Application en cours de développement
          </p>
          <button
            onClick={() => setCount((count) => count + 1)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Clics: {count}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App