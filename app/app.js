const electron = require("electron");

const { ipcRenderer, shell } = electron;


// DONE:
//  - save more often! (on state update)
//  - Add links, maybe refactor html elements to a's
//  - Add custom context menu with per element options (custom class etc, delete, convert)
//  - Add Sidebar
//
// TODO: 
//  - Connect Sidebar Buttons to pages
//  - Settings with Theme, video save location (specific for different formats)
//  - List-like appearrance where you can add new rules. Rules consist of an Regular expression? a save location and an filename template.
//  - Add Lower bar with Download and Lsitener buttons
//  - Add Descripütion html with uploader, likes etc
//  - Add Download class in index.js, to keep track of running downloads
//  - Add Capabilities to resume downloads? test if ypoutube-dl autoresumes if part file exists
//  - Cancel Downloads on app exit, prompt on app exit if still downloading
//  - Refactor and organize
//  - Add Sort dropdown (sort by date, length, add search ?)
//  - Bottom bar format dropdown



document.body.addEventListener('click', event => {

    if (event.target.tagName.toLowerCase() === 'a') {

      event.preventDefault();
      shell.openExternal(event.target.href);

    }
});

class SideBar {

    static opened = false;
    static hovered = false;

    static currentPage = document.querySelector(".downloads");

    // static timer = setTimeout(()=>{}, 0);

    static setup() {

        let sidebar = document.querySelector(".sidebar");

        sidebar.addEventListener("click", (e) => {
            if (e.target.classList.contains("sidebar")) SideBar.toggle()
        });

        // Connect Buttons

        sidebar.querySelector("#toggle-button").addEventListener("click", SideBar.toggle)

        sidebar.querySelector("#download-page").addEventListener("click", () => SideBar.showPage(".downloads"))
        sidebar.querySelector("#convert-page").addEventListener("click", () => SideBar.showPage(".convert"))
        sidebar.querySelector("#settings-page").addEventListener("click", () => SideBar.showPage(".settings"))
    }

    static close() {
        SideBar.opened = false;
        document.querySelector(".sidebar").classList.remove("opened");
    }

    static open() {
        SideBar.opened = true;
        document.querySelector(".sidebar").classList.add("opened");
    }

    static toggle() {

        // let target = e.target;
        // if (target.parentNode.classList.contains("sidebar-element")) target = target.parentNode;

        // console.log(e.target, target, target.classList)

        // if (!( e || )) return;

        if(SideBar.opened) {
            SideBar.close();
        } else {
            SideBar.open();
        }
    }

    static showPage(className) {
        SideBar.currentPage.classList.add("hidden");
        SideBar.currentPage = document.querySelector(className);
        SideBar.currentPage.classList.remove("hidden")
    }
}

SideBar.setup();



var listening = false;

function download(){
    ipcRenderer.send("download");
}

function toggleListener(){

    ipcRenderer.send("listener:toggle");

    if (listening){
        document.querySelector("#toggleListener").innerHTML = "Start Listening";
    } else {
        document.querySelector("#toggleListener").innerHTML = "Stop Listening";
    }
    listening = !listening;
}


class CtxMenu {

    // Create Menu HTML
    static menu = function(){

        let menu = document.createElement("ul");

        menu.classList.add("context-menu");
        document.body.appendChild(menu);

        menu.addEventListener("mouseenter", () => CtxMenu.mouseover = true);

        menu.addEventListener("mouseleave", () => {

            CtxMenu.mouseover = false;
            clearTimeout(CtxMenu.timer);

            CtxMenu.timer = setTimeout(() => {
                if (CtxMenu.mouseover || !CtxMenu.visible) return;
                CtxMenu.hide()
                console.log("end")
            }, 800);
        });
        
        return menu;

    }();


    static visible = false;
    static mouseover = false;

    static timer = setTimeout(()=>{}, 0);


    // Show Menu with opts
    static show(opts) {

        let menu = this.menu;

        // Clear li's
        menu.innerHTML = "";

        // Create new li's from template
        for ( const item of opts.items ) {

            // Add separator
            if (item === null) {

                let sep = document.createElement("li");

                sep.classList.add("separator");
                menu.appendChild(sep);
                continue;
            }


            // Add Option with callback
            const [ text, action ] = item;

            let li = document.createElement("li");

            li.innerText = text;
            li.classList.add("context-menu-item");
            li.addEventListener("click", action);

            menu.appendChild(li);
        }

        // Calculate position and scale origin
        const { x, y, transformOrigin } = this.calcPosition(opts.x, opts.y);

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.transformOrigin = transformOrigin;


        menu.classList.add("visible");
        this.visible = true;
    }

