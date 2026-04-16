import { v4 as uuidv4 } from 'uuid';
import type { CreateVmPayload, VmRecord } from '../types/vm.types';
import { isValidIp } from '../utils/ipValidator';

const vms: VmRecord[] = [];

export class VmService {
  getAll(): VmRecord[] {
    return [...vms];
  }

  getById(id: string): VmRecord | null {
    return vms.find((vm) => vm.id === id) ?? null;
  }

  create(payload: CreateVmPayload): VmRecord {
    const name = payload.name.trim();
    const ip = payload.ip.trim();

    if (!name) {
      throw new Error('VM name is required');
    }
    if (!isValidIp(ip)) {
      throw new Error('Invalid IPv4 address');
    }

    const record: VmRecord = {
      id: uuidv4(),
      name,
      ip,
      createdAt: new Date().toISOString(),
    };

    vms.push(record);
    return record;
  }
}

export const vmService = new VmService();
