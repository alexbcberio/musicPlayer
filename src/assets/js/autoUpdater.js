var autoUpdater = {
    checking: () => {
        console.info("autoUpdater: searching for updates");
    },
    updateAvailable: () => {
        console.info("autoUpdater: newer update was found");
    },
    updateNotAvailable: () => {
        console.info("autoUpdater: newer update was not found");
    },
    error: (error) => {
        swal("Error", "There was an error trying to search updates, open the developer console for more details", "error");
        console.error("autoUpdater: " + error);
    },
    downloadProgress: (progressObj) => {
        var bytesPerSecond = progressObj.bytesPerSecond;
        var percent = progressObj.percent;
        var transferred = progressObj.transferred;
        var total = progressObj.total;

        swal({
            title: "Downloading new update...",
            text: "status: " + Math.round(percent) + "% downloaded",
            showConfirmButton: false
        });
    },
    updateDownloaded: () => {
        swal({
            title: "New update was downloaded",
            text: "Would you like to install it now?",
            type: "info",
            showConfirmButton: true,
            confirmButtonText: "Yes",
            showCancelButton: true,
            cancelButtonText: "No"

        }, () => {
            autoUpdater.quitAndInstall();
        });
    },
    quitAndInstall: () => {
        ipcRenderer.send("update");
    }
};

ipcRenderer.on("autoUpdater", (event, obj) => {

    switch (obj.type) {
        case "checking":
            autoUpdater.checking(obj.data);
            break;

        case "checking":
            autoUpdater.checking(obj.data);
            break;

        case "updateAvailable":
            autoUpdater.updateAvailable(obj.data);
            break;

        case "updateNotAvailable":
            autoUpdater.updateNotAvailable(obj.data);
            break;

        case "error":
            autoUpdater.error(obj.data);
            break;

        case "downloadProgress":
            autoUpdater.downloadProgress(obj.data);
            break;

        case "updateDownloaded":
            autoUpdater.updateDownloaded();
            break;

        default:
            console.log("autoUpdater: " + obj.type + "\n" + obj.data);
            break;
    }
});
