import {
    app,
    BrowserWindow,
    globalShortcut,
    ipcMain,
    dialog
} from 'electron';

import {
    autoUpdater
} from "electron-updater";

import fs from 'fs';
import id3 from 'musicmetadata';
import path from 'path';
import songsMgr from "./includes/songsMgr.include.js";
import url from 'url';


let win,
    optionsWin,
    updateMsg;

app.on('ready', () => {

    win = new BrowserWindow({
        show: false,

        width: 800,
        height: 600,
        minWidth: 490,
        minHeight: 540,

        center: true,

        icon: "assets/img/favicon.png",
        autoHideMenuBar: true,
        frame: false,
        webPreferences: {
            devTools: true
        },
    });

    win.loadURL("file://" + __dirname + "/index.html");

    optionsWin = new BrowserWindow({
        parent: win,
        modal: true,
        show: false,

        width: 700,
        //height: 0,
        center: true,
        resizable: false,
        autoHideMenuBar: true,
        frame: false
    });

    optionsWin.loadURL("file://" + __dirname + "/options.html");

    optionsWin.on("close", (event) => {
        event.preventDefault();

        optionsWin.hide();
    });

    win.once("ready-to-show", () => {
        win.show();

        updateMsg = function(type, data) {
            win.webContents.send("autoUpdater", {
                type: type,
                data: data
            });
            console.log(type + " " + data);
        }

        try {
            // TODO: fix autoupdater not founding updates
            // autoUpdater.checkForUpdates();
        } catch (error) {
            console.log("\nError finding updates");
            updateMsg("error", error);
        }
    });

    // hotkeys
    win.webContents.on("did-finish-load", () => {

        // toggle debugger
        ipcMain.on("toggleDevTools", () => {
            win.webContents.toggleDevTools();
        });

        // volume up
        globalShortcut.register("volumeUp", () => {
            win.webContents.send("keyPress", "volumeUp");
        });
        globalShortcut.register("Alt+Up", () => {
            win.webContents.send("keyPress", "volumeUp");
        });

        // volume down
        globalShortcut.register("volumeDown", () => {
            win.webContents.send("keyPress", "volumeDown");
        });
        globalShortcut.register("Alt+Down", () => {
            win.webContents.send("keyPress", "volumeDown");
        });

        // toggleMute
        globalShortcut.register("Alt+M", () => {
            win.webContents.send("keyPress", "toggleMute");
        });

        // previousSong
        globalShortcut.register("mediaPreviousTrack", () => {
            win.webContents.send("keyPress", "previousSong");
        });
        globalShortcut.register("Alt+Left", () => {
            win.webContents.send("keyPress", "previousSong");
        });

        // nextSong
        globalShortcut.register("MediaNextTrack", () => {
            win.webContents.send("keyPress", "nextSong");
        });
        globalShortcut.register("Alt+Right", () => {
            win.webContents.send("keyPress", "nextSong");
        });

        // playPause
        globalShortcut.register("MediaPlayPause", () => {
            win.webContents.send("keyPress", "playPause");
        });
        globalShortcut.register("Alt+Space", () => {
            win.webContents.send("keyPress", "playPause");
        });

        // stop
        globalShortcut.register("MediaStop", () => {
            win.webContents.send("keyPress", "stop");
        });
        globalShortcut.register("Alt+Enter", () => {
            win.webContents.send("keyPress", "stop");
        });

    });

    // changelog
    ipcMain.on("changelog", (event, action) => {

        switch(action) {
            case "getVersion":
                event.returnValue = app.getVersion();
                break;

            case "getChangelog":
                event.returnValue = fs.readFileSync(__dirname + "/changelog.html", {
                    "encoding": "utf8"
                });
                break;
        }

    });

    // user interface titlebar actions
    ipcMain.on("titleBar", (event, arg) => {
        let window = arg.win;
        let action = arg.action;

        switch(window) {
            case "main":
                window = win;
                break;

            case "options":
                window = optionsWin;
                break;

            default:
                return;
        }

        switch (action) {
            case "close":
                (window == win) ? window.close() && app.quit() : window.hide();
                break;

            case "maximize":
                window.isMaximized() ? window.unmaximize() : window.maximize();
                break;

            case "minimize":
                window.minimize();
                break;

            case "loadFolder":
                event.retrunValue = (songsMgr.loadMusicFromDir(event)) ? true : false;
                break;
        }

    });

    ipcMain.on("showOptions", () => {
        optionsWin.show();
    });

    ipcMain.on("loadAudioFromDir", (event, dir) => {
        songsMgr.loadMusicFromDir(event, dir);
    });

    ipcMain.on("changeAlbumart", (event, songPath) => {
        songsMgr.setAlbumArt(songPath);
    });

    ipcMain.on("update", () => {
        autoUpdater.quitAndInstall();
    });
});



// Quit when all windows are closed.
app.on('window-all-closed', () => {
    app.quit();
});


autoUpdater.on("checking-for-update", () => {
    updateMsg("checking", "Checking for updates...");
});

autoUpdater.on("update-available", (event, info) => {
    updateMsg("updateAvailable", "Update available");
});

autoUpdater.on("update-not-available", (event, info) => {
    updateMsg("updateNotAvailable","Update not available");
});

autoUpdater.on("error", (event, error) => {
    updateMsg("error", "Error in auto-updater:" + error);
});

autoUpdater.on("download-progress", (progressObj) => {
    updateMsg("downloadProgress", progressObj);
});

autoUpdater.on("update-downloaded", (event, info) => {
    updateMsg("updateDownloaded", null);
});
