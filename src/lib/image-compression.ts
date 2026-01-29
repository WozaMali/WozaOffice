
/**
 * Compresses an image file for use in cards (smaller dimensions)
 */
export async function compressImageForCard(file: File): Promise<File> {
  return compressImage(file, 800, 0.8);
}

/**
 * Compresses an image file for use in slides (larger dimensions)
 */
export async function compressImageForSlide(file: File): Promise<File> {
  return compressImage(file, 1920, 0.8);
}

/**
 * Fetches an image from a URL and recompresses it
 */
export async function recompressImageFromUrl(url: string, isCard: boolean = false): Promise<File> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const filename = url.split('/').pop() || "image.jpg";
    const file = new File([blob], filename, { type: blob.type });
    return isCard ? compressImageForCard(file) : compressImageForSlide(file);
  } catch (error) {
    console.error("Error recompressing image:", error);
    throw error;
  }
}

async function compressImage(file: File, maxWidth: number, quality: number): Promise<File> {
  // If running on server side, return original file
  if (typeof window === 'undefined') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        // Draw white background for transparent images
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not compress image"));
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
