// Keeps localStorage/sessionStorage from taking the whole app down where the browser refuses them.
//
// Accessing either *throws* a SecurityError — it doesn't return null — when a browser has decided
// this document may not have storage. In a frame on another origin that is not an edge case: Chrome
// blocks third-party storage in Incognito by default, Safari blocks it for anyone who has turned
// third-party cookies off. Draftmancer reads localStorage while its module is still evaluating, so
// the throw happens before anything is on screen and the frame stays blank.
//
// Swapping in a Map for the session is the right trade there: settings, saved logs and the cached
// collection stop persisting across reloads — which storage the browser has already refused to keep
// anyway — and everything else works. Imported for its side effect, first, before any module that
// touches storage.

function memoryStorage(): Storage {
	const entries = new Map<string, string>();
	return {
		get length() {
			return entries.size;
		},
		key: (i: number) => [...entries.keys()][i] ?? null,
		getItem: (k: string) => entries.get(k) ?? null,
		setItem: (k: string, v: string) => void entries.set(k, String(v)),
		removeItem: (k: string) => void entries.delete(k),
		clear: () => entries.clear(),
	};
}

function install(name: "localStorage" | "sessionStorage") {
	try {
		// Write as well as read: some browsers hand back a Storage that rejects every write.
		const probe = "__draftmancer_storage_probe__";
		window[name].setItem(probe, "1");
		window[name].removeItem(probe);
		return;
	} catch (e) {
		console.warn(`${name} is unavailable here (${e}); falling back to memory for this session.`);
	}
	try {
		Object.defineProperty(window, name, { value: memoryStorage(), configurable: true });
	} catch (e) {
		console.error(`Could not replace ${name}:`, e);
	}
}

install("localStorage");
install("sessionStorage");
