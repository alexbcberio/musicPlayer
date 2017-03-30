const {
    app,
    BrowserWindow,
    globalShortcut,
    ipcMain,
    dialog
} = require('electron');

const path = require('path');
const url = require('url');

const fs = require('fs');
const id3 = require('musicmetadata');

// window object
let win;

app.on('ready', () => {
    // Create the browser window.
    win = new BrowserWindow({
        width: 800,
        height: 600,
        center: true,
        icon: "assets/img/favicon.png",
        autoHideMenuBar: true,
        frame: false,
        webPreferences: {
            devTools: true
        }
    });

    // and load the index.html of the app.
    win.loadURL("file://" + __dirname + "/index.html");

    // hotkeys
    win.webContents.on("did-finish-load", () => {

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

    // user interface titlebar actions
    ipcMain.on("titleBar", (event, arg) => {

        // close
        if (arg == "close") {
            win.close();

        // maximize unmazimize
        } else if (arg == "maximize") {

            // is maximized
            if (win.isMaximized()) {
                win.unmaximize();

            // is not maximized
            } else {
                win.maximize();
            }

        } else if (arg == "minimize") {
            win.minimize();

        } else if (arg == "loadFolder") {
            event.returnValue = loadMusicFromDir(event);
        }

        event.returnValue = "ok";
    });

    ipcMain.on("loadAudioFromDir", (event, dir) => {
        loadMusicFromDir(event, dir);
        return;
    });

});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    app.quit();
});

function selectFolder() {
    var dir = dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (typeof dir === "undefined") {
        return false;
    } else {
        return dir = dir[0];
    }
}

function loadMusicFromDir(event, dir) {
    if (typeof dir === "undefined") {
        dir = selectFolder();
    }

    if (dir == false) {
        return false;
    }

    if (fs.existsSync(dir)) {
        // send the selected audio folder
        event.sender.send("selAudioDir", dir);

        fs.readdir(dir, (error, files) => {
            files.forEach((file) => {
                if (fs.lstatSync(dir + "/" + file).isDirectory()) {
                    // recursive
                    //loadMusicFromDir(event, dir + "/" + file);
                    //console.log(dir+"/"+file);
                }

                var f = file.split(".");
                if (f[f.length - 1].toUpperCase() == "MP3") {
                    file = path.resolve(dir, file);

                    var filemtime;
                    fs.stat(file, (err, stats) => {
                        filemtime = new Date(stats.mtime).valueOf();
                    });

                    // doc: https://github.com/leetreveil/musicmetadata
                    var readableStream = fs.createReadStream(file);
                    var parser = id3(readableStream, {duration: true}, function (err, metadata) {
                        var resp = {
                            path: file,
                            title: metadata.title,
                            artist: metadata.artist,
                            album: metadata.album,
                            duration: metadata.duration,
                            cover: null,
                            moddate: filemtime
                        }

                        if (typeof metadata.picture[0] != "undefined") {
                            var image = metadata.picture[0];
                            var format = image.format;

                            var path = "./assets/img/albumArt/";
                            var filename = metadata.album + "." + format;

                            // create directory where the images are stored
                            if (!fs.existsSync(path)) {
                                fs.mkdir(path, function(error) {
                                    if (error) {
                                        console.log(error);
                                    }
                                });
                            }

                            // create image if not exists
                            if (!fs.existsSync(path + filename)) {
                                var base64buffer = new Buffer(image.data, "base64");
                                fs.writeFile(path + filename, base64buffer, function(error) {
                                    if (error) {
                                        console.log(error);
                                    }
                                });
                            }
                            resp.cover = path + filename;

                        }


                        event.sender.send("addSong", resp);
                        readableStream.close();
                    });
                }
            });
        });
    }

    return true;
}
