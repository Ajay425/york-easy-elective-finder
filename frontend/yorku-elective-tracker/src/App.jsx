import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import './index.css'
import {BrowserRouter as Router, Routes , Route} from 'react-router-dom';
import Home from './components/sections/Home.jsx';

function App() {

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start pt-8">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </div>
  )
}


export default App
