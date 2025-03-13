import React from "react";
import ReactDom from "react-dom/client";

function App() {
  return (
    <p>Hello World!</p> 
  );
}

const root = ReactDom.createRoot(document.getElementById("root"));
root.render(<App />);
