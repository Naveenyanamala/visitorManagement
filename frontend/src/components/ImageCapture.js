import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Webcam from 'react-webcam';
import { Camera, Upload, X, RotateCcw, Check } from 'lucide-react';

const ImageCapture = ({ onImageCapture, initialImage = null, required = false }) => {
  const [capturedImage, setCapturedImage] = useState(initialImage);
  const [showWebcam, setShowWebcam] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const webcamRef = useRef(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const imageDataUrl = reader.result;
        setCapturedImage(imageDataUrl);
        onImageCapture(imageDataUrl);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageCapture]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      onImageCapture(imageSrc);
      setShowWebcam(false);
    }
  }, [onImageCapture]);

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const removeImage = () => {
    setCapturedImage(null);
    onImageCapture(null);
  };

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: facingMode
  };

  return (
    <div className="space-y-4">
      <label className="label">
        Visitor Photo {required && <span className="text-red-500">*</span>}
      </label>
      
      {capturedImage ? (
        <div className="relative">
          <div className="w-full max-w-sm mx-auto">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-64 object-cover rounded-lg border border-gray-300"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex justify-center mt-2">
            <button
              type="button"
              onClick={() => setShowWebcam(true)}
              className="btn-outline text-sm"
            >
              <Camera className="h-4 w-4 mr-1" />
              Retake Photo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-primary-600">Drop the image here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag & drop an image here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
            )}
          </div>

          {/* Or Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">or</span>
            </div>
          </div>

          {/* Camera Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowWebcam(true)}
              className="btn-primary"
            >
              <Camera className="h-5 w-5 mr-2" />
              Take Photo
            </button>
          </div>
        </div>
      )}

      {/* Webcam Modal */}
      {showWebcam && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowWebcam(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Take Photo</h3>
                  <button
                    type="button"
                    onClick={() => setShowWebcam(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="relative">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="w-full rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="flex justify-center space-x-4 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowWebcam(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="btn-primary"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Capture
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCapture;
