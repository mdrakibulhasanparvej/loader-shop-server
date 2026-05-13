export const normalizeImageUrls = (images: any): string[] => {
  if (Array.isArray(images)) {
    return images.filter(
      (img) => typeof img === "string" && img.trim().length > 0,
    );
  }
  if (typeof images === "string" && images.trim().length > 0) {
    return [images.trim()];
  }
  return [];
};

export const createSlugFromName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};
