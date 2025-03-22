// api.js - Simplified API utilities with CORS compatibility
import { useAuth } from "@clerk/clerk-react";

// Base URL from environment
const API_URL = import.meta.env.VITE_API_URL;

/**
 * Simplified fetch wrapper that handles common CORS issues
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - JSON response
 */
export const fetchWithCors = async (endpoint, options = {}) => {
  try {
    // Default options optimized for CORS
    const defaultOptions = {
      method: "GET",
      mode: "cors",
      credentials: "omit", // Important for cross-domain
      cache: "no-cache",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    // Merge options
    const fetchOptions = { ...defaultOptions, ...options };

    // Add authorization if token provided
    if (options.token) {
      fetchOptions.headers.Authorization = `Bearer ${options.token}`;
      delete fetchOptions.token;
    }

    // Construct URL - append token to query params for backup auth method
    let url = `${API_URL}${endpoint}`;
    if (options.token && !url.includes("?")) {
      url += `?token=${encodeURIComponent(options.token)}`;
    } else if (options.token) {
      url += `&token=${encodeURIComponent(options.token)}`;
    }

    console.log(`[API] Fetching ${url}`, fetchOptions);

    // Make request
    const response = await fetch(url, fetchOptions);

    console.log(`[API] Response status:`, response.status, response.statusText);
    console.log(
      `[API] Response headers:`,
      Object.fromEntries([...response.headers.entries()])
    );

    // Handle errors
    if (!response.ok) {
      console.error(`[API] Error: ${response.status} - ${response.statusText}`);

      // For debugging, try to get the response content
      try {
        const errorText = await response.text();
        console.error(
          "[API] Error response body:",
          errorText.substring(0, 200) + "..."
        );

        // If it's an HTML response, it's likely a login page or auth error
        if (
          errorText.includes("<!DOCTYPE html>") ||
          errorText.includes("<html>")
        ) {
          console.error(
            "[API] Received HTML response instead of JSON - likely authentication issue"
          );
        }
      } catch (e) {
        console.error("[API] Could not read error response:", e);
      }

      throw new Error(`API error: ${response.status}`);
    }

    // Parse JSON
    const data = await response.json();
    console.log("[API] Success response:", data);
    return data;
  } catch (error) {
    console.error("[API] Fetch error:", error);
    throw error;
  }
};

/**
 * Hook to use API with authentication
 */
export const useApi = () => {
  const { getToken } = useAuth();

  /**
   * Authenticated API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   */
  const authFetch = async (endpoint, options = {}) => {
    let token = null;

    try {
      // Try to get the token but don't fail if it's not available
      try {
        token = await getToken();
        console.log("Retrieved auth token:", token ? "✓" : "✗");
      } catch (tokenError) {
        console.warn("Failed to get auth token:", tokenError);
        // Continue without token - the server may return mock data
      }

      // Continue with the request even if token retrieval failed
      return fetchWithCors(endpoint, { ...options, token });
    } catch (error) {
      console.error("Auth fetch error:", error);
      throw error;
    }
  };

  return { authFetch, fetchWithCors };
};

export default useApi;
