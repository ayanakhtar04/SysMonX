export interface Vm {
  id: string;
  name: string;
  ip: string;
  createdAt: string;
}

export interface CreateVmRequest {
  name: string;
  ip: string;
}
