export type BatchJobType = 
  | 'bulk-email'
  | 'bulk-export'
  | 'bulk-update'
  | 'bulk-delete'
  | 'bulk-import';

export interface BatchJobData {
  type: BatchJobType;
  items: any[];
  options?: any;
}

export interface BatchProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ item: any; error: string }>;
}

export interface BatchJobStatus {
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  result?: BatchProgress;
}

export interface BatchJobResponse {
  jobId: string;
  itemCount: number;
  message: string;
}
