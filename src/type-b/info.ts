import type { NoticeInfo } from "../type.d.ts";
import { getNoticeContent, parseNoticeRowsFromTable } from "./type-b.ts";

export type InfoCollegeType =
  | "정보대학 학부 공지사항"
  | "정보대학 대학원 공지사항"
  | "정보대학 학부 장학공지"
  | "정보대학 대학원 장학공지"
  | "정보대학 행사 및 소식"
  | "정보대학 진로정보 - 채용"
  | "정보대학 진로정보 - 교육"
  | "정보대학 진로정보 - 인턴"
  | "정보대학 진로정보 - 공모전";

const INFO_BASE_URL = "https://info.korea.ac.kr";

const INFO_PATH_MAP: Record<InfoCollegeType, string> = {
  "정보대학 학부 공지사항": "/info/board/notice_under.do",
  "정보대학 대학원 공지사항": "/info/board/notice_grad.do",
  "정보대학 학부 장학공지": "/info/board/scholarship_under.do",
  "정보대학 대학원 장학공지": "/info/board/scholarship_grad.do",
  "정보대학 행사 및 소식": "/info/board/news.do",
  "정보대학 진로정보 - 채용": "/info/board/course_job.do",
  "정보대학 진로정보 - 교육": "/info/board/course_program.do",
  "정보대학 진로정보 - 인턴": "/info/board/course_intern.do",
  "정보대학 진로정보 - 공모전": "/info/board/course_competition.do",
};

const INFO_URL_MAP: Record<InfoCollegeType, string> = {} as Record<InfoCollegeType, string>;
for (const type in INFO_PATH_MAP)
  INFO_URL_MAP[type as InfoCollegeType] = INFO_BASE_URL + INFO_PATH_MAP[type as InfoCollegeType];

/**
 *
 * @param type 가져올 공지사항 카테고리
 * @returns 해당 카테고리 공지사항 최근 10개의 content HTML, 제목, 작성자, 게시일자, KUPID 내부 id, public URL을 반환합니다.
 */
export async function fetchInfoNotices(type: InfoCollegeType): Promise<NoticeInfo[]> {
  const url = INFO_URL_MAP[type];
  const response = await fetch(url);
  const html = await response.text();

  const noticeInfo = parseNoticeRowsFromTable(html, url);
  return Promise.all(
    noticeInfo.map(async (info) => ({ ...info, content: await getNoticeContent(info.url) }))
  );
}
