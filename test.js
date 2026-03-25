console.log("Hello from", process.versions.electron ? "Electron" : "Node", process.versions);
const electron = require('electron');
console.log("electron:", typeof electron, Object.keys(electron));
process.exit(0);
