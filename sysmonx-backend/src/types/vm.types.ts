export interface VmRecord {
  id: string;
  name: string;
  ip: string;
  createdAt: string;
}

export interface CreateVmPayload {
  name: string;
  ip: string;
}
