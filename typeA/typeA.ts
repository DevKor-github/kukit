export interface typeANotice {
  title: string;
  date: string;
  writer: string;
  content: string;
  url: string;
  category: string;
}

/**
 * @param html fetch로 받아온 HTML
 * @param url 기본 사이트 URL
 * @returns HTML에서 파일 경로를 절대경로로 변환합니다.
 */
export function makeFilePathPublic(html: string, url: string): string {
  return html.replace(/\/ft_board\/(.+?)"/g, function (match) {
    return url + match;
  });
}

/**
 * @param url 공지사항 기본 페이지 url
 * @param form href에 붙는 form ex:undernotice_view 등
 * @returns 해당 페이지의 href 리스트를 반환합니다.
 */
export async function getTypeAUrlList(
  url: string,
  form: string,
): Promise<string[]> {
  const scrap = await fetch(url);
  const html = await scrap.text();
  const regex = new RegExp(`${form}\\.html\\?no=([0-9]+)`, "g");
  const matchArray = html.match(regex);
  if (!matchArray) throw Error("No match found");
  return matchArray;
}

/**
 * @param article fetch로 받아온 공지의 HTML
 * @param form p, span 등 제목을 감싸는 태그
 * @returns 공지의 title을 반환합니다.
 */
export function getTitle(article: string, form: string): string {
  const regex = new RegExp(
    `<${form} class="tit">(\\r\\n)?(.+)(\\r\\n)?(.*)<\\/${form}>`,
  );
  const rawTitle = article.match(regex);
  if (!rawTitle) throw Error("Failed to get title");
  const title = rawTitle[0].replace(/(<(\/?[a-z"\s=]+)>(\r\n)?\s*)+/g, "");
  return title.replace(/\s*/, "");
}

/**
 * @param article fetch로 받아온 공지의 HTML
 * @param form p, span 등 제목을 감싸는 태그
 * @returns 공지의 date를 반환합니다.
 */
export function getDate(article: string, form: string): string {
  const regex = new RegExp(`<${form} class="date">(.+)<\\/${form}>`);
  const rawDate = article.match(regex);
  if (!rawDate) throw Error("Failed to get date");
  return rawDate[1];
}

/**
 * @param article fetch로 받아온 공지의 HTML
 * @param name span의 class name
 * @returns 공지의 writer를 반환합니다.
 */
export function getWriter(article: string, name: string): string {
  const regex = new RegExp(`<span class="${name}">(.+)<\\/span>`);
  const rawWriter = article.match(regex);
  if (!rawWriter) throw Error("Failed to get writer");
  return rawWriter[1];
}

/**
 * @param article fetch로 받아온 공지의 HTML
 * @returns 공지의 content를 반환합니다.
 */
export function getContent(article: string): string {
  const rawMain = article.match(
    /<div class="contents_info">(.+)<div class="file_info">/s,
  );
  const rawFile = article.match(
    /<div class="file_info">(.+)<div class="list_info">/s,
  );
  if (!rawMain || !rawFile) throw Error("Failed to get content");
  const content = rawMain[0].replace(/<div class="file_info">/, "") +
    rawFile[0].replace(/<div class="list_info">/, "");
  return content;
}
