import { uiElement } from "./modules/ui-element.mjs";
import Cropper from "../node_modules/cropperjs/dist/cropper.esm.js";

const ipc = window.ipc;

// UI
const jUI = (function() {
  const [fileInfo, alertMsg, selectBtn, sourceImg, imgContainer, setDimensionsBtn, exportBtn, imageWidth, imageHeight, imageAspectRatio, 
        targetWidth, targetHeight, targetAspectRatio, cropWidth, cropHeight, cropAspectRatio, outputInfo] = 
        ["file-info", "alert-msg", "select-btn", "source-img", "img-container", "set-dimensions-btn", "export-btn", "image-width", "image-height", "image-aspect-ratio", "target-width", "target-height", "target-aspect-ratio", "crop-width", "crop-height", "crop-aspect-ratio", "output-info"].map(id => new uiElement(document.getElementById(id)));
  let imgElement = new uiElement(document.createElement("img"));

  function showAlert(msg, className) {
    alertMsg.element.classList.add(className);
    alertMsg.textContent = msg;
    $(alertMsg.element).fadeIn(200);

    //Remove Alert after time-out and reset div
    setTimeout(() => {
      $(alertMsg.element).fadeOut(400, () => { 
        alertMsg.reset();
      }); 
      }, 3000);
  }

  function updateOutputInfo(newInfo) {
    outputInfo.reset();
    outputInfo.textContent += newInfo;
  }

  function reset() {
    // imgContainer.reset();
    imageWidth.reset();
    imageHeight.reset();
    imageAspectRatio.reset();
    targetWidth.value = "";
    targetHeight.value = "";
    targetAspectRatio.reset();
    cropWidth.reset();
    cropHeight.reset();
    cropAspectRatio.reset();
    outputInfo.reset();
    exportBtn.reset();
    setDimensionsBtn.reset();
  }

  return {
    fileInfo, outputInfo,
    alertMsg,
    sourceImg,
    imgContainer,
    setDimensionsBtn, selectBtn, exportBtn, 
    imageWidth, imageHeight, imageAspectRatio,
    targetWidth, targetHeight, targetAspectRatio,
    cropWidth, cropHeight, cropAspectRatio,
    imgElement,
    showAlert,
    reset,
    updateOutputInfo
  }
})();

