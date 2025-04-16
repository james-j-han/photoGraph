import React, { useState } from "react";
import "../styles/QueryPanel.css";

// const API = "https://photograph-production-4f29.up.railway.app/query";
const API = "http://127.0.0.1:5000/query";

function QueryPanel( { projectId }) {
  const [queryType, setQueryType] = useState("text"); // "text" or "image"
  const [topK, setTopK] = useState(5);
  const [textQuery, setTextQuery] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [results, setResults] = useState([]);

  const handleQueryTypeChange = (e) => {
    setQueryType(e.target.value);
    setTextQuery("");
    setImageFile(null);
  };

  const handleTopKChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (val >= 1 && val <= 10) {
      setTopK(val);
    }
  };

  const handleTextChange = (e) => {
    setTextQuery(e.target.value);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (queryType === "text") {
        const payload = {
          type: "text",
          top_k: topK,
          text: textQuery,
          project_id: projectId
        };
        response = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else if (queryType === "image") {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("top_k", topK);
        formData.append("type", "image");
        formData.append("project_id", projectId);
        response = await fetch(API, {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        const errData = await response.json();
        console.error("Query error:", errData);
        return;
      }
      const queryResults = await response.json();
      console.log("Query results:", queryResults);
      setResults(queryResults);
    } catch (err) {
      console.error("Error submitting query:", err);
    }
  };

  return (
    <div className="query-panel">
      <h2 className="query-panel-title">Query Top-k Similar Images</h2>
      <form className="query-form" onSubmit={handleSubmit}>
        <div className="query-selection">
          <label>
            <input
              type="radio"
              value="text"
              checked={queryType === "text"}
              onChange={handleQueryTypeChange}
            />
            Text Query
          </label>
          <label style={{ marginLeft: "20px" }}>
            <input
              type="radio"
              value="image"
              checked={queryType === "image"}
              onChange={handleQueryTypeChange}
            />
            Image Query
          </label>
        </div>
        <div className="form-group">
          <label>
            Top-k (1-10):{" "}
            <input
              type="number"
              value={topK}
              onChange={handleTopKChange}
              min="1"
              max="10"
              className="small-input"
            />
          </label>
        </div>
        {queryType === "text" ? (
          <div className="form-group">
            <label>
              Enter text:
              <input
                type="text"
                value={textQuery}
                onChange={handleTextChange}
                placeholder="Type your query..."
                className="text-input"
              />
            </label>
          </div>
        ) : (
          <div className="form-group">
            <label>
              Select an image:
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
              />
            </label>
          </div>
        )}
        <div className="form-group">
          <button type="submit" className="submit-button">
            Search
          </button>
        </div>
      </form>

      {results && results.length > 0 && (
        <div className="query-results-container">
          <h4>Query Results:</h4>
          <div className="query-results-grid">
            {results.map((result, index) => (
              <div key={index} className="result-card">
                <div className="result-similarity">
                  <strong>Similarity:</strong>{" "}
                  {result.similarity ? result.similarity.toFixed(2) : "N/A"}
                </div>
                <div className="result-label">
                  <strong>Label:</strong> {result.label || "Unnamed"}
                </div>
                {result.image_url && (
                  <img
                    src={result.image_url}
                    alt={result.label || "Image"}
                    className="result-image"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default QueryPanel;