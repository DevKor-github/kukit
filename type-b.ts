import type { NoticeInfo } from "./types.ts";
import { convertRelativePaths, extractBaseUrl, trim } from "./utils.ts";

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
  const baseUrl = extractBaseUrl(url);

  const content = convertRelativePaths(
    td[1]
      .replace(/&nbsp;/g, " ")
      .replace(/(\t)+/g, " ")
      .replace(/(\n)+/g, "\n"),
    baseUrl
  );

  const files = td[2].replace(/&amp;/g, "&");
  const [hostPath, _] = url.split("?");
  const filePaths = files.replaceAll(`href="`, `href="${hostPath}`);
  if (!filePaths) throw new Error("Failed to parse files");

  const result = `<h3>${title}</h3>${content}${filePaths}`;
  return result;
}

export type TypeBProvider = "미디어학부" | "정보대학";

export type TypeBCategory =
  | "미디어학부 공지사항"
  | "미디어학부 채용정보"
  | "미디어학부 공모전·행사"
  | "미디어학부 소식"
  | "미디어학부 일반대학원 공지사항"
  | "미디어학부 미디어대학원 공지사항"
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
const MEDIA_BASE_URL = "https://mediacom.korea.ac.kr";

const TYPE_B_RELATIVE_PATH_MAP: Record<TypeBCategory, string> = {
  "미디어학부 공지사항": "/mediacom/faculty/notice.do",
  "미디어학부 채용정보": "/mediacom/faculty/worknotice.do",
  "미디어학부 공모전·행사": "/mediacom/faculty/contestnotice.do",
  "미디어학부 소식": "/mediacom/faculty/notice2.do",
  "미디어학부 일반대학원 공지사항": "/mediacom/grad/notice.do",
  "미디어학부 미디어대학원 공지사항": "/mediacom/media_grad/notice.do",
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

const TYPE_B_CATEGORY_NAME_BASE_URL_MAP: Record<TypeBProvider, string> = {
  미디어학부: MEDIA_BASE_URL,
  정보대학: INFO_BASE_URL,
};
const TYPE_B_URL_MAP: Record<TypeBCategory, string> = {} as Record<TypeBCategory, string>;
for (const type in TYPE_B_RELATIVE_PATH_MAP) {
  const providerName = type.split(" ")[0] as TypeBProvider;
  TYPE_B_URL_MAP[type as TypeBCategory] =
    TYPE_B_CATEGORY_NAME_BASE_URL_MAP[providerName] +
    TYPE_B_RELATIVE_PATH_MAP[type as TypeBCategory];
}

/** notice content from type-B web. */
export async function fetchTypeBNotices(type: TypeBCategory): Promise<string[]> {
  const url = TYPE_B_URL_MAP[type];
  const response = await fetch(url);
  const html = await response.text();

  const noticeInfo = parseNoticeRowsFromTable(html, url);
  return Promise.all(noticeInfo.map((info) => getNoticeContent(info.url)));
}

/** return metadata and notice content from type-B web. */
export async function fetchParsedTypeBNotices(type: TypeBCategory): Promise<NoticeInfo[]> {
  const url = TYPE_B_URL_MAP[type];
  const response = await fetch(url);
  const html = await response.text();

  const noticeInfo = parseNoticeRowsFromTable(html, url);
  return Promise.all(
    noticeInfo.map(async (info) => ({ ...info, content: await getNoticeContent(info.url) }))
  );
}
