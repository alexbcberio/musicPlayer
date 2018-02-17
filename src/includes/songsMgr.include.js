import curl from 'curl';
import {
    dialog
} from 'electron';

import fs from 'fs';
import id3 from 'musicmetadata';
import path from 'path';


// visible letiables from inport
module.exports = {
    loadMusicFromDir: loadMusicFromDir,
    setAlbumArt: setAlbumArt
};

/*
 *
 */

let songs = new Array();

function selectFolder() {
    let dir = dialog.showOpenDialog({
        properties: ['openDirectory']
    });

    if (typeof dir === "undefined") {
        return false;
    } else {
        return dir[0];
    }
}

function selectImage() {
    let image = dialog.showOpenDialog({
        filters: [{
            name: 'Images', extensions: ['jpg', 'jpeg']
        }]
    });

    if (typeof image === "undefined") {
        return false;
    } else {
        return image[0]
    }
}

function getSongMetadata(file, callback) {
    let filemtime;

    fs.stat(file, (error, stats) => {
        filemtime = new Date(stats.mtime).valueOf();
    });

    let readableStream = fs.createReadStream(file);

    id3(readableStream, {
        duration: true
    }, function (err, metadata) {

        albumArt(metadata, file, (coverPath) => {
            let resp = {
                path: file,
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                duration: metadata.duration,
                cover: coverPath,
                moddate: filemtime
            }

            readableStream.close();

            if (typeof callback === "function") {
                callback(resp);
            }
        });

    });
}

function albumArt(metadata, file, callback) {

    let imgPath = path.resolve("./albumArt/");
    let filename = undefined;

    if (!fs.existsSync(imgPath)) {
        fs.mkdir(imgPath, function(error) {
            if (error) {
                console.log("Image folder could't be created");
            }
        });
    }

    // if no title use the filename
    if (!metadata.title.length) {
        filename = file.replace(path.dirname(file) + path.sep, "");
        let dotSplit = filename.split(".");

        metadata.title = filename.replace("." + dotSplit[dotSplit.length - 1], "");
    }

    try {
        // file contains album art image
        if (metadata.picture[0]) {
            let image = metadata.picture[0];
            let format = image.format;

            if (metadata.album) {
                filename = metadata.album;

                if (metadata.artist[0]) {
                    imgPath = path.resolve(imgPath, metadata.artist[0]);
                }

            } else if (metadata.artist[0] ) {
                imgPath = path.resolve(imgPath, metadata.artist[0]);

                filename = metadata.title;

            } else {
                filename = metadata.title;
            }

            filename += "." + format;

            if (!fs.existsSync(imgPath)) {

                fs.mkdir(imgPath, function(error) {
                    if (error) {
                        console.log("Artist folder couln't be created");
                    }
                });
            }

            if (!fs.existsSync(path.resolve(imgPath, filename))) {
                let base64buffer = new Buffer(image.data, "base64");
                fs.writeFile(path.resolve(imgPath, filename), base64buffer, function(error) {
                    if (error) {
                        console.log("Error creating image \"" + filename + "\" on " + imgPath);
                    }
                });
            }

            imgPath = path.resolve(imgPath, filename);

        // artist/title.jpg
        } else if (metadata.artist[0] && metadata.title && fs.existsSync(path.resolve(imgPath, metadata.artist[0], metadata.title + ".jpg"))) {
            imgPath = path.resolve(imgPath, metadata.artist[0], metadata.title + ".jpg");

        // artist/album.jpg
        } else if (metadata.artist[0] && metadata.album && fs.existsSync(path.resolve(imgPath, metadata.artist[0], metadata.album + ".jpg"))) {
            imgPath = path.resolve(imgPath, metadata.artist[0], metadata.album + ".jpg");

        // artist.jpg
        } else if (metadata.artist[0] && fs.existsSync(path.resolve(imgPath, metadata.artist[0] + ".jpg"))) {
            imgPath = path.resolve(imgPath, metadata.artist[0] + ".jpg");

        // title.jpg
        } else if ( metadata.title && fs.existsSync(path.resolve(imgPath, metadata.title + ".jpg"))) {
            imgPath = path.resolve(imgPath, metadata.title + ".jpg");

        // album.jpg
        } else if (metadata.album && fs.existsSync(path.resolve(imgPath, metadata.album + ".jpg"))) {
            imgPath = path.resolve(imgPath, metadata.album + ".jpg");

        // default
        } else {
            imgPath = undefined;
        }

    } catch (error) {
        if (error) {
            console.log("Error searching album art");
        }
        imgPath = undefined;
    }

    if (typeof callback === "function") {
        callback(imgPath);
    }


    /********************************************************

    // iTunes API albumart query
    let albumQuery = resp.title;

    curl.get("https://itunes.apple.com/search?country=US&entity=album&term=" + albumQuery, {}, (error, response) => {

    if (error) {
        console.log(error);
    } else {
        let json = JSON.parse(response.body);

        if (json.resultCount > 0) {
            // set the first image
            resp.cover = json.results[0].artworkUrl100.replace("100x100", "512x512");
        }
    }

    ********************************************************/
}

