import type { Request, Response } from 'express';
import { vmService } from '../services/vm.service';
import { metricsService } from '../services/metrics.service';
import type { CreateVmPayload } from '../types/vm.types';
import type { VmMetricsResponse, VmStatusResponse } from '../types/metrics.types';
import type { ApiErrorResponse } from '../server';

export class VmController {
  getAll = (_req: Request, res: Response): void => {
    const vms = vmService.getAll();
    res.json(vms);
  };

  create = (req: Request, res: Response<VmMetricsResponse | ApiErrorResponse>): void => {
    const body = req.body as Partial<CreateVmPayload>;

    if (!body || typeof body.name !== 'string' || typeof body.ip !== 'string') {
      const errorBody: ApiErrorResponse = {
        error: 'Invalid request body. Expected "name" and "ip" fields.',
      };
      res.status(400).json(errorBody as unknown as VmMetricsResponse);
      return;
    }

    try {
      const vm = vmService.create({ name: body.name, ip: body.ip });
      res.status(201).json(vm as unknown as VmMetricsResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create VM';
      const errorBody: ApiErrorResponse = { error: message };
      res.status(400).json(errorBody as unknown as VmMetricsResponse);
    }
  };

  getMetrics = async (req: Request, res: Response<VmMetricsResponse | ApiErrorResponse>): Promise<void> => {
    const vmId = req.params.id;
    const vm = vmService.getById(vmId);
    if (!vm) {
      const body: ApiErrorResponse = { error: 'VM not found' };
      res.status(404).json(body as unknown as VmMetricsResponse);
      return;
    }

    try {
      const metrics = await metricsService.fetchMetricsForIp(vm.ip);
      res.json(metrics);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reach Node Exporter';
      const body: ApiErrorResponse = {
        error: 'Unable to retrieve metrics from VM',
        details: message,
      };
      res.status(502).json(body as unknown as VmMetricsResponse);
    }
  };

  getStatus = async (req: Request, res: Response<VmStatusResponse | ApiErrorResponse>): Promise<void> => {
    const vmId = req.params.id;
    const vm = vmService.getById(vmId);
    if (!vm) {
      const body: ApiErrorResponse = { error: 'VM not found' };
      res.status(404).json(body as unknown as VmStatusResponse);
      return;
    }

    try {
      const status = await metricsService.fetchStatusForIp(vm.ip);
      res.json(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reach Node Exporter';
      const body: ApiErrorResponse = {
        error: 'Unable to retrieve status from VM',
        details: message,
      };
      res.status(502).json(body as unknown as VmStatusResponse);
    }
  };
}

export const vmController = new VmController();
