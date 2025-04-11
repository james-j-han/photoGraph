import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";

import "../styles/Scatterplot.css";

// const API = "http://127.0.0.1:5000/retrieve-pca-embeddings";
const API = "http://73.106.25.87:52847/retrieve-pca-embeddings";

function ScatterPlot({ refreshToken, is3D }) {
  const [pcaData, setPcaData] = useState([]);

  // Fetch PCA embeddings from your backend
  const fetchPCAEmbeddings = async () => {
    try {
      // Update the URL to match your deployed backend endpoint if necessary.
      const response = await fetch(API, {
        method: "GET",
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error retrieving PCA embeddings:", errorData);
        return;
      }
      const data = await response.json();
      console.log("PCA embeddings retrieved:", data);
      setPcaData(data);
    } catch (err) {
      console.error("Error fetching PCA embeddings:", err);
    }
  };

  useEffect(() => {
    fetchPCAEmbeddings();
  }, [refreshToken]);

  // Process the PCA data to extract coordinates.
  // Here we assume pca_embedding is an array of at least two numbers.
  const xValues = pcaData.map(item => item.embedding[0]);
  const yValues = pcaData.map(item => item.embedding[1]);
  const zValues = pcaData.map(item => item.embedding[2] || 0);

  if (is3D) {
    return (
      <div className="responsive-container">
        <h2>PCA Embeddings Scatter Plot 3D</h2>
        <Plot
          key="3d"
          data={[
            {
              type: 'scatter3d',
              mode: 'markers',
              x: xValues,
              y: yValues,
              z: zValues,
              marker: {
                color: xValues,
                colorscale: 'Viridis',
                size: 8,
                colorbar: { title: 'Component 1' }
              },
              text: pcaData.map((record) => `Name: ${record.data_points.label}`),
              hoverinfo: 'text',
              hovertemplate: '%{text}<extra></extra>'
            },
          ]}
          layout={{
            autosize: true,
            title: 'PCA Embeddings Scatter Plot',
            scene: {
              xaxis: { title: { text: 'PCA Component 1', font: { size: 14 } }, zeroline: false },
              yaxis: { title: { text: 'PCA Component 2', font: { size: 14 } }, zeroline: false },
              zaxis: { title: { text: 'PCA Component 3', font: { size: 14 } }, zeroline: false },
            },
            margin: { l: 40, r: 10, t: 10, b: 40 },
          }}
          config={{ responsive: true }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  } else {
    return (
      <div className="responsive-container">
        <h2>PCA Embeddings Scatter Plot 2D</h2>
        <Plot
          key="2d"
          data={[
            {
              type: 'scatter',
              mode: 'markers',
              x: xValues,
              y: yValues,
              marker: {
                color: xValues,
                colorscale: 'Viridis',
                size: 8,
                colorbar: { title: 'Component 1' }
              },
              text: pcaData.map((record) => `Name: ${record.data_points.label}`),
              hoverinfo: 'text'
            },
          ]}
          layout={{
            autosize: true,
            title: 'PCA Embeddings Scatter Plot',
            xaxis: { title: { text: 'PCA Component 1', font: { size: 14 } }, zeroline: false },
            yaxis: { title: { text: 'PCA Component 2', font: { size: 14 } }, zeroline: false },
            margin: { l: 40, r: 10, t: 10, b: 40 },
          }}
          config={{ responsive: true }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  }
}

export default ScatterPlot;