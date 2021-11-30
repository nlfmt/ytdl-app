const electron = require("electron");
const { app, BrowserWindow, ipcMain, dialog, shell } = electron;

const fs = require("fs");
const cb = require("copy-paste");
const { spawn, exec } = require("child_process");



winPreferences = {
  frame: false,
  background: "transparent",
  webPreferences:{nodeIntegration:true, contextIsolation: false},
  width: 1000,
  height: 580
}


app.on("ready", () => {
  
  var mainWindow = new BrowserWindow(winPreferences)
  mainWindow.setMinimumSize(770,360)
  mainWindow.loadURL(`file://${__dirname}/app/home.html`)
  


  mainWindow.on("closed", () => app.quit())


  var listener;


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
  function download(url, origin){

    origin.send("download:new", url)

    const downloader = spawn("python", ["util/dl_agent.py", url]);
    
    downloader.stdout.on("data", data => {
      origin.send(`state:${url}`, String(data))
    });
    downloader.stderr.on("data", err => {
      console.log("stderr-data", String(err));

      let error;

      if(String(err).includes("not a valid URL.")){
        error = "URLError";
      } else {
        error = "Error";
      }

      origin.send(`state:${url}`, `abort ${error}`);
    });



  }


  // Directly download currently copied URL
  ipcMain.on("download", (e) => {

    download(cb.paste(), e.sender);

  });


  // Toggle a listener to directly download on URL copy
  ipcMain.on("listener:toggle", (e) => {

    // Kill Listener
    if (listener) {
      listener.kill();
      listener = undefined;
      return;
    }
    
    // Spawn new Listener
    listener = spawn("python", ["util/listener.py"]);

    // Connect Listener output to download
    listener.stdout.on("data", url => {
      download(String(url), e.sender)
    });

  });


  ipcMain.on("storage:save", (e, data) => {

    fs.writeFile("./datastorage", JSON.stringify(data), "utf8", function(){})
    // console.log(JSON.stringify(data))

  });
  

  ipcMain.on("storage:load", (e) => {

    fs.readFile("./datastorage", "utf8", (err, data) => {

      if (err || data.length == 0) return;
      e.sender.send("storage:data", JSON.parse(data));

    });
  });

  ipcMain.on("shell:openlink", (e, link) => {
    shell.openExternal(link);
    console.log("link")
  });

  ipcMain.on("shell:openfile", (e, path) => {
    console.log("path");
    // shell.openItem(path);
    shell.openPath(path);
  });

  ipcMain.on("shell:showfile", (e, path) => {
    console.log("Running: ", `explorer.exe /select,"${path}"`);
    let exp = exec(`explorer.exe /select,"${path}"`);
    exp.stdout.on("data", (d)=>console.log(d));
    exp.stderr.on("data", (d)=>console.log(d));
  });

  ipcMain.on("fs:delete", (e, path) => {
    fs.unlink(path, ()=>{});
  });




  // Window Events
  ipcMain.on("window:close", () => app.quit() );

  ipcMain.on("window:minimize", () => mainWindow.minimize());

  ipcMain.on("window:maximize", () => {
    if(mainWindow.isMaximized()){
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  });

});