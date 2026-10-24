import axios from "axios";
import { SessionID } from "./IDTypes.js";
import { Session } from "./Session.js";

/**
 * POSTs a session's draft log to an HTTP endpoint, so a service that sent players here can be told
 * what they drafted instead of polling /getDraftLog for it.
 *
 * <p>A session owner can always register a hook themselves (see the 'setHooks' message); that is
 * where session.hooks.draftLog usually comes from. DRAFTLOG_HOOK_URL hands the same hook to every
 * session whose ID starts with DRAFTLOG_HOOK_SESSION_PREFIX, which is what an instance run
 * alongside the service it reports to needs: that service picks the session ID, sends its players
 * in through a plain link, and hears back about their decks without anyone in the session having to
 * set anything up — or even know the hook is there.
 *
 * <p>Deck building goes on long after the draft ends, and every card moved updates the log, so
 * sends are debounced: a table of eight players tweaking their decks produces one POST every few
 * seconds rather than a few hundred. Each POST carries the whole log (the same body the /getDraftLog
 * endpoint serves, unstripped), so a lost one costs nothing — the next send supersedes it.
 */

const HookURL = process.env.DRAFTLOG_HOOK_URL;

/** Which sessions get the default hook. Empty (the default) means all of them. */
const HookSessionPrefix = process.env.DRAFTLOG_HOOK_SESSION_PREFIX ?? "";

/** How long to wait for the deck edits to stop before sending. */
const HookDelay = intFromEnv("DRAFTLOG_HOOK_DELAY", 3000);

/** ...and how long a steady stream of them can hold a send off. */
const HookMaxDelay = intFromEnv("DRAFTLOG_HOOK_MAX_DELAY", 30000);

const HookTimeout = intFromEnv("DRAFTLOG_HOOK_TIMEOUT", 10000);

function intFromEnv(name: string, fallback: number): number {
	const raw = process.env[name];
	if (!raw) return fallback;
	const n = parseInt(raw);
	return isNaN(n) || n < 0 ? fallback : n;
}

type PendingSend = { timer: NodeJS.Timeout; since: number };

const Pending = new Map<SessionID, PendingSend>();

/** The hook a session is born with, if this instance was configured to give it one. */
export function defaultDraftLogHook(sessionID: SessionID): string | undefined {
	if (!HookURL) return undefined;
	return sessionID.startsWith(HookSessionPrefix) ? HookURL : undefined;
}

/**
 * Send the log shortly, once the decks stop moving. Call this as often as you like; it collapses
 * into a single POST.
 */
export function scheduleDraftLogHook(session: Session) {
	if (!session.hooks.draftLog || !session.draftLog) return;
	const pending = Pending.get(session.id);
	if (!pending) {
		Pending.set(session.id, {
			timer: setTimeout(() => sendDraftLogHook(session), HookDelay),
			since: Date.now(),
		});
		return;
	}
	// Held off for long enough: send what we have rather than wait out another round of edits.
	if (Date.now() - pending.since >= HookMaxDelay) {
		sendDraftLogHook(session);
		return;
	}
	clearTimeout(pending.timer);
	pending.timer = setTimeout(() => sendDraftLogHook(session), HookDelay);
}

/** Send the log now, dropping any send this session had scheduled. */
export function sendDraftLogHook(session: Session) {
	cancelDraftLogHook(session.id);
	if (!session.hooks.draftLog || !session.draftLog) return;
	post(session.hooks.draftLog, session.id, session.draftLog, true);
}

/** Forget a session's scheduled send, for a session on its way out. */
export function cancelDraftLogHook(sessionID: SessionID) {
	const pending = Pending.get(sessionID);
	if (!pending) return;
	clearTimeout(pending.timer);
	Pending.delete(sessionID);
}

function post(url: string, sessionID: SessionID, log: unknown, retry: boolean) {
	axios.post(url, log, { timeout: HookTimeout }).catch((err) => {
		console.error(
			`[${sessionID}] Error sending draft log to hook '${url}'${retry ? ", will retry once in 5 seconds" : ""}: `,
			err.cause ?? err
		);
		// One retry, for a receiver that was restarting. Anything longer-lived is its problem to
		// notice: it can still ask /getDraftLog for the log itself.
		if (retry) setTimeout(() => post(url, sessionID, log, false), 5000);
	});
}
