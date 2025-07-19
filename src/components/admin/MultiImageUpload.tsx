import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, Check, Plus } from 'lucide-react';
import { uploadImage, deleteImage, getOptimizedImageUrl, isSupabaseConfigured } from '../../lib/supabase';
import { ProductImage } from '../../types';

interface MultiImageUploadProps {
  onImagesChange: (images: ProductImage[]) => void;
  currentImages?: ProductImage[];
  className?: string;
  disabled?: boolean;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
  uploadingFor?: string; // 'main' or weight like '10kg'
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  onImagesChange,
  currentImages = [],
  className = '',
  disabled = false
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false
  });
  const [dragActive, setDragActive] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDisabled = disabled || !isSupabaseConfigured();

  const weightOptions = [
    { value: 'main', label: 'Main Product Image' },
    { value: '10kg', label: '10kg Variant' },
    { value: '25kg', label: '25kg Variant' },
    { value: '50kg', label: '50kg Variant' }
  ];

  const resetUploadState = () => {
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      success: false
    });
  };

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please select a valid image file';
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  const getImageForWeight = (weight: string) => {
    if (weight === 'main') {
      return currentImages.find(img => img.is_primary);
    }
    const weightKg = parseInt(weight);
    return currentImages.find(img => img.weight_kg === weightKg);
  };

  const handleFileUpload = async (files: FileList, targetWeight: string) => {
    if (files.length === 0 || isDisabled) return;

    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      setUploadState(prev => ({ ...prev, error: validationError }));
      return;
    }

    setUploadState({
      uploading: true,
      progress: 0,
      error: null,
      success: false,
      uploadingFor: targetWeight
    });

    try {
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 200);

      console.log(`Starting image upload for ${targetWeight}...`);
      const imageUrl = await uploadImage(file);
      console.log('Image upload successful, URL:', imageUrl);
      
      clearInterval(progressInterval);
      
      setUploadState({
        uploading: false,
        progress: 100,
        error: null,
        success: true,
        uploadingFor: targetWeight
      });

      // Create new image object
      const newImage: ProductImage = {
        id: crypto.randomUUID(), // Temporary ID, will be replaced by database
        image_url: imageUrl,
        alt_text: `${targetWeight === 'main' ? 'Main product image' : `${targetWeight} variant image`}`,
        display_order: targetWeight === 'main' ? 0 : parseInt(targetWeight),
        is_primary: targetWeight === 'main',
        weight_kg: targetWeight === 'main' ? undefined : parseInt(targetWeight)
      };

      // Update images array
      const updatedImages = [...currentImages];
      const existingIndex = updatedImages.findIndex(img => 
        targetWeight === 'main' ? img.is_primary : img.weight_kg === parseInt(targetWeight)
      );

      if (existingIndex >= 0) {
        updatedImages[existingIndex] = newImage;
      } else {
        updatedImages.push(newImage);
      }

      onImagesChange(updatedImages);

      // Reset success state after 2 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false, progress: 0, uploadingFor: undefined }));
      }, 2000);

    } catch (error) {
      console.error('Image upload failed:', error);
      setUploadState({
        uploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
        success: false,
        uploadingFor: undefined
      });
    }
  };

  const handleRemoveImage = async (targetWeight: string) => {
    const image = getImageForWeight(targetWeight);
    if (!image || isDisabled) return;

    try {
      await deleteImage(image.image_url);
      
      const updatedImages = currentImages.filter(img => 
        targetWeight === 'main' ? !img.is_primary : img.weight_kg !== parseInt(targetWeight)
      );
      
      onImagesChange(updatedImages);
      resetUploadState();
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to remove image'
      }));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent, targetWeight: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDisabled && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
      setDragTarget(targetWeight);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetWeight: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragTarget(null);
    
    if (!isDisabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files, targetWeight);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, targetWeight: string) => {
    if (!isDisabled && e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files, targetWeight);
    }
  };

  const openFileDialog = (targetWeight: string) => {
    if (!isDisabled && fileInputRef.current) {
      fileInputRef.current.setAttribute('data-target', targetWeight);
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Configuration Warning */}
      {!isSupabaseConfigured() && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" size={16} />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Image upload requires Supabase connection
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {uploadState.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={16} />
            <p className="text-sm text-red-800 dark:text-red-200">
              {uploadState.error}
            </p>
          </div>
        </div>
      )}

      {/* Success Display */}
      {uploadState.success && uploadState.uploadingFor && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Check className="text-green-600 dark:text-green-400 flex-shrink-0" size={16} />
            <p className="text-sm text-green-800 dark:text-green-200">
              Image uploaded successfully for {uploadState.uploadingFor}
            </p>
          </div>
        </div>
      )}

      {/* Image Upload Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {weightOptions.map((option) => {
          const currentImage = getImageForWeight(option.value);
          const isUploading = uploadState.uploading && uploadState.uploadingFor === option.value;
          const isDragTarget = dragActive && dragTarget === option.value;

          return (
            <div key={option.value} className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {option.label}
              </h3>

              {/* Current Image Display */}
              {currentImage && (
                <div className="relative group">
                  <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700">
                    <img
                      src={getOptimizedImageUrl(currentImage.image_url, 300, 200, 80)}
                      alt={currentImage.alt_text || option.label}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== currentImage.image_url) {
                          target.src = currentImage.image_url;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <button
                        onClick={() => handleRemoveImage(option.value)}
                        disabled={isDisabled || isUploading}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
                        title="Remove image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-4 transition-all duration-200 ${
                  isDragTarget
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } ${
                  isDisabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                onDragEnter={(e) => handleDragIn(e, option.value)}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={(e) => handleDrop(e, option.value)}
                onClick={() => openFileDialog(option.value)}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const target = e.target.getAttribute('data-target');
                    if (target) {
                      handleFileSelect(e, target);
                    }
                  }}
                  disabled={isDisabled || isUploading}
                  className="hidden"
                />

                <div className="text-center">
                  {isUploading ? (
                    <div className="space-y-2">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Uploading... {uploadState.progress}%
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentImage ? 'Click to replace' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={16} />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Image Requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Main image: Primary product photo (displayed first)</li>
              <li>10kg, 25kg, 50kg images: Show the product in different weight packages</li>
              <li>All images should be high quality and clearly show the product</li>
              <li>Maximum file size: 5MB per image</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiImageUpload; 