    static hide() {
        this.menu.classList.remove("visible")
        this.visible = false;
    }

    static calcPosition(x, y) {

        let offset = 5;

        let width = this.menu.clientWidth;
        let height = this.menu.clientHeight;

        let transformOrigin = "top";


        // Test if Menu is too large to be displayed below
        if (y > window.innerHeight - height) {
            y -= height - offset;
            transformOrigin = "bottom";
        } else {
            y -= offset;
        }

        // Test if Menu is too large to be displayed to the right
        if (x > window.innerWidth - width) {
            x -= width - offset;
            transformOrigin += " right";
        } else {
            x -= offset;
            transformOrigin += " left";
        }

        return { x, y, transformOrigin };
    }

}


document.addEventListener("click", (e) => {
    CtxMenu.hide();
});

document.querySelector(".downloads").addEventListener("scroll", (e) => {
    if (CtxMenu.visible)
        CtxMenu.hide();
})

class Settings {

    static getConfig() {

        settings_elem = document.querySelector(".settings");
        const config = {};

        for (const input in settings_elem.childNodes) {
            config[input.id] = input.value;
        }

        return config;
    }
}

class DownloadManager {

    static downloads = [];

    // Add to download Array
    static add(download) {
        DownloadManager.downloads.unshift(download);
    }

    // Send Data to save | Create Downloads from data
    static save() {
        var data = [];
        for (const dl of DownloadManager.downloads) {
            data.push(dl.getInfo())
        }
        ipcRenderer.send("storage:save", data);
    }

    static load(data) {
        for (const dlData of data) {
            DownloadManager.add( new Download("", dlData) );
        }
        DownloadManager.sortByDate()
    }

    // Sorting
    static sortByDate(descending = true) {
        DownloadManager.downloads.sort((a,b) => {
            return new Date(b.date) - new Date(a.date);
        });

        if (!descending) DownloadManager.downloads.reverse();

        for (const dl of DownloadManager.downloads) {
            dl.html.remove()
            document.querySelector(".downloads").appendChild(dl.html);
        }

    }

    static sortByDuration(descending = true) {
        DownloadManager.downloads.sort((a,b) => {
            return b.duration - a.duration;
        });

        if (!descending) DownloadManager.downloads.reverse();

        for (const dl of DownloadManager.downloads) {
            dl.html.remove()
            document.querySelector(".downloads").appendChild(dl.html);
        }
    }
}


class Download {

    constructor(url, data={}) {
        this.url = url;
        this.state = "Initializing";
        this.date = new Date().toISOString();

        this.setHtml();

        if (Object.keys(data).length === 0) {
            ipcRenderer.on(`state:${url}`, (e, state) => this.update(state) );
        } else {
            Object.assign(this, data);
            this.updateHTML();
            this.setState(this.state);
        }

        let downloads = document.querySelector(".downloads");

        downloads.insertBefore(this.html, downloads.childNodes[1].nextSibling);
        this.setupCtxMenu();
    }

    update(state) {

        console.log(state)
        let [ type, ...val ] = state.split(" ");
        val = val.join(" ");


        switch(type){

            case "video":
                this.setState("Downloading Video");
                this.setProgress(val.slice(0,4));
                break;
            
            case "audio":
                this.setState("Downloading Audio");
                this.setProgress(val.slice(0,4));
                break;

            case "file":
                this.setState("Finished");
                this.filename = val;
                
                DownloadManager.save();
                console.log("finished", this)
                break;

            case "abort":
                this.setState("Cancelled");
                if (val==="URLError") {
                    this.html.querySelector(".title").innerText = "Can't download that URL";
                    setTimeout(()=>{
                        this.remove();
                    },3000);
                } else {
                    this.html.querySelector(".title").innerText = "Something went wrong";
                }
                break;
            

            case "info":
                let info = JSON.parse(val);
                Object.assign(this, info);

                this.updateHTML();

                console.log(this);
                DownloadManager.save();
                break;
        }

    }

