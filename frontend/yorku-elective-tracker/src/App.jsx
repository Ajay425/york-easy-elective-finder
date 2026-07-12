import './App.css'
import './index.css'
import {BrowserRouter as Router, Routes , Route} from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
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
      <Analytics />
    </div>
  )
}


export default App
