import type { NoticeInfo, KupidType } from "./types.ts";
import { getToken, trim } from "./utils.ts";

interface GrwResponse {
  grwSessionId: string;
  html: string;
}

interface NoticeViewParameters {
  kind: string;
  index: string;
  message_id: string;
  replyTop: string;
  replyPos: string;
  replyTo: string;
  rowReply: string;
  depth: string;
}

async function getNoticeListPage(
  token: string,
  session: string,
  kind: string
): Promise<GrwResponse> {
  const url = `https://grw.korea.ac.kr/GroupWare/user/NoticeList.jsp?kind=${kind}&compId=148&menuCd=340&language=ko&frame=&token=${token}&orgtoken=${token}`;
  const cookieString = `ssotoken=${token}; PORTAL_SESSIONID=${session};`;
  const response = await fetch(url, {
    headers: {
      referer: "https://portal.korea.ac.kr/",
      cookie: cookieString,
    },
  });
  const [cookies] = response.headers.getSetCookie();
  if (!cookies) throw Error("Failed to get cookies");
  const [grwSessionCookie] = cookies.split(";");
  if (!grwSessionCookie) throw Error("Failed to get grwSessionCookie");
  const [_, grwSessionId] = grwSessionCookie.split("=");
  if (!grwSessionId) throw Error("Failed to get grwSessionId");

  const stream = await response.arrayBuffer();
  const decoder = new TextDecoder("euc-kr");
  const html = decoder.decode(stream);
  return { grwSessionId, html };
}

function parseNoticeParamsFromHTML(html: string): Array<NoticeViewParameters> {
  const hrefs = html.match(/javascript\:view\((.+)\);/g);
  if (!hrefs) throw Error("Failed to parse html");

  return hrefs.map((href) => {
    const matchArray = href.match(/\d+/g);
    if (!matchArray) throw Error("Failed to parse href");
    const [kind, index, message_id, replyTop, replyPos, replyTo, rowReply, depth] = matchArray;
    return {
      kind,
      index,
      message_id,
      replyTop,
      replyPos,
      replyTo,
      rowReply,
      depth,
    };
  });
}
function parseScheduleParamsFromHTML(html: string): Array<NoticeViewParameters> {
  const hrefs = html.match(/javascript\:view1\((.+)\);/g);
  if (!hrefs) throw Error("Failed to parse html");

  return hrefs.map((href) => {
    const matchArray = href.match(/\d+/g);
    if (!matchArray) throw Error("Failed to parse href");
    const [_, kind, index, message_id, replyTop, replyPos, replyTo, rowReply, depth] = matchArray;
    return {
      kind,
      index,
      message_id,
      replyTop,
      replyPos,
      replyTo,
      rowReply,
      depth,
    };
  });
}

function getNoticeUrl(token: string, params: NoticeViewParameters) {
  return `https://grw.korea.ac.kr/GroupWare/user/NoticeView.jsp?language=ko&WhereSelect=all&KeyWord=&tab=&temp=&JOB_MODE=Q&JOBMODE=I&hdCurrPage=1&hdListCount=100&hdPageCount=5&hdPageList=&userid=&index=${params.index}&message_id=${params.message_id}&replyTop=${params.replyTop}&replyPos=${params.replyPos}&replyTo=${params.replyTo}&rowReply=${params.rowReply}&depth=${params.depth}&kind=${params.kind}&type=0&mode=0&flag=&access_type=Y&calIndex=&token=${token}`;
}

async function fetchNotice(
  token: string,
  session: string,
  grwSession: string,
  url: string,
  kind: string
) {
  const cookieString = `ssotoken=${token}; PORTAL_SESSIONID=${session}; GRW_SESSIONID=${grwSession};`;
  const response = await fetch(url, {
    headers: {
      referer: `https://grw.korea.ac.kr/GroupWare/user/NoticeList.jsp?kind=${kind}`,
      cookie: cookieString,
    },
  });
  const stream = await response.arrayBuffer();
  const decoder = new TextDecoder("euc-kr");
  const html = decoder.decode(stream).replace(/euc\-kr/g, "utf-8");
  return html.replace(/\<input type="button"/g, '<input type="button" style="display:none"');
}

