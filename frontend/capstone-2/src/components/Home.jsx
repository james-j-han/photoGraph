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
          In the age where artificial intelligence and machine learning is popular, data is essential. Luckily, we have access to a lot of data in the form of images, videos, text, etc. However, the size of this data can be very large and hard to explore. Our tool addresses this data visualization issue by allowing users to upload, plot, and explore their image data.
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
