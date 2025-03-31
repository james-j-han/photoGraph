import React, { useEffect, useState } from "react";
import ReactDom from "react-dom/client";

import './index.css';

import NavBar from "./components/NavBar.jsx";
import Home from "./components/Home.jsx";
import ProjectPage from "./components/ProjectsPage.jsx";
import ProjectDetail from "./components/ProjectDetail.jsx";
import Login from "./components/Login.jsx";
import About from "./components/About.jsx";
import Register from "./components/Register.jsx";
import Footer from "./components/Footer.jsx";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  // Set landing page to projects if logged in, otherwise home
  const [activeSection, setActiveSection] = useState(loggedIn ? 'projects' : 'home');
  const [selectedProject, setSelectedProject] = useState(null);
  const [username, setUsername] = useState('');

  // Redirect user to projects page automatically after logging in
  // Redirect user to home page automatically after logging out
  useEffect(() => {
    loggedIn ? setActiveSection('projects') : setActiveSection('home');
  }, [loggedIn]);

  // Call backend API to handle login
  const handleLoginClick = () => {
    setActiveSection('login');
    console.log("Login clicked");
    // Verify login credentials backend
    // Use response to proceed to login or error message
  };

  const handleLoginSubmission = (data) => {
    setLoggedIn(true);
    setUsername(data.username || "User");
  }

  const handleLogoutClick = () => {
    setLoggedIn(false);
    console.log("Logout clicked");
  }

  const handleProjectsClick = () => {
    setActiveSection('projects')
    console.log("Projects clicked");  
  }

  // Call backend API to handle registration
  const handleRegisterClick = () => {
    setActiveSection('register');
    console.log("Register clicked");
    // Send registration credentials to backend
    // Use response to display success or error
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setActiveSection('projectDetail');
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return <Home />;
      case 'projects':
        return <ProjectPage onSelectProject={handleSelectProject} />;
      case 'projectDetail':
        return <ProjectDetail project={selectedProject} onBack={() => setActiveSection('projects')} />;
      case 'login':
        return <Login onLogin={handleLoginSubmission} />
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
        onLogoutClick={handleLogoutClick}
        onProjectsClick={handleProjectsClick}
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
