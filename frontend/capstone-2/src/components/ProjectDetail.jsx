import React, { useEffect, useRef, useState } from "react";
import supabase from "./Supabase";
import imageCompression from "browser-image-compression";

import ScatterPlot from "./Scatterplot";
import QueryPanel from "./QueryPanel";

import "../styles/ProjectDetail.css";

const EMBED_AND_PCA_API = "https://photograph-production-4f29.up.railway.app/embed-and-pca-batch";
// const EXTRACT_PCA_EMBEDDING_API = "https://photograph-production-4f29.up.railway.app/extract-pca-embeddings";

// const EMBED_AND_PCA_API = "http://127.0.0.1:5000/embed-and-pca-batch";
const EXTRACT_PCA_EMBEDDING_API =
  "http://127.0.0.1:5000/extract-pca-embeddings";

// Toan's API
// const EXTRACT_CLIP_EMBEDDING_API = "http://73.106.25.87:52847/extract-clip-embeddings"
// const EXTRACT_PCA_EMBEDDING_API = "http://73.106.25.87:52847/extract-pca-embeddings"

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
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    // 0) Count how many images already exist in this project
    let existingCount = 0;
    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("data_points")
        .select("id", { count: "exact" })
        .eq("project_id", project.id);
      if (existingError) throw existingError;
      existingCount = existingRows?.length ?? 0;
    } catch (err) {
      console.error("Could not check existing images:", err);
      window.confirm("A new project requires at least 3 images.")
      return
    }

    // Filter out non-image files
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/jpg"];
    const files = rawFiles.filter((f) => validTypes.includes(f.type));
    if (!files.length) {
      console.warn("No supported images selected");
      return;
    }

    // 1) If project is brand new and they’re uploading fewer than 3 images, block them
    if (existingCount === 0 && files.length < 3) {
      alert(
        "Please start your project by uploading at least 3 images at once."
      );
      return;
    }

    const items = [];

    for (const file of files) {
      if (!validTypes.includes(file.type)) continue;

      // 1) compress
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      // 2) upload to Supabase Storage
      const path = `${project.id}/${Date.now()}_${compressed.name}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(path, compressed, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        console.error("Storage upload failed:", uploadError);
        continue;
      }
      const { data: urlData, error: urlError } = supabase.storage
        .from("images")
        .getPublicUrl(path);
      if (urlError) {
        console.error("getPublicUrl failed:", urlError);
        continue;
      }
      const publicUrl = urlData.publicUrl;

      // 3) insert into data_points
      const { data: dpRows, error: dpError } = await supabase
        .from("data_points")
        .insert({
          project_id: project.id,
          label: file.name,
          image_url: publicUrl,
        })
        .select("id");
      if (dpError || !dpRows?.length) {
        console.error("Inserting data_point failed:", dpError);
        continue;
      }

      items.push({
        data_point_id: dpRows[0].id,
        image_url: publicUrl,
      });
    }

    if (items.length === 0) {
      console.warn("No valid images to process");
      return;
    }

    const batchResp = await fetch(EMBED_AND_PCA_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: project.id,
        items,
      }),
    });

    const text = await batchResp.text();
    console.log(
      "Batch embed+PCA status:",
      batchResp.status,
      batchResp.statusText
    );
    console.log("Batch embed+PCA body:", text);

    if (!batchResp.ok) {
      throw new Error(`Batch failed (${batchResp.status}): ${text}`);
    }

    // 5) trigger your scatterplot to refetch
    triggerRefresh();
  };

  // Toggle between 2D and 3D
  const handleToggle3D = () => {
    setIs3D((prev) => !prev);
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
            <button onClick={handleToggle3D}>{is3D ? "3D" : "2D"}</button>
          </div>
        </div>
      </header>

      <button className="back-button mobile-only" onClick={onBack}>
        Back to Projects
      </button>

      <div className="visualization-container">
        <div className="scatterplot-box">
          <ScatterPlot
            is3D={is3D}
            refreshToken={refreshToken}
            projectId={localProject.id}
          />
        </div>
        <div className="query-panel-box">
          <QueryPanel projectId={localProject.id} />
        </div>
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
