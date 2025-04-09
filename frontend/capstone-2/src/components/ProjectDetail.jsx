import React, { useEffect, useRef, useState } from "react";
import supabase from "./Supabase";
import "../styles/ProjectDetail.css";

function ProjectDetail({ project, onBack, onProjectUpdate }) {
  const fileInputRef = useRef(null);
  const [localProject, setLocalProject] = useState(project);
  const [is3D, setIs3D] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project ? project.name : "");
  const [updateError, setUpdateError] = useState("");

  // If the passed project prop changes (e.g., on refresh), update localProject
  useEffect(() => {
    setLocalProject(project);
    setEditedName(project ? project.name : "");
  }, [project]);

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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validImageTypes = ["image/jpeg", "image/png", "image/gif"]; // Add or adjust types based on what CLIP and PCA accept

    for (const file of files) {
      // Check the file's MIME type
      if (!validImageTypes.includes(file.type)) {
        console.error(`File ${file.name} is not a supported image type.`);
        continue; // Skip processing for this file
      }

      // Create a FormData instance to hold the image file.
      const formData = new FormData();
      formData.append("file", file);

      try {
        // Change the URL to match your backend environment.
        // For local testing, you might use: "http://localhost:5000/extract-embeddings"
        // For production, use your deployed URL.
        const response = await fetch(
          "https://photograph-4lb1.onrender.com/extract-embeddings",
          {
            method: "POST",
            body: formData,
          }
        );

        // Check for errors in the response.
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error from embeddings endpoint:`, errorData);
          continue;
        }

        // Parse the JSON result.
        const result = await response.json();
        console.log(`Embeddings for ${file.name}:`, result);

        // After receiving the embeddings result:
        const { clip_embedding, pca_embedding } = result;

        // Insert the CLIP embedding; using project.id as the data_point_id.
        const { data: clipData, error: clipError } = await supabase
          .from("clip_embeddings")
          .insert({ data_point_id: project.id, embedding: clip_embedding })
          .execute();

        if (clipError) {
          console.error("Error inserting clip embedding:", clipError);
          continue;
        }

        // Insert the PCA embedding. Use project.id (instead of dataPointId) and the correct variable name.
        const { data: pcaData, error: pcaError } = await supabase
          .from("pca_embeddings")
          .insert({ data_point_id: project.id, embedding: pca_embedding })
          .execute();

        if (pcaError) {
          console.error("Error inserting PCA embedding:", pcaError);
          continue;
        }
        
      } catch (err) {
        console.error("Error extracting embeddings:", err);
      }
    }
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
        {is3D ? "3D Scatter Plot" : "2D Scatter Plot"}
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
