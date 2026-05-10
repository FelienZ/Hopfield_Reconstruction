import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30000,
});

export interface IdentifyResponse {
  status: "AUTHORIZED" | "DENIED";
  matched_id: number;
  diagnostics: {
    initial_energy: number;
    converged_energy: number | null;
    ideal_energy: number | null;
  };
  reconstructed_image: string | null;
}

export const identifyFingerprint = async (file: File): Promise<IdentifyResponse> => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await api.post<IdentifyResponse>("/api/recognize", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
