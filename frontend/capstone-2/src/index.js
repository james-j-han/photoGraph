import React, { useState } from "react";
import ReactDom from "react-dom/client";

import NavBar from "./components/NavBar.jsx";
import Home from "./components/Home.jsx";
import About from "./components/About.jsx";
import Footer from "./components/Footer.jsx";

function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [loggedIn, setLoggedIn] = useState(false);
  const username = "John Doe"; // Retrieve from database

  // Call backend API to handle login
  const handleLoginClick = () => {
    console.log("Login clicked");
  };

  // Call backend API to handle registration
  const handleRegisterClick = () => {
    console.log("Register clicked");
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return <Home />;
      case 'about':
        return <About />;
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
