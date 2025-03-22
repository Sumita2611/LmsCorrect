// Script to add environment variables to Vercel
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Wait for user confirmation
rl.question("", () => {
  // Add variables to Vercel
  for (const [name, value] of Object.entries(envVars)) {
    try {
      console.log(`Adding ${name}...`);
      // Create a temporary file with the value
      const tempFilePath = path.join(__dirname, `temp_${name}`);
      fs.writeFileSync(tempFilePath, value);

      // Add to Vercel using the file
      try {
        execSync(`vercel env add ${name} < "${tempFilePath}"`, {
          stdio: "inherit",
        });
      } catch (cmdError) {
        console.log(`Note: ${name} might already exist or there was an issue.`);
      }

      // Clean up the temp file
      fs.unlinkSync(tempFilePath);
    } catch (error) {
      console.error(`Error adding ${name}: ${error.message}`);
    }
  }

  console.log("\nFinished adding environment variables.");
  console.log('Run "vercel --prod" to deploy with these variables.');
  rl.close();
});