// App
const App = (function() {

  let cropper,
      imgName,
      imgPath;
  
  // Listen
  ipc.alertImageReady((msg) => {
    jUI.showAlert(msg, "bg-success");
  });

  ipc.alertSettingsSaved((data) => {
    jUI.showAlert(data.msg, "bg-success");
    jUI.updateOutputInfo(data.outputinfo);
  });

  // Event listener to auto-click select when choosing image
  jUI.sourceImg.element.addEventListener("change", () => {
    if(jUI.sourceImg.element.files.length > 0) {
      jUI.selectBtn.element.click();
    }
  });

  // Event listener for select button
  jUI.selectBtn.element.addEventListener("click", () => {
    try {
      imgPath = jUI.sourceImg.element.files[0].path;
      imgName = jUI.sourceImg.element.files[0].name;

      jUI.imgElement.element.setAttribute("src", imgPath);
      jUI.imgContainer.element.appendChild(jUI.imgElement.element);

      // If cropper is undefined create new cropper from image..
      if(cropper === undefined) {
        cropper = new Cropper(jUI.imgElement.element, {
          autoCrop: false,
          cropBoxResizable: false,
          zoomable: false,
          scalable: false,
          viewMode: 3,
          ready() {
            let imgData = cropper.getImageData();
            let canvasData = cropper.getCanvasData();

            // Scale factor to scale crop box
            let scaleFactor = canvasData.width / canvasData.naturalWidth;

            let targetWidth, targetHeight, targetAspectRatio,
                cropWidth, cropHeight, cropAspectRatio, cropLongEdge;

            // Calculate image aspect ratio
            let imageAspectRatio = imgData.naturalWidth / imgData.naturalHeight;

            // Write image info to page
            jUI.imageWidth.textContent = `Image Width: ${imgData.naturalWidth}`;
            jUI.imageHeight.textContent = `Image Height: ${imgData.naturalHeight}`;
            jUI.imageAspectRatio.textContent = `Image Aspect Ratio: ${imageAspectRatio.toFixed(2)}`;

            // Some jQuery Magic
            $(jUI.fileInfo.element).fadeIn(1000);

            // Event listener for setting dimensions
            jUI.setDimensionsBtn.element.addEventListener("click", () => {

              // Enable export
              jUI.exportBtn.element.classList.remove("disabled");
              jUI.exportBtn.element.disabled = false;

              targetWidth = parseInt(jUI.targetWidth.element.value);
              targetHeight = parseInt(jUI.targetHeight.element.value);
              targetAspectRatio = targetWidth / targetHeight;

              // Set crop box long edge
              targetAspectRatio >= imageAspectRatio ? cropLongEdge = "width" : cropLongEdge = "height";

              // Check cropLongEdge to set Crop Box dimensions
              // We do this so that crop box dimensions dont exceed image dimensions
              if(cropLongEdge === "width") {
                cropWidth = imgData.naturalWidth;
                cropHeight = targetHeight + ((imgData.naturalWidth - targetWidth) / targetAspectRatio);
                cropAspectRatio = cropWidth / cropHeight;
              } else {
                cropHeight = imgData.naturalHeight;
                cropWidth = targetWidth + ((imgData.naturalHeight - targetHeight) * targetAspectRatio);
                cropAspectRatio = cropWidth / cropHeight;
              }

              // Check that aspect ratios match and color the UI accordingly
              if(targetAspectRatio.toFixed(10) === cropAspectRatio.toFixed(10)) {
                jUI.targetAspectRatio.element.classList.add("bg-info");
                jUI.cropAspectRatio.element.classList.add("bg-info");
              } else {
                jUI.targetAspectRatio.element.classList.add("bg-warning");
                jUI.cropAspectRatio.element.classList.add("bg-warning");
              }
              
              jUI.targetAspectRatio.textContent = `Target Aspect Ratio: ${targetAspectRatio.toFixed(4)}`; 
              jUI.cropWidth.textContent = `Crop Box Width: ${cropWidth.toFixed(0)}`;
              jUI.cropHeight.textContent = `Crop Box Height: ${cropHeight.toFixed(0)}`;
              jUI.cropAspectRatio.textContent = `Crop Aspect Ratio: ${cropAspectRatio.toFixed(4)}`;

              // Set crop box
              this.cropper.crop();
              this.cropper.setCropBoxData({ "left": canvasData.left, "top": canvasData.top, "width": cropWidth*scaleFactor, "height": cropHeight*scaleFactor });
              
              // Send source file name+suffix to main process and update output info in return
              ipc.setExportFileName({ 
                sourceFileName: imgName, 
                suffix: `_${targetWidth}x${targetHeight}` 
                });
              ipc.updateOutputInfo((info) => {
                jUI.updateOutputInfo(info);
              });
              
              jUI.setDimensionsBtn.element.disabled = true;
            }, { once: true }); // once: true to prevent unnecessary eventlisteners clogging up the ipc

            // Event listener for export button
            jUI.exportBtn.element.addEventListener("click", () => {
              if(jUI.exportBtn.element.classList.contains("disabled")) {
                jUI.showAlert("Please set desired crop first!", "bg-danger");
              } else {
                let croppedImage = this.cropper.getCroppedCanvas({
                  fillColor: "#fff",
                  width: targetWidth,
                  height: targetHeight,
                  imageSmoothingEnabled: true,
                  imageSmoothingQuality: "high",
                }).toDataURL("image/jpg", 1);

                // Send cropped image data to main process
                ipc.exportImage(croppedImage);
              }

              jUI.exportBtn.element.disabled = true;
            }, { once: true }); // one export per crop to prevent eventlisteners hanging around  
          }
        });
      // .. else replace cropper with new image
      } else {
        $(jUI.fileInfo.element).fadeOut(200, () => {
          jUI.reset();
          cropper.replace(imgPath);
        });
      }        
    }
    catch {
      jUI.showAlert("Select an image first..", "bg-danger");
    }
  });
})();

