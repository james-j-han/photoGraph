import React, { useEffect, useRef, useState } from 'react';
import supabase from './Supabase';
import '../styles/ProjectDetail.css';

function ProjectDetail({ project, onBack, onProjectUpdate }) {
  const fileInputRef = useRef(null);
  const [localProject, setLocalProject] = useState(project);
  const [is3D, setIs3D] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(project ? project.name : '');
  const [updateError, setUpdateError] = useState('');

  // If the passed project prop changes (e.g., on refresh), update localProject
  useEffect(() => {
    setLocalProject(project);
    setEditedName(project ? project.name : '');
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
        .from('projects')
        .update({ name: editedName })
        .eq('id', localProject.id)
        .select('id, name'); // explicitly select updated fields

      if (error) {
        setUpdateError(error.message);
        console.error('Error updating project name:', error);
      } else if (data && data.length > 0) {
        // Update the local state with the updated project
        setLocalProject(data[0]);
        setIsEditing(false);
        // Optionally, notify the parent to update its list with the new project data
        if (onProjectUpdate) onProjectUpdate(data[0]);
      }
    } catch (err) {
      setUpdateError(err.message);
      console.error("Error in handleSave:", err);
    }
  };

  // Optionally, allow saving on Enter or on blur from the input field.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
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

    // For each file, process the embeddings
    for (const file of files) {
      // For demonstration, simply log the file.
      // In practice, you would send the file to your ML model or process it locally.
      console.log('Processing file:', file.name);

      // Example: Call a function to extract embeddings (pseudo-code)
      // const { clipEmbeddings, pcaEmbeddings } = await extractEmbeddings(file);

      // Then, insert these embeddings into the corresponding Supabase table.
      // For instance:
      // await supabase.from('clip_embeddings').insert({ data_point_id: project.id, embedding: clipEmbeddings }).execute();
      // await supabase.from('pca_embeddings').insert({ data_point_id: project.id, embedding: pcaEmbeddings }).execute();
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
        <div className='header-top'>
          <button className='header-top desktop-only' onClick={onBack}>Back to Projects</button>
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
            <h2 onClick={handleEdit} style={{ cursor: 'pointer' }}>
              {localProject.name}
            </h2>
          )}
          {updateError && <p className="error-message">{updateError}</p>}
        </div>
        <div className="header-controls">
          {/* <span><strong>Model:</strong> {project.llm}</span> */}
          <div>
            <button onClick={handleDatasetClick}>Dataset</button>
            <button onClick={() => setIs3D(prev => !prev)}>
              {is3D ? '3D' : '2D'}
            </button>
          </div>
        </div>
      </header>

      <button className="back-button mobile-only" onClick={onBack}>
        Back to Projects
      </button>

      <div className="scatterplot-area">
        {is3D ? '3D Scatter Plot' : '2D Scatter Plot'}
      </div>

      <input
        type="file"
        multiple
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}

export default ProjectDetail;