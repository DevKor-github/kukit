import {
  getScholarFromKupid,
  getSchedulesFromKupid,
  getNoticesFromKupid,
  parseScholarInfo,
  parseScheduleInfo,
  parseNoticeInfo,
} from "./kupid.ts";

export type KupidType = "Scholar" | "Notice" | "Schedule";
export interface NoticeInfo {
  id: string;
  title: string;
  date: string;
  writer: string;
  content: string;
  url: string;
}
/**
 *
 * @param id KUPID id
 * @param password KUPID password
 * @param type 장학공지 Scholar, 일반공지 Notice, 학사일정 Schedule
 * @returns KUPID의 해당 카테고리 공지사항 최근 10개의 raw HTML string array를 반환합니다.
 */
export async function fetchKupidNotices(
  id: string,
  password: string,
  type: KupidType
): Promise<string[]> {
  switch (type) {
    case "Scholar":
      return getScholarFromKupid(id, password);
    case "Notice":
      return getNoticesFromKupid(id, password);
    case "Schedule":
      return getSchedulesFromKupid(id, password);
    default:
      throw new Error("Invalid Type");
  }
}

/**
 *
 * @param id KUPID id
 * @param password KUPID password
 * @param type 장학공지 Scholar, 일반공지 Notice, 학사일정 Schedule
 * @returns KUPID의 해당 카테고리 공지사항 최근 10개의 content HTML, 제목, 작성자, 게시일자, KUPID 내부 id, public URL을 반환합니다.
 */
export async function fetchParsedKupidNoptices(
  id: string,
  password: string,
  type: KupidType
): Promise<NoticeInfo[]> {
  const htmls = await fetchKupidNotices(id, password, type);
  switch (type) {
    case "Scholar":
      return htmls.map(parseScholarInfo);
    case "Notice":
      return htmls.map(parseNoticeInfo);
    case "Schedule":
      return htmls.map(parseScheduleInfo);
    default:
      throw new Error("Invalid Type");
  }
}
