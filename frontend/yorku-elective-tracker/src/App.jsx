import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import './index.css'
import {BrowserRouter as Router, Routes , Route} from 'react-router-dom';
import Home from './components/sections/Home.jsx';
import Electives from './components/sections/Electives.jsx';
import ContactUs from './components/sections/Contact.jsx';

function App() {

  return (
    <div className="min-h-screen bg-[#050509] w-full flex flex-col items-center justify-start">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/electives" element={<Electives />} />
          <Route path="/contact-us" element={<ContactUs />} />
        </Routes>
      </Router>
    </div>
  )
}


export default App
