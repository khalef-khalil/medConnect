export interface ISchedule {
  scheduleId: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IScheduleCreateRequest {
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

export interface IScheduleUpdateRequest {
  startTime?: string;
  endTime?: string;
  slotDuration?: number;
}

export interface IScheduleResponse {
  schedules: ISchedule[];
  count: number;
  doctorDetails?: {
    userId: string;
    firstName: string;
    lastName: string;
    specialization: string;
    profileImage: string;
  };
}

export interface IScheduleError {
  status: number;
  message: string;
} 