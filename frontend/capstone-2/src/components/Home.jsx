import React from 'react';
import '../styles/Home.css';

import scatterplot_1 from "../images/scatterplot_1.png";
import scatterplot_2 from "../images/scatterplot_2.png";

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
        <img src={scatterplot_1} alt="Scatterplot Example 1" />
        <img src={scatterplot_2} alt="Scatterplot Example 2" />
      </div>
    </section>
  );
}

export default HomeSection;