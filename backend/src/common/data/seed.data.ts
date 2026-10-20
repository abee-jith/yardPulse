import { daysAgo } from "../../utils/helper";
import { USER_ROLE, LINE_CODE, HOLD_TYPE, CONTAINER_STATUS } from "../enum";

const SEED_USERS = [
  {
    fullName: "YardPulse Operator",
    email: "ops@yardpulse.test",
    password: "Operator#2026",
    role: USER_ROLE.OPERATOR,
    lineCode: null,
  },
  {
    fullName: "Alice",
    email: "alice@atlasline.test",
    password: "Customer#2026",
    role: USER_ROLE.CUSTOMER,
    lineCode: LINE_CODE.ALN,
  },
  {
    fullName: "Bob",
    email: "bob@borealis.test",
    password: "Customer#2026",
    role: USER_ROLE.CUSTOMER,
    lineCode: LINE_CODE.BRL,
  },
];

const VISITS = [
  {
    visitRef: "ATL-2641E",
    vesselName: "Gulf Horizon",
    eta: daysAgo(12, 6),
    ata: daysAgo(12, 7),
    atd: daysAgo(11, 18),
  },
  {
    visitRef: "ATL-2642E",
    vesselName: "Arabian Star",
    eta: daysAgo(7, 8),
    ata: daysAgo(7, 9),
    atd: daysAgo(6, 20),
  },
  {
    visitRef: "ATL-2643E",
    vesselName: "Ocean Pearl",
    eta: daysAgo(3, 7),
    ata: daysAgo(3, 8),
    atd: null,
  },
];

const CONTAINERS = [
  {
    containerNo: "ALNU1234567",
    lineCode: LINE_CODE.ALN,
    sizeFt: 40,
    status: CONTAINER_STATUS.IN_YARD,
    dischargedAt: daysAgo(2, 10),
    yardLocation: "A01-01-01",
    gateOutAt: null,
  },
  {
    containerNo: "ALNU7654321",
    lineCode: LINE_CODE.ALN,
    sizeFt: 20,
    status: CONTAINER_STATUS.IN_YARD,
    dischargedAt: daysAgo(3, 14),
    yardLocation: "A01-02-01",
    gateOutAt: null,
  },
  {
    containerNo: "ALNU5550001",
    lineCode: LINE_CODE.ALN,
    sizeFt: 40,
    status: CONTAINER_STATUS.DEPARTED,
    dischargedAt: daysAgo(10, 0),
    yardLocation: null,
    gateOutAt: daysAgo(8, 16),
  },
  {
    containerNo: "BRLU0000017",
    lineCode: LINE_CODE.BRL,
    sizeFt: 20,
    status: CONTAINER_STATUS.IN_YARD,
    dischargedAt: daysAgo(1, 8),
    yardLocation: "B01-01-01",
    gateOutAt: null,
  },
];

const HOLD_SEEDS = [
  {
    containerNo: "ALNU7654321",
    holdType: HOLD_TYPE.CUSTOMS,
    note: "Customs inspection required",
  },
  {
    containerNo: "BRLU1000001",
    holdType: HOLD_TYPE.CUSTOMS,
    note: "Seeded active hold for BRL",
  },
  {
    containerNo: "CRXU1000002",
    holdType: HOLD_TYPE.INSPECTION,
    note: "Seeded active hold for CRX",
  },
];

export { SEED_USERS, VISITS, CONTAINERS, HOLD_SEEDS };
