// Script to add environment variables to Vercel
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Path to .env file
const envPath = path.join(__dirname, ".env");

// Read the .env file
const envContent = fs.readFileSync(envPath, "utf8");

// Parse the environment variables
const envVars = {};
envContent.split("\n").forEach((line) => {
  // Skip empty lines and comments
  if (!line || line.startsWith("#")) return;

  // Extract variable name and value
  const match = line.match(/^\s*([^=\s]+)\s*=\s*(.*?)\s*$/);
  if (match) {
    const [, name, value] = match;
    envVars[name] = value.replace(/^['"]|['"]$/g, ""); // Remove quotes if present
  }
});

console.log("Found environment variables:");
console.log(Object.keys(envVars).join(", "));
console.log("\nWARNING: This will add these variables to your Vercel project.");
console.log("Press Enter to continue or Ctrl+C to abort...");

// Wait for user confirmation
readline
  .createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  .question("", () => {
    // Add variables to Vercel
    Object.entries(envVars).forEach(([name, value]) => {
      try {
        console.log(`Adding ${name}...`);
        // Create a temporary file with the value
        const tempFilePath = path.join(__dirname, `temp_${name}`);
        fs.writeFileSync(tempFilePath, value);

        // Add to Vercel using the file
        execSync(`vercel env add ${name} < "${tempFilePath}"`, {
          stdio: "inherit",
        });

        // Clean up the temp file
        fs.unlinkSync(tempFilePath);
      } catch (error) {
        console.error(`Error adding ${name}: ${error.message}`);
      }
    });

    console.log("\nFinished adding environment variables.");
    console.log('Run "vercel --prod" to deploy with these variables.');
  });
