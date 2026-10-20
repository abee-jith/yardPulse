enum USER_ROLE {
  CUSTOMER = "Customer",
  OPERATOR = "Operator",
}

enum LINE_CODE {
  ALN = "ALN",
  BRL = "BRL",
  CRX = "CRX",
}

enum CONTAINER_SIZE_FT {
  FT20 = 20,
  FT40 = 40,
  FT45 = 45,
}

enum FREIGHT_KIND {
  FULL = "Full",
  EMPTY = "Empty",
}

enum CONTAINER_STATUS {
  ON_VESSEL = "On vessel",
  IN_YARD = "In yard",
  DEPARTED = "Departed",
}

enum HOLD_TYPE {
  CUSTOMS = "Customs",
  LINE = "Line",
  INSPECTION = "Inspection",
  TERMINAL = "Terminal",
}

enum CONTAINER_EVENT_TYPE {
  DISCHARGED = "Discharged",
  YARD_MOVE = "Yard move",
  HOLD_PLACED = "Hold placed",
  HOLD_RELEASED = "Hold released",
  APPOINTMENT_BOOKED = "Appointment booked",
  APPOINTMENT_CANCELLED = "Appointment cancelled",
  GATE_OUT = "Gate out",
}

enum APPOINTMENT_STATUS {
  BOOKED = "Booked",
  CANCELLED = "Cancelled",
  COMPLETED = "Completed",
}

export {
  USER_ROLE,
  LINE_CODE,
  CONTAINER_SIZE_FT,
  FREIGHT_KIND,
  CONTAINER_STATUS,
  HOLD_TYPE,
  CONTAINER_EVENT_TYPE,
  APPOINTMENT_STATUS,
};
