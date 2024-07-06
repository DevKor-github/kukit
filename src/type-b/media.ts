import type { NoticeInfo } from "../type.d.ts";
import { getNoticeContent, parseNoticeRowsFromTable } from "./type-b.ts";

export type MediaCollegeType =
  | "미디어학부 공지사항"
  | "미디어학부 채용정보"
  | "미디어학부 공모전·행사"
  | "미디어학부 소식"
  | "미디어학부 일반대학원 공지사항"
  | "미디어학부 미디어대학원 공지사항";

const MEDIA_BASE_URL = "https://mediacom.korea.ac.kr";

const MEDIA_PATH_MAP: Record<MediaCollegeType, string> = {
  "미디어학부 공지사항": "/mediacom/faculty/notice.do",
  "미디어학부 채용정보": "/mediacom/faculty/worknotice.do",
  "미디어학부 공모전·행사": "/mediacom/faculty/contestnotice.do",
  "미디어학부 소식": "/mediacom/faculty/notice2.do",
  "미디어학부 일반대학원 공지사항": "/mediacom/grad/notice.do",
  "미디어학부 미디어대학원 공지사항": "/mediacom/media_grad/notice.do",
};

const MEDIA_URL_MAP: Record<MediaCollegeType, string> = {} as Record<MediaCollegeType, string>;
for (const type in MEDIA_PATH_MAP)
  MEDIA_URL_MAP[type as MediaCollegeType] =
    MEDIA_BASE_URL + MEDIA_PATH_MAP[type as MediaCollegeType];

/**
 *
 * @param type 가져올 공지사항 카테고리
 * @returns 해당 카테고리 공지사항 최근 10개의 content HTML, 제목, 작성자, 게시일자, KUPID 내부 id, public URL을 반환합니다.
 */
export async function fetchMediaNotices(type: MediaCollegeType): Promise<NoticeInfo[]> {
  const url = MEDIA_URL_MAP[type];
  const response = await fetch(url);
  const html = await response.text();

  const noticeInfo = parseNoticeRowsFromTable(html, url);
  return Promise.all(
    noticeInfo.map(async (info) => ({ ...info, content: await getNoticeContent(info.url) }))
  );
}