function makeFilePathPublic(html: string) {
  return html.replace(/javascript\:Download\((.+)\);/g, (match, p1: string) => {
    const params = p1.split(",").map((p) => p.trim().replace(/'/g, ""));
    return `https://portal.korea.ac.kr/common/Download.kpd?filePath=${params[0]}&fileName=${params[1]}`;
  });
}

async function getNoticesFromKupid(id: string, password: string): Promise<string[]> {
  const { token, sessionId } = await getToken(id, password);
  const { grwSessionId, html } = await getNoticeListPage(token, sessionId, "11");
  const params = parseNoticeParamsFromHTML(html);
  const urls = params.map((param) => getNoticeUrl(token, param));

  return Promise.all(
    urls.map(async (url) => {
      const html = await fetchNotice(token, sessionId, grwSessionId, url, "11");
      return makeFilePathPublic(html);
    })
  );
}

async function getSchedulesFromKupid(id: string, password: string): Promise<string[]> {
  const { token, sessionId } = await getToken(id, password);
  const { grwSessionId, html } = await getNoticeListPage(token, sessionId, "89");
  const params = parseScheduleParamsFromHTML(html);
  const urls = params.map((param) => getNoticeUrl(token, param));
  return Promise.all(
    urls.map(async (url) => {
      const html = await fetchNotice(token, sessionId, grwSessionId, url, "89");
      return makeFilePathPublic(html);
    })
  );
}

async function getScholarFromKupid(id: string, password: string): Promise<string[]> {
  const { token, sessionId } = await getToken(id, password);
  const { grwSessionId, html } = await getNoticeListPage(token, sessionId, "88");
  const params = parseNoticeParamsFromHTML(html);
  const urls = params.map((param) => getNoticeUrl(token, param));
  return Promise.all(
    urls.map(async (url) => {
      const html = await fetchNotice(token, sessionId, grwSessionId, url, "88");
      return makeFilePathPublic(html);
    })
  );
}

function parseNoticeInfo(html: string): NoticeInfo {
  const tableRows = html.split("<tr>").slice(1);
  tableRows[tableRows.length - 1] = tableRows[tableRows.length - 1].split("</tr>")[0];
  const rawWriter = tableRows[0].match(/\<td\>(.+)\<\/td\>/);
  if (!rawWriter) throw Error("Failed to parse writer");
  const writer = trim(rawWriter[1]);

  const rawDate = tableRows[2].match(/\<td colspan="\d"\>(.+)\<\/td\>/);
  if (!rawDate) throw Error("Failed to parse date");
  const date = trim(rawDate[1]);

  const rawTitle = tableRows[4].match(/\<td colspan="\d"\>(.+)\<\/td\>/);
  if (!rawTitle) throw Error("Failed to parse title");
  const title = trim(rawTitle[1]);

  const rawContent = tableRows.slice(5).join("");
  const content = `<tbody>${rawContent}</tbody>`;
  const rawId = html.match(/\<input type="hidden" name="index" value="(.+)"\/\>/);
  if (!rawId) throw Error("Failed to parse id");
  const id = rawId[1].trim();
  const url = `https://portal.korea.ac.kr/front/IntroNotice/NMainNoticeContent.kpd?idx=${id}&seq=`;
  return {
    id,
    title,
    date,
    writer,
    content,
    url,
  };
}

function parseScheduleInfo(html: string): NoticeInfo {
  const tableRows = html.split("<tr>").slice(1);
  tableRows[tableRows.length - 1] = tableRows[tableRows.length - 1].split("</tr>")[0];
  const rawWriter = tableRows[0].match(/\<td\>(.+)\<\/td\>/);
  if (!rawWriter) throw Error("Failed to parse writer");
  const writer = trim(rawWriter[1]);

  const rawDate = tableRows[1].split("<td>")[1].split("</td>")[0];
  if (!rawDate) throw Error("Failed to parse date");
  const date = trim(rawDate).trim().replace(/\n/g, "").replace(/\t/g, "").replace(/ /g, "");

  const rawTitle = tableRows[4].match(/\<td colspan="\d"\>(.+)\<\/td\>/);
  if (!rawTitle) throw Error("Failed to parse title");
  const title = trim(rawTitle[1]);

  const rawContent = tableRows.slice(5).join("");
  const content = `<tbody>${rawContent}</tbody>`;
  const rawId = html.match(/\<input type="hidden" name="index" value="(.+)"\/\>/);
  if (!rawId) throw Error("Failed to parse id");
  const id = rawId[1].trim();
  const url = `https://portal.korea.ac.kr/front/IntroNotice/NMainNoticeContent.kpd?idx=${id}&seq=`;
  return {
    id,
    title,
    date,
    writer,
    content,
    url,
  };
}

function parseScholarInfo(html: string): NoticeInfo {
  const tableRows = html.split("<tr>").slice(1);
  tableRows[tableRows.length - 1] = tableRows[tableRows.length - 1].split("</tr>")[0];
  const rawWriter = tableRows[0].match(/\<td\>(.+)\<\/td\>/);
  if (!rawWriter) throw Error("Failed to parse writer");
  const writer = trim(rawWriter[1]);

  const rawDate = tableRows[2].match(/\<td colspan="\d"\>(.+)\<\/td\>/);
  if (!rawDate) throw Error("Failed to parse date");
  const date = trim(rawDate[1]);

  const rawTitle = tableRows[4].match(/\<td colspan="\d"\>(.+)\<\/td\>/);
  if (!rawTitle) throw Error("Failed to parse title");
  const title = trim(rawTitle[1]);

  const rawContent = tableRows.slice(5).join("");
  const content = `<tbody>${rawContent}</tbody>`;
  const rawId = html.match(/\<input type="hidden" name="index" value="(.+)"\/\>/);
  if (!rawId) throw Error("Failed to parse id");
  const id = rawId[1].trim();
  const url = `https://portal.korea.ac.kr/front/IntroNotice/NMainNoticeContent.kpd?idx=${id}&seq=`;
  return {
    id,
    title,
    date,
    writer,
    content,
    url,
  };
}

/** notice content from KUPID. */
export function fetchKupidNotices(
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

/** return metadata and notice content from KUPID. */
export async function fetchParsedKupidNotices(
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
