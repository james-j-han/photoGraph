import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";

import "../styles/Scatterplot.css";

function ScatterPlot({ refreshToken }) {
  const [pcaData, setPcaData] = useState([]);

  // Fetch PCA embeddings from your backend
  const fetchPCAEmbeddings = async () => {
    try {
      // Update the URL to match your deployed backend endpoint if necessary.
      const response = await fetch("http://127.0.0.1:5000/retrieve-pca-embeddings", {
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

  return (
    <div className="responsive-container">
      {/* <h2>PCA Embeddings Scatter Plot</h2> */}
      <Plot
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
          xaxis: { title: 'PCA Component 1', zeroline: false },
          yaxis: { title: 'PCA Component 2', zeroline: false },
          // margin: { l: 10, r: 10, t: 20, b: 20 },
        }}
        config={{ responsive: true }}
        useResizeHandler={true}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default ScatterPlot;