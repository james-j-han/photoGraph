import React, { useEffect, useRef, useState } from "react";
import supabase from "./Supabase";

import ScatterPlot from "./Scatterplot";

import "../styles/ProjectDetail.css";

function ProjectDetail({ project, onBack, onProjectUpdate }) {
  const fileInputRef = useRef(null);
  const [localProject, setLocalProject] = useState(project);
  const [refreshToken, setRefreshToken] = useState(0);
  const [is3D, setIs3D] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project ? project.name : "");
  const [updateError, setUpdateError] = useState("");

  // If the passed project prop changes (e.g., on refresh), update localProject
  useEffect(() => {
    setLocalProject(project);
    setEditedName(project ? project.name : "");
  }, [project]);

  // Call this function after successfully inserting new embeddings (or after PCA extraction)
  const triggerRefresh = () => {
    setRefreshToken((prev) => prev + 1);
  };

  // Toggle edit mode when the project name is clicked.
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Update the edited name state as the user types.
  const handleChange = (e) => {
    setEditedName(e.target.value);
  };

  // Call this to update the project's name in Supabase and update local state
  const handleSave = async () => {
    if (!localProject) return;
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({ name: editedName })
        .eq("id", localProject.id)
        .select("id, name"); // explicitly select updated fields

      if (error) {
        setUpdateError(error.message);
        console.error("Error updating project name:", error);
      } else if (data && data.length > 0) {
        // Update the local state with the updated project
        setLocalProject(data[0]);
        setIsEditing(false);
        // Notify the parent to update its list with the new project data
        if (onProjectUpdate) onProjectUpdate(data[0]);
      }
    } catch (err) {
      setUpdateError(err.message);
      console.error("Error in handleSave:", err);
    }
  };

  // Allow saving on Enter or on blur from the input field.
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  const handleDatasetClick = () => {
    // Trigger the hidden file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    console.log("Files Changed:", e.target.files);

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/jpg",
    ];

    // Process each file sequentially (or you can use Promise.all for parallel processing)
    for (const file of files) {
      // Validate file type.
      if (!validImageTypes.includes(file.type)) {
        console.error(`File ${file.name} is not a supported image type.`);
        continue;
      }

      // Create FormData for the file.
      const formData = new FormData();
      formData.append("file", file);

      try {
        // --- Step 1: Extract CLIP Embeddings ---
        // Call your first endpoint for CLIP extraction.
        const responseClip = await fetch(
          "http://127.0.0.1:5000/extract-clip-embeddings", // Change URL as needed.
          {
            method: "POST",
            body: formData,
          }
        );

        if (!responseClip.ok) {
          const errorData = await responseClip.json();
          console.error(
            `Error from CLIP embeddings endpoint for ${file.name}:`,
            errorData
          );
          continue;
        }

        const clipResults = await responseClip.json();
        // Assume the endpoint returns an array of objects:
        // [ { "filename": "name", "clip_embedding": [...] } ]
        const { clip_embedding } = clipResults[0]; // For one file.
        console.log(`CLIP embedding for ${file.name}:`, clip_embedding);

        // --- Step 2: Insert the CLIP Embedding into the Database ---
        // First, create a new data point.
        const { data: dpData, error: dpError } = await supabase
          .from("data_points")
          .insert({ project_id: project.id, label: file.name })
          .select();

        if (dpError) {
          console.error("Error creating data point:", dpError);
          continue;
        }

        const newDataPointId = dpData[0].id;
        console.log("New data point created with ID:", newDataPointId);

        // --- Step 3: Insert the CLIP Embedding into the Database ---
        const { data: clipData, error: clipError } = await supabase
          .from("clip_embeddings")
          .insert({ data_point_id: newDataPointId, embedding: clip_embedding });
        if (clipError) {
          console.error("Error inserting CLIP embedding:", clipError);
          continue;
        }

        console.log(`CLIP embedding inserted for data_point_id ${newDataPointId}`);
      } catch (err) {
        console.error("Error processing file (CLIP step):", file.name, err);
      }
    } // End for loop over files

    // --- Step 3: Call the PCA Extraction Endpoint ---
    try {
      const responsePCA = await fetch(
        "http://127.0.0.1:5000/extract-pca-embeddings",
        {
          method: "POST",
        }
      );
      if (!responsePCA.ok) {
        const errorData = await responsePCA.json();
        console.error("Error from PCA extraction endpoint:", errorData);
      } else {
        const pcaResults = await responsePCA.json();
        console.log("PCA results:", pcaResults);

        // For each PCA embedding result, insert it into the database.
        for (const result of pcaResults) {
          const { data_point_id, pca_embedding } = result;
          const { data: pcaData, error: pcaError } = await supabase
            .from("pca_embeddings")
            .upsert({ data_point_id: data_point_id, embedding: pca_embedding });

          if (pcaError) {
            console.error(
              `Error inserting PCA embedding for data_point_id ${data_point_id}:`,
              pcaError
            );
          } else {
            console.log(
              `PCA embedding inserted for data_point_id ${data_point_id}`
            );
          }
        }
      }
    } catch (err) {
      console.error("Error calling PCA extraction endpoint:", err);
    }

    triggerRefresh();
  };

  // If project is null or undefined
  if (!localProject) {
    return (
      <div className="project-detail">
        <p>No project selected.</p>
        <button onClick={onBack}>Back to Projects</button>
      </div>
    );
  }

  return (
    <div className="project-detail">
      <header className="project-detail-header">
        <div className="header-top">
          <button className="header-top desktop-only" onClick={onBack}>
            Back to Projects
          </button>
          {isEditing ? (
            // When editing, show an input field for the project name.
            <input
              type="text"
              value={editedName}
              onChange={handleChange}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            // Otherwise, show the project name as a clickable element.
            <h2 onClick={handleEdit} style={{ cursor: "pointer" }}>
              {localProject.name}
            </h2>
          )}
          {updateError && <p className="error-message">{updateError}</p>}
        </div>
        <div className="header-controls">
          {/* <span><strong>Model:</strong> {project.llm}</span> */}
          <div>
            <button onClick={handleDatasetClick}>Dataset</button>
            <button onClick={() => setIs3D((prev) => !prev)}>
              {is3D ? "3D" : "2D"}
            </button>
          </div>
        </div>
      </header>

      <button className="back-button mobile-only" onClick={onBack}>
        Back to Projects
      </button>

      <div className="scatterplot-area">
        {/* {is3D ? "3D Scatter Plot" : "2D Scatter Plot"} */}
        <ScatterPlot refreshToken={refreshToken} />
      </div>

      <input
        type="file"
        multiple
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default ProjectDetail;
