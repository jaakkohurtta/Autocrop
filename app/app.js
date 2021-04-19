import Cropper from "../node_modules/cropperjs/dist/cropper.esm.js";

const ipc = window.ipc;

class UI {
    constructor() {
      this.inputExportWidth = document.getElementById("inputExportWidth"),
      this.inputExportHeight = document.getElementById("inputExportHeight"),
      this.importBtn  = document.getElementById("importBtn"),
      this.sourceImg = document.getElementById("sourceImg");
      this.imgContainer = document.getElementById("imgContainer");
      this.fileInfo = document.getElementById("fileInfo");
      this.exportInfo = document.getElementById("exportInfo");
      this.exportBtn = document.getElementById("exportBtn");
      this.alertMsg = document.getElementById("alertMsg");

      this.imageWidth = document.getElementById("imageWidth");
      this.imageHeight = document.getElementById("imageHeight");
      this.imageAspectRatio = document.getElementById("imageAspectRatio");

      this.cropWidth = document.getElementById("cropWidth");
      this.cropHeight = document.getElementById("cropHeight");
      this.cropAspectRatio = document.getElementById("cropAspectRatio");

      this.exportWidth = document.getElementById("exportWidth");
      this.exportHeight = document.getElementById("exportHeight");
      this.exportAspectRatio = document.getElementById("exportAspectRatio");

      this.imgElement = document.getElementById("imgElement");
    }

    // Display info on UI
    displayImageInfo(imageWidth, imageHeight, imageAspectRatio, cropWidth, cropHeight, cropAspectRatio, exportWidth, exportHeight, exportAspectRatio) {
      this.imageWidth.textContent = `Image Width: ${imageWidth}`;
      this.imageHeight.textContent = `Image Height: ${imageHeight}`;
      this.imageAspectRatio.textContent = `Image Aspect Ratio: ${imageAspectRatio.toFixed(2)}`;

      this.cropWidth.textContent = `Crop Width: ${cropWidth.toFixed(0)}`;
      this.cropHeight.textContent = `Crop Height: ${cropHeight.toFixed(0)}`;
      this.cropAspectRatio.textContent = `Crop Aspect Ratio: ${cropAspectRatio.toFixed(5)}`;

      this.exportWidth.textContent = `Export Width: ${exportWidth.toFixed(0)}`;
      this.exportHeight.textContent = `Export Height: ${exportHeight.toFixed(0)}`;
      this.exportAspectRatio.textContent = `Export Aspect Ratio: ${exportAspectRatio.toFixed(5)}`;

      this.checkAspectRatios();
    }

    // Update crop dimensions on UI
    updateCropBoxDimensions(newWidth, newHeight) {
      this.cropWidth.textContent = `Crop Width: ${newWidth.toFixed(0)}`;
      this.cropHeight.textContent = `Crop Height: ${newHeight.toFixed(0)}`;
      this.checkAspectRatios();
    }

    // Check if crop aspect ratio and export aspect ratio match
    checkAspectRatios() {
      // Get aspect ratios from UI
      let cAr = parseFloat(this.cropAspectRatio.textContent.slice(-7));
      let eAr = parseFloat(this.exportAspectRatio.textContent.slice(-7));

      if(cAr === eAr) {
        this.classList("remove", "bg-warning", this.cropAspectRatio, this.exportAspectRatio);
        this.classList("add", "bg-success", this.cropAspectRatio, this.exportAspectRatio);
      } else {
        this.classList("remove", "bg-success", this.cropAspectRatio, this.exportAspectRatio);
        this.classList("add", "bg-warning", this.cropAspectRatio, this.exportAspectRatio);
      }
    }

    updateExportInfo(newInfo) {
      this.exportInfo.textContent = `Export location: ${newInfo}`;
    }

    clearImportForm() {
      this.inputExportWidth.value = "";
      this.inputExportHeight.value = "";
    }

    // Add or remove a class to an element
    classList(option, className, ...elements) {
      if(option === "add") {
        elements.forEach(element => {
          if(!element.classList.contains(className)) { 
            element.classList.add(className);
          }
        });
      }
      if(option === "remove") {
        elements.forEach(element => {
          if(element.classList.contains(className)) { 
            element.classList.remove(className);
          }
        });
      }
    }

    // Display alert msgs in UI
    showAlert(msg, className) {
      this.classList("add", className, this.alertMsg);
      alertMsg.textContent = msg;
      $(alertMsg).fadeIn(200);
  
      // Remove alert after a timeout
      setTimeout(() => {
        $(alertMsg).fadeOut(400, () => { 
          this.alertMsg.textContent = "";
          this.classList("remove", className, this.alertMsg);
        }); 
        }, 4000);
    }
  
}

