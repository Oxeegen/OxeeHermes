/**
 * "New browser tab": a blank in-app browser tab with its address bar ready, one
 * keystroke / click / palette row away (upstream only reaches the browser through
 * links, files or the toggle that reopens the last page). Labels live in the
 * catalogs under keybinds.actions['view.newBrowserTab'].
 */
export { newBrowserTab } from '@/store/preview'

export const NEW_BROWSER_TAB_ACTION = 'view.newBrowserTab'
