import { USER_ROLE, LINE_CODE } from "../enum";

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

export { SEED_USERS };