const App = function() {

  const ui = new UI();
  
  //#region Private vars
  let cropper;

  let exportWidth,
      exportHeight,
      exportAspectRatio,
      adjustedCropWidth,
      adjustedCropHeight;

  let sourceImagePath,
      sourceImageFileName;  
  //#endregion
  
  const icp = function() {
    ipc.alertImageReady((msg) => {
      ui.showAlert(msg, "bg-success");
    });
  
    ipc.alertSettingsSaved((data) => {
      ui.showAlert(data.msg, "bg-success");
      ui.updateOutputInfo(data.outputinfo);
    });
  }

  const loadEventListeners = function() {
    ui.importBtn.addEventListener("click", importImage);
    ui.exportBtn.addEventListener("click", exportImage);

    // Listen for Cropper events
    ui.imgElement.addEventListener("ready", cropReady);
    ui.imgElement.addEventListener("crop", cropAdjust);
    ui.imgElement.addEventListener("cropend", cropEnd);

  }

  // Import image and set export dimensions
  const importImage = function() {
    // Form validity check
    if(ui.sourceImg.files.length === 0 || ui.inputExportWidth.value === "" || ui.inputExportHeight.value === "") {
      ui.showAlert("Fill in all fields before trying to crop..", "bg-warning");
      return;
    }

    ui.imgElement.style.display = "block";

    exportWidth = parseInt(ui.inputExportWidth.value);
    exportHeight = parseInt(ui.inputExportHeight.value);
    exportAspectRatio = exportWidth / exportHeight;

    sourceImagePath = ui.sourceImg.files[0].path;
    sourceImageFileName = ui.sourceImg.files[0].name;

    // Set imported image to img element for cropper
    ui.imgElement.setAttribute("src", sourceImagePath);
 
    // Create cropper from imported image
    if(cropper === undefined) {
      cropper = new Cropper(imgElement, {
        autoCrop: true,
        autoCropArea: 1,
        cropBoxResizable: true,
        zoomable: false,
        scalable: false,
        aspectRatio: exportAspectRatio,
        viewMode: 3,
      });
    } else {
      cropper.setAspectRatio(exportAspectRatio);
      cropper.replace(sourceImagePath);
    }

    // Clear input form
    ui.clearImportForm();
  }

  // Export image
  const exportImage = function() {
    let croppedImage = cropper.getCroppedCanvas({
      fillColor: "#fff",
      width: exportWidth,
      height: exportHeight,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    }).toDataURL("image/jpg", 1);

    // Send cropped image data to main process
    ipc.exportImage(croppedImage);
  }

  // Crop Image
  const cropReady = function() {

    // Get data from cropper
    let sourceImageData = cropper.getImageData();
    let cropBoxData = cropper.getData();

    let cropWidth = cropBoxData.width;
    let cropHeight = cropBoxData.height;
    let cropAspectRatio = cropWidth / cropHeight;

    console.log(cropWidth, cropHeight, cropAspectRatio);

    // If export dimensions are greater than actual image dimension adjust accordingly
    if(exportWidth > sourceImageData.naturalWidth || exportHeight > sourceImageData.naturalHeight) {
      exportWidth = cropWidth;
      exportHeight = cropHeight;
      exportAspectRatio = exportWidth / exportHeight;

      ui.showAlert("WARNING: Export dimensions can't be bigger than source image dimensions", "bg-warning");
    }

    let imageAspectRatio = sourceImageData.naturalWidth / sourceImageData.naturalHeight;

    // Display Image/Crop/Export info in UI
    ui.displayImageInfo(sourceImageData.naturalWidth, sourceImageData.naturalHeight, imageAspectRatio, 
                       cropWidth, cropHeight, cropAspectRatio, 
                       exportWidth, exportHeight, exportAspectRatio);

    ui.classList("remove", "d-none", ui.fileInfo);


    // Send file name and dimension to main process
    ipc.setExportFileName({ 
      sourceFileName: sourceImageFileName, 
      suffix: `_${exportWidth}x${exportHeight}` 
      });
    ipc.updateExportInfo((info) => ui.updateExportInfo(info));
  }

  const cropAdjust = function(e) {
    adjustedCropWidth = e.detail.width;
    adjustedCropHeight = e.detail.height;

    ui.updateCropBoxDimensions(adjustedCropWidth, adjustedCropHeight);
  }
  
  const cropEnd = function(e) {
    // Check if new crop box smaller than desired export
    if(adjustedCropWidth < exportWidth || adjustedCropHeight < exportHeight) {
      ui.exportBtn.disabled = true;
      ui.classList("add", "bg-warning", ui.cropWidth, ui.cropHeight);
      ui.showAlert("WARNING: Selected crop is smaller than desired dimensions", "bg-warning");
    } else {
      ui.exportBtn.disabled = false;
      ui.classList("remove", "bg-warning", ui.cropWidth, ui.cropHeight);
    }   
  }

  // Public methods 
  return {
    init: function() {
      loadEventListeners();
      icp();
    }
  }

}();

App.init();