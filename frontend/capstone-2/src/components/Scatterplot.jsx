import React, { useEffect, useState, useRef } from "react";
import Plot from "react-plotly.js";
import Plotly from "plotly.js-dist";

import "../styles/Scatterplot.css";

const API = "http://127.0.0.1:5000/retrieve-pca-embeddings";
// const API = "http://73.106.25.87:52847/retrieve-pca-embeddings";
const zoomThreshold = 0.2;

function ScatterPlot({ refreshToken, is3D }) {
  // const [overlayImages, setOverlayImages] = useState([]);
  const plotRef = useRef(null);
  const [pcaData, setPcaData] = useState([]);

  // Fetch PCA embeddings from backend
  const fetchPCAEmbeddings = async () => {
    try {
      const response = await fetch(API, { method: "GET" });
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
  const xValues = pcaData.map((item) => item.embedding[0]);
  const yValues = pcaData.map((item) => item.embedding[1]);
  const zValues = pcaData.map((item) => item.embedding[2] || 0);

  // The relayout event handler. This function will be invoked via the onRelayout prop.
  const handleRelayout = (eventData) => {
    // Check if the x-axis range is provided
    if (eventData["xaxis.range[0]"] && eventData["xaxis.range[1]"]) {
      const xMin = parseFloat(eventData["xaxis.range[0]"]);
      const xMax = parseFloat(eventData["xaxis.range[1]"]);
      const range = xMax - xMin;
      console.log("X-axis range:", range);
      if (range < zoomThreshold) {
        // Filter the PCA data so we only overlay images for points that are visible in the current view.
        const visibleData = pcaData.filter((record) => {
          const x = record.embedding[0];
          return x >= xMin && x <= xMax;
        });

        // Map to overlay image objects.
        const newImages = visibleData.map((record) => ({
          source: record.data_points.image_url,
          xref: "x",
          yref: "y",
          x: record.embedding[0],
          y: record.embedding[1],
          sizex: 0.04, // Adjust these values as needed
          sizey: 0.04,
          xanchor: "center",
          yanchor: "middle",
          opacity: 0.8,
          layer: "above",
        }));
        console.log("Overlay images set:", newImages);
        // Update images imperatively without forcing a full re-render.
        if (plotRef.current && plotRef.current.el) {
          Plotly.relayout(plotRef.current.el, { images: newImages });
        }
      } else {
        // Clear images when zoomed out.
        if (plotRef.current && plotRef.current.el) {
          Plotly.relayout(plotRef.current.el, { images: [] });
        }
      }
    }
  };

  // Define the Plotly trace for 2D; note that we're using "scatter" (not scatter3d).
  const trace2D = {
    type: "scatter",
    mode: "markers",
    x: xValues,
    y: yValues,
    marker: {
      size: 8,
      colorscale: "Viridis",
      color: xValues,
      colorbar: { title: "Component 1" },
    },
    // Assuming our backend returns a flat property "label"
    text: pcaData.map(
      (record) => `Label: ${record.data_points.label || "Unnamed"}`
    ),
    hoverinfo: "text",
    hovertemplate: "%{text}<extra></extra>",
  };

  // Define layout for 2D plot, including the images if available.
  const layout2D = {
    autosize: true,
    title: "PCA Embeddings Scatter Plot (2D)",
    xaxis: {
      title: { text: "PCA Component 1", font: { size: 14 } },
      zeroline: false,
    },
    yaxis: {
      title: { text: "PCA Component 2", font: { size: 14 } },
      zeroline: false,
    },
    margin: { l: 40, r: 10, t: 10, b: 40 },
    // images: overlayImages,
  };

  // For a 3D chart, we won’t overlay images the same way.
  const trace3D = {
    type: "scatter3d",
    mode: "markers",
    x: xValues,
    y: yValues,
    z: zValues,
    marker: {
      size: 8,
      colorscale: "Viridis",
      color: xValues,
      colorbar: { title: "Component 1" },
    },
    text: pcaData.map((record) => `Label: ${record.label || "Unnamed"}`),
    hoverinfo: "text",
    hovertemplate: "%{text}<extra></extra>",
  };

  const layout3D = {
    autosize: true,
    title: "PCA Embeddings Scatter Plot (3D)",
    scene: {
      xaxis: { title: { text: "PC1", font: { size: 14 } }, zeroline: false },
      yaxis: { title: { text: "PC2", font: { size: 14 } }, zeroline: false },
      zaxis: { title: { text: "PC3", font: { size: 14 } }, zeroline: false },
    },
    margin: { l: 40, r: 10, t: 10, b: 40 },
  };

  const config = { responsive: true };

  if (is3D) {
    return (
      <div className="responsive-container">
        <h2>PCA Embeddings Scatter Plot (3D)</h2>
        <Plot
          key="3d"
          data={[trace3D]}
          layout={layout3D}
          config={config}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  } else {
    return (
      <div className="responsive-container">
        <h2>PCA Embeddings Scatter Plot (2D)</h2>
        <Plot
          ref={plotRef}
          key="2d"
          data={[trace2D]}
          layout={layout2D}
          config={config}
          onRelayout={handleRelayout}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  }

  // if (is3D) {
  //   return (
  //     <div className="responsive-container">
  //       <h2>PCA Embeddings Scatter Plot 3D</h2>
  //       <Plot
  //         key="3d"
  //         data={[
  //           {
  //             type: 'scatter3d',
  //             mode: 'markers',
  //             x: xValues,
  //             y: yValues,
  //             z: zValues,
  //             marker: {
  //               color: xValues,
  //               colorscale: 'Viridis',
  //               size: 8,
  //               colorbar: { title: 'Component 1' }
  //             },
  //             text: pcaData.map((record) => `Name: ${record.data_points.label}`),
  //             hoverinfo: 'text',
  //             hovertemplate: '%{text}<extra></extra>'
  //           },
  //         ]}
  //         layout={{
  //           autosize: true,
  //           title: 'PCA Embeddings Scatter Plot',
  //           scene: {
  //             xaxis: { title: { text: 'PCA Component 1', font: { size: 14 } }, zeroline: false },
  //             yaxis: { title: { text: 'PCA Component 2', font: { size: 14 } }, zeroline: false },
  //             zaxis: { title: { text: 'PCA Component 3', font: { size: 14 } }, zeroline: false },
  //           },
  //           margin: { l: 40, r: 10, t: 10, b: 40 },
  //         }}
  //         config={{ responsive: true }}
  //         useResizeHandler={true}
  //         style={{ width: "100%", height: "100%" }}
  //       />
  //     </div>
  //   );
  // } else {
  //   return (
  //     <div className="responsive-container">
  //       <h2>PCA Embeddings Scatter Plot 2D</h2>
  //       <Plot
  //         key="2d"
  //         data={[
  //           {
  //             type: 'scatter',
  //             mode: 'markers',
  //             x: xValues,
  //             y: yValues,
  //             marker: {
  //               color: xValues,
  //               colorscale: 'Viridis',
  //               size: 8,
  //               colorbar: { title: 'Component 1' }
  //             },
  //             text: pcaData.map((record) => `Name: ${record.data_points.label}`),
  //             hoverinfo: 'text'
  //           },
  //         ]}
  //         layout={{
  //           autosize: true,
  //           title: 'PCA Embeddings Scatter Plot',
  //           xaxis: { title: { text: 'PCA Component 1', font: { size: 14 } }, zeroline: false },
  //           yaxis: { title: { text: 'PCA Component 2', font: { size: 14 } }, zeroline: false },
  //           margin: { l: 40, r: 10, t: 10, b: 40 },
  //         }}
  //         config={{ responsive: true }}
  //         useResizeHandler={true}
  //         style={{ width: "100%", height: "100%" }}
  //       />
  //     </div>
  //   );
  // }
}

export default ScatterPlot;
