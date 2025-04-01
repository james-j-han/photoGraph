import React from 'react';
import '../styles/Home.css';

function HomeSection() {
  return (
    <section className="home-container">
      <div className="hero-section">
        <h1>Welcome to photoGRAPH</h1>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>
      
      <div className="scatterplot-showcase">
        <img src="scatterplot1.png" alt="Scatterplot Example 1" />
        <img src="scatterplot2.png" alt="Scatterplot Example 2" />
      </div>
    </section>
  );
}

export default HomeSection;