function createAlbumArt(metadata, songPath, imagePath) {
    let imgPath = path.resolve("./albumArt/");
    let filename = undefined;

    // if no title use the filename
    if (!metadata.title.length) {
        let filename = songPath.replace(path.dirname(songPath) + path.sep, "");
        let dotSplit = filename.split(".");

        metadata.title = filename.replace("." + dotSplit[dotSplit.length - 1], "");
    }

    try {
        // file contains album art image
        if (imagePath || metadata.picture[0]) {
            let format = "jpg";

            if (metadata.album) {
                filename = metadata.album;

                if (metadata.artist[0]) {
                    imgPath = path.resolve(imgPath, metadata.artist[0]);
                }

            } else if (metadata.artist[0] ) {
                imgPath = path.resolve(imgPath, metadata.artist[0]);

                filename = metadata.title;

            } else {
                filename = metadata.title;
            }

            filename += "." + format;

            // copy from given image
            if (imagePath) {
                fs.createReadStream(imagePath).pipe(fs.createWriteStream(path.resolve(imgPath, filename)));

            // create from metadata
            } else {
                let image = metadata.picture[0];
                format = image.format;

                if (!fs.existsSync(imgPath)) {

                    fs.mkdir(imgPath, function(error) {
                        if (error) {
                            console.log("error creating artist folder: " + imgPath);
                        }
                    });
                }

                if (!fs.existsSync(path.resolve(imgPath, filename))) {
                    let base64buffer = new Buffer(image.data, "base64");
                    fs.writeFile(path.resolve(imgPath, filename), base64buffer, function(error) {
                        if (error) {
                            console.log("error creating album image: " + path.resolve(imgPath, filename));
                        }
                    });
                }
            }

            imgPath = path.resolve(imgPath, filename);

        // artist/title.jpg
        } else if (metadata.artist[0] && metadata.title && fs.existsSync(path.resolve(imgPath, metadata.artist[0], metadata.title + ".jpg"))) {
            imgPath = path.resolve(imgPath, metadata.artist[0], metadata.title + ".jpg");

        // artist/album.jpg
        } else if (metadata.artist[0] && metadata.album && fs.existsSync(path.resolve(imgPath, metadata.artist[0], metadata.album + ".jpg"))) {
            imgPath = path.resolve(imgPath, metadata.artist[0], metadata.album + ".jpg");

        // artist.jpg
        } else if (metadata.artist[0] && fs.existsSync(path.resolve(imgPath, metadata.artist[0] + ".jpg"))) {
            imgPath = path.resolve(imgPath, metadata.artist[0] + ".jpg");

        // title.jpg
        } else if ( metadata.title && fs.existsSync(path.resolve(imgPath, metadata.title + ".jpg"))) {
            imgPath = path.resolve(imgPath, metadata.title + ".jpg");

        // album.jpg
        } else if (metadata.album && fs.existsSync(path.resolve(imgPath, metadata.album + ".jpg"))) {
            imgPath = path.resolve(imgPath, metadata.album + ".jpg");

        // default
        } else {
            imgPath = undefined;
        }

    } catch (error) {
        if (error) {
            console.log("Error creating album art");
        }
        imgPath = undefined;
    }

}

