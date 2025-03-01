// Este servicio maneja la carga de imágenes a Cloudinary

const CLOUDINARY_UPLOAD_URL =
  "https://api.cloudinary.com/v1_1/dpnmheei1/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default"; // Configura esto en el dashboard de Cloudinary

export const uploadToCloudinary = async (base64Image) => {
  try {
    // Eliminar el prefijo "data:image/jpeg;base64," si existe
    const base64Data = base64Image.includes("base64,")
      ? base64Image.split("base64,")[1]
      : base64Image;

    // Crear el objeto FormData para la solicitud
    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${base64Data}`);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    // Realizar la solicitud a Cloudinary
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Error uploading to Cloudinary");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  }
};

// Función de apoyo para usar cuando no podemos cargar a Cloudinary
export const getApiImageUrl = (text) => {
  return `https://api.a0.dev/assets/image?text=${encodeURIComponent(
    text
  )}&aspect=1:1&seed=${Date.now()}`;
};
