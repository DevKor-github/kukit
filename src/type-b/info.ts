import { trim } from "../utils.ts";
import type { NoticeInfo } from "../type.d.ts";

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

const INFO_URL_MAP: Record<InfoCollegeType, string> = {
  "정보대학 학부 공지사항": "https://info.korea.ac.kr/info/board/notice_under.do",
  "정보대학 대학원 공지사항": "https://info.korea.ac.kr/info/board/notice_grad.do",
  "정보대학 학부 장학공지": "https://info.korea.ac.kr/info/board/scholarship_under.do",
  "정보대학 대학원 장학공지": "https://info.korea.ac.kr/info/board/scholarship_grad.do",
  "정보대학 행사 및 소식": "https://info.korea.ac.kr/info/board/news.do",
  "정보대학 진로정보 - 채용": "https://info.korea.ac.kr/info/board/course_job.do",
  "정보대학 진로정보 - 교육": "https://info.korea.ac.kr/info/board/course_program.do",
  "정보대학 진로정보 - 인턴": "https://info.korea.ac.kr/info/board/course_intern.do",
  "정보대학 진로정보 - 공모전": "https://info.korea.ac.kr/info/board/course_competition.do",
};

/**
 *
 * @param type 가져올 공지사항 카테고리
 * @returns 해당 카테고리 공지사항 최근 10개의 content HTML, 제목, 작성자, 게시일자, KUPID 내부 id, public URL을 반환합니다.
 */
export async function fetchNoticeInfos(type: InfoCollegeType): Promise<NoticeInfo[]> {
  const url = INFO_URL_MAP[type];
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

  const content = td[1]
    .replace(/&nbsp;/g, " ")
    .replace(/(\t)+/g, " ")
    .replace(/(\n)+/g, "\n");

  const files = td[2].replace(/&amp;/g, "&");
  const [hostPath, _] = url.split("?");
  const filePaths = files.replaceAll(`href="`, `href="${hostPath}`);
  if (!filePaths) throw new Error("Failed to parse files");
  const result = `<h3>${title}</h3>${content}${filePaths}`;

  return result;
}
