const fs = require('fs');

// Read the file
const content = fs.readFileSync('app/admin/AdminDashboardClient.tsx', 'utf8');

// Split into lines
const lines = content.split('\n');

// Track function declarations and their positions
const functionDeclarations = [];
let inFunction = false;
let functionStart = -1;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check for function declarations
  if (line.includes('const loadDashboardData = async () => {') || 
      line.includes('const loadRecentActivity = async () => {')) {
    if (inFunction) {
      // End previous function
      functionDeclarations.push({ start: functionStart, end: i - 1, name: 'previous' });
    }
    inFunction = true;
    functionStart = i;
    braceCount = 0;
  }
  
  if (inFunction) {
    // Count braces to find function end
    for (const char of line) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }
    
    if (braceCount === 0 && line.includes('};')) {
      // Function ended
      functionDeclarations.push({ start: functionStart, end: i, name: lines[functionStart] });
      inFunction = false;
    }
  }
}

// Find duplicates and remove them
const seenFunctions = new Set();
const linesToRemove = new Set();

for (const func of functionDeclarations) {
  const funcName = func.name.includes('loadDashboardData') ? 'loadDashboardData' : 
                   func.name.includes('loadRecentActivity') ? 'loadRecentActivity' : 'other';
  
  if (seenFunctions.has(funcName)) {
    // This is a duplicate, mark for removal
    for (let i = func.start; i <= func.end; i++) {
      linesToRemove.add(i);
    }
  } else {
    seenFunctions.add(funcName);
  }
}

// Create new content without duplicate lines
const newLines = lines.filter((_, index) => !linesToRemove.has(index));

// Write the cleaned file
fs.writeFileSync('app/admin/AdminDashboardClient.tsx', newLines.join('\n'));

console.log('Cleaned duplicate functions from AdminDashboardClient.tsx');
console.log('Removed lines:', Array.from(linesToRemove).sort((a, b) => a - b));
