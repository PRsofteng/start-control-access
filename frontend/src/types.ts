// Employee types
export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  fullName: string;
  position: string;
  department: string;
  photo: string;
  registrationNumber: string;
  email: string;
  status: EmployeeStatus;
}

// RFID Tag types
export interface RFIDTag {
  uid: string;
  employeeId: string | null;
  isBlocked: boolean;
  assignedAt: string | null;
}

// Access Event types
export type AccessStatus = 'allowed' | 'denied';
export type DoorStatus = 'closed' | 'opening' | 'open' | 'closing';

export interface AccessEvent {
  id: string;
  employeeName: string;
  employeeId: string;
  tagUid: string;
  entryTime: string;
  exitTime: string | null;
  status: AccessStatus;
  reason: string | null;
}

// Filtering types for logs
export interface LogFilters {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  department?: string;
  status?: AccessStatus;
}

// Dashboard statistics
export interface AccessStatistics {
  totalAccesses: number;
  authorizedAccesses: number;
  unauthorizedAccesses: number;
  currentPeopleCount: number;
}

// Time periods for statistics
export type TimePeriod = 'today' | 'week' | 'month';

// Chart data types
export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface AccessChart {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
  }[];
}