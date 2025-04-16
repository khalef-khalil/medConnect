export interface Doctor {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  specialization: string;
}

export interface Patient {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
}

export interface Appointment {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startTime: string; // ISO date
  endTime: string; // ISO date
  status: AppointmentStatus;
  appointmentType: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  patientName?: string;
  doctorName?: string;
  patientDetails?: Patient;
  doctorDetails?: Doctor;
}

export type AppointmentStatus = 'pending' | 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  startTime: string; // ISO date
  endTime: string; // ISO date
  appointmentType: string;
  notes?: string;
}

export interface UpdateAppointmentPayload {
  status?: AppointmentStatus;
  notes?: string;
}

export interface AvailabilitySlot {
  startTime: string; // ISO date
  endTime: string; // ISO date
}

export interface DailyAvailability {
  date: string; // YYYY-MM-DD
  slots: AvailabilitySlot[];
}

export interface DoctorAvailability {
  doctorId: string;
  availableSlots: DailyAvailability[];
} 