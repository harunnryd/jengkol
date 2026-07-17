const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface Agency {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export async function listAgencies(): Promise<Agency[]> {
  const response = await fetch(`${API_URL}/agencies`);
  if (!response.ok) {
    throw new Error(`Failed to load agencies: ${response.status}`);
  }
  return response.json();
}
