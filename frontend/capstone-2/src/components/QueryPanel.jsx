import React, { useState } from "react";

function QueryPanel() {
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
        };
        response = await fetch("http://127.0.0.1:5000/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else if (queryType === "image") {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("top_k", topK);
        formData.append("type", "image");
        response = await fetch("http://127.0.0.1:5000/query", {
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
      <form onSubmit={handleSubmit}>
        <div>
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
        <div style={{ marginTop: "10px" }}>
          <label>
            Top-k (1-10):{" "}
            <input
              type="number"
              value={topK}
              onChange={handleTopKChange}
              min="1"
              max="10"
              style={{ width: "50px" }}
            />
          </label>
        </div>
        {queryType === "text" ? (
          <div style={{ marginTop: "10px" }}>
            <label>
              Enter text:
              <input
                type="text"
                value={textQuery}
                onChange={handleTextChange}
                placeholder="Type your query..."
                style={{ marginLeft: "10px", width: "300px" }}
              />
            </label>
          </div>
        ) : (
          <div style={{ marginTop: "10px" }}>
            <label>
              Select an image:
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </label>
          </div>
        )}
        <div style={{ marginTop: "10px" }}>
          <button type="submit">Search</button>
        </div>
      </form>
      {results && results.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h4>Query Results:</h4>
          <ul>
            {results.map((result, index) => (
              <li key={index} style={{ marginBottom: "15px" }}>
                <div>
                  <strong>Similarity:</strong>{" "}
                  {result.similarity ? result.similarity.toFixed(2) : "N/A"}
                </div>
                <div>
                  <strong>Label:</strong> {result.label}
                </div>
                {result.image_url && (
                  <img
                    src={result.image_url}
                    alt={result.label || "Image"}
                    style={{ width: "100px", marginTop: "10px" }}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default QueryPanel;