function setAlbumArt(songPath) {

    if (fs.existsSync(songPath)) {
        let img = selectImage()

        if (img !== false) {
            getSongMetadata(songPath, (metadata) => {
                createAlbumArt(metadata, songPath, img);
            });
        }
    }
}

function loadMusicFromDir(event, dir) {
    songs = new Array();

    let cachedDir = "./metadata.json";
    let mostRecentFileModdate = -1;

    if (typeof dir === "undefined") {
        dir = selectFolder();
    }

    if (dir === false) {
        return false;
    }

    if (fs.existsSync(dir)) {

        if (fs.existsSync(cachedDir)) {

            // send the selected audio folder
            event.sender.send("selAudioDir", dir);

            let cachedJson = JSON.parse(fs.readFileSync(cachedDir));

            if (cachedJson.folder == dir) {
                scanSongsFromDir(dir, (songs) => {
                    songs.forEach((song, index) => {

                        if (song.moddate > mostRecentFileModdate) {
                            mostRecentFileModdate = song.moddate;
                        }

                        // execute on end
                        if ((songs.length - 1) == index) {

                            // json updated
                            if (cachedJson.mostRecentFileModdate <= mostRecentFileModdate) {
                                readFromJson(event, fs.readFileSync(cachedDir, {
                                    "encoding": "utf8"
                                }));

                                return true;
                            }
                        }
                    });

                });

            }
        }

        // save songs metadata to json file
        let data = {};
        data.folder = dir;
        data.mostRecentFileModdate = -1;
        data.songs = new Array();

        scanSongsFromDir(dir, (songs) => {
            // no songs found
            if (songs.length == 0) {
                event.sender.send("addSongs", false);
            }

            songs.forEach((song, index) => {
                data.songs.push(song);

                if (song.moddate > mostRecentFileModdate) {
                    mostRecentFileModdate = song.moddate;
                }

                // execute on end
                if ((songs.length - 1) == index) {
                    data.mostRecentFileModdate = song.moddate;

                    fs.writeFileSync(cachedDir, JSON.stringify(data), {
                        "encoding": "utf8"
                    });

                    readFromJson(event, fs.readFileSync(cachedDir, {
                        "encoding": "utf8"
                    }));
                }
            });

        });

    }

    return true;
}

function scanSongsFromDir(dir, callback) {
    let songs = new Array();
    let totalSongs = 0;

    if (songs.length == 0) {
        fs.readdir(dir, (error, files) => {

            files.forEach((file, index) => {
                let filePath = path.resolve(dir, file);

                // directory
                if (fs.lstatSync(filePath).isDirectory()) {

                // file
                } else if (fs.lstatSync(filePath).isFile()) {
                    let dotSplit = file.split(".");

                    if (dotSplit[dotSplit.length - 1].toUpperCase() == "MP3") {
                        totalSongs++;

                        getSongMetadata(filePath, function(metadata) {
                            songs.push(metadata);
                        });
                    }
                }

                // execute code on scanning last file
                if (files.length - index == 1) {
                    let interval = setInterval(() => {
                        if (songs.length == totalSongs) {
                            if (typeof callback === "function") {
                                callback(songs);
                            }
                            clearInterval(interval);
                        }
                    }, 10);
                }

            });

        });
    } else {
        if (typeof callback === "function") {
            callback(songs);
        }
    }
}

function readFromJson(event, json) {
    json = JSON.parse(json);

    event.sender.send("addSongs", json.songs);
}
