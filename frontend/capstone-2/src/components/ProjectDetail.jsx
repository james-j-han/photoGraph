import React, { useEffect, useRef, useState } from "react";
import supabase from "./Supabase";
import imageCompression from "browser-image-compression";

import ScatterPlot from "./Scatterplot";
import QueryPanel from "./QueryPanel";

import "../styles/ProjectDetail.css";

const EXTRACT_CLIP_EMBEDDING_API = "https://photograph-production-4f29.up.railway.app/extract-clip-embeddings";
const EXTRACT_PCA_EMBEDDING_API = "https://photograph-production-4f29.up.railway.app/extract-pca-embeddings";

// const EXTRACT_CLIP_EMBEDDING_API = "http://127.0.0.1:5000/extract-clip-embeddings";
// const EXTRACT_PCA_EMBEDDING_API = "http://127.0.0.1:5000/extract-pca-embeddings";

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

  // Combined file processing function:
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

    // Process each file one by one.
    for (const file of files) {
      // Validate file type.
      if (!validImageTypes.includes(file.type)) {
        console.error(`File ${file.name} is not a supported image type.`);
        continue;
      }

      try {
        // --- Step 1: Compress the Image ---
        const options = {
          maxSizeMB: 0.1, // Target a small file (adjust as needed)
          maxWidthOrHeight: 800, // Maximum dimensions (adjust as needed)
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        console.log(
          `Compressed file size for ${file.name}: ${compressedFile.size} bytes`
        );

        // --- Step 2: Upload the Compressed Image to the Bucket ---
        const bucketName = "images"; // Your Supabase bucket name
        const filePath = `${project.id}/${Date.now()}_${compressedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, compressedFile, {
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) {
          console.error("Error uploading image:", uploadError);
          continue;
        }
        const { data, error: urlError } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
          
        if (urlError) {
          console.error("Error getting public URL:", urlError);
          continue;
        }
        const publicURL = data.publicUrl;
        console.log("Uploaded image public URL:", publicURL);

        // --- Step 3: Insert a New Data Point with the Image URL ---
        const { data: dpData, error: dpError } = await supabase
          .from("data_points")
          .insert({
            project_id: project.id,
            label: file.name, // Use file name as label (or adjust as needed)
            image_url: publicURL, // Link to the stored image
          })
          .select();
        if (dpError) {
          console.error("Error creating data point:", dpError);
          continue;
        }
        const newDataPointId = dpData[0].id;
        console.log("New data point created with ID:", newDataPointId);

        // --- Step 4: Extract CLIP Embedding (Optional) ---
        // Prepare a FormData payload for the compressed file.
        const formData = new FormData();
        formData.append("file", compressedFile);
        const responseClip = await fetch(
          EXTRACT_CLIP_EMBEDDING_API,
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
        // Assume the returned object has a field named clip_embedding.
        const { clip_embedding } = clipResults[0];
        console.log(`CLIP embedding for ${file.name}:`, clip_embedding);

        // --- Step 5: Insert the CLIP Embedding into the Database ---
        const { data: clipData, error: clipError } = await supabase
          .from("clip_embeddings")
          .insert({ data_point_id: newDataPointId, embedding: clip_embedding });
        if (clipError) {
          console.error("Error inserting CLIP embedding:", clipError);
          continue;
        }
        console.log(
          `CLIP embedding inserted for data_point_id ${newDataPointId}`
        );
      } catch (err) {
        console.error("Error processing file:", file.name, err);
      }
    } // End for loop

    // --- Step 6: Call the PCA Extraction Endpoint (if needed) ---
    try {
      const responsePCA = await fetch(
        EXTRACT_PCA_EMBEDDING_API,
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

        // For each PCA result, upsert into the pca_embeddings table.
        for (const result of pcaResults) {
          const { data_point_id, pca_embedding } = result;
          const { error: pcaError } = await supabase
            .from("pca_embeddings")
            .upsert({ data_point_id: data_point_id, embedding: pca_embedding });
          if (pcaError) {
            console.error(
              `Error upserting PCA embedding for data_point_id ${data_point_id}:`,
              pcaError
            );
          } else {
            console.log(
              `PCA embedding upserted for data_point_id ${data_point_id}`
            );
          }
        }
      }
    } catch (err) {
      console.error("Error calling PCA extraction endpoint:", err);
    }

    triggerRefresh();
  };

  // Toggle between 2D and 3D
  const handleToggle3D = () => {
    setIs3D(prev => !prev);
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
            <button onClick={handleToggle3D}>
              {is3D ? "3D" : "2D"}
            </button>
          </div>
        </div>
      </header>

      <button className="back-button mobile-only" onClick={onBack}>
        Back to Projects
      </button>

      <div className="visualization-container">
        <div className="scatterplot-box">
          <ScatterPlot is3D={is3D} refreshToken={refreshToken} projectId={localProject.id} />
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
