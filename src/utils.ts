export function convertRelativeImgPath(html: string, baseUrl: string): string {
  const imgTagRegex = /<img\s+[^>]*src="([^"]+)"[^>]*>/gi;

  return html.replace(imgTagRegex, (match, src) => {
    if (!src.startsWith("http")) {
      const absoluteUrl = baseUrl + src;
      return match.replace(src, absoluteUrl);
    }
    return match;
  });
}

export function trim(str: string): string {
  return str.replace(/\<(.+)\>/g, "").replace(/(&nbsp;)+/g, " ");
}

const firstDelimiter = `<input type="password" name="pw" id="_pw" value="" />`;
const secondDelimiter = `<input type="hidden" name="direct_div"/>`;

interface KupidSessionAuth {
  token: string;
  sessionId: string;
}

export async function getToken(id: string, password: string): Promise<KupidSessionAuth> {
  const {
    id: idKey,
    password: passwordKey,
    csrf,
    fake,
    sessionId,
  } = await (async () => {
    const res = await fetch("https://portal.korea.ac.kr/front/Intro.kpd", {
      headers: { referer: "https://portal.korea.ac.kr/front/Intro.kpd" },
    });
    if (!res.ok) throw Error("Failed to fetch kupid/intro");
    const text = await res.text();
    const [_, b] = text.split(firstDelimiter);
    if (!b) throw Error("Failed to parse kupid/intro @ 1st delimiter");
    const [c, d] = b.split(secondDelimiter);
    if (!d) throw Error("Failed to parse kupid/intro @ 2nd delimiter");
    const elems = c
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (elems.length !== 4) {
      throw Error("Failed to parse kupid/intfo @ elem trimming");
    }
    const [idElem, passwordElem, csrfElem, fakeElem] = elems;
    const idMatchArray = idElem.match(/name="(\w+)"/);
    if (!idMatchArray) throw Error("Failed to parse id element");
    const passwordMatchArray = passwordElem.match(/name="(\w+)"/);
    if (!passwordMatchArray) throw Error("Failed to parse password element");
    const csrfMatchArray = csrfElem.match(/value="(.+)"/);
    if (!csrfMatchArray) throw Error("Failed to parse csrf element");
    const fakeElemMatchArray = fakeElem.match(/value="(\w+)"/);
    if (!fakeElemMatchArray) throw Error("Failed to parse fake element");
    const [, id] = idMatchArray;
    const [, password] = passwordMatchArray;
    const [, csrf] = csrfMatchArray;
    const [, fake] = fakeElemMatchArray;
    const cookies = res.headers.getSetCookie();
    if (!cookies.length) throw Error("Unexpected length of set-cookie");
    const parsed = cookies.map(parseSetCookie);
    const sessionId = parsed.find(({ key }) => key === "PORTAL_SESSIONID");
    if (!sessionId) {
      throw Error("Failed to get sessionId from set-cookie result");
    }
    if (!id || !password || !csrf || !fake) {
      throw Error("Failed to parse elements");
    }
    return { id, password, csrf, fake, sessionId: sessionId.value };
  })();

  const token = await (async () => {
    const body = new URLSearchParams({
      [idKey]: id,
      [passwordKey]: password,
      _csrf: csrf,
      [fake]: fake,
      direct_div: "",
      pw_pass: "",
      browser: "chrome",
    });
    const res = await fetch("https://portal.korea.ac.kr/common/Login.kpd", {
      headers: {
        referer: "https://portal.korea.ac.kr/front/Intro.kpd",
        cookie: `PORTAL_SESSIONID=${sessionId}`,
      },
      body,
      method: "POST",
      redirect: "manual",
    });
    if (res.status !== 302) throw Error("Failed to kupid/login");
    const cookies = res.headers.getSetCookie();
    if (!cookies.length) throw Error("Unexpected length of set-cookie");
    const parsed = cookies.map(parseSetCookie);
    const token = parsed.find(({ key }) => key === "ssotoken");
    if (!token) throw Error("Failed to get token from set-cookie result");
    return token.value;
  })();

  return { token, sessionId };
}

export function parseSetCookie(cookie: string) {
  const [kv] = cookie.split(";");
  const [key, value] = kv.split("=");
  return { key, value };
}
