
const API_URL = "/api/files/storage/usage";

export const getStorageUsage = async () => {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  const response = await fetch(API_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Unable to fetch storage usage."
    );
  }

  return data.storage;
};
