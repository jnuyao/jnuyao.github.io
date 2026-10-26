export function readingLayout(pageCount: number, page: number, facingPages = false) {
  const current = Math.max(0, Math.min(page, pageCount - 1));
  const first = facingPages && current > 0
    ? 1 + Math.floor((current - 1) / 2) * 2
    : current;
  const last = facingPages && first > 0 ? Math.min(first + 1, pageCount - 1) : first;
  const pages = Array.from({ length: last - first + 1 }, (_, index) => first + index);
  return {
    pages,
    previous: first === 0 ? null : facingPages ? Math.max(0, first - 2) : first - 1,
    next: last >= pageCount - 1 ? null : last + 1,
    label: first === last ? String(first + 1) : `${first + 1}–${last + 1}`,
  };
}
