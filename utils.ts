export function trim(str: string): string {
  return str.replace(/\<(.+)\>/g, "").replace(/(&nbsp;)+/g, " ");
}
