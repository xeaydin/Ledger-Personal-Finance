const { app } = require('electron');
console.log("App:", app);
if (app) {
  app.whenReady().then(() => { console.log("Ready!"); process.exit(0); });
} else {
  console.log("APP IS UNDEFINED!");
  process.exit(1);
}
