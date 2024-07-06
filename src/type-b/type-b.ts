import { trim, convertRelativeImgPath, extractBaseUrl } from "../utils.ts";
import type { NoticeInfo } from "../type.d.ts";

export function parseNoticeRowsFromTable(
  html: string,
  hostPath: string
): Omit<NoticeInfo, "content">[] {
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

export async function getNoticeContent(url: string): Promise<string> {
  const response = await fetch(url);
  const html = await response.text();
  const td = html.match(/<td[^>]*>([\s\S]+?)<\/td>/g);
  if (!td) throw new Error("Failed to parse td");

  const title = td[0].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
  const baseUrl = extractBaseUrl(url);

  const content = convertRelativeImgPath(
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