    // HTML Management
    updateHTML() {

        let thumb_style = "url(" + this.thumbnail.replace(/\(/g, "%28").replace(/\)/g, "%29") + ")";

        this.html.querySelector(".duration").innerText = parseDuration(this.duration);
        this.html.querySelector(".origin").innerText = this.origin;
        this.html.querySelector(".title").innerText = this.title;
        this.html.querySelector(".thumbnail").style.backgroundImage = thumb_style;

        let desc_words = this.description.replace(/\n/g, " <br>").split(" ");

        for (const [i, word] of desc_words.entries()) {

            if (word.startsWith("http")) {
                desc_words[i] = `<a href="${word}" target="_blank">${word}</a>`
            }
        }

        this.html.querySelector(".description").innerHTML = desc_words.join(" ") || "";

    }

    setHtml() {
        this.html = document.createElement("div");
        this.html.classList.add("download");
        this.html.innerHTML = `<div class="dl-wrapper dblclick"> <div class="thumbnail dblclick"></div> <span class="title dblclick">...</span> <div class="info"><span class="duration">--:--</span><a class="origin">...</a></div><i class="expand-button fas fa-chevron-down"></i><div class="state">Initializing</div><progress max="100" value="0"></progress></div><div class="description"></div>`;

        this.html.addEventListener("dblclick", (e) => {

            if(!e.target.classList.contains("dblclick")) return;

            window.getSelection().removeAllRanges();
            if (this.filename) {
                shell.openPath(this.filename)
            }
        });

        this.html.querySelector(".expand-button").addEventListener("click", e => {
            this.html.querySelector(".expand-button").classList.toggle("opened");
            this.html.querySelector(".description").classList.toggle("opened");
        });

        this.html.querySelector(".origin").addEventListener("click", (e) => {
            shell.openExternal(this.url);
        });
    }

    // Add Context Menu to HTML
    setupCtxMenu() {

        this.html.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            let opts = {
                x: e.clientX,
                y: e.clientY,
                items: [
                    ["Delete", (e) => this.remove(false) ],
                    ["Delete File", (e) => this.remove() ],
                    null,
                    ["Show in Explorer", (e) => ipcRenderer.send("shell:showfile", this.filename)]
                ]
            }
            CtxMenu.show(opts);
        });
    }

    // Update progress Bar
    setProgress(val) {
        this.html.querySelector("progress").setAttribute("value", val)
    }

    // Set Current state
    setState(state) {

        let html = this.html;

        let opts = {
            "Initializing": function() {  },
            "Downloading Video": function() {  },
            "Downloading Audio": function() {  },
            "Cancelled": function() {
                html.querySelector("progress")?.remove?.();
                html.querySelector(".state").classList.add("cancelled");
            },
            "Finished": function() {
                html.querySelector("progress").remove();
                html.querySelector(".state").remove();
            }
        }

        if( !(state in opts) ) return;

        this.html.querySelector(".state").innerText = state;
        this.state = state;

        opts[state]();


    }

    // Get Info to save
    getInfo() {

        const { 
            url,
            state,
            date,
            title = "unknown",
            uploader = "unknown",
            origin = "unknown",
            description = "",
            view_count = 0,
            like_count = 0,
            duration = 0,
            thumbnail = "",
            filename
        } = this;

        return { 
            url,
            state,
            date,
            title,
            uploader,
            origin,
            description,
            view_count,
            like_count,
            duration,
            thumbnail,
            filename
        };

    }

    // Remove download
    remove(delFile=true) {

        let i = DownloadManager.downloads.indexOf(this);
        DownloadManager.downloads.splice(i, 1);

        this.html.remove();
        DownloadManager.save();

        if (this.filename && delFile)
            ipcRenderer.send("fs:delete", this.filename);

        delete this;
    }
}


// Window Events
function minimize(){
    ipcRenderer.send("window:minimize");
}
function maximize(){
    ipcRenderer.send("window:maximize");
}
function _close(){
    DownloadManager.save();
    ipcRenderer.send("window:close");
}


// Create Download
ipcRenderer.on("download:new", (e, url) => {

    DownloadManager.add( new Download(url) )

});


// Load Storage
ipcRenderer.send("storage:load");
ipcRenderer.on("storage:data", (e, data) => {
    DownloadManager.load(data);
})


// Util
function parseDuration(seconds) {
    let hours = Math.floor(seconds / 3600);
    let mins = Math.floor((seconds % 3600) / 60);
    let secs = seconds % 60;

    return (
          (hours > 0 ? `${hours}h ` : "")
        + (mins  > 0 ? `${mins}m `  : "")
        + (secs > 0 && hours < 1 ? `${secs}s`   : "")
        ).trim();

}