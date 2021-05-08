const electron = require("electron");
const cb = require("copy-paste");
const { spawn } = require("child_process");

const { app, BrowserWindow, ipcMain, dialog } = electron;


winPreferences = {
 // frame: false,
  background: "transparent",
  webPreferences:{nodeIntegration:true}
}

app.on("ready", ()=>{
  
  var mainWindow = new BrowserWindow(winPreferences)
  mainWindow.setMinimumSize(810,350)
  mainWindow.loadURL(`file://${__dirname}/app/home.html`)
  mainWindow.on("closed", ()=> app.quit())


  // File Picker
  ipcMain.on("filepicker", (e, args) => {

    switch(args.type){

      case "open":
        dialog.showOpenDialog(mainWindow, { title: args.title, properties: [args.file ? "openFile" : "openDirectory"]}).then(result => {
          if(result.filePaths.length > 0)
            e.sender.send(`filepicker:${args.id}`, result.filePaths[0])
        });
        break;
    }
  });

  // Downloader
  ipcMain.on("download", (e) => {
    
    url = cb.paste();
    console.log(`Downloading ${url}`)

    const downloader = spawn("python", ["dl_agent.py", url]);

    downloader.stdout.on("data", data => {
    console.log(`'${data}'`)
    });

  });

  ipcMain.on("toggleListener", e => {
    const listener = spawn("python", ["listener.py"]);
    listener.stdout.on("data", data => {
      
    });
  });




  // Window Events
  ipcMain.on("window:close", ()=> app.quit());

  ipcMain.on("window:minimize", ()=> mainWindow.minimize());

  ipcMain.on("window:maximize", ()=>{
    if(mainWindow.isMaximized()){
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  });

});