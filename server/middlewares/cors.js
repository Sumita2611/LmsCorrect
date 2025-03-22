// CORS middleware for Vercel serverless functions
const allowCors = (fn) => async (req, res) => {
  // Set CORS headers - using origin reflection instead of * when using credentials
  const origin = req.headers.origin || "*";

  // If we have an origin header, use it (for credentials mode)
  res.setHeader("Access-Control-Allow-Origin", origin);

  // Allow all methods and headers
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cache-Control, Pragma, Expires, Origin"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Extended max age for OPTIONS preflight caching
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Continue with the actual request handler
  try {
    return await fn(req, res);
  } catch (error) {
    console.error("Error in serverless function:", error);
    // If an error hasn't been handled by the function, return a 500
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }
};

export default allowCors;
