import React from "react";
import ReactDom from "react-dom/client";

import Footer from "./components/Footer.jsx";
import NavBar from "./components/NavBar.jsx";

function App() {
  return (
    <>
      <NavBar />
      <p>Hello World!</p>
      <Footer />
    </>
  );
}

const root = ReactDom.createRoot(document.getElementById("root"));
root.render(<App />);
