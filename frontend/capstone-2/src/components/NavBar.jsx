import React from 'react';
import '../styles/NavBar.css'

function NavBar({ setActiveSection, loggedIn, username, onLoginClick, onRegisterClick }) {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="navbar-brand" onClick={() => setActiveSection('home')}>
          photoGRAPH
        </span>
      </div>
      <div className="navbar-right">
        {loggedIn ? (
          <span className="navbar-username">{username}</span>
        ) : (
          <>
            <button className="navbar-button" onClick={onLoginClick}>
              Login
            </button>
            <button className="navbar-button" onClick={onRegisterClick}>
              Register
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default NavBar;