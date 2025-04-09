import React, { useState } from "react";
import supabase from "./Supabase";

import "../styles/Register.css";

function Register({ onRegister }) {
  // const registerAPI = "https://photograph-4lb1.onrender.com/register";

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

  // Track success or error
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Sign up user via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Extract auth_id from the returned user object
      const auth_id = data.user?.id;
      if (!auth_id) {
        throw new Error("Failed to obtain auth_id");
      }

      const authUser = data.user;
      console.log("User signed up, metadata:", authUser.user_metadata);

      // Prepare payload for your backend registration endpoint
      const payload = {
        auth_id, // Include the auth_id from Supabase Auth
        first_name: formData.first_name,
        last_name: formData.last_name,
      };

      // Now register the user in your custom table via your backend API endpoint
      // const response = await fetch(registerAPI, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(payload),
      // });

      // if (!response.ok) {
      //   const errorData = await response.json();
      //   console.error("Server error message:", errorData)
      //   throw new Error(errorData.message || "Registration failed");
      // }

      setSuccess("Registration successful!");

      if (onRegister) {
        onRegister(authUser);
      }

    } catch (err) {
      console.error("Error caught:", err);
      setError(err.message);
    }
  };

  return (
    <div className="registration-container">
      <h2>Register</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="first_name">First Name</label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="last_name">Last Name</label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="register-button">
          Register
        </button>
      </form>
    </div>
  );
}

export default Register;
