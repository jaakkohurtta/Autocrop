const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ipc", {
  // AboutWindow
    openExternal: (link) => { 
      ipcRenderer.send("main:openexternal", link);
    },
  // SettingsWindow
    applyPreferences: (prefs) => {
      ipcRenderer.send("settings:applypreferences", prefs);
    },
    cancelPreferences: () => {
      ipcRenderer.send("settings:cancelpreferences");
    },
    getPreferences: (prefs) => {
      ipcRenderer.on("settings:userpreferences", (event, ...args) => prefs(...args));
    },
    setExportPath: () => {
      ipcRenderer.send("settings:setexportpath")
    },
    getExportPath: (path) => {
      ipcRenderer.on("settings:getexportpath", (event, ...args) => path(...args));
    },
  // MainWindow
    exportImage: (data) => {
      ipcRenderer.send("main:exportimage", data);
    },
    setExportFileName: (data) => {
      ipcRenderer.send("main:setexportfilename", data);
    }, 
    updateExportInfo: (info) => {
      ipcRenderer.on("main:updateexportinfo", (event, ...args) => info(...args));
    },
    alertImageReady: (msg) => {
      ipcRenderer.on("alert:imageready", (event, ...args) => msg(...args));
    },
    alertSettingsSaved: (msg) => {
      ipcRenderer.on("alert:settingssaved", (event, ...args) => msg(...args));
    }
  }
);