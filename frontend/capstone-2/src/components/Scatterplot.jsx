import React, { useEffect, useState, useRef } from "react";
import Plot from "react-plotly.js";
import Plotly from "plotly.js-dist";

import "../styles/Scatterplot.css";

const API = "https://photograph-production-4f29.up.railway.app/retrieve-pca-with-details";

// const API = "http://127.0.0.1:5000/retrieve-pca-with-details";

// const API = "http://73.106.25.87:52847/retrieve-pca-embeddings";
const zoomThreshold = 0.2;

function ScatterPlot({ refreshToken, is3D, projectId }) {
  // const [overlayImages, setOverlayImages] = useState([]);
  const plotRef = useRef(null);
  const [pcaData, setPcaData] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  // Fetch PCA embeddings from backend
  console.log(projectId);
  const fetchPCAEmbeddings = async () => {
    try {
      const response = await fetch(`${API}?project_id=${projectId}`, { method: "GET" });
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
    if (projectId) {
      fetchPCAEmbeddings();
    }
  }, [refreshToken, projectId]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // If there's no data, just display a fallback message (or return null).
  if (!pcaData || pcaData.length === 0) {
    return (
      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <h3>No data found for this project.</h3>
      </div>
    );
  }

  // Process the PCA data to extract coordinates.
  // Here we assume pca_embedding is an array of at least two numbers.
  const xValues = pcaData.map((item) => item.embedding[0]);
  const yValues = pcaData.map((item) => item.embedding[1]);
  const zValues = pcaData.map((item) => item.embedding[2] || 0);

  // The relayout event handler. This function will be invoked via the onRelayout prop.
  const handleRelayout = (eventData) => {
    const x0 = eventData["xaxis.range[0]"];
    const x1 = eventData["xaxis.range[1]"];
    const y0 = eventData["yaxis.range[0]"];
    const y1 = eventData["yaxis.range[1]"];
    if (x0 != null && x1 != null && y0 != null && y1 != null) {
      const xMin = parseFloat(x0),
            xMax = parseFloat(x1),
            yMin = parseFloat(y0),
            yMax = parseFloat(y1);
  
      // only overlay when you've zoomed in enough on *both* axes
      if ((xMax - xMin) < zoomThreshold && (yMax - yMin) < zoomThreshold) {
        const visibleData = pcaData.filter(({ embedding }) => {
          const [x, y] = embedding;
          return x >= xMin && x <= xMax && y >= yMin && y <= yMax;
        });
  
        const newImages = visibleData.map((record) => ({
          source:    record.data_points.image_url,
          xref:      "x",
          yref:      "y",
          x:         record.embedding[0],
          y:         record.embedding[1],
          sizex:     0.04,
          sizey:     0.04,
          xanchor:   "center",
          yanchor:   "middle",
          opacity:   0.8,
          layer:     "above",
        }));
  
        // imperatively update only the `images` array
        if (plotRef.current?.el) {
          Plotly.relayout(plotRef.current.el, { images: newImages });
        }
      } else {
        // clear images when zoomed out
        if (plotRef.current?.el) {
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
      showscale: !isMobile,
    },
    // Assuming our backend returns a flat property "label"
    text: pcaData.map(record => {
      const lbl = record?.data_points?.label || "Unnamed";
      return `Label: ${lbl}`;
    }),
    hoverinfo: "text",
    hovertemplate: "%{text}<extra></extra>",
  };

  // Define layout for 2D plot, including the images if available.
  const layout2D = {
    autosize: true,
    title: { text: "PCA Embeddings Scatter Plot (2D)" },
    xaxis: {
      title: { text: "PCA Component 1", font: { size: 14 } },
      zeroline: false,
      automargin: true,
    },
    yaxis: {
      title: { text: "PCA Component 2", font: { size: 14 } },
      zeroline: false,
      automargin: true,
    },
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
      showscale: !isMobile,
    },
    text: pcaData.map(record => {
      const lbl = record?.data_points?.label || "Unnamed";
      return `Label: ${lbl}`;
    }),
    hoverinfo: "text",
    hovertemplate: "%{text}<extra></extra>",
  };

  const layout3D = {
    autosize: true,
    title: { text: "PCA Embeddings Scatter Plot (3D)" },
    margin: { l: 0, r: 0, t: 30, b: 0 },
  
    // make the 3D box flex to its container
    scene: {
      domain: { x: [0,1], y: [0,1] },
      aspectmode: "auto",
      xaxis: {
        title: { text: "PC1", font: { size: 14 } },
        zeroline: false,
        automargin: true,
      },
      yaxis: {
        title: { text: "PC2", font: { size: 14 } },
        zeroline: false,
        automargin: true,
      },
      zaxis: {
        title: { text: "PC3", font: { size: 14 } },
        zeroline: false,
        automargin: true,
      },
    },
  };

  const config = { responsive: true };

  if (is3D) {
    return (
      <div className="responsive-container">
        <Plot
          key="3d"
          data={[trace3D]}
          layout={layout3D}
          config={config}
          onRelayout={handleRelayout}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  } else {
    return (
      <div className="responsive-container">
        <Plot
          ref={plotRef}
          key="2d"
          data={[trace2D]}
          layout={layout2D}
          config={config}
          onRelayout={handleRelayout}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  }
}

export default ScatterPlot;
