const electron = require("electron");

const { ipcRenderer } = electron;

var listening = false;

function download(){
    ipcRenderer.send("download");
}

function toggleListener(){

    ipcRenderer.send("toggleListener");

    if (listening){
        document.querySelector("#toggleListener").innerHTML = "Start Listening";
    } else {
        document.querySelector("#toggleListener").innerHTML = "Stop Listening";
    }
    listening = !listening;
}
