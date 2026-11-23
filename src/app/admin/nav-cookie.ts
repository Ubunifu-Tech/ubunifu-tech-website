/**
 * The cookie that remembers a sidebar narrowed to its icons. Written in the
 * browser by the navigation and read by the layout on the server, so the page
 * arrives the right width instead of jumping after it loads. In a module of
 * its own because a value exported from a client component reaches the server
 * as a reference, not as the text.
 */
export const NAV_COOKIE = 'console-nav';
