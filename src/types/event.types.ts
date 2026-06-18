export type EventRecord = {
  eventId: string;
  name: string;
  startTime: string;
  endTime: string;
  pricingPerHour: number;
  capacity: number;
  bookedCustomers: number;
  createdAt: string;
  updatedAt: string;
};

export type EventRecordInput = {
  eventId?: string;
  name: string;
  startTime: string;
  endTime: string;
  pricingPerHour: number;
  capacity: number;
  bookedCustomers?: number;
};

export type EventRangeInput = {
  startTime: string;
  endTime: string;
};
