import {
  getContent,
  getDate,
  getTitle,
  getTypeAUrlList,
  getWriter,
  makeFilePathPublic,
  type typeANotice,
} from "./type-a.ts";

/**
 * @param page 탐색할 페이지 번호
 * @param category 탐색할 카테고리 번호, 1: 학부, 2: 대학원, 3: 취업정보
 * @returns 해당 페이지의 공지사항 URL 리스트를 반환합니다.
 */
export async function getEeUrlList(
  page: number,
  category: number,
): Promise<string[]> {
  const eeCategory = {
    1: "undernotice",
    2: "undernotice",
    3: "job",
  }[category];
  if (!eeCategory) throw Error("Invalid category number");
  const mainUrl =
    `https://ee.korea.ac.kr/community/${eeCategory}.html?&page=${page}`;
  const hrefList = await getTypeAUrlList(mainUrl, `${eeCategory}_view`);
  return hrefList.map((x) => "https://ee.korea.ac.kr/community/" + x);
}
