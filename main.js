 // Handle setupevents as quickly as possible
 const setupEvents = require('./installers/setupEvents')
 if (setupEvents.handleSquirrelEvent()) {
    // Squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
 }

const { app, BrowserWindow, dialog,  Menu, ipcMain, shell } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const imageDataURI = require("image-data-uri");

// Set environment
process.env.NODE_ENV = "production";

const isDev = process.env.NODE_ENV !== "production" ? true : false;
const isMac = process.platform === "darwin" ? true : false;

let mainWindow;
let aboutWindow;
let settingsWindow;

let userPreferences;
let defaultPreferences = {
  path: `${os.homedir}`,
  filename: "Use original",
  suffix: "None",
  showinfolder: true 
};

//#region BrowserWindow initializers
function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "Autocrop",
    width: 1200,
    height: 1000,
    backgroundColor: "#f5f5f5",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: `${(__dirname)}/assets/icons/icon_256x256.png`  
  });
  
  if(isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  mainWindow.loadFile("./app/index.html");
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: "Autocrop",
    width: 512,
    height: 512,
    resizable: false,
    backgroundColor: "#f5f5f5",
    parent: "mainWindow",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: `${(__dirname)}/assets/icons/icon_256x256.png`  
  });

  aboutWindow.removeMenu();
  aboutWindow.loadFile("./app/about.html");
}

function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    title: "User Preferences",
    width: 700,
    height: 600,
    resizable: false,
    backgroundColor: "#f5f5f5",
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: `${(__dirname)}/assets/icons/icon_256x256.png`  
  });

  settingsWindow.removeMenu();
  settingsWindow.loadFile("./app/settings.html")
    .then(() => {
      // Send current user preferences to settings window
      settingsWindow.webContents.send("settings:userpreferences", userPreferences);
    })
    .catch((err) => console.log(err));
}
//#endregion

// Create Main Window when App is ready
app.on("ready", () => {
  createMainWindow();
  loadUserPreferences();

  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);
  
  mainWindow.on("ready", () => mainWindow = null);
}); 

//#region Main Menu
const menu = [
  ...(isMac ? [{ 
      label: app.name,
      submenu: [
        { label: "About" },
        { click: createAboutWindow }
      ]
    }] : []),
  { 
    label: "Menu",
    submenu: [
      { label: "Preferences", click: createSettingsWindow },
      { label: "About", click: createAboutWindow },
      { type: "separator" },
      { role: "quit" }
    ]
  },
  ...(isDev ? [
    {
      label: "Dev",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "toggleDevtools" }
      ]
    }
  ] : [])
];
//#endregion

//#region INTER PROCESS COMMUNICATIONS

// Export image
ipcMain.on("image:data", (e, imageData) => {
  // Setting output location from user preferences
  let outputPath = `${userPreferences.path}\\${exportFileName}.jpg`;
  // Write imagedata to file
  imageDataURI.outputFile(imageData, outputPath)
    .then(res => { 
      if(userPreferences.showinfolder === true) {
        shell.openPath(userPreferences.path);
      }
      mainWindow.webContents.send("alert:imagedone", `Image exported to ${res}`);
      if(isDev) {
        console.log("Image exported to " + res);
      }
    }).catch(err => console.log(err));   
});

// Get source file name/target dimensions and set the export file name string
ipcMain.handle("settings:sourcefilename",  (e, data) => {  
  
  if(userPreferences.filename === "Use original") {
    // Cut the extension from file name
    let pos = data.sourceFileName.lastIndexOf(".");
    exportFileName = data.sourceFileName.substring(0, pos);
  } else {
    exportFileName = userPreferences.filename;
  }

  // Add suffix
  if(userPreferences.suffix === "Dimensions") {
    exportFileName += data.suffix;
  }

  return ` ${userPreferences.path}\\${exportFileName}.jpg`;
});

// Set the export path
ipcMain.handle("settings:setexportpath", async () => {  
    let exportPath = new Promise((resolve, reject) => {
      dialog.showOpenDialog(settingsWindow, { title: "Choose export location", properties: ["openDirectory"]})
        .then(res => resolve(res.filePaths))
        .catch(err => reject(err));
    });

    let result = await exportPath;
    return result; // Send export path back to settingsWindow
});

ipcMain.handle("settings:outputinfo", () => {
  return ` ${userPreferences.path}`;
});

// Apply user preferences
ipcMain.on("settings:applypreferences", (e, appliedUserPreferences) => {
  userPreferences = appliedUserPreferences;
  saveUserPreferences();
  settingsWindow.close();
});

// Close settings window
ipcMain.on("settings:closewindow", () => {
  settingsWindow.close();
});

// Open links in default browser
ipcMain.on("aboutwindow:openlink", (e, link) => {
  shell.openExternal(link);
});
//#endregion

//#region FILE I/O
function saveUserPreferences() {
  let settingsData = JSON.stringify(userPreferences, null, 2);

  fs.writeFile("settings.json", settingsData, (err) => {
    if (err) console.log(err);
    if(isDev) {
      console.log("Settings written to settings.json.");
    }
    mainWindow.webContents.send("alert:settingssaved", { 
      msg: "User preferences saved to settings.json.", 
      outputinfo: `${userPreferences.path}` 
    });
  });
}
  
function loadUserPreferences() {
  if(fs.access("settings.json", fs.F_OK, (err) => {
    if(err) {
      // If file not found set userPreferences to defaultPreferences
      if(err.code === "ENOENT") {
        userPreferences = defaultPreferences;
        return;
      } else {
        console.log(err);
        return;
      }
    }
    fs.readFile("settings.json", (err, settingsData) => {
      if(err) {
        console.log(err);
      }
      userPreferences = JSON.parse(settingsData);
      if(isDev) { 
        console.log("User preferences:");
        console.log(userPreferences);
      }
    });
  }));
}
//#endregion

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit()
  }
}); 

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
});
