import { trim, convertRelativeImgPath } from "../utils";
import type { NoticeInfo } from "../type.d";

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
for (const type in MEDIA_PATH_MAP) {
  MEDIA_URL_MAP[type as MediaCollegeType] = `${MEDIA_BASE_URL}${
    MEDIA_PATH_MAP[type as MediaCollegeType]
  }`;
}

/**
 *
 * @param type 가져올 공지사항 카테고리
 * @returns 해당 카테고리 공지사항 최근 10개의 content HTML, 제목, 작성자, 게시일자, KUPID 내부 id, public URL을 반환합니다.
 */
export async function fetchNoticeInfos(type: MediaCollegeType): Promise<NoticeInfo[]> {
  const url = MEDIA_URL_MAP[type];
  const response = await fetch(url);
  const html = await response.text();

  const noticeInfo = parseNoticeRowsFromTable(html, url);
  return Promise.all(
    noticeInfo.map(async (info) => ({ ...info, content: await getNoticeContent(info.url) }))
  );
}

function parseNoticeRowsFromTable(html: string, hostPath: string): Omit<NoticeInfo, "content">[] {
  const tableRegex = /<tbody>([\s\S]+?)<\/tbody>/;
  const tableMatch = html.match(tableRegex);

  if (!tableMatch) {
    throw new Error("Failed to parse tbody");
  }
  const rowRegex = /<tr[^>]*>([\s\S]+?)<\/tr>/g;
  const rows = tableMatch[1].matchAll(rowRegex);
  if (!rows) throw new Error("Failed to parse rows");

  const result: Omit<NoticeInfo, "content">[] = [];

  for (const row of rows) {
    const td = row[1].match(/<td[^>]*>([\s\S]+?)<\/td>/g);
    if (!td) throw new Error("Failed to parse td");

    const title = trim(
      td[1]
        .replace(/<[^>]+>/g, "")
        .replace(/(&nbsp;)+/g, " ")
        .replace(/\n/g, "")
        .replace(/\t/g, "")
        .replace(/&amp;/g, "&")
    ).trim();

    const urlMatch = td[1].match(/href="([^"]+?)"/);
    if (!urlMatch) throw new Error("Failed to parse url");
    const url = `${hostPath}${urlMatch[1].replace(/&amp;/g, "&")}`;

    const idMatch = url.match(/articleNo=(\d+)/);
    if (!idMatch) throw new Error("Failed to parse id");
    const id = idMatch[1];

    const writer = td[2].replace(/<[^>]+>/g, "");

    const date = td[4].replace(/<[^>]+>/g, "");
    result.push({
      title,
      url,
      id,
      writer,
      date,
    });
  }
  return result;
}

async function getNoticeContent(url: string): Promise<string> {
  const response = await fetch(url);
  const html = await response.text();
  const td = html.match(/<td[^>]*>([\s\S]+?)<\/td>/g);
  if (!td) throw new Error("Failed to parse td");

  const title = td[0].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");

  const content = convertRelativeImgPath(
    td[1]
      .replace(/&nbsp;/g, " ")
      .replace(/(\t)+/g, " ")
      .replace(/(\n)+/g, "\n"),
    MEDIA_BASE_URL
  );

  const files = td[2].replace(/&amp;/g, "&");
  const [hostPath, _] = url.split("?");
  const filePaths = files.replaceAll(`href="`, `href="${hostPath}`);
  if (!filePaths) throw new Error("Failed to parse files");

  const result = `<h3>${title}</h3>${content}${filePaths}`;
  return result;
}
