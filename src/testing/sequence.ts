import { SequencePatch, SequenceRange, Unit } from "../sequence";

export class PatchTypeError extends TypeError {
	public constructor(public readonly patch: SequencePatch<any>, message?: string) {
		super(message);
	}
}

export function validatePatch(patch: SequencePatch<any>) {
	if (patch.fresh) {
		validateSequenceRange(patch.fresh);
		if (patch.prev) {
			if (patch.prev !== patch.fresh.next.prev) {
				throw new PatchTypeError(patch, "new range start must link to the previous unit");
			}
			if (patch.prev.next !== patch.fresh.next) {
				throw new PatchTypeError(patch, "previous unit must link to the new range start");
			}
		}
		if (patch.next) {
			if (patch.next !== patch.fresh.prev.next) {
				throw new PatchTypeError(patch, "new range end must link to the next unit");
			}
			if (patch.next.prev !== patch.fresh.prev) {
				throw new PatchTypeError(patch, "next unit must link to the new range end");
			}
		}
	}
	if (patch.stale) {
		validateSequenceRange(patch.stale);
		if (patch.prev && patch.prev !== patch.stale.next.prev) {
			throw new PatchTypeError(patch, "stale range start must still link to the previous unit");
		}
		if (patch.next && patch.next !== patch.stale.prev.next) {
			throw new PatchTypeError(patch, "stale range end must still link to the next unit");
		}
	}
}

export class SequenceRangeTypeError extends TypeError {
	public constructor(public readonly range: SequenceRange<any>, message?: string) {
		super(message);
	}
}

export function validateSequenceRange(range: SequenceRange<any>) {
	const units = new Set<Unit<any>>();
	let unit = range.next;
	let prev: Unit<any> = null;
	do {
		if (!unit) {
			throw new SequenceRangeTypeError(range, "Unit chain ended before the range end.");
		}
		if (units.has(unit)) {
			throw new SequenceRangeTypeError(range, "Circular range");
		}
		if (prev && unit.prev !== prev) {
			throw new SequenceRangeTypeError(range, "Units within a range must be linked in both directions");
		}
		validateUnit(unit);
		units.add(unit);
		prev = unit;
		unit = unit.next;
	} while (prev !== range.prev);
}

export class UnitTypeError extends TypeError {
	public constructor(public readonly unit: Unit<any>, message?: string) {
		super(message);
	}
}

export function validateUnit(unit: Unit<any>) {
	if (!unit || typeof unit !== "object") {
		throw new UnitTypeError(unit, "unit must be an object.");
	}
	if (!("prev" in unit)) {
		throw new UnitTypeError(unit, "unit.prev must be defined.");
	}
	if (!("next" in unit)) {
		throw new UnitTypeError(unit, "unit.next must be defined.");
	}
	if (!("value" in unit)) {
		throw new UnitTypeError(unit, "unit.value must be defined.");
	}
}
