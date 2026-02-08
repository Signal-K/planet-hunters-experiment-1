const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktopHost", {
  platform: process.platform,
  versions: process.versions,
});
