import React, { useEffect, useRef, useState } from "react";
import "../styles/NavBar.css";

function NavBar({
  setActiveSection,
  loggedIn,
  userData,
  onLoginClick,
  onRegisterClick,
  onLogoutClick,
  onProjectsClick,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  // If mousedown or touch outside of dropdown, close menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="navbar-brand" onClick={() => setActiveSection("home")}>
          photoGRAPH
        </span>
      </div>
      <div className="navbar-right">
        {/* Desktop Menu */}
        <div className="desktop-menu">
          {loggedIn ? (
            <>
              <span className="navbar-username">{userData.first_name}</span>
              <button className="navbar-button" onClick={onProjectsClick}>
                Projects
              </button>
              <button className="navbar-button" onClick={onLogoutClick}>
                Logout
              </button>
            </>
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

        {/* Mobile Menu */}
        <div className="mobile-menu" ref={mobileMenuRef}>
          {loggedIn && (
            <span className="navbar-username mobile-username">{userData.first_name}</span>
          )}
          <button className="hamburger" onClick={toggleMenu}>
            ☰
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              {loggedIn ? (
                <>
                  <button className="navbar-button" onClick={onProjectsClick}>
                    Projects
                  </button>
                  <button className="navbar-button" onClick={onLogoutClick}>
                    Logout
                  </button>
                </>
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
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
