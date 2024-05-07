export { getToken } from "./token.ts";
export {
  getNoticesFromKupid,
  getSchedulesFromKupid,
  getScholarFromKupid,
  type NoticeInfo,
  parseNoticeInfo,
  parseScheduleInfo,
  parseScholarInfo,
} from "./kupid.ts";
export { type KupidType, fetchKupidNotices, fetchParsedKupidNoptices } from "./wrapper.ts";
