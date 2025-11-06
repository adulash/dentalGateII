/**
 * Convert CSV files to JSON for migration
 * 
 * Usage:
 * node scripts/csv-to-json.js data/Users.csv
 * 
 * Or convert all CSVs in data folder:
 * node scripts/csv-to-json.js data/*.csv
 */

const fs = require("fs");
const path = require("path");

function csvToJson(csvFilePath) {
  const csvData = fs.readFileSync(csvFilePath, "utf8");
  const lines = csvData.split("\n");
  
  if (lines.length < 2) {
    console.log(`Skipping empty file: ${csvFilePath}`);
    return;
  }
  
  // Parse header
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  
  // Parse rows
  const jsonArray = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const obj = {};
    
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    
    jsonArray.push(obj);
  }
  
  // Write JSON file
  const jsonFilePath = csvFilePath.replace(".csv", ".json");
  fs.writeFileSync(jsonFilePath, JSON.stringify(jsonArray, null, 2));
  console.log(`✓ Converted ${csvFilePath} → ${jsonFilePath} (${jsonArray.length} records)`);
}

// Get file paths from command line arguments
const files = process.argv.slice(2);

if (files.length === 0) {
  console.log("Usage: node csv-to-json.js <csv-file> [<csv-file2> ...]");
  console.log("Example: node csv-to-json.js data/Users.csv data/Orders.csv");
  process.exit(1);
}

files.forEach((file) => {
  if (fs.existsSync(file)) {
    csvToJson(file);
  } else {
    console.error(`File not found: ${file}`);
  }
});

console.log("\n✓ Conversion complete!");

