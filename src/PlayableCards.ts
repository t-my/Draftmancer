import axios from "axios";
import { BoosterCardsBySet, CardsBySet, getCard, getUnique } from "./Cards.js";
import { CardID, UniqueCard } from "./CardTypes.js";
import { SessionID } from "./IDTypes.js";
import { getRandom } from "./utils.js";

/**
 * Keeps cards a game engine can't play out of the boosters, for an instance run alongside one.
 *
 * <p>PLAYABLE_CARDS_URL serves the names the engine knows, one per line (split and double-faced
 * cards by each face). Once a set booster is built, every card whose front face isn't on the list is
 * swapped for a playable card of the same set and rarity. Doing it after the fact, rather than by
 * trimming the card pools, covers every way a booster is made: paper collations, set-specific
 * factories and the plain rarity slots alike.
 *
 * <p>The list is fetched in the background and refreshed now and then, so the engine can be
 * upgraded without restarting this instance. Until the first fetch succeeds nothing is filtered.
 */

const ListURL = process.env.PLAYABLE_CARDS_URL;

/** Which sessions get filtered boosters. Empty (the default) means all of them. */
const SessionPrefix = process.env.PLAYABLE_CARDS_SESSION_PREFIX ?? "";

const RetryDelay = 30 * 1000;
const RefreshDelay = 60 * 60 * 1000;

let Playable: Set<string> | null = null;

async function fetchList() {
	let next = RefreshDelay;
	try {
		const response = await axios.get(ListURL!, { responseType: "text", timeout: 60 * 1000 });
		const names = new Set<string>();
		for (const line of (response.data as string).split("\n")) {
			const name = line.trim().toLowerCase();
			if (name) names.add(name);
		}
		if (names.size === 0) throw new Error("the list is empty");
		if (Playable?.size !== names.size) console.log(`PlayableCards: ${names.size} playable card names.`);
		Playable = names;
	} catch (err) {
		console.error(`PlayableCards: could not fetch ${ListURL}: ${(err as Error).message}`);
		if (!Playable) next = RetryDelay;
	}
	setTimeout(fetchList, next).unref();
}

if (ListURL) fetchList();

function frontFace(name: string) {
	return name.split(" //")[0].trim().toLowerCase();
}

function isPlayable(cid: CardID) {
	return !Playable || Playable.has(frontFace(getCard(cid).name));
}

/** Swaps each unplayable card for a playable one from its set. Boosters are changed in place. */
export function replaceUnplayableCards(sessionID: SessionID, boosters: UniqueCard[][]) {
	if (!Playable || !sessionID.startsWith(SessionPrefix)) return;
	for (const booster of boosters) {
		for (let i = 0; i < booster.length; ++i) {
			const card = booster[i];
			if (isPlayable(card.id)) continue;
			const replacement = pickReplacement(card, booster);
			if (replacement) booster[i] = getUnique(replacement, { foil: card.foil });
			else console.warn(`PlayableCards: nothing playable in '${card.set}' to replace '${card.name}'.`);
		}
	}
}

function pickReplacement(card: UniqueCard, booster: UniqueCard[]): CardID | null {
	const pool = BoosterCardsBySet[card.set]?.length ? BoosterCardsBySet[card.set] : (CardsBySet[card.set] ?? []);
	const inBooster = new Set(booster.map((c) => c.id));
	const candidates = pool.filter((cid) => !inBooster.has(cid) && isPlayable(cid));
	const sameRarity = candidates.filter((cid) => getCard(cid).rarity === card.rarity);
	if (sameRarity.length > 0) return getRandom(sameRarity);
	if (candidates.length > 0) return getRandom(candidates);
	return null;
}
