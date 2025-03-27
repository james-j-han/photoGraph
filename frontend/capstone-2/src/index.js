import React, { useState } from "react";
import ReactDom from "react-dom/client";

import './index.css';

import NavBar from "./components/NavBar.jsx";
import Home from "./components/Home.jsx";
import ProjectPage from "./components/ProjectsPage.jsx";
import Login from "./components/Login.jsx";
import About from "./components/About.jsx";
import Register from "./components/Register.jsx";
import Footer from "./components/Footer.jsx";

function App() {
  const [activeSection, setActiveSection] = useState('projects');
  const [loggedIn, setLoggedIn] = useState(false);
  const username = "John Doe"; // Retrieve from database

  // Call backend API to handle login
  const handleLoginClick = () => {
    setActiveSection('login');
    console.log("Login clicked");
    // Verify login credentials backend
    // Use response to proceed to login or error message
  };

  // Call backend API to handle registration
  const handleRegisterClick = () => {
    setActiveSection('register');
    console.log("Register clicked");
    // Send registration credentials to backend
    // Use response to display success or error
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return <Home />;
      case 'projects':
        return <ProjectPage />;
      case 'login':
        return <Login />
      case 'about':
        return <About />;
      case 'register':
        return <Register />;
      default:
        return <Home />;
    }
  }

  return (
    <>
      <NavBar
        setActiveSection={setActiveSection}
        loggedIn={loggedIn}
        username={username}
        onLoginClick={handleLoginClick}
        onRegisterClick={handleRegisterClick}
      />
      <main>
        {renderSection()}
      </main>
      <Footer />
    </>
  );
}

const root = ReactDom.createRoot(document.getElementById("root"));
root.render(<App />);
